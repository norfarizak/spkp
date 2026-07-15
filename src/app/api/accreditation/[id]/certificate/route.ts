import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, logAudit, sanitizeText, canApprove, pushNotification, ROLE_CODES } from '@/lib/auth'
import { db } from '@/lib/db'

// POST — generate a certificate when application is approved
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  const { user, session } = ctx

  // Only approvers can issue certificates
  if (!canApprove(session)) {
    return NextResponse.json({ error: 'Anda tidak dibenarkan menjana sijil' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json().catch(() => ({} as any))
  const signedBy = sanitizeText(body.signedBy || user.fullName).trim()
  const yearsValid = Number(body.yearsValid || 5)
  const instName = sanitizeText(body.institutionName || '').trim()
  const progName = sanitizeText(body.programName || '').trim()

  const app = await db.accreditationApplication.findUnique({
    where: { id },
    include: {
      institution: true,
      program: true,
      certificates: { where: { status: 'active' } },
    },
  })
  if (!app) return NextResponse.json({ error: 'Permohonan tidak dijumpai' }, { status: 404 })

  // Must be approved before generating certificate
  if (app.status !== 'approved') {
    return NextResponse.json({ error: 'Permohonan belum diluluskan' }, { status: 400 })
  }

  // Prevent duplicate active cert
  if (app.certificates.length > 0) {
    return NextResponse.json({ error: 'Sijil aktif telah wujud' }, { status: 400 })
  }

  // Generate certNumber: CERT-YYYY-XXXX
  const yr = new Date().getFullYear()
  const count = await db.certificate.count({
    where: { certNumber: { startsWith: `CERT-${yr}-` } },
  })
  const certNumber = `CERT-${yr}-${String(count + 1).padStart(4, '0')}`

  const issuedAt = new Date()
  const expiryDate = new Date()
  expiryDate.setFullYear(expiryDate.getFullYear() + yearsValid)

  const certificate = await db.certificate.create({
    data: {
      applicationId: id,
      certNumber,
      institutionName: instName || app.institution?.name || 'Institusi',
      programName: progName || app.program?.name || 'Program',
      type: app.type,
      issuedAt,
      expiryDate,
      status: 'active',
      signedBy,
    },
  })

  // Update application with approvedAt and expiryDate
  await db.accreditationApplication.update({
    where: { id },
    data: { approvedAt: new Date(), expiryDate },
  })

  await logAudit({
    tableName: 'certificates',
    recordId: certificate.id,
    action: 'INSERT',
    newValues: { certNumber, applicationId: id, expiryDate },
    performedById: user.id,
    source: 'user',
  })

  // Notify applicant
  if (app.applicantId) {
    await pushNotification({
      userId: app.applicantId,
      category: 'accreditation',
      title: 'Sijil Pentauliahan Dikeluarkan',
      message: `Sijil ${certNumber} telah dikeluarkan untuk permohonan ${app.applicationCode}. Sah sehingga ${expiryDate.toLocaleDateString('ms-MY')}.`,
      link: 'accreditation',
      priority: 'high',
    })
  }

  // Notify institution's accreditation officers
  const officers = await db.userRole.findMany({
    where: {
      role: { code: { in: [ROLE_CODES.PEGAWAI_PENTAULIAHAN, ROLE_CODES.PEGAWAI_QA] } },
      user: { institutionId: app.institutionId },
    },
    include: { user: true },
  })
  for (const o of officers) {
    await pushNotification({
      userId: o.user.id,
      category: 'accreditation',
      title: 'Sijil Pentauliahan Baru',
      message: `Sijil ${certNumber} (${app.institution?.name}) telah dikeluarkan`,
      link: 'accreditation',
      priority: 'normal',
    })
  }

  return NextResponse.json({ id: certificate.id, certNumber, expiryDate, issuedAt })
}
