import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, logAudit, sanitizeText, canCreateCurriculum } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/curriculum/[id] — full program detail with hierarchy
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  const { id } = await params

  const program = await db.program.findUnique({
    where: { id },
    include: {
      institution: true,
      createdBy: { select: { id: true, fullName: true, email: true } },
      courses: {
        orderBy: { semester: 'asc' },
        include: {
          modules: { include: { _count: { select: { cus: true } } } },
          _count: { select: { modules: true } },
        },
      },
      cu: {
        orderBy: { cuCode: 'asc' },
        include: {
          outcomes: true,
          module: { select: { id: true, name: true, code: true } },
          nossMapping: { include: { nossCu: { include: { noss: { select: { nossCode: true, title: true } } } } } },
          _count: { select: { wim: true } },
        },
      },
      cocu: { orderBy: { code: 'asc' } },
      accreds: { select: { id: true, applicationCode: true, status: true, type: true } },
    },
  })
  if (!program) return NextResponse.json({ error: 'Program tidak dijumpai' }, { status: 404 })

  const workflow = await db.workflowInstance.findFirst({
    where: { entityType: 'program', entityId: id },
    include: {
      transitions: {
        orderBy: { createdAt: 'asc' },
        include: { actionBy: { select: { id: true, fullName: true, email: true } } },
      },
      currentOwner: { select: { id: true, fullName: true } },
    },
  })

  return NextResponse.json({ program, workflow })
}

// PATCH /api/curriculum/[id] — update program (bumps version)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  const { user, session } = ctx
  const { id } = await params

  if (!canCreateCurriculum(session)) {
    return NextResponse.json({ error: 'Tidak dibenarkan mengedit kurikulum' }, { status: 403 })
  }

  const program = await db.program.findUnique({ where: { id } })
  if (!program) return NextResponse.json({ error: 'Program tidak dijumpai' }, { status: 404 })
  if (program.status === 'approved') {
    return NextResponse.json({ error: 'Program yang diluluskan tidak boleh diedit. Sila buat versi baru.' }, { status: 400 })
  }

  const body = await req.json().catch(() => ({} as any))
  const data: any = {}
  if (body.name !== undefined) data.name = sanitizeText(body.name).slice(0, 300)
  if (body.nossCode !== undefined) data.nossCode = sanitizeText(body.nossCode).trim().toUpperCase().slice(0, 50) || null
  if (body.level !== undefined) data.level = sanitizeText(body.level).slice(0, 50) || null
  if (body.durationMonth !== undefined) data.durationMonth = Number(body.durationMonth) || 0
  if (body.description !== undefined) data.description = sanitizeText(body.description).slice(0, 2000)
  if (body.totalCredit !== undefined) data.totalCredit = Number(body.totalCredit) || 0

  // Auto-calculate total credit from CU sum if requested (FR-M2-08)
  if (body.recalculateCredit === true) {
    const cus = await db.competencyUnit.aggregate({ where: { programId: id }, _sum: { creditHour: true } })
    data.totalCredit = cus._sum.creditHour || 0
  }

  // Bump version on content edit (FR-M2-03)
  const oldValues = {
    name: program.name, nossCode: program.nossCode, level: program.level,
    durationMonth: program.durationMonth, description: program.description, totalCredit: program.totalCredit,
    version: program.version,
  }
  data.version = program.version + 1

  const updated = await db.program.update({ where: { id }, data })

  await logAudit({
    tableName: 'programs',
    recordId: id,
    action: 'UPDATE',
    oldValues,
    newValues: data,
    performedById: user.id,
    ipAddress: req.headers.get('x-forwarded-for') || undefined,
  })

  return NextResponse.json({ program: updated })
}
