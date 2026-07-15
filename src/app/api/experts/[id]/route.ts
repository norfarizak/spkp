import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, logAudit, sanitizeText, isAdmin, hasRole, ROLE_CODES } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })

  const { id } = await params
  const expert = await db.expert.findUnique({
    where: { id },
    include: {
      institution: { select: { id: true, name: true, code: true } },
      user: { select: { id: true, fullName: true, email: true } },
      appointments: {
        orderBy: { scheduledAt: 'desc' },
        take: 50,
        include: {
          assigner: { select: { id: true, fullName: true } },
          honorarium: true,
        },
      },
      evaluations: { orderBy: { createdAt: 'desc' }, take: 50 },
      honorariums: {
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { appointment: { select: { purpose: true, scheduledAt: true } } },
      },
    },
  })
  if (!expert) return NextResponse.json({ error: 'Pakar tidak dijumpai' }, { status: 404 })

  // Aggregate stats
  const totalPaid = expert.honorariums
    .filter((h) => h.status === 'paid')
    .reduce((s, h) => s + h.amount, 0)
  const avgRating =
    expert.evaluations.length > 0
      ? expert.evaluations.reduce((s, e) => s + e.rating, 0) / expert.evaluations.length
      : 0

  return NextResponse.json({
    item: {
      ...expert,
      stats: {
        totalAppointments: expert.appointments.length,
        totalEvaluations: expert.evaluations.length,
        totalHonorariums: expert.honorariums.length,
        totalPaid,
        avgRating,
      },
    },
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  const { user, session } = ctx

  const { id } = await params
  const body = await req.json().catch(() => ({} as any))

  const existing = await db.expert.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Pakar tidak dijumpai' }, { status: 404 })

  // Self-service: if user is the linked user of this expert, they can only update their own availability
  const isSelf = existing.userId === user.id
  const canManage =
    isAdmin(session) ||
    hasRole(
      session,
      ROLE_CODES.PEGAWAI_KURIKULUM,
      ROLE_CODES.PEGAWAI_PENTAULIAHAN,
      ROLE_CODES.BAHAGIAN_KURIKULUM,
      ROLE_CODES.PENARAH,
      ROLE_CODES.TIMBALAN_PENARAH,
      ROLE_CODES.KETUA_PROGRAM,
      ROLE_CODES.KETUA_JABATAN
    )

  // Restrict fields
  const data: any = {}
  if (typeof body.availability === 'string') {
    const av = sanitizeText(body.availability).trim()
    if (['available', 'busy', 'unavailable'].includes(av)) data.availability = av
  }

  // Self can only update availability; admins/pegawai can update everything
  if (canManage && !isSelf) {
    if (typeof body.fullName === 'string') data.fullName = sanitizeText(body.fullName).trim()
    if (typeof body.icNumber === 'string') data.icNumber = sanitizeText(body.icNumber).trim() || null
    if (typeof body.email === 'string') data.email = sanitizeText(body.email).trim().toLowerCase() || null
    if (typeof body.phone === 'string') data.phone = sanitizeText(body.phone).trim() || null
    if (typeof body.category === 'string' && ['Industri', 'Akademik', 'Penilai'].includes(body.category)) {
      data.category = body.category
    }
    if (typeof body.expertiseArea === 'string') data.expertiseArea = sanitizeText(body.expertiseArea).trim()
    if (typeof body.qualification === 'string') data.qualification = sanitizeText(body.qualification).trim() || null
    if (typeof body.organization === 'string') data.organization = sanitizeText(body.organization).trim() || null
    if (typeof body.experienceYear === 'number') data.experienceYear = body.experienceYear
    if (typeof body.institutionId === 'string') data.institutionId = body.institutionId || null
    if (typeof body.status === 'string' && ['active', 'inactive'].includes(body.status)) data.status = body.status
  } else if (!isSelf && !canManage) {
    return NextResponse.json({ error: 'Anda tidak dibenarkan mengemas kini pakar ini' }, { status: 403 })
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Tiada medan untuk dikemas kini' }, { status: 400 })
  }

  const updated = await db.expert.update({ where: { id }, data })

  await logAudit({
    tableName: 'experts',
    recordId: id,
    action: 'UPDATE',
    oldValues: existing,
    newValues: data,
    performedById: user.id,
    source: 'user',
  })

  return NextResponse.json({ id: updated.id, availability: updated.availability })
}
