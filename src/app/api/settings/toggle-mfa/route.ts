import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, logAudit } from '@/lib/auth'
import { db } from '@/lib/db'

// POST /api/settings/toggle-mfa - toggle own MFA
export async function POST(req: NextRequest) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })

  const body = await req.json().catch(() => ({} as any))
  const enable = body.enable !== undefined ? Boolean(body.enable) : !ctx.user.mfaEnabled

  // If enabling and no secret, generate one (simulated)
  const data: any = { mfaEnabled: enable }
  if (enable && !ctx.user.mfaSecret) {
    // generate a fake TOTP secret placeholder (simulated per task spec)
    data.mfaSecret = 'SIM_' + Math.random().toString(36).slice(2, 14).toUpperCase()
  }
  if (!enable) {
    data.mfaSecret = null
  }

  await db.user.update({ where: { id: ctx.user.id }, data })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  await logAudit({
    tableName: 'users',
    recordId: ctx.user.id,
    action: 'UPDATE',
    newValues: { event: 'self_mfa_toggle', mfaEnabled: enable },
    performedById: ctx.user.id,
    ipAddress: ip,
  })

  return NextResponse.json({ ok: true, mfaEnabled: enable })
}
