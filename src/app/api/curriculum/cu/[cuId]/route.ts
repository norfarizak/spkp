import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, logAudit, sanitizeText, canCreateCurriculum } from '@/lib/auth'
import { db } from '@/lib/db'

// PATCH /api/curriculum/cu/[cuId] — update CU fields
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ cuId: string }> }) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  const { user, session } = ctx
  const { cuId } = await params

  if (!canCreateCurriculum(session)) {
    return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 403 })
  }

  const cu = await db.competencyUnit.findUnique({ where: { id: cuId } })
  if (!cu) return NextResponse.json({ error: 'CU tidak dijumpai' }, { status: 404 })

  const body = await req.json().catch(() => ({} as any))
  const data: any = {}

  if (body.title !== undefined) data.title = sanitizeText(body.title).slice(0, 300)
  if (body.learningOutcome !== undefined) data.learningOutcome = sanitizeText(body.learningOutcome).slice(0, 2000) || null
  if (body.performanceCriteria !== undefined) data.performanceCriteria = sanitizeText(body.performanceCriteria).slice(0, 4000) || null
  if (body.knowledge !== undefined) data.knowledge = sanitizeText(body.knowledge).slice(0, 2000) || null
  if (body.skill !== undefined) data.skill = sanitizeText(body.skill).slice(0, 2000) || null
  if (body.attitude !== undefined) data.attitude = sanitizeText(body.attitude).slice(0, 1000) || null
  if (body.toolsEquipment !== undefined) data.toolsEquipment = sanitizeText(body.toolsEquipment).slice(0, 2000) || null
  if (body.creditHour !== undefined) data.creditHour = Number(body.creditHour) || 0
  if (body.status !== undefined) data.status = sanitizeText(body.status).slice(0, 30) || 'draft'
  if (body.moduleId !== undefined) {
    data.moduleId = sanitizeText(body.moduleId).trim() || null
  }

  // Bump version on content edit (FR-M2-03)
  const oldValues = {
    title: cu.title, learningOutcome: cu.learningOutcome, performanceCriteria: cu.performanceCriteria,
    knowledge: cu.knowledge, skill: cu.skill, attitude: cu.attitude, toolsEquipment: cu.toolsEquipment,
    creditHour: cu.creditHour, status: cu.status, version: cu.version,
  }
  data.version = cu.version + 1

  const updated = await db.competencyUnit.update({ where: { id: cuId }, data })

  // Recalculate program totalCredit (FR-M2-08)
  const agg = await db.competencyUnit.aggregate({ where: { programId: cu.programId }, _sum: { creditHour: true } })
  await db.program.update({ where: { id: cu.programId }, data: { totalCredit: agg._sum.creditHour || 0 } })

  await logAudit({
    tableName: 'competency_units',
    recordId: cuId,
    action: 'UPDATE',
    oldValues,
    newValues: data,
    performedById: user.id,
    ipAddress: req.headers.get('x-forwarded-for') || undefined,
  })

  return NextResponse.json({ cu: updated })
}
