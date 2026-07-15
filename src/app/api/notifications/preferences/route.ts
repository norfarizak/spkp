import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, sanitizeText } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/notifications/preferences
export async function GET(req: NextRequest) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  const { session } = ctx

  let pref = await db.notificationPreference.findUnique({ where: { userId: session.userId } })
  if (!pref) {
    pref = await db.notificationPreference.create({ data: { userId: session.userId } })
  }
  return NextResponse.json({
    preference: {
      emailEnabled: pref.emailEnabled,
      inAppEnabled: pref.inAppEnabled,
      whatsappEnabled: pref.whatsappEnabled,
      pushEnabled: pref.pushEnabled,
      categories: pref.categories,
    },
  })
}

// PATCH /api/notifications/preferences
export async function PATCH(req: NextRequest) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  const { session } = ctx

  const body = await req.json().catch(() => ({} as any))
  const data: any = {}
  for (const k of ['emailEnabled', 'inAppEnabled', 'whatsappEnabled', 'pushEnabled']) {
    if (typeof body[k] === 'boolean') data[k] = body[k]
  }
  if (typeof body.categories === 'string') data.categories = sanitizeText(body.categories).slice(0, 500) || null

  const updated = await db.notificationPreference.upsert({
    where: { userId: session.userId },
    update: data,
    create: { userId: session.userId, ...data },
  })

  return NextResponse.json({ ok: true, preference: updated })
}
