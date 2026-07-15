import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, logAudit, sanitizeText, isAdmin, hasRole, ROLE_CODES } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/experts — list with filters (search, category, availability)
export async function GET(req: NextRequest) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })

  const url = new URL(req.url)
  const q = (url.searchParams.get('q') || '').trim()
  const category = url.searchParams.get('category') || ''
  const availability = url.searchParams.get('availability') || ''
  const institutionId = url.searchParams.get('institutionId') || ''

  const where: any = {}
  if (category) where.category = category
  if (availability) where.availability = availability
  if (institutionId) where.institutionId = institutionId
  if (q) {
    where.OR = [
      { fullName: { contains: q } },
      { email: { contains: q } },
      { expertiseArea: { contains: q } },
      { organization: { contains: q } },
      { icNumber: { contains: q } },
    ]
  }

  const experts = await db.expert.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      institution: { select: { id: true, name: true, code: true } },
      _count: { select: { appointments: true, evaluations: true, honorariums: true } },
    },
  })

  return NextResponse.json({
    items: experts.map((e) => ({
      id: e.id,
      userId: e.userId,
      fullName: e.fullName,
      icNumber: e.icNumber,
      email: e.email,
      phone: e.phone,
      category: e.category,
      expertiseArea: e.expertiseArea,
      qualification: e.qualification,
      experienceYear: e.experienceYear,
      organization: e.organization,
      availability: e.availability,
      rating: e.rating,
      totalSessions: e.totalSessions,
      status: e.status,
      institution: e.institution ? { id: e.institution.id, name: e.institution.name } : null,
      counts: {
        appointments: e._count.appointments,
        evaluations: e._count.evaluations,
        honorariums: e._count.honorariums,
      },
    })),
  })
}

// POST /api/experts — create new expert (admin / pegawai only)
export async function POST(req: NextRequest) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  const { user, session } = ctx

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
  if (!canManage) {
    return NextResponse.json({ error: 'Anda tidak dibenarkan mengurus panel pakar' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({} as any))
  const fullName = sanitizeText(body.fullName || '').trim()
  const icNumber = sanitizeText(body.icNumber || '').trim()
  const email = sanitizeText(body.email || '').trim().toLowerCase()
  const phone = sanitizeText(body.phone || '').trim()
  const category = sanitizeText(body.category || '').trim()
  const expertiseArea = sanitizeText(body.expertiseArea || '').trim()
  const qualification = sanitizeText(body.qualification || '').trim()
  const organization = sanitizeText(body.organization || '').trim()
  const experienceYear = Number(body.experienceYear || 0)
  const institutionId = sanitizeText(body.institutionId || '').trim() || null
  const userId = sanitizeText(body.userId || '').trim() || null
  const availability = sanitizeText(body.availability || 'available').trim()

  if (!fullName) return NextResponse.json({ error: 'Nama penuh diperlukan' }, { status: 400 })
  if (!['Industri', 'Akademik', 'Penilai'].includes(category)) {
    return NextResponse.json({ error: 'Kategori tidak sah' }, { status: 400 })
  }
  if (!expertiseArea) return NextResponse.json({ error: 'Bidang kepakaran diperlukan' }, { status: 400 })

  // Validate institution if provided
  if (institutionId) {
    const inst = await db.institution.findUnique({ where: { id: institutionId } })
    if (!inst) return NextResponse.json({ error: 'Institusi tidak dijumpai' }, { status: 404 })
  }

  // Validate userId if provided
  if (userId) {
    const u = await db.user.findUnique({ where: { id: userId } })
    if (!u) return NextResponse.json({ error: 'Pengguna tidak dijumpai' }, { status: 404 })
  }

  const created = await db.expert.create({
    data: {
      fullName,
      icNumber: icNumber || null,
      email: email || null,
      phone: phone || null,
      category,
      expertiseArea,
      qualification: qualification || null,
      organization: organization || null,
      experienceYear,
      institutionId,
      userId,
      availability,
      status: 'active',
    },
  })

  await logAudit({
    tableName: 'experts',
    recordId: created.id,
    action: 'INSERT',
    newValues: { fullName, category, expertiseArea, organization },
    performedById: user.id,
    source: 'user',
  })

  return NextResponse.json({ id: created.id, fullName: created.fullName })
}
