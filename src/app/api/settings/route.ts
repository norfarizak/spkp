import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin, sanitizeText, logAudit } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/settings - list all settings
export async function GET(req: NextRequest) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })

  const settings = await db.systemSetting.findMany({ orderBy: [{ category: 'asc' }, { key: 'asc' }] })

  // Group by category for nicer display
  const grouped: Record<string, any[]> = {}
  for (const s of settings) {
    const cat = s.category || 'general'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push({ id: s.id, key: s.key, value: s.value, category: cat, updatedAt: s.updatedAt })
  }

  return NextResponse.json({ settings, grouped, isAdmin: isAdmin(ctx.session) })
}

// POST /api/settings - create or update a setting (admin only)
export async function POST(req: NextRequest) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  if (!isAdmin(ctx.session)) return NextResponse.json({ error: 'Hanya pentadbir' }, { status: 403 })

  const body = await req.json().catch(() => ({} as any))
  const key = (body.key || '').toString().trim()
  const value = sanitizeText(body.value)
  const category = (body.category || 'general').toString()

  if (!key) return NextResponse.json({ error: 'Kunci diperlukan' }, { status: 400 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

  const existing = await db.systemSetting.findUnique({ where: { key } })
  let saved: any
  if (existing) {
    saved = await db.systemSetting.update({ where: { key }, data: { value, category } })
    await logAudit({
      tableName: 'system_settings',
      recordId: saved.id,
      action: 'UPDATE',
      oldValues: { key, value: existing.value },
      newValues: { key, value, category },
      performedById: ctx.user.id,
      ipAddress: ip,
    })
  } else {
    saved = await db.systemSetting.create({ data: { key, value, category } })
    await logAudit({
      tableName: 'system_settings',
      recordId: saved.id,
      action: 'INSERT',
      newValues: { key, value, category },
      performedById: ctx.user.id,
      ipAddress: ip,
    })
  }

  return NextResponse.json({ ok: true, setting: saved })
}

// PUT - alias of POST for update
export async function PUT(req: NextRequest) {
  return POST(req)
}
