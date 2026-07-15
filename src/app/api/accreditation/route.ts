import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, logAudit, sanitizeText, hasRole, ROLE_CODES } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/accreditation — list with filters
export async function GET(req: NextRequest) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  const { session } = ctx
  const url = new URL(req.url)
  const status = url.searchParams.get('status') || ''
  const type = url.searchParams.get('type') || ''
  const institutionId = url.searchParams.get('institutionId') || ''
  const q = url.searchParams.get('q') || ''

  const isAdminUser =
    hasRole(session, ROLE_CODES.SUPER_ADMIN, ROLE_CODES.ADMINISTRATOR) ||
    hasRole(session, ROLE_CODES.PENARAH, ROLE_CODES.TIMBALAN_PENARAH, ROLE_CODES.BAHAGIAN_KURIKULUM, ROLE_CODES.PEGAWAI_PENTAULIAHAN, ROLE_CODES.PEGAWAI_QA)

  const where: any = {}
  if (status) where.status = status
  if (type) where.type = type
  if (institutionId) where.institutionId = institutionId
  // Institution scoping for non-admins
  if (!isAdminUser && session.institutionId) {
    where.institutionId = session.institutionId
  }
  if (q) {
    where.OR = [
      { applicationCode: { contains: q } },
      { institution: { name: { contains: q } } },
      { program: { name: { contains: q } } },
      { program: { code: { contains: q } } },
    ]
  }

  const items = await db.accreditationApplication.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      institution: { select: { id: true, name: true, code: true } },
      program: { select: { id: true, name: true, code: true } },
      applicant: { select: { id: true, fullName: true, email: true } },
      _count: { select: { checklists: true, audits: true, certificates: true } },
    },
  })

  return NextResponse.json({
    items: items.map((a) => ({
      id: a.id,
      applicationCode: a.applicationCode,
      institutionId: a.institutionId,
      institutionName: a.institution?.name,
      programId: a.programId,
      programName: a.program?.name,
      programCode: a.program?.code,
      type: a.type,
      status: a.status,
      submittedAt: a.submittedAt,
      auditDate: a.auditDate,
      approvedAt: a.approvedAt,
      expiryDate: a.expiryDate,
      notes: a.notes,
      applicantName: a.applicant?.fullName,
      counts: { checklists: a._count.checklists, audits: a._count.audits, certificates: a._count.certificates },
    })),
  })
}

// POST /api/accreditation — create new application
export async function POST(req: NextRequest) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  const { user, session } = ctx

  const body = await req.json().catch(() => ({} as any))
  const institutionId = sanitizeText(body.institutionId || '').trim()
  const programId = sanitizeText(body.programId || '').trim() || null
  const type = sanitizeText(body.type || '').trim()
  const notes = sanitizeText(body.notes || '').trim()

  if (!institutionId) return NextResponse.json({ error: 'Institusi diperlukan' }, { status: 400 })
  if (!['Penuh', 'Sementara', 'Pembaharuan'].includes(type)) {
    return NextResponse.json({ error: 'Jenis pentauliahan tidak sah' }, { status: 400 })
  }

  // Verify institution exists
  const inst = await db.institution.findUnique({ where: { id: institutionId } })
  if (!inst) return NextResponse.json({ error: 'Institusi tidak dijumpai' }, { status: 404 })

  // Generate applicationCode (ACC-YYYYMM-XXX)
  const ym = new Date().toISOString().slice(0, 7).replace('-', '')
  const count = await db.accreditationApplication.count({
    where: { applicationCode: { startsWith: `ACC-${ym}-` } },
  })
  const applicationCode = `ACC-${ym}-${String(count + 1).padStart(3, '0')}`

  const created = await db.accreditationApplication.create({
    data: {
      applicationCode,
      institutionId,
      programId,
      applicantId: user.id,
      type,
      status: 'submitted',
      submittedAt: new Date(),
      notes: notes || null,
    },
  })

  // Auto-create a WorkflowInstance for this accreditation_application
  const slaDueAt = new Date()
  slaDueAt.setDate(slaDueAt.getDate() + 30) // 30-day default SLA
  await db.workflowInstance.create({
    data: {
      entityType: 'accreditation_application',
      entityId: created.id,
      currentStatus: 'submitted',
      currentOwnerId: user.id,
      slaDueAt,
      priority: 'normal',
    },
  })

  // Seed standard compliance checklist items (MQA requirements)
  const standardItems = [
    { item: 'Profil Institusi', requirement: 'Dokumen profil institusi dikemaskini' },
    { item: 'Kurikulum Program', requirement: 'Struktur kurikulum diluluskan oleh JPP' },
    { item: 'Fasiliti & Peralatan', requirement: 'Makmal/bengkel mencukupi & diselenggara' },
    { item: 'Tenaga Pengajar', requirement: 'Pengajar berkelayakan & sijil kompetensi' },
    { item: 'Pentaksiran', requirement: 'Prosedur pentaksiran & rubrik' },
    { item: 'Pengurusan Kualiti', requirement: 'Dasar kualiti & audit dalaman' },
    { item: 'Rekod Pelajar', requirement: 'Sistem maklumat pelajar' },
    { item: 'Komitmen Industri', requirement: 'Kerjasama dengan panel industri' },
  ]
  await db.complianceChecklist.createMany({
    data: standardItems.map((s) => ({
      applicationId: created.id,
      item: s.item,
      requirement: s.requirement,
      isMet: false,
    })),
  })

  await logAudit({
    tableName: 'accreditation_applications',
    recordId: created.id,
    action: 'INSERT',
    newValues: { applicationCode, institutionId, programId, type, status: 'submitted' },
    performedById: user.id,
    source: 'user',
  })

  // Notify accreditation officers
  const accredOfficers = await db.userRole.findMany({
    where: { role: { code: { in: [ROLE_CODES.PEGAWAI_PENTAULIAHAN, ROLE_CODES.PEGAWAI_QA, ROLE_CODES.ADMINISTRATOR] } } },
    include: { user: true },
  })
  for (const ur of accredOfficers) {
    await db.notification.create({
      data: {
        userId: ur.user.id,
        category: 'accreditation',
        title: 'Permohonan Pentauliahan Baru',
        message: `Permohonan ${applicationCode} (${inst.name}) telah dihantar oleh ${user.fullName}`,
        link: 'accreditation',
        priority: 'normal',
      },
    }).catch(() => null)
  }

  return NextResponse.json({ id: created.id, applicationCode: created.applicationCode, status: 'submitted' })
}
