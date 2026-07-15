import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/curriculum/[id]/history — version history via audit logs
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  const { id } = await params

  const program = await db.program.findUnique({ where: { id }, select: { id: true, code: true, name: true, version: true, status: true, createdById: true } })
  if (!program) return NextResponse.json({ error: 'Program tidak dijumpai' }, { status: 404 })

  // Audit logs for this program (any action)
  const logs = await db.auditLog.findMany({
    where: {
      OR: [
        { tableName: 'programs', recordId: id },
        { tableName: 'competency_units', recordId: { in: (await db.competencyUnit.findMany({ where: { programId: id }, select: { id: true } })).map((c) => c.id) } },
      ],
    },
    orderBy: { performedAt: 'desc' },
    include: { performedBy: { select: { id: true, fullName: true, email: true } } },
    take: 100,
  })

  const workflow = await db.workflowInstance.findFirst({
    where: { entityType: 'program', entityId: id },
    include: {
      transitions: {
        orderBy: { createdAt: 'desc' },
        include: { actionBy: { select: { id: true, fullName: true, email: true } } },
      },
    },
  })

  return NextResponse.json({ program, logs, workflow })
}
