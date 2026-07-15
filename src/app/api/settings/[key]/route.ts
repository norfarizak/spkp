import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin, sanitizeText, logAudit } from '@/lib/auth'
import { db } from '@/lib/db'

// PATCH /api/settings/[key] - update single setting (admin only)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  if (!isAdmin(ctx.session)) return NextResponse.json({ error: 'Hanya pentadbir' }, { status: 403 })

  const { key } = await params
  const body = await req.json().catch(() => ({} as any))
  const value = sanitizeText(body.value)
  const category = body.category ? String(body.category) : undefined

  const existing = await db.systemSetting.findUnique({ where: { key } })
  if (!existing) return NextResponse.json({ error: 'Tetapan tidak dijumpai' }, { status: 404 })

  const data: any = { value }
  if (category) data.category = category

  const updated = await db.systemSetting.update({ where: { key }, data })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  await logAudit({
    tableName: 'system_settings',
    recordId: updated.id,
    action: 'UPDATE',
    oldValues: { key, value: existing.value },
    newValues: { key, value: updated.value, category: updated.category },
    performedById: ctx.user.id,
    ipAddress: ip,
  })

  return NextResponse.json({ ok: true, setting: updated })
}
