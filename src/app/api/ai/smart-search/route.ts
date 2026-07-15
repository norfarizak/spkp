import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, sanitizeText } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })

  const url = new URL(req.url)
  const q = sanitizeText(url.searchParams.get('q') || '').slice(0, 200)
  if (!q) return NextResponse.json({ results: [] })

  const [programs, noss, wim, cus] = await Promise.all([
    db.program.findMany({
      where: { OR: [{ name: { contains: q } }, { code: { contains: q } }, { description: { contains: q } }] },
      take: 5,
      include: { institution: true },
    }),
    db.nossLibrary.findMany({
      where: { OR: [{ title: { contains: q } }, { nossCode: { contains: q } }, { description: { contains: q } }] },
      take: 5,
    }),
    db.wimDocument.findMany({
      where: { OR: [{ title: { contains: q } }, { code: { contains: q } }, { content: { contains: q } }] },
      take: 5,
      include: { program: true },
    }),
    db.competencyUnit.findMany({
      where: { OR: [{ title: { contains: q } }, { cuCode: { contains: q } }, { learningOutcome: { contains: q } }] },
      take: 5,
      include: { program: true },
    }),
  ])

  const results = [
    ...programs.map((p) => ({ type: 'Program', id: p.id, title: p.name, subtitle: p.code, meta: p.institution?.name, status: p.status })),
    ...noss.map((n) => ({ type: 'NOSS', id: n.id, title: n.title, subtitle: n.nossCode, meta: `Sektor: ${n.sector}`, status: 'active' })),
    ...wim.map((w) => ({ type: 'WIM', id: w.id, title: w.title, subtitle: w.code, meta: w.program?.name, status: w.status })),
    ...cus.map((c) => ({ type: 'CU', id: c.id, title: c.title, subtitle: c.cuCode, meta: c.program?.name, status: c.status })),
  ]

  return NextResponse.json({ results, total: results.length })
}
