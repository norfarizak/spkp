import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, logAudit, sanitizeText, canApprove, pushNotification, hasRole, ROLE_CODES } from '@/lib/auth'
import { db } from '@/lib/db'

// Workflow: submitted -> self_assessment -> audit -> review -> approved/rejected
// Allowed transitions & required role per stage
const TRANSITIONS: Record<string, { to: string; action: string; needApprover?: boolean }[]> = {
  submitted:        [{ to: 'self_assessment', action: 'submit' }],
  self_assessment:  [{ to: 'audit', action: 'submit' }, { to: 'submitted', action: 'return' }],
  audit:            [{ to: 'review', action: 'submit' }, { to: 'self_assessment', action: 'return' }],
  review:           [
    { to: 'approved', action: 'approve', needApprover: true },
    { to: 'rejected', action: 'reject', needApprover: true },
    { to: 'self_assessment', action: 'return', needApprover: true },
  ],
  approved:         [],
  rejected:         [{ to: 'submitted', action: 'submit' }],
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  const { user, session } = ctx

  const { id } = await params
  const body = await req.json().catch(() => ({} as any))
  const action = sanitizeText(body.action || '').trim()
  const remarks = sanitizeText(body.remarks || '').trim()
  if (!action) return NextResponse.json({ error: 'Aksi diperlukan' }, { status: 400 })

  const app = await db.accreditationApplication.findUnique({
    where: { id },
    include: { institution: true },
  })
  if (!app) return NextResponse.json({ error: 'Permohonan tidak dijumpai' }, { status: 404 })

  const allowed = TRANSITIONS[app.status] || []
  const transition = allowed.find((t) => t.action === action)
  if (!transition) {
    return NextResponse.json({ error: `Aksi "${action}" tidak dibenarkan pada status "${app.status}"` }, { status: 400 })
  }

  // Approval / reject / return requires canApprove(session)
  if (transition.needApprover && !canApprove(session)) {
    return NextResponse.json({ error: 'Anda tidak mempunyai kuasa kelulusan' }, { status: 403 })
  }

  const oldStatus = app.status
  const newStatus = transition.to

  // Update application status
  const updated = await db.accreditationApplication.update({
    where: { id },
    data: { status: newStatus },
  })

  // Update workflow instance for this application
  const wf = await db.workflowInstance.findFirst({
    where: { entityType: 'accreditation_application', entityId: id },
  })
  if (wf) {
    await db.workflowInstance.update({
      where: { id: wf.id },
      data: { currentStatus: newStatus, currentOwnerId: user.id },
    })
    await db.workflowTransition.create({
      data: {
        workflowId: wf.id,
        fromStatus: oldStatus,
        toStatus: newStatus,
        actionById: user.id,
        action,
        remarks: remarks || null,
      },
    })
  }

  await logAudit({
    tableName: 'accreditation_applications',
    recordId: id,
    action: 'UPDATE',
    oldValues: { status: oldStatus },
    newValues: { status: newStatus, action, remarks },
    performedById: user.id,
    source: 'user',
  })

  // Notify applicant
  if (app.applicantId) {
    const labels: Record<string, string> = {
      submit: 'Dihantar ke peringkat seterusnya',
      approve: 'Diluluskan',
      reject: 'Ditolak',
      return: 'Dipulangkan untuk pembetulan',
    }
    await pushNotification({
      userId: app.applicantId,
      category: 'workflow',
      title: `Kemas Kini Pentauliahan: ${app.applicationCode}`,
      message: `Status permohonan kini: ${newStatus.toUpperCase()} — ${labels[action] || action}.${remarks ? ` Catatan: ${remarks}` : ''}`,
      link: 'accreditation',
      priority: newStatus === 'approved' || newStatus === 'rejected' ? 'high' : 'normal',
    })
  }

  // Notify QA/accreditation officers on approval
  if (newStatus === 'approved') {
    const officers = await db.userRole.findMany({
      where: { role: { code: { in: [ROLE_CODES.PEGAWAI_PENTAULIAHAN, ROLE_CODES.PEGAWAI_QA] } } },
      include: { user: true },
    })
    for (const o of officers) {
      await pushNotification({
        userId: o.user.id,
        category: 'accreditation',
        title: 'Permohonan Pentauliahan Diluluskan',
        message: `${app.applicationCode} (${app.institution?.name}) telah diluluskan. Sijil boleh dijana sekarang.`,
        link: 'accreditation',
        priority: 'high',
      })
    }
  }

  return NextResponse.json({ id: updated.id, status: newStatus })
}
