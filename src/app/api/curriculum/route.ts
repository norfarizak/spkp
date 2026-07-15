import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, logAudit, sanitizeText, canCreateCurriculum } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/curriculum — list programs with filters
export async function GET(req: NextRequest) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  const { session } = ctx

  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') || '').trim().toLowerCase()
  const status = searchParams.get('status') || ''
  const level = searchParams.get('level') || ''
  const institutionId = searchParams.get('institutionId') || ''

  const isAdmin = session.roleCodes.includes('SUPER_ADMIN') || session.roleCodes.includes('ADMINISTRATOR')
  const where: any = {}
  if (!isAdmin) {
    where.institutionId = session.institutionId || 'none'
  }
  if (status) where.status = status
  if (level) where.level = level
  if (institutionId) where.institutionId = institutionId
  if (q) {
    where.OR = [
      { code: { contains: q } },
      { name: { contains: q } },
      { nossCode: { contains: q } },
    ]
  }

  const programs = await db.program.findMany({
    where,
    include: {
      institution: { select: { id: true, name: true, code: true } },
      createdBy: { select: { id: true, fullName: true, email: true } },
      _count: { select: { cu: true, courses: true, cocu: true, wim: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 200,
  })

  return NextResponse.json({ programs })
}

// POST /api/curriculum — create program
export async function POST(req: NextRequest) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  const { user, session } = ctx
  if (!canCreateCurriculum(session)) {
    return NextResponse.json({ error: 'Anda tidak mempunyai kebenaran untuk mencipta kurikulum' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({} as any))
  const code = sanitizeText(body.code || '').trim().toUpperCase().slice(0, 50)
  const name = sanitizeText(body.name || '').trim().slice(0, 300)
  const nossCode = sanitizeText(body.nossCode || '').trim().toUpperCase().slice(0, 50) || null
  const level = sanitizeText(body.level || '').trim().slice(0, 50) || null
  const durationMonth = Number(body.durationMonth) || 0
  const description = sanitizeText(body.description || '').slice(0, 2000)
  const institutionId = sanitizeText(body.institutionId || '').trim() || session.institutionId || ''

  if (!code || !name) {
    return NextResponse.json({ error: 'Kod dan Nama program diperlukan' }, { status: 400 })
  }
  if (!institutionId) {
    return NextResponse.json({ error: 'Institusi diperlukan' }, { status: 400 })
  }

  const exists = await db.program.findUnique({ where: { code } })
  if (exists) return NextResponse.json({ error: 'Kod program sudah wujud' }, { status: 409 })

  try {
    const program = await db.program.create({
      data: {
        code, name, nossCode, level,
        durationMonth,
        description,
        institutionId,
        createdById: user.id,
        status: 'draft',
        version: 1,
        totalCredit: 0,
      },
    })

    // Auto-create workflow instance
    await db.workflowInstance.create({
      data: {
        entityType: 'program',
        entityId: program.id,
        currentStatus: 'draft',
        currentOwnerId: user.id,
      },
    })

    await logAudit({
      tableName: 'programs',
      recordId: program.id,
      action: 'INSERT',
      newValues: { code, name, nossCode, level, durationMonth, institutionId },
      performedById: user.id,
      ipAddress: req.headers.get('x-forwarded-for') || undefined,
    })

    return NextResponse.json({ program }, { status: 201 })
  } catch (e: any) {
    console.error('[CREATE PROGRAM ERROR]', e)
    return NextResponse.json({ error: 'Gagal mencipta program: ' + e.message }, { status: 500 })
  }
}
