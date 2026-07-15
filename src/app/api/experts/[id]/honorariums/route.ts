import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, logAudit, sanitizeText, isAdmin, hasRole, ROLE_CODES, pushNotification } from '@/lib/auth'
import { db } from '@/lib/db'

// GET — list honorariums for an expert
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })

  const { id } = await params
  const items = await db.expertHonorarium.findMany({
    where: { expertId: id },
    orderBy: { createdAt: 'desc' },
    include: { appointment: { select: { purpose: true, scheduledAt: true } } },
  })

  return NextResponse.json({
    items: items.map((h) => ({
      id: h.id,
      appointmentId: h.appointmentId,
      amount: h.amount,
      currency: h.currency,
      status: h.status,
      paidAt: h.paidAt,
      createdAt: h.createdAt,
      appointment: h.appointment,
    })),
  })
}

// PATCH — mark honorarium as paid (or cancel)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  const { user, session } = ctx

  const { id } = await params
  const body = await req.json().catch(() => ({} as any))
  const honorariumId = sanitizeText(body.id || '').trim()
  const status = sanitizeText(body.status || '').trim()

  if (!honorariumId) return NextResponse.json({ error: 'ID honorarium diperlukan' }, { status: 400 })
  if (!['pending', 'paid', 'cancelled'].includes(status)) {
    return NextResponse.json({ error: 'Status tidak sah' }, { status: 400 })
  }

  // Only admins / pegawai can mark honorariums as paid
  const canManage =
    isAdmin(session) ||
    hasRole(
      session,
      ROLE_CODES.PEGAWAI_KURIKULUM,
      ROLE_CODES.PEGAWAI_PENTAULIAHAN,
      ROLE_CODES.BAHAGIAN_KURIKULUM,
      ROLE_CODES.PENARAH,
      ROLE_CODES.TIMBALAN_PENARAH,
      ROLE_CODES.KETUA_JABATAN
    )
  if (!canManage) {
    return NextResponse.json({ error: 'Anda tidak dibenarkan mengemas kini honorarium' }, { status: 403 })
  }

  const existing = await db.expertHonorarium.findUnique({
    where: { id: honorariumId },
    include: { appointment: true },
  })
  if (!existing || existing.expertId !== id) {
    return NextResponse.json({ error: 'Honorarium tidak dijumpai' }, { status: 404 })
  }

  const updated = await db.expertHonorarium.update({
    where: { id: honorariumId },
    data: {
      status,
      paidAt: status === 'paid' ? new Date() : null,
    },
  })

  // If paid, also mark appointment as completed (FR-M6-02 consistency)
  if (status === 'paid' && existing.appointment && existing.appointment.status !== 'completed') {
    await db.expertAppointment.update({
      where: { id: existing.appointmentId },
      data: { status: 'completed' },
    })
    // Reset expert availability back to available after session completes
    await db.expert.update({
      where: { id },
      data: { availability: 'available' },
    })
  }

  await logAudit({
    tableName: 'expert_honorariums',
    recordId: honorariumId,
    action: 'UPDATE',
    oldValues: { status: existing.status, paidAt: existing.paidAt },
    newValues: { status: updated.status, paidAt: updated.paidAt },
    performedById: user.id,
    source: 'user',
  })

  // Notify expert's user if linked
  const expert = await db.expert.findUnique({ where: { id }, select: { userId: true, fullName: true } })
  if (expert?.userId && status === 'paid') {
    await pushNotification({
      userId: expert.userId,
      category: 'system',
      title: 'Honorarium Dibayar',
      message: `Honorarium sebanyak ${updated.currency} ${updated.amount.toFixed(2)} telah dibayar kepada anda.`,
      link: 'experts',
      priority: 'normal',
    })
  }

  return NextResponse.json({ id: updated.id, status: updated.status, paidAt: updated.paidAt })
}
