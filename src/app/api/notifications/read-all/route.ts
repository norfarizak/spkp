import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

// POST /api/notifications/read-all — mark all current user's notifications as read
export async function POST(req: NextRequest) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  const { session } = ctx

  const r = await db.notification.updateMany({
    where: { userId: session.userId, isRead: false },
    data: { isRead: true },
  })

  return NextResponse.json({ ok: true, updated: r.count })
}
