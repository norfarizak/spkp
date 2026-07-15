import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/audit/report?from=&to=
// Aggregated compliance report: counts by table, by action, by source
export async function GET(req: NextRequest) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })

  const url = req.nextUrl
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')
  const dateWhere: any = {}
  if (from || to) {
    dateWhere.performedAt = {}
    if (from) dateWhere.performedAt.gte = new Date(from)
    if (to) dateWhere.performedAt.lte = new Date(to)
  }

  const [byTable, byAction, bySource, byUser, total] = await Promise.all([
    db.auditLog.groupBy({ by: ['tableName'], _count: true, where: dateWhere, orderBy: { _count: { tableName: 'desc' } } }),
    db.auditLog.groupBy({ by: ['action'], _count: true, where: dateWhere }),
    db.auditLog.groupBy({ by: ['source'], _count: true, where: dateWhere }),
    db.auditLog.groupBy({ by: ['performedById'], _count: true, where: dateWhere, orderBy: { _count: { performedById: 'desc' } }, take: 15 }),
    db.auditLog.count({ where: dateWhere }),
  ])

  // Resolve user names for top users
  const userIds = byUser.map((u) => u.performedById).filter(Boolean) as string[]
  const users = userIds.length ? await db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, fullName: true, email: true } }) : []
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]))

  // AI activity detail
  const aiActivity = await db.auditLog.findMany({
    where: { ...dateWhere, source: 'AI_GENERATED' },
    orderBy: { performedAt: 'desc' },
    take: 50,
    include: { performedBy: { select: { fullName: true, email: true } } },
  })

  return NextResponse.json({
    total,
    byTable: byTable.map((t) => ({ label: t.tableName, count: t._count })),
    byAction: byAction.map((a) => ({ label: a.action, count: a._count })),
    bySource: bySource.map((s) => ({ label: s.source, count: s._count })),
    byUser: byUser.map((u) => ({
      id: u.performedById,
      name: userMap[u.performedById || '']?.fullName || 'Sistem',
      email: userMap[u.performedById || '']?.email,
      count: u._count,
    })),
    aiActivity: aiActivity.map((a) => ({
      id: a.id,
      tableName: a.tableName,
      recordId: a.recordId,
      action: a.action,
      by: a.performedBy?.fullName,
      at: a.performedAt,
    })),
    dateRange: { from: from || null, to: to || null },
  })
}
