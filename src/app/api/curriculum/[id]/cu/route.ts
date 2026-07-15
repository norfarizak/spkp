import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, logAudit, sanitizeText, canCreateCurriculum } from '@/lib/auth'
import { db } from '@/lib/db'

// POST /api/curriculum/[id]/cu — add Competency Unit under program (and optionally course/module)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  const { user, session } = ctx
  const { id } = await params

  if (!canCreateCurriculum(session)) {
    return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 403 })
  }

  const program = await db.program.findUnique({ where: { id } })
  if (!program) return NextResponse.json({ error: 'Program tidak dijumpai' }, { status: 404 })
  if (program.status === 'approved') {
    return NextResponse.json({ error: 'Program diluluskan tidak boleh diubah' }, { status: 400 })
  }

  const body = await req.json().catch(() => ({} as any))
  const cuCode = sanitizeText(body.cuCode || '').trim().toUpperCase().slice(0, 30)
  const title = sanitizeText(body.title || '').slice(0, 300)
  const moduleId = sanitizeText(body.moduleId || '').trim() || null
  const creditHour = Number(body.creditHour) || 0

  if (!cuCode || !title) {
    return NextResponse.json({ error: 'Kod CU dan Tajuk diperlukan' }, { status: 400 })
  }

  const cu = await db.competencyUnit.create({
    data: {
      programId: id,
      cuCode, title, creditHour,
      moduleId,
      learningOutcome: sanitizeText(body.learningOutcome || '').slice(0, 2000) || null,
      performanceCriteria: sanitizeText(body.performanceCriteria || '').slice(0, 4000) || null,
      knowledge: sanitizeText(body.knowledge || '').slice(0, 2000) || null,
      skill: sanitizeText(body.skill || '').slice(0, 2000) || null,
      attitude: sanitizeText(body.attitude || '').slice(0, 1000) || null,
      toolsEquipment: sanitizeText(body.toolsEquipment || '').slice(0, 2000) || null,
      version: 1,
      status: 'draft',
    },
  })

  // Auto recalculate program totalCredit (FR-M2-08)
  const agg = await db.competencyUnit.aggregate({ where: { programId: id }, _sum: { creditHour: true } })
  await db.program.update({ where: { id }, data: { totalCredit: agg._sum.creditHour || 0 } })

  await logAudit({
    tableName: 'competency_units',
    recordId: cu.id,
    action: 'INSERT',
    newValues: { programId: id, cuCode, title, creditHour },
    performedById: user.id,
    ipAddress: req.headers.get('x-forwarded-for') || undefined,
  })

  return NextResponse.json({ cu }, { status: 201 })
}
