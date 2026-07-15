import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, logAudit, sanitizeText } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  const { user } = ctx

  const body = await req.json().catch(() => ({} as any))
  const programId = body.programId as string
  if (!programId) return NextResponse.json({ error: 'Program ID diperlukan' }, { status: 400 })

  const program = await db.program.findUnique({
    where: { id: programId },
    include: { cu: true },
  })
  if (!program) return NextResponse.json({ error: 'Program tidak dijumpai' }, { status: 404 })

  const nossLib = await db.nossLibrary.findUnique({ where: { nossCode: program.nossCode || '' }, include: { cus: true } })
  if (!nossLib) return NextResponse.json({ error: 'NOSS tidak dijumpai untuk kod ini' }, { status: 404 })

  // Simple mapping: match by title keyword overlap
  const mappings: any[] = []
  for (const cu of program.cu) {
    const candidates = nossLib.cus.map((nc) => {
      const cuTokens = (cu.title + ' ' + (cu.learningOutcome || '')).toLowerCase().split(/\s+/).filter((t) => t.length > 3)
      const ncTokens = (nc.title + ' ' + (nc.learningOutcome || '')).toLowerCase().split(/\s+/).filter((t) => t.length > 3)
      const intersection = cuTokens.filter((t) => ncTokens.includes(t))
      const score = cuTokens.length > 0 ? Math.round((intersection.length / Math.max(cuTokens.length, 1)) * 100) : 0
      return { nossCu: nc, score }
    }).sort((a, b) => b.score - a.score)
    const best = candidates[0]
    if (best && best.score > 20) {
      mappings.push({
        cuId: cu.id,
        cuCode: cu.cuCode,
        cuTitle: cu.title,
        nossCuId: best.nossCu.id,
        nossCuCode: best.nossCu.cuCode,
        nossCuTitle: best.nossCu.title,
        confidence: best.score,
      })
    }
  }

  // Identify gaps (CU without mapping)
  const mappedCuIds = new Set(mappings.map((m) => m.cuId))
  const gaps = program.cu.filter((c) => !mappedCuIds.has(c.id)).map((c) => ({
    cuId: c.id,
    cuCode: c.cuCode,
    cuTitle: c.title,
    issue: 'Tiada padanan NOSS dijumpai - sila semak manual',
  }))

  await logAudit({
    tableName: 'noss_mappings',
    recordId: programId,
    action: 'INSERT',
    newValues: { feature: 'ai_mapping', mapped: mappings.length, gaps: gaps.length },
    performedById: user.id,
    source: 'AI_GENERATED',
  })

  return NextResponse.json({
    mappings,
    gaps,
    summary: {
      total: program.cu.length,
      mapped: mappings.length,
      gaps: gaps.length,
      coveragePercent: program.cu.length > 0 ? Math.round((mappings.length / program.cu.length) * 100) : 0,
    },
    disclaimer: 'Draf AI - Perlu Semakan Manusia',
  })
}
