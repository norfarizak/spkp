import { NextRequest, NextResponse } from 'next/server'
import {
  getCurrentUser,
  isAdmin,
  hasRole,
  hashPassword,
  validatePasswordPolicy,
  sanitizeText,
  logAudit,
  ROLE_CODES,
} from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/users - list users (admin sees all, non-admin sees own institution only)
export async function GET(req: NextRequest) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })

  const { session, user } = ctx
  const url = new URL(req.url)
  const q = (url.searchParams.get('q') || '').trim()
  const roleFilter = url.searchParams.get('role') || ''
  const institutionFilter = url.searchParams.get('institution') || ''
  const statusFilter = url.searchParams.get('status') || ''
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10), 500)

  const admin = isAdmin(session)

  // RLS-style: non-admins only see users in their own institution
  const where: any = {}
  if (!admin) {
    where.institutionId = user.institutionId || '___none___'
  } else if (institutionFilter) {
    where.institutionId = institutionFilter
  }

  if (statusFilter) where.status = statusFilter
  if (q) {
    where.OR = [
      { fullName: { contains: q } },
      { email: { contains: q } },
      { staffId: { contains: q } },
      { icNumber: { contains: q } },
    ]
  }
  if (roleFilter) {
    where.roles = { some: { role: { code: roleFilter } } }
  }

  const users = await db.user.findMany({
    where,
    include: {
      roles: { include: { role: true } },
      institution: { select: { id: true, name: true, code: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  // Lookup campus/department names in separate queries (User model has no relation for these)
  const campusIds = Array.from(new Set(users.map((u) => u.campusId).filter(Boolean))) as string[]
  const deptIds = Array.from(new Set(users.map((u) => u.departmentId).filter(Boolean))) as string[]
  const [campuses, depts] = await Promise.all([
    campusIds.length ? db.campus.findMany({ where: { id: { in: campusIds } }, select: { id: true, name: true } }) : [],
    deptIds.length ? db.department.findMany({ where: { id: { in: deptIds } }, select: { id: true, name: true, code: true } }) : [],
  ])
  const campusMap = Object.fromEntries(campuses.map((c) => [c.id, c]))
  const deptMap = Object.fromEntries(depts.map((d) => [d.id, d]))

  const data = users.map((u) => ({
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
    institution: u.institution ? { id: u.institution.id, name: u.institution.name, code: u.institution.code } : null,
    campus: u.campusId && campusMap[u.campusId] ? { id: u.campusId, name: campusMap[u.campusId].name } : null,
    department: u.departmentId && deptMap[u.departmentId] ? { id: u.departmentId, name: deptMap[u.departmentId].name, code: deptMap[u.departmentId].code } : null,
    roles: u.roles.map((r) => ({ id: r.role.id, code: r.role.code, name: r.role.name })),
    lastLoginAt: u.lastLoginAt,
    failedAttempts: u.failedAttempts,
    lockedUntil: u.lockedUntil,
    createdAt: u.createdAt,
  }))

  // For filter dropdowns
  const roles = await db.role.findMany({ orderBy: { code: 'asc' }, select: { id: true, code: true, name: true } })
  const institutions = admin
    ? await db.institution.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, code: true } })
    : []

  return NextResponse.json({ users: data, roles, institutions, isAdmin: admin })
}

// POST /api/users - create user (admin only)
export async function POST(req: NextRequest) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  if (!isAdmin(ctx.session)) return NextResponse.json({ error: 'Hanya pentadbir' }, { status: 403 })

  const body = await req.json().catch(() => ({} as any))
  const email = (body.email || '').toString().trim().toLowerCase()
  const fullName = sanitizeText(body.fullName)
  const icNumber = sanitizeText(body.icNumber)
  const staffId = sanitizeText(body.staffId)
  const phone = sanitizeText(body.phone)
  const institutionId = body.institutionId ? String(body.institutionId) : null
  const campusId = body.campusId ? String(body.campusId) : null
  const departmentId = body.departmentId ? String(body.departmentId) : null
  const password = (body.password || '').toString()
  const roleIds: string[] = Array.isArray(body.roleIds) ? body.roleIds.map(String) : []
  const roleCodes: string[] = Array.isArray(body.roleCodes) ? body.roleCodes.map(String) : []
  const status = ['active', 'suspended', 'pending'].includes(body.status) ? body.status : 'active'

  if (!email || !fullName || !password) {
    return NextResponse.json({ error: 'E-mel, nama penuh, dan kata laluan diperlukan' }, { status: 400 })
  }
  // email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Format e-mel tidak sah' }, { status: 400 })
  }
  // unique email
  const existing = await db.user.findUnique({ where: { email } })
  if (existing) return NextResponse.json({ error: 'E-mel telah wujud' }, { status: 409 })

  // password policy
  const pwdCheck = validatePasswordPolicy(password)
  if (!pwdCheck.ok) return NextResponse.json({ error: pwdCheck.msg }, { status: 400 })

  // Resolve role IDs
  const finalRoleIds = new Set<string>()
  if (roleIds.length) {
    const r = await db.role.findMany({ where: { id: { in: roleIds } }, select: { id: true } })
    r.forEach((x) => finalRoleIds.add(x.id))
  }
  if (roleCodes.length) {
    const r = await db.role.findMany({ where: { code: { in: roleCodes } }, select: { id: true } })
    r.forEach((x) => finalRoleIds.add(x.id))
  }
  if (finalRoleIds.size === 0) {
    return NextResponse.json({ error: 'Sekurang-kurangnya satu peranan diperlukan' }, { status: 400 })
  }
  // Prevent granting SUPER_ADMIN to non-super-admin
  if (
    !hasRole(ctx.session, ROLE_CODES.SUPER_ADMIN) &&
    roleCodes.includes(ROLE_CODES.SUPER_ADMIN)
  ) {
    return NextResponse.json({ error: 'Tidak dibenarkan memberikan peranan SUPER_ADMIN' }, { status: 403 })
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

  const created = await db.user.create({
    data: {
      email,
      passwordHash: hashPassword(password),
      fullName,
      icNumber: icNumber || null,
      staffId: staffId || null,
      phone: phone || null,
      institutionId,
      campusId,
      departmentId,
      status,
      mustResetPwd: true, // force password reset on first login (FR-M12-01)
      roles: {
        create: Array.from(finalRoleIds).map((roleId) => ({ roleId })),
      },
    },
    include: { roles: { include: { role: true } }, institution: true },
  })

  await logAudit({
    tableName: 'users',
    recordId: created.id,
    action: 'INSERT',
    newValues: { email, fullName, staffId, institutionId, status, roles: created.roles.map((r) => r.role.code) },
    performedById: ctx.user.id,
    ipAddress: ip,
  })

  return NextResponse.json({ ok: true, id: created.id, email: created.email })
}
