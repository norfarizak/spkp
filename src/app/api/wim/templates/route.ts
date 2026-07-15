import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/wim/templates — list WIM templates
export async function GET(req: NextRequest) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const sheetType = searchParams.get('sheetType') || ''
  const category = searchParams.get('category') || ''

  const where: any = {}
  if (sheetType) where.sheetType = sheetType
  if (category) where.category = category

  const templates = await db.wimTemplate.findMany({
    where,
    orderBy: { name: 'asc' },
  })

  return NextResponse.json({ templates })
}
