import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, logAudit, sanitizeText } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })

  const { id } = await params
  const app = await db.accreditationApplication.findUnique({
    where: { id },
    include: {
      institution: { select: { id: true, name: true, code: true } },
      program: { select: { id: true, name: true, code: true, level: true } },
      applicant: { select: { id: true, fullName: true, email: true } },
      checklists: { orderBy: { createdAt: 'asc' } },
      audits: {
        orderBy: { scheduledAt: 'asc' },
        include: {
          auditor: { select: { id: true, fullName: true, email: true } },
          findings: {
            include: { auditor: { select: { fullName: true } } },
            orderBy: { createdAt: 'desc' },
          },
        },
      },
      certificates: { orderBy: { issuedAt: 'desc' } },
    },
  })
  if (!app) return NextResponse.json({ error: 'Permohonan tidak dijumpai' }, { status: 404 })

  return NextResponse.json({ item: app })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  const { user } = ctx

  const { id } = await params
  const body = await req.json().catch(() => ({} as any))
  const notes = sanitizeText(body.notes || '').trim()
  const auditDate = body.auditDate ? new Date(body.auditDate) : undefined
  const approvedAt = body.approvedAt ? new Date(body.approvedAt) : undefined
  const expiryDate = body.expiryDate ? new Date(body.expiryDate) : undefined

  const existing = await db.accreditationApplication.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Permohonan tidak dijumpai' }, { status: 404 })

  const updated = await db.accreditationApplication.update({
    where: { id },
    data: {
      ...(notes !== '' ? { notes } : {}),
      ...(auditDate ? { auditDate } : {}),
      ...(approvedAt ? { approvedAt } : {}),
      ...(expiryDate ? { expiryDate } : {}),
    },
  })

  await logAudit({
    tableName: 'accreditation_applications',
    recordId: id,
    action: 'UPDATE',
    oldValues: { notes: existing.notes, auditDate: existing.auditDate, approvedAt: existing.approvedAt, expiryDate: existing.expiryDate },
    newValues: { notes: updated.notes, auditDate: updated.auditDate, approvedAt: updated.approvedAt, expiryDate: updated.expiryDate },
    performedById: user.id,
    source: 'user',
  })

  return NextResponse.json({ id: updated.id, status: updated.status })
}
