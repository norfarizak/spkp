import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/audit?tableName=&action=&source=&performedById=&from=&to=&page=&pageSize=
export async function GET(req: NextRequest) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })

  const url = req.nextUrl
  const tableName = url.searchParams.get('tableName') || ''
  const action = url.searchParams.get('action') || ''
  const source = url.searchParams.get('source') || ''
  const performedById = url.searchParams.get('performedById') || ''
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')
  const search = (url.searchParams.get('search') || '').trim()
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
  const pageSize = Math.min(200, Math.max(1, parseInt(url.searchParams.get('pageSize') || '50', 10)))

  const where: any = {}
  if (tableName) where.tableName = tableName
  if (action) where.action = action
  if (source) where.source = source
  if (performedById) where.performedById = performedById
  if (from || to) {
    where.performedAt = {}
    if (from) where.performedAt.gte = new Date(from)
    if (to) where.performedAt.lte = new Date(to)
  }
  if (search) {
    where.OR = [
      { recordId: { contains: search } },
      { ipAddress: { contains: search } },
    ]
  }

  const [items, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { performedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { performedBy: { select: { id: true, fullName: true, email: true } } },
    }),
    db.auditLog.count({ where }),
  ])

  return NextResponse.json({
    items: items.map((a) => ({
      id: a.id,
      tableName: a.tableName,
      recordId: a.recordId,
      action: a.action,
      oldValues: a.oldValues,
      newValues: a.newValues,
      performedBy: a.performedBy ? { id: a.performedBy.id, name: a.performedBy.fullName, email: a.performedBy.email } : null,
      performedAt: a.performedAt,
      ipAddress: a.ipAddress,
      source: a.source,
    })),
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total,
  })
}
