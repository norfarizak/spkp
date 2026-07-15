import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, logAudit, sanitizeText } from '@/lib/auth'
import { db } from '@/lib/db'

// POST — add a new checklist item
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  const { user } = ctx

  const { id } = await params
  const body = await req.json().catch(() => ({} as any))
  const item = sanitizeText(body.item || '').trim()
  const requirement = sanitizeText(body.requirement || '').trim()
  if (!item) return NextResponse.json({ error: 'Item diperlukan' }, { status: 400 })

  const app = await db.accreditationApplication.findUnique({ where: { id } })
  if (!app) return NextResponse.json({ error: 'Permohonan tidak dijumpai' }, { status: 404 })

  const created = await db.complianceChecklist.create({
    data: { applicationId: id, item, requirement: requirement || '', isMet: false },
  })

  await logAudit({
    tableName: 'compliance_checklists',
    recordId: created.id,
    action: 'INSERT',
    newValues: { applicationId: id, item, requirement },
    performedById: user.id,
    source: 'user',
  })

  return NextResponse.json({ id: created.id })
}

// PATCH — update existing checklist item (isMet, evidence, remarks)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  const { user } = ctx

  const { id } = await params
  const body = await req.json().catch(() => ({} as any))
  const checklistId = sanitizeText(body.id || '').trim()
  if (!checklistId) return NextResponse.json({ error: 'ID item diperlukan' }, { status: 400 })

  const existing = await db.complianceChecklist.findUnique({ where: { id: checklistId } })
  if (!existing || existing.applicationId !== id) {
    return NextResponse.json({ error: 'Item tidak dijumpai' }, { status: 404 })
  }

  const data: any = {}
  if (typeof body.isMet === 'boolean') data.isMet = body.isMet
  if (typeof body.evidence === 'string') data.evidence = sanitizeText(body.evidence).trim() || null
  if (typeof body.remarks === 'string') data.remarks = sanitizeText(body.remarks).trim() || null

  const updated = await db.complianceChecklist.update({
    where: { id: checklistId },
    data,
  })

  await logAudit({
    tableName: 'compliance_checklists',
    recordId: checklistId,
    action: 'UPDATE',
    oldValues: { isMet: existing.isMet, evidence: existing.evidence, remarks: existing.remarks },
    newValues: { isMet: updated.isMet, evidence: updated.evidence, remarks: updated.remarks },
    performedById: user.id,
    source: 'user',
  })

  return NextResponse.json({ id: updated.id, isMet: updated.isMet })
}
