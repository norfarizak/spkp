import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

// PATCH /api/notifications/[id]/read — mark single as read
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  const { session } = ctx

  const { id } = await params
  // Ensure this notification belongs to current user
  const existing = await db.notification.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Notifikasi tidak dijumpai' }, { status: 404 })
  if (existing.userId !== session.userId) return NextResponse.json({ error: 'Tiada kebenaran' }, { status: 403 })

  await db.notification.update({ where: { id }, data: { isRead: true } })
  return NextResponse.json({ ok: true })
}
