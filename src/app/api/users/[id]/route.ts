import { NextRequest, NextResponse } from 'next/server'
import {
  getCurrentUser,
  isAdmin,
  sanitizeText,
  logAudit,
  ROLE_CODES,
} from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/users/[id] - get user detail
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  const { id } = await params

  const u = await db.user.findUnique({
    where: { id },
    include: {
      roles: { include: { role: true } },
      institution: { select: { id: true, name: true, code: true } },
    },
  })
  if (!u) return NextResponse.json({ error: 'Pengguna tidak dijumpai' }, { status: 404 })

  // RLS: non-admin can only view users in their own institution (or themselves)
  const admin = isAdmin(ctx.session)
  if (!admin && u.institutionId !== ctx.user.institutionId && u.id !== ctx.user.id) {
    return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 403 })
  }

  // Lookup campus/department names separately (User model has no relation for these)
  const [campus, department] = await Promise.all([
    u.campusId ? db.campus.findUnique({ where: { id: u.campusId }, select: { id: true, name: true } }) : null,
    u.departmentId ? db.department.findUnique({ where: { id: u.departmentId }, select: { id: true, name: true, code: true } }) : null,
  ])

  return NextResponse.json({
    user: {
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
      institution: u.institution,
      campus,
      department,
      roles: u.roles.map((r) => ({ id: r.role.id, code: r.role.code, name: r.role.name })),
      lastLoginAt: u.lastLoginAt,
      lastLoginIp: u.lastLoginIp,
      failedAttempts: u.failedAttempts,
      lockedUntil: u.lockedUntil,
      createdAt: u.createdAt,
    },
  })
}

// PATCH /api/users/[id] - update user
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  const { id } = await params
  const admin = isAdmin(ctx.session)
  // Only admin OR self can update (self only for limited fields like phone/avatar - that goes through profile endpoint)
  if (!admin) return NextResponse.json({ error: 'Hanya pentadbir' }, { status: 403 })

  const existing = await db.user.findUnique({ where: { id }, include: { roles: { include: { role: true } } } })
  if (!existing) return NextResponse.json({ error: 'Pengguna tidak dijumpai' }, { status: 404 })

  const body = await req.json().catch(() => ({} as any))
  const data: any = {}

  if (body.fullName !== undefined) data.fullName = sanitizeText(body.fullName) || existing.fullName
  if (body.icNumber !== undefined) data.icNumber = sanitizeText(body.icNumber) || null
  if (body.staffId !== undefined) data.staffId = sanitizeText(body.staffId) || null
  if (body.phone !== undefined) data.phone = sanitizeText(body.phone) || null
  if (body.institutionId !== undefined) data.institutionId = body.institutionId ? String(body.institutionId) : null
  if (body.campusId !== undefined) data.campusId = body.campusId ? String(body.campusId) : null
  if (body.departmentId !== undefined) data.departmentId = body.departmentId ? String(body.departmentId) : null
  if (body.status !== undefined) {
    if (!['active', 'suspended', 'pending'].includes(body.status)) {
      return NextResponse.json({ error: 'Status tidak sah' }, { status: 400 })
    }
    data.status = body.status
  }
  if (body.mfaEnabled !== undefined) data.mfaEnabled = Boolean(body.mfaEnabled)
  if (body.mustResetPwd !== undefined) data.mustResetPwd = Boolean(body.mustResetPwd)
  if (body.failedAttempts !== undefined) data.failedAttempts = parseInt(body.failedAttempts, 10) || 0
  if (body.unlock !== undefined && body.unlock) {
    data.failedAttempts = 0
    data.lockedUntil = null
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

  // Safety: cannot suspend the last SUPER_ADMIN
  const oldRoleCodes = existing.roles.map((r) => r.role.code)
  const wasSuperAdmin = oldRoleCodes.includes(ROLE_CODES.SUPER_ADMIN)
  if (wasSuperAdmin && data.status === 'suspended') {
    const superAdmins = await db.user.findMany({
      where: { status: 'active', roles: { some: { role: { code: ROLE_CODES.SUPER_ADMIN } } } },
      select: { id: true },
    })
    const otherActive = superAdmins.filter((u) => u.id !== id)
    if (otherActive.length === 0) {
      return NextResponse.json({ error: 'Tidak boleh menggantung SUPER_ADMIN terakhir' }, { status: 400 })
    }
  }

  const updated = await db.user.update({
    where: { id },
    data,
    include: { roles: { include: { role: true } }, institution: true },
  })

  await logAudit({
    tableName: 'users',
    recordId: id,
    action: 'UPDATE',
    oldValues: {
      fullName: existing.fullName,
      status: existing.status,
      mfaEnabled: existing.mfaEnabled,
      institutionId: existing.institutionId,
    },
    newValues: data,
    performedById: ctx.user.id,
    ipAddress: ip,
  })

  return NextResponse.json({
    ok: true,
    user: {
      id: updated.id,
      email: updated.email,
      fullName: updated.fullName,
      status: updated.status,
      mfaEnabled: updated.mfaEnabled,
      roles: updated.roles.map((r) => ({ id: r.role.id, code: r.role.code, name: r.role.name })),
    },
  })
}

// DELETE /api/users/[id] - delete user (admin only, cannot delete self)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  const { id } = await params
  if (!isAdmin(ctx.session)) return NextResponse.json({ error: 'Hanya pentadbir' }, { status: 403 })

  // cannot delete self
  if (id === ctx.user.id) {
    return NextResponse.json({ error: 'Tidak boleh memadam akaun sendiri' }, { status: 400 })
  }

  const existing = await db.user.findUnique({ where: { id }, include: { roles: { include: { role: true } } } })
  if (!existing) return NextResponse.json({ error: 'Pengguna tidak dijumpai' }, { status: 404 })

  // cannot delete last SUPER_ADMIN
  if (existing.roles.some((r) => r.role.code === ROLE_CODES.SUPER_ADMIN)) {
    const superAdmins = await db.user.findMany({
      where: { status: 'active', roles: { some: { role: { code: ROLE_CODES.SUPER_ADMIN } } } },
      select: { id: true },
    })
    if (superAdmins.filter((u) => u.id !== id).length === 0) {
      return NextResponse.json({ error: 'Tidak boleh memadam SUPER_ADMIN terakhir' }, { status: 400 })
    }
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

  await db.user.delete({ where: { id } })

  await logAudit({
    tableName: 'users',
    recordId: id,
    action: 'DELETE',
    oldValues: { email: existing.email, fullName: existing.fullName },
    performedById: ctx.user.id,
    ipAddress: ip,
  })

  return NextResponse.json({ ok: true })
}
