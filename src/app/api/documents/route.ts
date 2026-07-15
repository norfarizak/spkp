import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, logAudit, sanitizeText, isAdmin } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/documents?category=&fileType=&search=&module=&status=
export async function GET(req: NextRequest) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  const { session } = ctx

  const url = req.nextUrl
  const category = url.searchParams.get('category') || ''
  const fileType = url.searchParams.get('fileType') || ''
  const moduleFilter = url.searchParams.get('module') || ''
  const statusFilter = url.searchParams.get('status') || ''
  const search = (url.searchParams.get('search') || '').trim().toLowerCase()

  const where: any = {}
  if (category) where.category = category
  if (fileType) where.fileType = fileType
  if (moduleFilter) where.module = moduleFilter
  if (statusFilter) where.status = statusFilter
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { tags: { contains: search } },
      { description: { contains: search } },
    ]
  }

  const docs = await db.document.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    include: {
      owner: { select: { id: true, fullName: true, email: true } },
      versions: { select: { id: true, version: true, createdAt: true, uploadedBy: { select: { fullName: true } } }, orderBy: { version: 'desc' } },
    },
    take: 200,
  })

  return NextResponse.json({
    items: docs.map((d) => ({
      id: d.id,
      name: d.name,
      category: d.category,
      module: d.module,
      fileType: d.fileType,
      fileSize: d.fileSize,
      description: d.description,
      tags: d.tags,
      status: d.status,
      owner: d.owner ? { id: d.owner.id, name: d.owner.fullName, email: d.owner.email } : null,
      versionCount: d.versions.length,
      latestVersion: d.versions[0]?.version || 0,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    })),
    total: docs.length,
    canManage: isAdmin(session),
  })
}

// POST /api/documents — create document metadata + first version
export async function POST(req: NextRequest) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  const { user, session } = ctx

  const body = await req.json().catch(() => ({} as any))
  const name = sanitizeText(body.name || '').trim()
  const category = sanitizeText(body.category || 'general').trim()
  const moduleStr = sanitizeText(body.module || '').trim() || null
  const description = sanitizeText(body.description || '').trim() || null
  const tags = sanitizeText(body.tags || '').trim() || null
  const fileType = sanitizeText(body.fileType || 'pdf').trim()
  const fileSize = Number(body.fileSize) || 0
  const status = sanitizeText(body.status || 'active').trim()

  if (!name) return NextResponse.json({ error: 'Nama dokumen diperlukan' }, { status: 400 })
  if (!['curriculum', 'wim', 'accreditation', 'certificate', 'general'].includes(category)) {
    return NextResponse.json({ error: 'Kategori tidak sah' }, { status: 400 })
  }

  const doc = await db.document.create({
    data: {
      name,
      category,
      module: moduleStr,
      ownerId: user.id,
      fileType,
      fileSize,
      description,
      tags,
      status,
      versions: {
        create: {
          version: 1,
          fileUrl: `/uploads/${encodeURIComponent(name)}`,
          uploadedById: user.id,
          checksum: 'demo-' + Math.random().toString(36).slice(2, 10),
        },
      },
    },
    include: { versions: true },
  })

  await logAudit({
    tableName: 'documents',
    recordId: doc.id,
    action: 'INSERT',
    newValues: { name, category, fileType, fileSize, tags },
    performedById: user.id,
    ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined,
    source: 'user',
  })

  return NextResponse.json({ ok: true, id: doc.id, document: doc })
}
