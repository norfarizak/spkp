import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, logAudit, sanitizeText } from '@/lib/auth'
import { db } from '@/lib/db'

// GET — list evaluations for an expert
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })

  const { id } = await params
  const evals = await db.expertEvaluation.findMany({
    where: { expertId: id },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({
    items: evals.map((e) => ({
      id: e.id,
      targetType: e.targetType,
      targetId: e.targetId,
      rating: e.rating,
      recommendation: e.recommendation,
      comments: e.comments,
      createdAt: e.createdAt,
    })),
  })
}

// POST — add an evaluation
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  const { user } = ctx

  const { id } = await params
  const body = await req.json().catch(() => ({} as any))
  const targetType = sanitizeText(body.targetType || '').trim()
  const targetId = sanitizeText(body.targetId || '').trim() || null
  const rating = Math.max(1, Math.min(5, Number(body.rating || 3)))
  const recommendation = sanitizeText(body.recommendation || '').trim()
  const comments = sanitizeText(body.comments || '').trim()

  if (!['curriculum', 'wim', 'accreditation'].includes(targetType)) {
    return NextResponse.json({ error: 'Jenis sasaran tidak sah' }, { status: 400 })
  }

  const expert = await db.expert.findUnique({ where: { id } })
  if (!expert) return NextResponse.json({ error: 'Pakar tidak dijumpai' }, { status: 404 })

  const created = await db.expertEvaluation.create({
    data: {
      expertId: id,
      targetType,
      targetId,
      rating,
      recommendation: recommendation || null,
      comments: comments || null,
    },
  })

  // Recompute average rating for this expert
  const allEvals = await db.expertEvaluation.findMany({
    where: { expertId: id },
    select: { rating: true },
  })
  const avg = allEvals.length > 0
    ? allEvals.reduce((s, e) => s + e.rating, 0) / allEvals.length
    : 0
  await db.expert.update({
    where: { id },
    data: { rating: Math.round(avg * 100) / 100 },
  })

  await logAudit({
    tableName: 'expert_evaluations',
    recordId: created.id,
    action: 'INSERT',
    newValues: { expertId: id, targetType, rating, recommendation },
    performedById: user.id,
    source: 'user',
  })

  return NextResponse.json({ id: created.id, rating, avgRating: avg })
}
