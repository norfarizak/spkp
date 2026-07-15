import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, logAudit, sanitizeText, canApprove, pushNotification } from '@/lib/auth'
import { db } from '@/lib/db'

// Workflow status mapping per entity type.
// Generic: draft → review → approved (or rejected/correction/archived at review)
// Accreditation: submitted → self_assessment → audit → review → approved/rejected
const ENTITY_TRANSITIONS: Record<string, Record<string, { to: string; needApprover?: boolean }[]>> = {
  program: {
    draft:     [{ to: 'review' }],
    correction:[{ to: 'review' }],
    review:    [
      { to: 'approved', needApprover: true },
      { to: 'rejected', needApprover: true },
      { to: 'correction', needApprover: true },
    ],
    approved:  [{ to: 'archived' }],
    rejected:  [{ to: 'draft' }],
  },
  wim_document: {
    draft:     [{ to: 'review' }],
    correction:[{ to: 'review' }],
    review:    [
      { to: 'approved', needApprover: true },
      { to: 'rejected', needApprover: true },
      { to: 'correction', needApprover: true },
    ],
    approved:  [{ to: 'archived' }],
    rejected:  [{ to: 'draft' }],
  },
  accreditation_application: {
    submitted:        [{ to: 'self_assessment' }],
    self_assessment:  [{ to: 'audit' }, { to: 'submitted' }],
    audit:            [{ to: 'review' }, { to: 'self_assessment' }],
    review:           [
      { to: 'approved', needApprover: true },
      { to: 'rejected', needApprover: true },
      { to: 'self_assessment', needApprover: true },
    ],
    rejected:         [{ to: 'submitted' }],
  },
}

const ACTION_TO_NEXT: Record<string, string> = {
  submit: 'next',
  approve: 'approved',
  reject: 'rejected',
  return: 'correction',
  archive: 'archived',
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
  const nextOwnerId = sanitizeText(body.nextOwnerId || '').trim() || null

  if (!['submit', 'approve', 'reject', 'return', 'archive'].includes(action)) {
    return NextResponse.json({ error: 'Aksi tidak sah' }, { status: 400 })
  }

  const wf = await db.workflowInstance.findUnique({
    where: { id },
    include: { currentOwner: true },
  })
  if (!wf) return NextResponse.json({ error: 'Aliran kerja tidak dijumpai' }, { status: 404 })

  const entityTransitions = ENTITY_TRANSITIONS[wf.entityType] || ENTITY_TRANSITIONS.program
  const fromStatus = wf.currentStatus
  const allowed = entityTransitions[fromStatus] || []

  // Determine next status based on action
  let nextStatus: string | null = null
  let needApprover = false

  if (action === 'archive') {
    // Archive can always be done on approved items
    if (fromStatus === 'approved') {
      nextStatus = 'archived'
    }
  } else if (action === 'approve') {
    const t = allowed.find((x) => x.to === 'approved')
    if (t) { nextStatus = 'approved'; needApprover = !!t.needApprover }
  } else if (action === 'reject') {
    const t = allowed.find((x) => x.to === 'rejected')
    if (t) { nextStatus = 'rejected'; needApprover = !!t.needApprover }
  } else if (action === 'return') {
    // For program/wim: review → correction; for accreditation: review → self_assessment
    const t = allowed.find((x) => ['correction', 'self_assessment', 'submitted'].includes(x.to))
    if (t) { nextStatus = t.to; needApprover = !!t.needApprover }
  } else if (action === 'submit') {
    // Move to next stage (first non-approver-required transition)
    const t = allowed.find((x) => !x.needApprover)
    if (t) { nextStatus = t.to }
  }

  if (!nextStatus) {
    return NextResponse.json({
      error: `Aksi "${action}" tidak dibenarkan untuk status "${fromStatus}" (${wf.entityType})`,
    }, { status: 400 })
  }

  if (needApprover && !canApprove(session)) {
    return NextResponse.json({ error: 'Anda tidak mempunyai kuasa kelulusan' }, { status: 403 })
  }

  const oldOwnerId = wf.currentOwnerId

  // Update workflow instance
  const updated = await db.workflowInstance.update({
    where: { id },
    data: {
      currentStatus: nextStatus,
      currentOwnerId: nextOwnerId || oldOwnerId,
    },
  })

  // Create transition record
  await db.workflowTransition.create({
    data: {
      workflowId: id,
      fromStatus,
      toStatus: nextStatus,
      actionById: user.id,
      action,
      remarks: remarks || null,
    },
  })

  // Sync linked entity status if accreditation
  if (wf.entityType === 'accreditation_application') {
    await db.accreditationApplication.update({
      where: { id: wf.entityId },
      data: { status: nextStatus },
    }).catch(() => null)
  } else if (wf.entityType === 'program') {
    await db.program.update({
      where: { id: wf.entityId },
      data: { status: nextStatus },
    }).catch(() => null)
  } else if (wf.entityType === 'wim_document') {
    await db.wimDocument.update({
      where: { id: wf.entityId },
      data: { status: nextStatus },
    }).catch(() => null)
  }

  await logAudit({
    tableName: 'workflow_instances',
    recordId: id,
    action: 'UPDATE',
    oldValues: { currentStatus: fromStatus, currentOwnerId: oldOwnerId },
    newValues: { currentStatus: nextStatus, currentOwnerId: updated.currentOwnerId, action, remarks },
    performedById: user.id,
    source: 'user',
  })

  // Auto-notification (FR-M7-03) to next owner if specified & different from actor
  if (nextOwnerId && nextOwnerId !== user.id) {
    const labels: Record<string, string> = {
      submit: 'Dihantar ke peringkat seterusnya',
      approve: 'Diluluskan',
      reject: 'Ditolak',
      return: 'Dipulangkan untuk pembetulan',
      archive: 'Diarkibkan',
    }
    await pushNotification({
      userId: nextOwnerId,
      category: 'workflow',
      title: `Tugasan Aliran Kerja Baru (${wf.entityType.replace('_', ' ')})`,
      message: `${labels[action] || action}: ${fromStatus} → ${nextStatus}.${remarks ? ` Catatan: ${remarks}` : ''}`,
      link: 'workflow',
      priority: action === 'approve' || action === 'reject' ? 'high' : 'normal',
    })
  }

  // Also notify original owner if action was taken by someone else (e.g. approver returned/rejected)
  if (oldOwnerId && oldOwnerId !== user.id && oldOwnerId !== nextOwnerId && (action === 'reject' || action === 'return')) {
    await pushNotification({
      userId: oldOwnerId,
      category: 'workflow',
      title: `Aliran Kerja ${action === 'reject' ? 'Ditolak' : 'Dipulangkan'}`,
      message: `${wf.entityType.replace('_', ' ')} (${fromStatus} → ${nextStatus}).${remarks ? ` Catatan: ${remarks}` : ''}`,
      link: 'workflow',
      priority: 'high',
    })
  }

  return NextResponse.json({ id: updated.id, currentStatus: updated.currentStatus, action })
}
