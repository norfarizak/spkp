import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, logAudit, sanitizeText, canApprove, canCreateCurriculum, pushNotification } from '@/lib/auth'
import { db } from '@/lib/db'

// POST /api/wim/[id]/workflow — submit / approve / reject / return
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  const { user, session } = ctx
  const { id } = await params

  const body = await req.json().catch(() => ({} as any))
  const action = sanitizeText(body.action || '').toLowerCase()
  const remarks = sanitizeText(body.remarks || '').slice(0, 1000)

  if (!['submit', 'approve', 'reject', 'return', 'archive'].includes(action)) {
    return NextResponse.json({ error: 'Tindakan tidak sah' }, { status: 400 })
  }

  const wim = await db.wimDocument.findUnique({ where: { id } })
  if (!wim) return NextResponse.json({ error: 'WIM tidak dijumpai' }, { status: 404 })

  const wf = await db.workflowInstance.findFirst({ where: { entityType: 'wim_document', entityId: id } })
  if (!wf) return NextResponse.json({ error: 'Aliran kerja tidak dijumpai' }, { status: 404 })

  if (action === 'submit') {
    if (!canCreateCurriculum(session)) {
      return NextResponse.json({ error: 'Tidak dibenarkan menghantar' }, { status: 403 })
    }
    if (wim.status !== 'draft' && wim.status !== 'rejected' && wim.status !== 'correction') {
      return NextResponse.json({ error: `WIM dalam status ${wim.status} tidak boleh dihantar` }, { status: 400 })
    }
  } else if (action === 'approve' || action === 'reject' || action === 'return') {
    if (!canApprove(session)) {
      return NextResponse.json({ error: 'Hanya pelulus dibenarkan' }, { status: 403 })
    }
    if (wim.status !== 'review' && wim.status !== 'submitted') {
      return NextResponse.json({ error: `WIM dalam status ${wim.status} tidak boleh diluluskan/ditolak` }, { status: 400 })
    }
  }

  let newStatus = wim.status
  if (action === 'submit') newStatus = 'review'
  else if (action === 'approve') newStatus = 'approved'
  else if (action === 'reject') newStatus = 'rejected'
  else if (action === 'return') newStatus = 'correction'
  else if (action === 'archive') newStatus = 'archived'

  const updated = await db.wimDocument.update({
    where: { id },
    data: { status: newStatus },
  })

  await db.workflowInstance.update({
    where: { id: wf.id },
    data: {
      currentStatus: newStatus,
      currentOwnerId: action === 'submit' ? null : (action === 'approve' || action === 'reject' ? wim.authorId : wf.currentOwnerId),
    },
  })

  await db.workflowTransition.create({
    data: {
      workflowId: wf.id,
      fromStatus: wim.status,
      toStatus: newStatus,
      actionById: user.id,
      action,
      remarks,
    },
  })

  await logAudit({
    tableName: 'wim_documents',
    recordId: id,
    action: 'UPDATE',
    oldValues: { status: wim.status },
    newValues: { status: newStatus, action, remarks },
    performedById: user.id,
    ipAddress: req.headers.get('x-forwarded-for') || undefined,
  })

  const actionLabel: Record<string, string> = {
    submit: 'dihantar untuk semakan',
    approve: 'diluluskan',
    reject: 'ditolak',
    return: 'dikembalikan untuk pembetulan',
    archive: 'diarkibkan',
  }
  await pushNotification({
    userId: wim.authorId,
    category: 'workflow',
    title: `WIM ${wim.code} - ${actionLabel[action]}`,
    message: `Dokumen WIM "${wim.title}" telah ${actionLabel[action]} oleh ${user.fullName}.${remarks ? ` Catatan: ${remarks}` : ''}`,
    link: '/wim',
    priority: action === 'reject' ? 'high' : 'normal',
  })

  return NextResponse.json({ wim: updated, status: newStatus })
}
