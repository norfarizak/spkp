import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, sanitizeText, logAudit } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/settings/profile - get own profile
export async function GET(req: NextRequest) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })

  const u = ctx.user
  return NextResponse.json({
    profile: {
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      icNumber: u.icNumber,
      staffId: u.staffId,
      phone: u.phone,
      avatarUrl: u.avatarUrl,
      status: u.status,
      mfaEnabled: u.mfaEnabled,
      mustResetPwd: u.mustResetPwd,
      institutionId: u.institutionId,
      institutionName: u.institution?.name,
      institutionCode: u.institution?.code,
      campus: null,
      department: null,
      roles: u.roles.map((r: any) => ({ id: r.role.id, code: r.role.code, name: r.role.name })),
      lastLoginAt: u.lastLoginAt,
      lastLoginIp: u.lastLoginIp,
      createdAt: u.createdAt,
    },
  })
}

// PATCH /api/settings/profile - update own phone/avatar
export async function PATCH(req: NextRequest) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })

  const body = await req.json().catch(() => ({} as any))
  const data: any = {}
  if (body.phone !== undefined) data.phone = sanitizeText(body.phone) || null
  if (body.avatarUrl !== undefined) data.avatarUrl = sanitizeText(body.avatarUrl) || null

  const updated = await db.user.update({ where: { id: ctx.user.id }, data })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  await logAudit({
    tableName: 'users',
    recordId: ctx.user.id,
    action: 'UPDATE',
    newValues: { phone: updated.phone, avatarUrl: updated.avatarUrl, event: 'self_profile_update' },
    performedById: ctx.user.id,
    ipAddress: ip,
  })

  return NextResponse.json({
    ok: true,
    profile: {
      id: updated.id,
      email: updated.email,
      fullName: updated.fullName,
      phone: updated.phone,
      avatarUrl: updated.avatarUrl,
    },
  })
}
