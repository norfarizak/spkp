import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/users/[id]/login-history - get login history for user
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  const { id } = await params

  // Allow admin OR self
  const admin = isAdmin(ctx.session)
  if (!admin && id !== ctx.user.id) {
    // also allow if same institution
    const target = await db.user.findUnique({ where: { id }, select: { institutionId: true } })
    if (!target || target.institutionId !== ctx.user.institutionId) {
      return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 403 })
    }
  }

  const url = new URL(req.url)
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200)

  const history = await db.loginHistory.findMany({
    where: { userId: id },
    orderBy: { loginAt: 'desc' },
    take: limit,
  })

  return NextResponse.json({
    history: history.map((h) => ({
      id: h.id,
      loginAt: h.loginAt,
      ipAddress: h.ipAddress,
      userAgent: h.userAgent,
      success: h.success,
      reason: h.reason,
    })),
  })
}
