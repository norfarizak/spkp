import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, logAudit, sanitizeText, canCreateCurriculum } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/noss — list NOSS library (searchable, FR-M3-01)
export async function GET(req: NextRequest) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') || '').trim().toLowerCase()
  const sector = searchParams.get('sector') || ''
  const level = searchParams.get('level') || ''
  const status = searchParams.get('status') || ''

  const where: any = {}
  if (status) where.status = status
  if (sector) where.sector = { contains: sector }
  if (level) where.level = level
  if (q) {
    where.OR = [
      { nossCode: { contains: q } },
      { title: { contains: q } },
      { sector: { contains: q } },
      { description: { contains: q } },
    ]
  }

  const list = await db.nossLibrary.findMany({
    where,
    include: {
      _count: { select: { cus: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 200,
  })

  return NextResponse.json({ list })
}

// POST /api/noss — manual entry of NOSS (FR-M3-02)
export async function POST(req: NextRequest) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  const { user, session } = ctx

  if (!canCreateCurriculum(session)) {
    return NextResponse.json({ error: 'Tidak dibenarkan mencipta NOSS' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({} as any))
  const nossCode = sanitizeText(body.nossCode || '').trim().toUpperCase().slice(0, 50)
  const title = sanitizeText(body.title || '').slice(0, 300)
  const sector = sanitizeText(body.sector || '').slice(0, 100) || null
  const level = sanitizeText(body.level || '').slice(0, 10) || null
  const version = sanitizeText(body.version || '').slice(0, 20) || null
  const publishedYear = Number(body.publishedYear) || null
  const description = sanitizeText(body.description || '').slice(0, 2000)

  if (!nossCode || !title) {
    return NextResponse.json({ error: 'Kod NOSS dan Tajuk diperlukan' }, { status: 400 })
  }

  const exists = await db.nossLibrary.findUnique({ where: { nossCode } })
  if (exists) return NextResponse.json({ error: 'Kod NOSS sudah wujud' }, { status: 409 })

  const noss = await db.nossLibrary.create({
    data: {
      nossCode, title, sector, level, version,
      publishedYear,
      description,
      status: 'active',
    },
  })

  // Optionally add CUs in the same request
  const cus: any[] = Array.isArray(body.cus) ? body.cus : []
  for (const c of cus) {
    const cuCode = sanitizeText(c.cuCode || '').trim().toUpperCase().slice(0, 30)
    const cuTitle = sanitizeText(c.title || '').slice(0, 300)
    if (!cuCode || !cuTitle) continue
    await db.nossCu.create({
      data: {
        nossId: noss.id,
        cuCode,
        title: cuTitle,
        learningOutcome: sanitizeText(c.learningOutcome || '').slice(0, 2000) || null,
        performanceCriteria: sanitizeText(c.performanceCriteria || '').slice(0, 4000) || null,
      },
    })
  }

  await logAudit({
    tableName: 'noss_libraries',
    recordId: noss.id,
    action: 'INSERT',
    newValues: { nossCode, title, sector, level, version, publishedYear, cuCount: cus.length },
    performedById: user.id,
    ipAddress: req.headers.get('x-forwarded-for') || undefined,
  })

  return NextResponse.json({ noss }, { status: 201 })
}
