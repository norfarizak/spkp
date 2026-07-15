import { NextRequest, NextResponse } from 'next/server'
import {
  getCurrentUser,
  isAdmin,
  hashPassword,
  validatePasswordPolicy,
  logAudit,
} from '@/lib/auth'
import { db } from '@/lib/db'

// POST /api/users/[id]/reset-password - admin resets user password
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  const { id } = await params
  if (!isAdmin(ctx.session)) return NextResponse.json({ error: 'Hanya pentadbir' }, { status: 403 })

  const body = await req.json().catch(() => ({} as any))
  const newPassword = (body.newPassword || body.password || '').toString()

  if (!newPassword) {
    return NextResponse.json({ error: 'Kata laluan baharu diperlukan' }, { status: 400 })
  }
  const pwdCheck = validatePasswordPolicy(newPassword)
  if (!pwdCheck.ok) return NextResponse.json({ error: pwdCheck.msg }, { status: 400 })

  const existing = await db.user.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Pengguna tidak dijumpai' }, { status: 404 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

  await db.user.update({
    where: { id },
    data: {
      passwordHash: hashPassword(newPassword),
      mustResetPwd: body.forceReset !== undefined ? Boolean(body.forceReset) : true,
      failedAttempts: 0,
      lockedUntil: null,
    },
  })

  await logAudit({
    tableName: 'users',
    recordId: id,
    action: 'UPDATE',
    newValues: { event: 'password_reset_by_admin', forceReset: body.forceReset !== false },
    performedById: ctx.user.id,
    ipAddress: ip,
  })

  return NextResponse.json({ ok: true })
}
