import { NextRequest, NextResponse } from 'next/server'
import {
  getCurrentUser,
  verifyPassword,
  hashPassword,
  validatePasswordPolicy,
  logAudit,
} from '@/lib/auth'
import { db } from '@/lib/db'

// POST /api/settings/change-password - change own password (verify old, validate new)
export async function POST(req: NextRequest) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })

  const body = await req.json().catch(() => ({} as any))
  const oldPassword = (body.oldPassword || '').toString()
  const newPassword = (body.newPassword || '').toString()

  if (!oldPassword || !newPassword) {
    return NextResponse.json({ error: 'Kata laluan lama dan baharu diperlukan' }, { status: 400 })
  }
  if (oldPassword === newPassword) {
    return NextResponse.json({ error: 'Kata laluan baharu tidak boleh sama dengan kata laluan lama' }, { status: 400 })
  }

  // Verify old password
  if (!verifyPassword(oldPassword, ctx.user.passwordHash)) {
    return NextResponse.json({ error: 'Kata laluan lama tidak sah' }, { status: 401 })
  }

  // Validate new password policy
  const check = validatePasswordPolicy(newPassword)
  if (!check.ok) return NextResponse.json({ error: check.msg }, { status: 400 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

  await db.user.update({
    where: { id: ctx.user.id },
    data: {
      passwordHash: hashPassword(newPassword),
      mustResetPwd: false,
      failedAttempts: 0,
      lockedUntil: null,
    },
  })

  await logAudit({
    tableName: 'users',
    recordId: ctx.user.id,
    action: 'UPDATE',
    newValues: { event: 'self_password_change' },
    performedById: ctx.user.id,
    ipAddress: ip,
  })

  return NextResponse.json({ ok: true })
}
