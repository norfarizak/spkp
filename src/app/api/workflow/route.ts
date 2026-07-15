import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/workflow — list workflow instances with filters
export async function GET(req: NextRequest) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  const { session } = ctx

  const url = new URL(req.url)
  const entityType = url.searchParams.get('entityType') || ''
  const currentStatus = url.searchParams.get('currentStatus') || ''
  const priority = url.searchParams.get('priority') || ''
  const overdue = url.searchParams.get('overdue') || ''
  const mineOnly = url.searchParams.get('mineOnly') === '1'

  const where: any = {}
  if (entityType) where.entityType = entityType
  if (currentStatus) where.currentStatus = currentStatus
  if (priority) where.priority = priority
  if (mineOnly) where.currentOwnerId = session.userId
  if (overdue === '1') {
    where.slaDueAt = { lt: new Date() }
    where.currentStatus = { notIn: ['approved', 'rejected', 'archived'] }
  }

  const items = await db.workflowInstance.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    take: 200,
    include: {
      currentOwner: { select: { id: true, fullName: true, email: true } },
      _count: { select: { transitions: true } },
    },
  })

  const now = new Date()
  return NextResponse.json({
    items: items.map((w) => {
      const isOverdue = w.slaDueAt && w.slaDueAt < now && !['approved', 'rejected', 'archived'].includes(w.currentStatus)
      const within24h = w.slaDueAt && !isOverdue && (w.slaDueAt.getTime() - now.getTime()) < 24 * 3600 * 1000
      return {
        id: w.id,
        entityType: w.entityType,
        entityId: w.entityId,
        currentStatus: w.currentStatus,
        currentOwner: w.currentOwner ? { id: w.currentOwner.id, fullName: w.currentOwner.fullName } : null,
        currentOwnerId: w.currentOwnerId,
        slaDueAt: w.slaDueAt,
        priority: w.priority,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
        isOverdue: !!isOverdue,
        within24h: !!within24h,
        transitionCount: w._count.transitions,
      }
    }),
  })
}
