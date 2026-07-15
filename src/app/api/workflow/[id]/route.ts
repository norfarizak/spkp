import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })

  const { id } = await params
  const wf = await db.workflowInstance.findUnique({
    where: { id },
    include: {
      currentOwner: { select: { id: true, fullName: true, email: true } },
      transitions: {
        orderBy: { createdAt: 'asc' },
        include: {
          actionBy: { select: { id: true, fullName: true, email: true } },
        },
      },
    },
  })
  if (!wf) return NextResponse.json({ error: 'Aliran kerja tidak dijumpai' }, { status: 404 })

  return NextResponse.json({
    item: {
      id: wf.id,
      entityType: wf.entityType,
      entityId: wf.entityId,
      currentStatus: wf.currentStatus,
      currentOwner: wf.currentOwner,
      currentOwnerId: wf.currentOwnerId,
      slaDueAt: wf.slaDueAt,
      priority: wf.priority,
      createdAt: wf.createdAt,
      updatedAt: wf.updatedAt,
      transitions: wf.transitions.map((t) => ({
        id: t.id,
        fromStatus: t.fromStatus,
        toStatus: t.toStatus,
        action: t.action,
        remarks: t.remarks,
        createdAt: t.createdAt,
        actionBy: t.actionBy ? { id: t.actionBy.id, fullName: t.actionBy.fullName } : null,
      })),
    },
  })
}
