import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/curriculum/institutions — list institutions for filter dropdown
export async function GET(req: NextRequest) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })

  const list = await db.institution.findMany({
    where: { status: 'active' },
    select: { id: true, name: true, code: true, type: true },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json({ list })
}
