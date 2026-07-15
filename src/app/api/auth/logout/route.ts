import { NextResponse } from 'next/server'
import { makeClearCookie, getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { logAudit } from '@/lib/auth'

export async function POST() {
  const session = await getSession(new Request('http://x', { headers: {} }))
  if (session) {
    await logAudit({
      tableName: 'users',
      recordId: session.userId,
      action: 'UPDATE',
      newValues: { event: 'logout', at: new Date().toISOString() },
      performedById: session.userId,
      source: 'system',
    })
  }
  const res = NextResponse.json({ ok: true })
  res.headers.set('set-cookie', makeClearCookie())
  return res
}
