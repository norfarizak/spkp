import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/roles - list all roles with their permissions
export async function GET(req: NextRequest) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })

  const roles = await db.role.findMany({
    orderBy: { code: 'asc' },
    include: {
      permissions: { include: { permission: true } },
      _count: { select: { users: true } },
    },
  })

  const permissions = await db.permission.findMany({
    orderBy: [{ module: 'asc' }, { code: 'asc' }],
  })

  return NextResponse.json({
    roles: roles.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description,
      userCount: r._count.users,
      permissions: r.permissions.map((rp) => ({
        id: rp.permission.id,
        code: rp.permission.code,
        name: rp.permission.name,
        module: rp.permission.module,
      })),
    })),
    permissions: permissions.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      module: p.module,
    })),
  })
}
