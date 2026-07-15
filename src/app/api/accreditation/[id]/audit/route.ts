import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, logAudit, sanitizeText, pushNotification, hasRole, ROLE_CODES } from '@/lib/auth'
import { db } from '@/lib/db'

// GET — list audits for this application
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })

  const { id } = await params
  const audits = await db.auditSchedule.findMany({
    where: { applicationId: id },
    orderBy: { scheduledAt: 'asc' },
    include: {
      auditor: { select: { id: true, fullName: true, email: true } },
      findings: {
        include: { auditor: { select: { fullName: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  })
  return NextResponse.json({ items: audits })
}

// POST — schedule a new audit
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  const { user, session } = ctx

  // Only accreditation officers, QA, auditors and admins can schedule audits
  const allowed = hasRole(session, ROLE_CODES.SUPER_ADMIN, ROLE_CODES.ADMINISTRATOR, ROLE_CODES.PEGAWAI_PENTAULIAHAN, ROLE_CODES.PEGAWAI_QA, ROLE_CODES.AUDITOR, ROLE_CODES.PENARAH, ROLE_CODES.TIMBALAN_PENARAH)
  if (!allowed) {
    return NextResponse.json({ error: 'Anda tidak dibenarkan menjadualkan audit' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json().catch(() => ({} as any))
  const auditorId = sanitizeText(body.auditorId || '').trim() || null
  const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null
  const location = sanitizeText(body.location || '').trim()
  if (!scheduledAt) return NextResponse.json({ error: 'Tarikh audit diperlukan' }, { status: 400 })

  const app = await db.accreditationApplication.findUnique({ where: { id } })
  if (!app) return NextResponse.json({ error: 'Permohonan tidak dijumpai' }, { status: 404 })

  const created = await db.auditSchedule.create({
    data: {
      applicationId: id,
      auditorId,
      scheduledAt,
      location: location || null,
      status: 'scheduled',
    },
  })

  // Update application: status -> audit, auditDate
  await db.accreditationApplication.update({
    where: { id },
    data: { auditDate: scheduledAt, status: 'audit' },
  })

  await logAudit({
    tableName: 'audit_schedules',
    recordId: created.id,
    action: 'INSERT',
    newValues: { applicationId: id, auditorId, scheduledAt, location },
    performedById: user.id,
    source: 'user',
  })

  // Notify auditor if assigned
  if (auditorId) {
    await pushNotification({
      userId: auditorId,
      category: 'accreditation',
      title: 'Audit Pentauliahan Dijadualkan',
      message: `Audit untuk ${app.applicationCode} telah dijadualkan pada ${scheduledAt.toLocaleDateString('ms-MY')}${location ? ` di ${location}` : ''}`,
      link: 'accreditation',
      priority: 'high',
    })
  }

  return NextResponse.json({ id: created.id, status: 'scheduled' })
}
