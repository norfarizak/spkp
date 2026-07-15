import { NextRequest, NextResponse } from 'next/server'
import {
  getCurrentUser,
  isAdmin,
  hasRole,
  logAudit,
  ROLE_CODES,
} from '@/lib/auth'
import { db } from '@/lib/db'

// POST /api/users/[id]/roles - assign role to user
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  const { id } = await params
  if (!isAdmin(ctx.session)) return NextResponse.json({ error: 'Hanya pentadbir' }, { status: 403 })

  const body = await req.json().catch(() => ({} as any))
  const roleCode = (body.roleCode || '').toString()
  const roleId = (body.roleId || '').toString()

  if (!roleCode && !roleId) {
    return NextResponse.json({ error: 'roleCode atau roleId diperlukan' }, { status: 400 })
  }

  const role = roleId
    ? await db.role.findUnique({ where: { id: roleId } })
    : await db.role.findUnique({ where: { code: roleCode } })
  if (!role) return NextResponse.json({ error: 'Peranan tidak dijumpai' }, { status: 404 })

  // Prevent granting SUPER_ADMIN if not super_admin
  if (role.code === ROLE_CODES.SUPER_ADMIN && !hasRole(ctx.session, ROLE_CODES.SUPER_ADMIN)) {
    return NextResponse.json({ error: 'Tidak dibenarkan memberikan peranan SUPER_ADMIN' }, { status: 403 })
  }

  const existing = await db.user.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Pengguna tidak dijumpai' }, { status: 404 })

  // upsert role assignment
  const existingUR = await db.userRole.findUnique({
    where: { userId_roleId: { userId: id, roleId: role.id } },
  })
  if (existingUR) {
    return NextResponse.json({ ok: true, message: 'Peranan telah ditugaskan' })
  }

  await db.userRole.create({ data: { userId: id, roleId: role.id } })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  await logAudit({
    tableName: 'user_roles',
    recordId: id,
    action: 'INSERT',
    newValues: { roleCode: role.code, roleName: role.name },
    performedById: ctx.user.id,
    ipAddress: ip,
  })

  return NextResponse.json({ ok: true })
}

// DELETE /api/users/[id]/roles - remove role from user
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  const { id } = await params
  if (!isAdmin(ctx.session)) return NextResponse.json({ error: 'Hanya pentadbir' }, { status: 403 })

  const url = new URL(req.url)
  const roleCode = url.searchParams.get('roleCode') || ''
  const roleId = url.searchParams.get('roleId') || ''

  if (!roleCode && !roleId) {
    return NextResponse.json({ error: 'roleCode atau roleId diperlukan' }, { status: 400 })
  }

  const role = roleId
    ? await db.role.findUnique({ where: { id: roleId } })
    : await db.role.findUnique({ where: { code: roleCode } })
  if (!role) return NextResponse.json({ error: 'Peranan tidak dijumpai' }, { status: 404 })

  // Prevent removing own SUPER_ADMIN role (lockout prevention)
  if (id === ctx.user.id && role.code === ROLE_CODES.SUPER_ADMIN) {
    return NextResponse.json({ error: 'Tidak boleh membuang peranan SUPER_ADMIN sendiri' }, { status: 400 })
  }

  // Prevent demoting last SUPER_ADMIN
  if (role.code === ROLE_CODES.SUPER_ADMIN) {
    const superAdmins = await db.user.findMany({
      where: { status: 'active', roles: { some: { role: { code: ROLE_CODES.SUPER_ADMIN } } } },
      select: { id: true },
    })
    if (superAdmins.filter((u) => u.id !== id).length === 0) {
      return NextResponse.json({ error: 'Tidak boleh membuang peranan SUPER_ADMIN terakhir' }, { status: 400 })
    }
  }

  const existing = await db.user.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Pengguna tidak dijumpai' }, { status: 404 })

  await db.userRole.deleteMany({ where: { userId: id, roleId: role.id } })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  await logAudit({
    tableName: 'user_roles',
    recordId: id,
    action: 'DELETE',
    oldValues: { roleCode: role.code, roleName: role.name },
    performedById: ctx.user.id,
    ipAddress: ip,
  })

  return NextResponse.json({ ok: true })
}
