import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, logAudit, sanitizeText, isAdmin } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })

  const { id } = await params
  const doc = await db.document.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, fullName: true, email: true } },
      versions: {
        orderBy: { version: 'desc' },
        include: { uploadedBy: { select: { fullName: true, email: true } } },
      },
    },
  })
  if (!doc) return NextResponse.json({ error: 'Dokumen tidak dijumpai' }, { status: 404 })

  return NextResponse.json({
    document: {
      id: doc.id,
      name: doc.name,
      category: doc.category,
      module: doc.module,
      fileType: doc.fileType,
      fileSize: doc.fileSize,
      description: doc.description,
      tags: doc.tags,
      status: doc.status,
      ownerId: doc.ownerId,
      owner: doc.owner ? { id: doc.owner.id, name: doc.owner.fullName, email: doc.owner.email } : null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    },
    versions: doc.versions.map((v) => ({
      id: v.id,
      version: v.version,
      fileUrl: v.fileUrl,
      checksum: v.checksum,
      createdAt: v.createdAt,
      uploadedBy: v.uploadedBy ? { name: v.uploadedBy.fullName, email: v.uploadedBy.email } : null,
    })),
    canManage: isAdmin(ctx.session) || doc.ownerId === ctx.user.id,
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  const { user, session } = ctx

  const { id } = await params
  const existing = await db.document.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Dokumen tidak dijumpai' }, { status: 404 })

  // Only owner or admin can update
  if (existing.ownerId !== user.id && !isAdmin(session)) {
    return NextResponse.json({ error: 'Tiada kebenaran' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({} as any))
  const data: any = {}
  if (body.name !== undefined) data.name = sanitizeText(body.name).trim()
  if (body.category !== undefined) data.category = sanitizeText(body.category).trim()
  if (body.module !== undefined) data.module = sanitizeText(body.module).trim() || null
  if (body.description !== undefined) data.description = sanitizeText(body.description).trim() || null
  if (body.tags !== undefined) data.tags = sanitizeText(body.tags).trim() || null
  if (body.status !== undefined) data.status = sanitizeText(body.status).trim()
  if (body.fileType !== undefined) data.fileType = sanitizeText(body.fileType).trim()
  if (body.fileSize !== undefined) data.fileSize = Number(body.fileSize) || 0

  const updated = await db.document.update({ where: { id }, data })

  await logAudit({
    tableName: 'documents',
    recordId: id,
    action: 'UPDATE',
    oldValues: existing,
    newValues: data,
    performedById: user.id,
    ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined,
    source: 'user',
  })

  return NextResponse.json({ ok: true, document: updated })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  const { user, session } = ctx

  const { id } = await params
  const existing = await db.document.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Dokumen tidak dijumpai' }, { status: 404 })

  if (existing.ownerId !== user.id && !isAdmin(session)) {
    return NextResponse.json({ error: 'Tiada kebenaran' }, { status: 403 })
  }

  await db.document.delete({ where: { id } })

  await logAudit({
    tableName: 'documents',
    recordId: id,
    action: 'DELETE',
    oldValues: existing,
    performedById: user.id,
    ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined,
    source: 'user',
  })

  return NextResponse.json({ ok: true })
}
