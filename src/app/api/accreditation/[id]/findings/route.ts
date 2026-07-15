import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, logAudit, sanitizeText } from '@/lib/auth'
import { db } from '@/lib/db'

// POST — add a finding to an audit (auditId required in body)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  const { user } = ctx

  const { id } = await params
  const body = await req.json().catch(() => ({} as any))
  const auditId = sanitizeText(body.auditId || '').trim()
  const category = sanitizeText(body.category || '').trim()
  const description = sanitizeText(body.description || '').trim()
  const severity = sanitizeText(body.severity || 'medium').trim()
  const correctiveAction = sanitizeText(body.correctiveAction || '').trim()
  const dueDate = body.dueDate ? new Date(body.dueDate) : null

  if (!auditId) return NextResponse.json({ error: 'ID audit diperlukan' }, { status: 400 })
  if (!['Major', 'Minor', 'Observation'].includes(category)) {
    return NextResponse.json({ error: 'Kategori tidak sah' }, { status: 400 })
  }
  if (!description) return NextResponse.json({ error: 'Penerangan diperlukan' }, { status: 400 })

  // Verify audit belongs to this application
  const audit = await db.auditSchedule.findUnique({ where: { id: auditId } })
  if (!audit || audit.applicationId !== id) {
    return NextResponse.json({ error: 'Audit tidak dijumpai' }, { status: 404 })
  }

  const created = await db.auditFinding.create({
    data: {
      auditId,
      auditorId: audit.auditorId || user.id,
      category,
      description,
      severity,
      correctiveAction: correctiveAction || null,
      status: 'open',
      dueDate,
    },
  })

  await logAudit({
    tableName: 'audit_findings',
    recordId: created.id,
    action: 'INSERT',
    newValues: { auditId, category, severity, description },
    performedById: user.id,
    source: 'user',
  })

  return NextResponse.json({ id: created.id })
}

// PATCH — update finding status (resolve / in_progress)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  const { user } = ctx

  const { id } = await params
  const body = await req.json().catch(() => ({} as any))
  const findingId = sanitizeText(body.id || '').trim()
  const status = sanitizeText(body.status || '').trim()
  if (!findingId) return NextResponse.json({ error: 'ID penemuan diperlukan' }, { status: 400 })
  if (!['open', 'in_progress', 'resolved'].includes(status)) {
    return NextResponse.json({ error: 'Status tidak sah' }, { status: 400 })
  }

  // Verify finding belongs to this application via audit
  const finding = await db.auditFinding.findUnique({
    where: { id: findingId },
    include: { audit: true },
  })
  if (!finding || finding.audit.applicationId !== id) {
    return NextResponse.json({ error: 'Penemuan tidak dijumpai' }, { status: 404 })
  }

  const updated = await db.auditFinding.update({
    where: { id: findingId },
    data: {
      status,
      resolvedAt: status === 'resolved' ? new Date() : null,
    },
  })

  await logAudit({
    tableName: 'audit_findings',
    recordId: findingId,
    action: 'UPDATE',
    oldValues: { status: finding.status, resolvedAt: finding.resolvedAt },
    newValues: { status: updated.status, resolvedAt: updated.resolvedAt },
    performedById: user.id,
    source: 'user',
  })

  return NextResponse.json({ id: updated.id, status: updated.status })
}
