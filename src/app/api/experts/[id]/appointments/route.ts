import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, logAudit, sanitizeText, pushNotification } from '@/lib/auth'
import { db } from '@/lib/db'

// GET — list appointments for an expert
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })

  const { id } = await params
  const appts = await db.expertAppointment.findMany({
    where: { expertId: id },
    orderBy: { scheduledAt: 'desc' },
    include: {
      assigner: { select: { id: true, fullName: true } },
      honorarium: true,
    },
  })

  return NextResponse.json({
    items: appts.map((a) => ({
      id: a.id,
      purpose: a.purpose,
      projectId: a.projectId,
      scheduledAt: a.scheduledAt,
      durationHour: a.durationHour,
      status: a.status,
      notes: a.notes,
      assigner: a.assigner,
      honorarium: a.honorarium,
    })),
  })
}

// POST — create a new appointment
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  const { user } = ctx

  const { id } = await params
  const body = await req.json().catch(() => ({} as any))
  const purpose = sanitizeText(body.purpose || '').trim()
  const projectId = sanitizeText(body.projectId || '').trim() || null
  const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null
  const durationHour = Number(body.durationHour || 1)
  const notes = sanitizeText(body.notes || '').trim()
  const amount = body.amount ? Number(body.amount) : null
  const currency = sanitizeText(body.currency || 'MYR').trim()

  if (!purpose) return NextResponse.json({ error: 'Tujuan pelantikan diperlukan' }, { status: 400 })
  if (!scheduledAt) return NextResponse.json({ error: 'Tarikh pelantikan diperlukan' }, { status: 400 })

  const expert = await db.expert.findUnique({ where: { id } })
  if (!expert) return NextResponse.json({ error: 'Pakar tidak dijumpai' }, { status: 404 })

  // Create appointment + optional honorarium
  const created = await db.expertAppointment.create({
    data: {
      expertId: id,
      assignerId: user.id,
      purpose,
      projectId,
      scheduledAt,
      durationHour,
      status: 'scheduled',
      notes: notes || null,
    },
  })

  // If amount provided, auto-create a pending honorarium
  if (amount && amount > 0) {
    await db.expertHonorarium.create({
      data: {
        appointmentId: created.id,
        expertId: id,
        amount,
        currency,
        status: 'pending',
      },
    })
  }

  // Update expert's totalSessions + set availability to busy
  await db.expert.update({
    where: { id },
    data: {
      totalSessions: { increment: 1 },
      availability: 'busy',
    },
  })

  await logAudit({
    tableName: 'expert_appointments',
    recordId: created.id,
    action: 'INSERT',
    newValues: { expertId: id, purpose, scheduledAt, durationHour, amount },
    performedById: user.id,
    source: 'user',
  })

  // Notify the expert (via linked user or email placeholder)
  if (expert.userId) {
    await pushNotification({
      userId: expert.userId,
      category: 'system',
      title: 'Pelantikan Baru Diterima',
      message: `Anda telah dilantik untuk: ${purpose} pada ${scheduledAt.toLocaleString('ms-MY')}${durationHour ? ` (${durationHour}j)` : ''}.`,
      link: 'experts',
      priority: 'normal',
    })
  }

  return NextResponse.json({ id: created.id, status: 'scheduled' })
}
