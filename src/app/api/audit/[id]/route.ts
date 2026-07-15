import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/audit/[id] — single audit log detail (read-only, immutable)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })

  const { id } = await params
  const item = await db.auditLog.findUnique({
    where: { id },
    include: { performedBy: { select: { id: true, fullName: true, email: true } } },
  })
  if (!item) return NextResponse.json({ error: 'Log audit tidak dijumpai' }, { status: 404 })

  return NextResponse.json({
    item: {
      id: item.id,
      tableName: item.tableName,
      recordId: item.recordId,
      action: item.action,
      oldValues: item.oldValues,
      newValues: item.newValues,
      performedBy: item.performedBy ? { id: item.performedBy.id, name: item.performedBy.fullName, email: item.performedBy.email } : null,
      performedAt: item.performedAt,
      ipAddress: item.ipAddress,
      source: item.source,
    },
  })
}

// NOTE: PATCH/DELETE are intentionally NOT exposed — audit logs are IMMUTABLE per FR-M13-03.
