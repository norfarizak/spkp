import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, logAudit, sanitizeText } from '@/lib/auth'
import { db } from '@/lib/db'

// PATCH /api/experts/appointments/[apptId] — update appointment status
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ apptId: string }> }
) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  const { user } = ctx

  const { apptId } = await params
  const body = await req.json().catch(() => ({} as any))
  const status = sanitizeText(body.status || '').trim()
  const notes = sanitizeText(body.notes || '').trim()

  if (!['scheduled', 'completed', 'cancelled'].includes(status)) {
    return NextResponse.json({ error: 'Status tidak sah' }, { status: 400 })
  }

  const existing = await db.expertAppointment.findUnique({
    where: { id: apptId },
    include: { expert: true },
  })
  if (!existing) return NextResponse.json({ error: 'Pelantikan tidak dijumpai' }, { status: 404 })

  const updated = await db.expertAppointment.update({
    where: { id: apptId },
    data: {
      status,
      ...(notes ? { notes } : {}),
    },
  })

  // Side-effect: when cancelled, free up expert's availability (if they have no other active appts)
  if (status === 'cancelled') {
    const activeAppts = await db.expertAppointment.count({
      where: { expertId: existing.expertId, status: 'scheduled' },
    })
    if (activeAppts === 0) {
      await db.expert.update({
        where: { id: existing.expertId },
        data: { availability: 'available' },
      })
    }
  }
  if (status === 'completed') {
    await db.expert.update({
      where: { id: existing.expertId },
      data: { availability: 'available' },
    })
  }

  await logAudit({
    tableName: 'expert_appointments',
    recordId: apptId,
    action: 'UPDATE',
    oldValues: { status: existing.status, notes: existing.notes },
    newValues: { status: updated.status, notes: updated.notes },
    performedById: user.id,
    source: 'user',
  })

  return NextResponse.json({ id: updated.id, status: updated.status })
}
