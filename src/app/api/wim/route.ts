import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, logAudit, sanitizeText, canCreateCurriculum } from '@/lib/auth'
import { db } from '@/lib/db'

const SHEET_TYPES = ['Assignment Sheet', 'Information Sheet', 'Work Sheet', 'Job Sheet', 'Operation Sheet']

// GET /api/wim — list WIM documents (filterable)
export async function GET(req: NextRequest) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') || '').trim().toLowerCase()
  const programId = searchParams.get('programId') || ''
  const sheetType = searchParams.get('sheetType') || ''
  const status = searchParams.get('status') || ''
  const isAiGenerated = searchParams.get('isAiGenerated')

  const isAdmin = ctx.session.roleCodes.includes('SUPER_ADMIN') || ctx.session.roleCodes.includes('ADMINISTRATOR')

  const where: any = {}
  if (programId) where.programId = programId
  if (sheetType) where.sheetType = sheetType
  if (status) where.status = status
  if (isAiGenerated === 'true') where.isAiGenerated = true
  if (isAiGenerated === 'false') where.isAiGenerated = false
  if (q) {
    where.OR = [
      { code: { contains: q } },
      { title: { contains: q } },
    ]
  }

  const list = await db.wimDocument.findMany({
    where,
    include: {
      program: { select: { id: true, code: true, name: true } },
      cu: { select: { id: true, cuCode: true, title: true } },
      author: { select: { id: true, fullName: true, email: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 200,
  })

  return NextResponse.json({ list })
}

// POST /api/wim — create WIM
export async function POST(req: NextRequest) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  const { user, session } = ctx

  if (!canCreateCurriculum(session)) {
    return NextResponse.json({ error: 'Tidak dibenarkan mencipta WIM' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({} as any))
  const programId = sanitizeText(body.programId || '').trim()
  const cuId = sanitizeText(body.cuId || '').trim()
  const code = sanitizeText(body.code || '').trim().toUpperCase().slice(0, 50)
  const title = sanitizeText(body.title || '').slice(0, 300)
  const sheetType = sanitizeText(body.sheetType || 'Assignment Sheet').slice(0, 50)
  const content = sanitizeText(body.content || '').slice(0, 50000)
  const rubric: any = body.rubric
    ? (typeof body.rubric === 'string'
        ? (() => { try { return JSON.parse(body.rubric) } catch { return body.rubric.slice(0, 20000) } })()
        : body.rubric)
    : null
  const answerScheme = sanitizeText(body.answerScheme || '').slice(0, 20000) || null
  const isAiGenerated = !!body.isAiGenerated

  if (!programId || !cuId || !code || !title) {
    return NextResponse.json({ error: 'Program, CU, Kod dan Tajuk diperlukan' }, { status: 400 })
  }
  if (!SHEET_TYPES.includes(sheetType)) {
    return NextResponse.json({ error: `sheetType mesti salah satu: ${SHEET_TYPES.join(', ')}` }, { status: 400 })
  }

  // Check code uniqueness (code is not unique constraint in schema — use findFirst)
  const existing = await db.wimDocument.findFirst({ where: { code } })
  if (existing) return NextResponse.json({ error: 'Kod WIM sudah wujud' }, { status: 409 })

  const wim = await db.wimDocument.create({
    data: {
      programId, cuId, code, title, sheetType, content,
      rubric, answerScheme,
      isAiGenerated,
      authorId: user.id,
      status: 'draft',
      version: 1,
    },
  })

  // Create workflow
  await db.workflowInstance.create({
    data: {
      entityType: 'wim_document',
      entityId: wim.id,
      currentStatus: 'draft',
      currentOwnerId: user.id,
    },
  })

  await logAudit({
    tableName: 'wim_documents',
    recordId: wim.id,
    action: 'INSERT',
    newValues: { code, title, sheetType, programId, cuId, isAiGenerated },
    performedById: user.id,
    ipAddress: req.headers.get('x-forwarded-for') || undefined,
    source: isAiGenerated ? 'AI_GENERATED' : 'user',
  })

  return NextResponse.json({ wim }, { status: 201 })
}
