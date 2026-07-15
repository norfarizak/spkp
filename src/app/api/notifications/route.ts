import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, sanitizeText, isAdmin, pushNotification } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/notifications?category=&isRead=
export async function GET(req: NextRequest) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  const { session } = ctx

  const url = req.nextUrl
  const category = url.searchParams.get('category') || ''
  const isRead = url.searchParams.get('isRead')

  const where: any = { userId: session.userId }
  if (category) where.category = category
  if (isRead === 'true') where.isRead = true
  if (isRead === 'false') where.isRead = false

  const items = await db.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  const stats = await db.notification.groupBy({
    by: ['category'],
    _count: true,
    where: { userId: session.userId },
  })

  const unread = await db.notification.count({
    where: { userId: session.userId, isRead: false },
  })

  return NextResponse.json({
    items: items.map((n) => ({
      id: n.id,
      category: n.category,
      title: n.title,
      message: n.message,
      link: n.link,
      isRead: n.isRead,
      priority: n.priority,
      createdAt: n.createdAt,
    })),
    stats: stats.map((s) => ({ category: s.category, count: s._count })),
    unread,
    canTestPush: isAdmin(session),
  })
}

// POST — send a test notification (admin only)
export async function POST(req: NextRequest) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  const { user, session } = ctx

  if (!isAdmin(session)) {
    return NextResponse.json({ error: 'Hanya pentadbir boleh menghantar notifikasi ujian' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({} as any))
  const title = sanitizeText(body.title || 'Notifikasi Ujian').slice(0, 200)
  const message = sanitizeText(body.message || 'Ini adalah notifikasi ujian dari sistem.').slice(0, 1000)
  const category = sanitizeText(body.category || 'system').slice(0, 50)
  const priority = sanitizeText(body.priority || 'normal').slice(0, 20)
  const targetUserId = body.targetUserId ? sanitizeText(body.targetUserId) : user.id

  // If admin wants to broadcast to all users in their institution (or all if super admin)
  let count = 0
  if (body.broadcast) {
    const users = await db.user.findMany({
      where: session.institutionId && !hasSuperAdmin(session) ? { institutionId: session.institutionId } : {},
      select: { id: true },
    })
    for (const u of users) {
      await pushNotification({ userId: u.id, category, title, message, priority })
      count++
    }
  } else {
    await pushNotification({ userId: targetUserId, category, title, message, priority })
    count = 1
  }

  return NextResponse.json({ ok: true, sent: count })
}

function hasSuperAdmin(session: any) {
  return session.roleCodes.includes('SUPER_ADMIN')
}
