import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })

  const { session } = ctx
  const isAdmin = session.roleCodes.includes('SUPER_ADMIN') || session.roleCodes.includes('ADMINISTRATOR')
  const institutionFilter = isAdmin ? {} : session.institutionId ? { institutionId: session.institutionId } : { id: 'none' }

  // Counts
  const [programs, cu, wim, noss, accreds, experts, users, workflows, docs, certs, auditLogs, notifications] = await Promise.all([
    db.program.count({ where: isAdmin ? {} : institutionFilter }),
    db.competencyUnit.count(),
    db.wimDocument.count(),
    db.nossLibrary.count(),
    db.accreditationApplication.count(),
    db.expert.count(),
    db.user.count(),
    db.workflowInstance.count({ where: { currentStatus: { in: ['draft', 'review'] } } }),
    db.document.count(),
    db.certificate.count({ where: { status: 'active' } }),
    db.auditLog.count(),
    db.notification.count({ where: { userId: session.userId, isRead: false } }),
  ])

  // Program status breakdown
  const programStatus = await db.program.groupBy({
    by: ['status'],
    _count: true,
    where: isAdmin ? {} : institutionFilter,
  })

  // WIM status breakdown
  const wimStatus = await db.wimDocument.groupBy({ by: ['status'], _count: true })

  // Accreditation status breakdown
  const accredStatus = await db.accreditationApplication.groupBy({ by: ['status'], _count: true })

  // Workflow by status
  const wfStatus = await db.workflowInstance.groupBy({ by: ['currentStatus'], _count: true })

  // Pending tasks (workflow instances assigned to user or awaiting action)
  const pendingTasks = await db.workflowInstance.findMany({
    where: {
      currentStatus: { in: ['draft', 'review', 'correction', 'self_assessment', 'audit'] },
      ...(isAdmin ? {} : { currentOwnerId: session.userId }),
    },
    take: 8,
    orderBy: { slaDueAt: 'asc' },
    include: { currentOwner: { select: { fullName: true } } },
  })

  // Recent audit logs
  const recentAudit = await db.auditLog.findMany({
    take: 8,
    orderBy: { performedAt: 'desc' },
    include: { performedBy: { select: { fullName: true, email: true } } },
  })

  // Recent notifications for this user
  const recentNotifs = await db.notification.findMany({
    where: { userId: session.userId },
    take: 6,
    orderBy: { createdAt: 'desc' },
  })

  // Programs by institution (for executive view)
  const programsByInst = await db.program.groupBy({
    by: ['institutionId'],
    _count: true,
    where: isAdmin ? {} : institutionFilter,
  })
  const instIds = programsByInst.map((p) => p.institutionId).filter(Boolean) as string[]
  const institutions = instIds.length ? await db.institution.findMany({ where: { id: { in: instIds } } }) : []
  const instMap = Object.fromEntries(institutions.map((i) => [i.id, i]))

  // Monthly trend (last 6 months) - using audit log as proxy
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  const recentAudits = await db.auditLog.findMany({
    where: { performedAt: { gte: sixMonthsAgo } },
    select: { performedAt: true, action: true },
  })
  const monthMap: Record<string, { insert: number; update: number; delete: number }> = {}
  for (const a of recentAudits) {
    const m = a.performedAt.toISOString().slice(0, 7)
    if (!monthMap[m]) monthMap[m] = { insert: 0, update: 0, delete: 0 }
    const act = a.action.toLowerCase() as 'insert' | 'update' | 'delete'
    if (act === 'insert') monthMap[m].insert++
    else if (act === 'update') monthMap[m].update++
    else if (act === 'delete') monthMap[m].delete++
  }
  const trend = Object.entries(monthMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, v]) => ({ month, ...v }))

  // Certificates expiring within 90 days
  const soon = new Date()
  soon.setDate(soon.getDate() + 90)
  const expiringCerts = await db.certificate.count({
    where: { status: 'active', expiryDate: { lte: soon, gte: new Date() } },
  })

  return NextResponse.json({
    counts: {
      programs, cu, wim, noss, accreds, experts, users, workflows, docs, certs, auditLogs, unreadNotifs: notifications,
      expiringCerts,
    },
    programStatus: programStatus.map((p) => ({ status: p.status, count: p._count })),
    wimStatus: wimStatus.map((w) => ({ status: w.status, count: w._count })),
    accredStatus: accredStatus.map((a) => ({ status: a.status, count: a._count })),
    wfStatus: wfStatus.map((w) => ({ status: w.currentStatus, count: w._count })),
    pendingTasks: pendingTasks.map((t) => ({
      id: t.id,
      entityType: t.entityType,
      entityId: t.entityId,
      status: t.currentStatus,
      priority: t.priority,
      slaDueAt: t.slaDueAt,
      owner: t.currentOwner?.fullName,
    })),
    recentAudit: recentAudit.map((a) => ({
      id: a.id,
      table: a.tableName,
      action: a.action,
      by: a.performedBy?.fullName,
      byEmail: a.performedBy?.email,
      at: a.performedAt,
      source: a.source,
    })),
    recentNotifs: recentNotifs.map((n) => ({
      id: n.id, title: n.title, message: n.message, category: n.category, isRead: n.isRead, priority: n.priority, createdAt: n.createdAt,
    })),
    programsByInst: programsByInst.map((p) => ({
      institution: instMap[p.institutionId || '']?.name || 'Tidak diketahui',
      code: instMap[p.institutionId || '']?.code || '-',
      count: p._count,
    })),
    trend,
    isAdmin,
    roleCodes: session.roleCodes,
  })
}
