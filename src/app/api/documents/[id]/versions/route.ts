import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, logAudit } from '@/lib/auth'
import { db } from '@/lib/db'

// POST /api/documents/[id]/versions — add a new version
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  const { user } = ctx

  const { id } = await params
  const doc = await db.document.findUnique({
    where: { id },
    include: { versions: { select: { version: true }, orderBy: { version: 'desc' }, take: 1 } },
  })
  if (!doc) return NextResponse.json({ error: 'Dokumen tidak dijumpai' }, { status: 404 })

  const body = await req.json().catch(() => ({} as any))
  const note = (body.note || '').toString().slice(0, 500)

  const nextVersion = (doc.versions[0]?.version || 0) + 1
  const version = await db.documentVersion.create({
    data: {
      documentId: id,
      version: nextVersion,
      fileUrl: `/uploads/${encodeURIComponent(doc.name)}-v${nextVersion}`,
      uploadedById: user.id,
      checksum: 'demo-' + Math.random().toString(36).slice(2, 12),
    },
  })

  // Bump document updatedAt
  await db.document.update({ where: { id }, data: { updatedAt: new Date() } })

  await logAudit({
    tableName: 'document_versions',
    recordId: version.id,
    action: 'INSERT',
    newValues: { documentId: id, version: nextVersion, note },
    performedById: user.id,
    ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined,
    source: 'user',
  })

  return NextResponse.json({ ok: true, version })
}
