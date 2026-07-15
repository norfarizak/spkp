import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  verifyPassword,
  signSession,
  makeSessionCookie,
  logAudit,
  checkRateLimit,
  recordFailedLogin,
  clearFailedLogin,
  pushNotification,
} from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any))
    const email = (body.email || '').toString().trim().toLowerCase()
    const password = (body.password || '').toString()
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'

    if (!email || !password) {
      return NextResponse.json({ error: 'E-mel dan kata laluan diperlukan' }, { status: 400 })
    }

    // Rate limit check (FR-M12-05 security)
    const rl = checkRateLimit(ip)
    if (!rl.ok) {
      return NextResponse.json({ error: rl.msg }, { status: 429 })
    }

    const user = await db.user.findUnique({
      where: { email },
      include: {
        roles: { include: { role: true } },
        institution: true,
      },
    })

    // Generic error to prevent user enumeration (OWASP)
    const genericError = 'E-mel atau kata laluan tidak sah'
    if (!user || !verifyPassword(password, user.passwordHash)) {
      if (user) {
        recordFailedLogin(ip)
        await db.loginHistory.create({
          data: { userId: user.id, ipAddress: ip, userAgent: req.headers.get('user-agent') || '', success: false, reason: 'wrong_password' },
        })
        await db.user.update({
          where: { id: user.id },
          data: {
            failedAttempts: { increment: 1 },
            lockedUntil: user.failedAttempts + 1 >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : undefined,
          },
        }).catch(() => {})
      }
      return NextResponse.json({ error: genericError }, { status: 401 })
    }

    if (user.status !== 'active') {
      return NextResponse.json({ error: 'Akaun anda telah digantung. Sila hubungi pentadbir.' }, { status: 403 })
    }
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return NextResponse.json({ error: 'Akaun dikunci selepas percubaan gagal berulang. Cuba lagi kemudian.' }, { status: 423 })
    }

    clearFailedLogin(ip)

    const roleCodes = user.roles.map((ur) => ur.role.code)
    const token = signSession({
      userId: user.id,
      email: user.email,
      roleCodes,
      institutionId: user.institutionId,
    })

    // Update login metadata
    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), lastLoginIp: ip, failedAttempts: 0, lockedUntil: null },
    })
    await db.loginHistory.create({
      data: { userId: user.id, ipAddress: ip, userAgent: req.headers.get('user-agent') || '', success: true },
    })

    await logAudit({
      tableName: 'users',
      recordId: user.id,
      action: 'UPDATE',
      newValues: { event: 'login_success', at: new Date().toISOString() },
      performedById: user.id,
      ipAddress: ip,
      source: 'system',
    })

    // Welcome notification if first login
    if (!user.lastLoginAt) {
      await pushNotification({
        userId: user.id,
        category: 'system',
        title: 'Selamat Datang ke SPKP-JTM',
        message: `Sistem Pengurusan Kurikulum dan Pentauliahan JTM. Log masuk berjaya pada ${new Date().toLocaleString('ms-MY')}.`,
        priority: 'normal',
      })
    }

    const res = NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        roles: roleCodes,
        institutionId: user.institutionId,
        institutionName: user.institution?.name,
        mustResetPwd: user.mustResetPwd,
        mfaEnabled: user.mfaEnabled,
      },
    })
    res.headers.set('set-cookie', makeSessionCookie(token))
    return res
  } catch (e: any) {
    console.error('[LOGIN ERROR]', e)
    return NextResponse.json({ error: 'Ralat pelayan. Sila cuba lagi.' }, { status: 500 })
  }
}
