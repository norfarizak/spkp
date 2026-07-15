import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, logAudit, sanitizeText, canCreateCurriculum } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/noss/[id]/mapping — all mappings for this NOSS (per NOSS CU)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  const { id } = await params

  const mappings = await db.nossMapping.findMany({
    where: { nossCu: { nossId: id } },
    include: {
      cu: {
        select: {
          id: true, cuCode: true, title: true, creditHour: true,
          program: { select: { id: true, code: true, name: true, institution: { select: { name: true, code: true } } } },
        },
      },
      nossCu: { select: { id: true, cuCode: true, title: true } },
    },
    orderBy: { confidenceScore: 'desc' },
  })

  return NextResponse.json({ mappings })
}

// POST /api/noss/[id]/mapping — add a new mapping
// body: { cuId, nossCuId, confidenceScore }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  const { user, session } = ctx
  const { id } = await params

  if (!canCreateCurriculum(session)) {
    return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({} as any))
  const cuId = sanitizeText(body.cuId || '').trim()
  const nossCuId = sanitizeText(body.nossCuId || '').trim()
  const confidenceScore = Math.max(0, Math.min(100, Number(body.confidenceScore) || 0))

  if (!cuId || !nossCuId) {
    return NextResponse.json({ error: 'CU ID dan NOSS CU ID diperlukan' }, { status: 400 })
  }

  // Validate that nossCuId belongs to this NOSS
  const nossCu = await db.nossCu.findUnique({ where: { id: nossCuId } })
  if (!nossCu || nossCu.nossId !== id) {
    return NextResponse.json({ error: 'NOSS CU tidak sah untuk NOSS ini' }, { status: 400 })
  }

  try {
    const mapping = await db.nossMapping.create({
      data: {
        cuId, nossCuId, confidenceScore,
        mappedById: user.id,
      },
    })
    await logAudit({
      tableName: 'noss_mappings',
      recordId: mapping.id,
      action: 'INSERT',
      newValues: { cuId, nossCuId, confidenceScore, nossId: id },
      performedById: user.id,
      ipAddress: req.headers.get('x-forwarded-for') || undefined,
    })
    return NextResponse.json({ mapping }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: 'Pemetaan sudah wujud atau gagal: ' + e.message }, { status: 409 })
  }
}

// DELETE /api/noss/[id]/mapping?mappingId=xxx — remove mapping
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  const { user, session } = ctx
  const { id } = await params

  if (!canCreateCurriculum(session)) {
    return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 403 })
  }

  const mappingId = new URL(req.url).searchParams.get('mappingId') || ''
  if (!mappingId) return NextResponse.json({ error: 'mappingId diperlukan' }, { status: 400 })

  await db.nossMapping.delete({ where: { id: mappingId } })
  await logAudit({
    tableName: 'noss_mappings',
    recordId: mappingId,
    action: 'DELETE',
    performedById: user.id,
    ipAddress: req.headers.get('x-forwarded-for') || undefined,
  })
  return NextResponse.json({ ok: true })
}
