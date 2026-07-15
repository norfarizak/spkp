import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

function csvEscape(s: any): string {
  if (s === null || s === undefined) return ''
  const str = typeof s === 'string' ? s : JSON.stringify(s)
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

// GET /api/audit/export?tableName=&action=&source=&from=&to=
// Returns CSV
export async function GET(req: NextRequest) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })

  const url = req.nextUrl
  const tableName = url.searchParams.get('tableName') || ''
  const action = url.searchParams.get('action') || ''
  const source = url.searchParams.get('source') || ''
  const performedById = url.searchParams.get('performedById') || ''
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')

  const where: any = {}
  if (tableName) where.tableName = tableName
  if (action) where.action = action
  if (source) where.source = source
  if (performedById) where.performedById = performedById
  if (from || to) {
    where.performedAt = {}
    if (from) where.performedAt.gte = new Date(from)
    if (to) where.performedAt.lte = new Date(to)
  }

  const items = await db.auditLog.findMany({
    where,
    orderBy: { performedAt: 'desc' },
    take: 1000,
    include: { performedBy: { select: { fullName: true, email: true } } },
  })

  const headers = ['ID', 'Table Name', 'Record ID', 'Action', 'Performed By', 'Email', 'Performed At', 'IP Address', 'Source', 'Old Values', 'New Values']
  const rows = items.map((a) => [
    a.id, a.tableName, a.recordId, a.action,
    a.performedBy?.fullName || 'Sistem',
    a.performedBy?.email || '',
    new Date(a.performedAt).toISOString(),
    a.ipAddress || '',
    a.source,
    a.oldValues || '',
    a.newValues || '',
  ])

  const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\r\n')

  return new Response('\ufeff' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
