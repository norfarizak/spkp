import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, logAudit, sanitizeText, isAdmin, canCreateCurriculum } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/noss/[id] — detail with CUs and mappings
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  const { id } = await params

  const noss = await db.nossLibrary.findUnique({
    where: { id },
    include: {
      cus: {
        orderBy: { cuCode: 'asc' },
        include: {
          mappings: {
            include: {
              cu: {
                select: {
                  id: true, cuCode: true, title: true, creditHour: true,
                  program: { select: { id: true, code: true, name: true, institution: { select: { name: true, code: true } } } },
                },
              },
            },
          },
          _count: { select: { mappings: true } },
        },
      },
      _count: { select: { cus: true } },
    },
  })
  if (!noss) return NextResponse.json({ error: 'NOSS tidak dijumpai' }, { status: 404 })

  // Find versions (same nossCode? — actually nossCode is unique; we look for similar sector/level for comparison demo)
  const related = await db.nossLibrary.findMany({
    where: {
      OR: [
        { title: { contains: noss.title.split(' ').slice(0, 3).join(' ') } },
        { sector: noss.sector || '___none___' },
      ],
      id: { not: id },
    },
    select: { id: true, nossCode: true, title: true, version: true, publishedYear: true, level: true, sector: true },
    take: 10,
  })

  return NextResponse.json({ noss, related })
}

// PATCH /api/noss/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  const { user, session } = ctx
  const { id } = await params

  if (!canCreateCurriculum(session)) {
    return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({} as any))
  const data: any = {}
  if (body.title !== undefined) data.title = sanitizeText(body.title).slice(0, 300)
  if (body.sector !== undefined) data.sector = sanitizeText(body.sector).slice(0, 100) || null
  if (body.level !== undefined) data.level = sanitizeText(body.level).slice(0, 10) || null
  if (body.version !== undefined) data.version = sanitizeText(body.version).slice(0, 20) || null
  if (body.publishedYear !== undefined) data.publishedYear = Number(body.publishedYear) || null
  if (body.description !== undefined) data.description = sanitizeText(body.description).slice(0, 2000)
  if (body.status !== undefined) data.status = sanitizeText(body.status).slice(0, 30)

  const updated = await db.nossLibrary.update({ where: { id }, data })

  await logAudit({
    tableName: 'noss_libraries',
    recordId: id,
    action: 'UPDATE',
    newValues: data,
    performedById: user.id,
    ipAddress: req.headers.get('x-forwarded-for') || undefined,
  })

  return NextResponse.json({ noss: updated })
}

// DELETE /api/noss/[id] — admin only
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  const { user, session } = ctx
  const { id } = await params

  if (!isAdmin(session)) {
    return NextResponse.json({ error: 'Hanya pentadbir dibenarkan memadam NOSS' }, { status: 403 })
  }

  await db.nossLibrary.delete({ where: { id } })

  await logAudit({
    tableName: 'noss_libraries',
    recordId: id,
    action: 'DELETE',
    performedById: user.id,
    ipAddress: req.headers.get('x-forwarded-for') || undefined,
  })

  return NextResponse.json({ ok: true })
}
