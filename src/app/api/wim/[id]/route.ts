import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, logAudit, sanitizeText, canCreateCurriculum } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/wim/[id] — WIM detail
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  const { id } = await params

  const wim = await db.wimDocument.findUnique({
    where: { id },
    include: {
      program: { select: { id: true, code: true, name: true } },
      cu: { select: { id: true, cuCode: true, title: true, learningOutcome: true } },
      author: { select: { id: true, fullName: true, email: true } },
    },
  })
  if (!wim) return NextResponse.json({ error: 'WIM tidak dijumpai' }, { status: 404 })

  const workflow = await db.workflowInstance.findFirst({
    where: { entityType: 'wim_document', entityId: id },
    include: {
      transitions: {
        orderBy: { createdAt: 'asc' },
        include: { actionBy: { select: { id: true, fullName: true, email: true } } },
      },
    },
  })

  return NextResponse.json({ wim, workflow })
}

// PATCH /api/wim/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  const { user, session } = ctx
  const { id } = await params

  if (!canCreateCurriculum(session)) {
    return NextResponse.json({ error: 'Tidak dibenarkan mengedit WIM' }, { status: 403 })
  }

  const wim = await db.wimDocument.findUnique({ where: { id } })
  if (!wim) return NextResponse.json({ error: 'WIM tidak dijumpai' }, { status: 404 })
  if (wim.status === 'approved') {
    return NextResponse.json({ error: 'WIM yang diluluskan tidak boleh diedit. Sila buat versi baru.' }, { status: 400 })
  }

  const body = await req.json().catch(() => ({} as any))
  const data: any = {}
  if (body.title !== undefined) data.title = sanitizeText(body.title).slice(0, 300)
  if (body.content !== undefined) data.content = sanitizeText(body.content).slice(0, 50000)
  if (body.answerScheme !== undefined) data.answerScheme = sanitizeText(body.answerScheme).slice(0, 20000) || null
  if (body.rubric !== undefined) {
    data.rubric = typeof body.rubric === 'string'
      ? (() => { try { return JSON.parse(body.rubric) } catch { return body.rubric.slice(0, 20000) } })()
      : body.rubric
  }
  if (body.sheetType !== undefined) data.sheetType = sanitizeText(body.sheetType).slice(0, 50)

  // Bump version
  const oldValues = {
    title: wim.title, content: wim.content?.slice(0, 200), sheetType: wim.sheetType, version: wim.version,
  }
  data.version = wim.version + 1

  const updated = await db.wimDocument.update({ where: { id }, data })

  await logAudit({
    tableName: 'wim_documents',
    recordId: id,
    action: 'UPDATE',
    oldValues,
    newValues: { ...data, content: data.content?.slice(0, 200) },
    performedById: user.id,
    ipAddress: req.headers.get('x-forwarded-for') || undefined,
  })

  return NextResponse.json({ wim: updated })
}
