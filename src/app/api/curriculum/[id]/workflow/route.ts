import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, logAudit, sanitizeText, canApprove, canCreateCurriculum } from '@/lib/auth'
import { db } from '@/lib/db'
import { pushNotification } from '@/lib/auth'

// POST /api/curriculum/[id]/workflow — submit / approve / reject / return / archive
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  const { user, session } = ctx
  const { id } = await params

  const body = await req.json().catch(() => ({} as any))
  const action = sanitizeText(body.action || '').toLowerCase() // submit | approve | reject | return | archive
  const remarks = sanitizeText(body.remarks || '').slice(0, 1000)

  if (!['submit', 'approve', 'reject', 'return', 'archive'].includes(action)) {
    return NextResponse.json({ error: 'Tindakan tidak sah' }, { status: 400 })
  }

  const program = await db.program.findUnique({ where: { id } })
  if (!program) return NextResponse.json({ error: 'Program tidak dijumpai' }, { status: 404 })

  const wf = await db.workflowInstance.findFirst({ where: { entityType: 'program', entityId: id } })
  if (!wf) return NextResponse.json({ error: 'Aliran kerja tidak dijumpai' }, { status: 404 })

  // Permission checks
  if (action === 'submit') {
    if (!canCreateCurriculum(session)) {
      return NextResponse.json({ error: 'Tidak dibenarkan menghantar' }, { status: 403 })
    }
    if (program.status !== 'draft' && program.status !== 'rejected' && program.status !== 'correction') {
      return NextResponse.json({ error: `Program dalam status ${program.status} tidak boleh dihantar` }, { status: 400 })
    }
  } else if (action === 'approve' || action === 'reject' || action === 'return') {
    if (!canApprove(session)) {
      return NextResponse.json({ error: 'Hanya pelulus dibenarkan' }, { status: 403 })
    }
    if (program.status !== 'review' && program.status !== 'submitted') {
      return NextResponse.json({ error: `Program dalam status ${program.status} tidak boleh diluluskan/ditolak` }, { status: 400 })
    }
  }

  // Determine new status
  let newStatus = program.status
  if (action === 'submit') newStatus = 'review'
  else if (action === 'approve') newStatus = 'approved'
  else if (action === 'reject') newStatus = 'rejected'
  else if (action === 'return') newStatus = 'correction'
  else if (action === 'archive') newStatus = 'archived'

  // Update program
  const updated = await db.program.update({
    where: { id },
    data: { status: newStatus },
  })

  // Update workflow instance
  await db.workflowInstance.update({
    where: { id: wf.id },
    data: {
      currentStatus: newStatus,
      currentOwnerId: action === 'submit' ? null : (action === 'approve' || action === 'reject' ? program.createdById : wf.currentOwnerId),
    },
  })

  // Record transition
  await db.workflowTransition.create({
    data: {
      workflowId: wf.id,
      fromStatus: program.status,
      toStatus: newStatus,
      actionById: user.id,
      action,
      remarks,
    },
  })

  await logAudit({
    tableName: 'programs',
    recordId: id,
    action: 'UPDATE',
    oldValues: { status: program.status },
    newValues: { status: newStatus, action, remarks },
    performedById: user.id,
    ipAddress: req.headers.get('x-forwarded-for') || undefined,
  })

  // Notify program creator
  const actionLabel: Record<string, string> = {
    submit: 'dihantar untuk semakan',
    approve: 'diluluskan',
    reject: 'ditolak',
    return: 'dikembalikan untuk pembetulan',
    archive: 'diarkibkan',
  }
  await pushNotification({
    userId: program.createdById,
    category: 'workflow',
    title: `Program ${program.code} - ${actionLabel[action]}`,
    message: `Program "${program.name}" telah ${actionLabel[action]} oleh ${user.fullName}.${remarks ? ` Catatan: ${remarks}` : ''}`,
    link: '/curriculum',
    priority: action === 'reject' ? 'high' : 'normal',
  })

  return NextResponse.json({ program: updated, status: newStatus })
}
