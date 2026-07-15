import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin, logAudit } from '@/lib/auth'
import { db } from '@/lib/db'

// POST /api/roles/[id]/permissions - grant permission to role
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  const { id } = await params
  if (!isAdmin(ctx.session)) return NextResponse.json({ error: 'Hanya pentadbir' }, { status: 403 })

  const body = await req.json().catch(() => ({} as any))
  const permissionId = (body.permissionId || '').toString()
  const permissionCode = (body.permissionCode || '').toString()

  if (!permissionId && !permissionCode) {
    return NextResponse.json({ error: 'permissionId atau permissionCode diperlukan' }, { status: 400 })
  }

  const role = await db.role.findUnique({ where: { id } })
  if (!role) return NextResponse.json({ error: 'Peranan tidak dijumpai' }, { status: 404 })

  const perm = permissionId
    ? await db.permission.findUnique({ where: { id: permissionId } })
    : await db.permission.findUnique({ where: { code: permissionCode } })
  if (!perm) return NextResponse.json({ error: 'Kebenaran tidak dijumpai' }, { status: 404 })

  const existing = await db.rolePermission.findUnique({
    where: { roleId_permissionId: { roleId: id, permissionId: perm.id } },
  })
  if (existing) return NextResponse.json({ ok: true, message: 'Kebenaran telah diberikan' })

  await db.rolePermission.create({ data: { roleId: id, permissionId: perm.id } })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  await logAudit({
    tableName: 'role_permissions',
    recordId: id,
    action: 'INSERT',
    newValues: { roleCode: role.code, permissionCode: perm.code },
    performedById: ctx.user.id,
    ipAddress: ip,
  })

  return NextResponse.json({ ok: true })
}

// DELETE /api/roles/[id]/permissions - revoke permission from role
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  const { id } = await params
  if (!isAdmin(ctx.session)) return NextResponse.json({ error: 'Hanya pentadbir' }, { status: 403 })

  const url = new URL(req.url)
  const permissionId = url.searchParams.get('permissionId') || ''
  const permissionCode = url.searchParams.get('permissionCode') || ''

  if (!permissionId && !permissionCode) {
    return NextResponse.json({ error: 'permissionId atau permissionCode diperlukan' }, { status: 400 })
  }

  const role = await db.role.findUnique({ where: { id } })
  if (!role) return NextResponse.json({ error: 'Peranan tidak dijumpai' }, { status: 404 })

  const perm = permissionId
    ? await db.permission.findUnique({ where: { id: permissionId } })
    : await db.permission.findUnique({ where: { code: permissionCode } })
  if (!perm) return NextResponse.json({ error: 'Kebenaran tidak dijumpai' }, { status: 404 })

  await db.rolePermission.deleteMany({ where: { roleId: id, permissionId: perm.id } })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  await logAudit({
    tableName: 'role_permissions',
    recordId: id,
    action: 'DELETE',
    oldValues: { roleCode: role.code, permissionCode: perm.code },
    performedById: ctx.user.id,
    ipAddress: ip,
  })

  return NextResponse.json({ ok: true })
}
