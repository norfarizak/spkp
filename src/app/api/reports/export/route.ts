import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

function csvEscape(s: any): string {
  if (s === null || s === undefined) return ''
  const str = typeof s === 'string' ? s : String(s)
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

// GET /api/reports/export?from=&to=&institutionId=&status=&module=&type=
// type: curriculum | accred | experts | compliance | ai
export async function GET(req: NextRequest) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  const { session } = ctx

  const url = req.nextUrl
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')
  const institutionId = url.searchParams.get('institutionId') || ''
  const status = url.searchParams.get('status') || ''
  const type = url.searchParams.get('type') || 'curriculum'

  const isAdmin = session.roleCodes.includes('SUPER_ADMIN') || session.roleCodes.includes('ADMINISTRATOR')
  const instFilter = isAdmin
    ? (institutionId ? { institutionId } : {})
    : (session.institutionId ? { institutionId: session.institutionId } : { institutionId: 'none' })

  const dateWhere: any = {}
  if (from || to) {
    dateWhere.createdAt = {}
    if (from) dateWhere.createdAt.gte = new Date(from)
    if (to) dateWhere.createdAt.lte = new Date(to)
  }

  let csv = ''
  let filename = 'report'

  if (type === 'curriculum') {
    const programs = await db.program.findMany({
      where: { ...instFilter, ...(status ? { status } : {}) },
      include: { institution: { select: { name: true, code: true } }, createdBy: { select: { fullName: true } } },
      orderBy: { updatedAt: 'desc' },
    })
    filename = `kurikulum-${new Date().toISOString().slice(0, 10)}`
    const headers = ['Kod Program', 'Nama Program', 'Institusi', 'Tahap', 'NOSS', 'Kredit', 'Tempoh (Bulan)', 'Status', 'Versi', 'Dicipta Oleh', 'Dicipta Pada', 'Dikemas Kini']
    const rows = programs.map((p) => [
      p.code, p.name, p.institution?.name || '', p.level || '', p.nossCode || '',
      p.totalCredit, p.durationMonth, p.status, p.version,
      p.createdBy?.fullName || '', new Date(p.createdAt).toISOString(), new Date(p.updatedAt).toISOString(),
    ])
    csv = [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\r\n')
  } else if (type === 'accred') {
    const apps = await db.accreditationApplication.findMany({
      where: { ...instFilter, ...dateWhere },
      include: { institution: { select: { name: true, code: true } }, program: { select: { name: true, code: true } }, applicant: { select: { fullName: true } } },
      orderBy: { submittedAt: 'desc' },
    })
    filename = `pentauliahan-${new Date().toISOString().slice(0, 10)}`
    const headers = ['Kod', 'Institusi', 'Program', 'Jenis', 'Status', 'Pemohon', 'Tarikh Hantar', 'Tarikh Audit', 'Tarikh Lulus', 'Tarikh Tamat']
    const rows = apps.map((a) => [
      a.applicationCode, a.institution?.name || '', a.program?.name || '', a.type, a.status,
      a.applicant?.fullName || '', new Date(a.submittedAt).toISOString(),
      a.auditDate ? new Date(a.auditDate).toISOString() : '',
      a.approvedAt ? new Date(a.approvedAt).toISOString() : '',
      a.expiryDate ? new Date(a.expiryDate).toISOString() : '',
    ])
    csv = [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\r\n')
  } else if (type === 'experts') {
    const experts = await db.expert.findMany({
      include: {
        institution: { select: { name: true } },
        honorariums: { select: { amount: true, status: true, paidAt: true } },
        appointments: { select: { purpose: true, scheduledAt: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    filename = `pakar-${new Date().toISOString().slice(0, 10)}`
    const headers = ['Nama', 'Kategori', 'Bidang', 'Institusi', 'Pengalaman (Tahun)', 'Penilaian', 'Sesi', 'Status', 'Jumlah Honorarium', 'Honorarium Dibayar']
    const rows = experts.map((e) => {
      const total = e.honorariums.reduce((s, h) => s + h.amount, 0)
      const paid = e.honorariums.filter((h) => h.status === 'paid').reduce((s, h) => s + h.amount, 0)
      return [
        e.fullName, e.category, e.expertiseArea, e.institution?.name || '',
        e.experienceYear, e.rating, e.totalSessions, e.status, total, paid,
      ]
    })
    csv = [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\r\n')
  } else if (type === 'compliance') {
    const items = await db.complianceChecklist.findMany({
      include: { application: { include: { institution: { select: { name: true } } } } },
      orderBy: { createdAt: 'desc' },
    })
    filename = `pematuhan-${new Date().toISOString().slice(0, 10)}`
    const headers = ['Institusi', 'Item', 'Keperluan', 'Dipenuhi', 'Bukti', 'Catatan']
    const rows = items.map((c) => [
      c.application?.institution?.name || '', c.item, c.requirement,
      c.isMet ? 'YA' : 'TIDAK', c.evidence || '', c.remarks || '',
    ])
    csv = [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\r\n')
  } else if (type === 'ai') {
    const items = await db.aiGenerationLog.findMany({
      where: dateWhere,
      orderBy: { createdAt: 'desc' },
      take: 1000,
    })
    // Resolve user names (AiGenerationLog has no relation in schema)
    const userIds = Array.from(new Set(items.map((i) => i.userId)))
    const users = userIds.length ? await db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, fullName: true, email: true } }) : []
    const userMap = Object.fromEntries(users.map((u) => [u.id, u]))
    filename = `ai-usage-${new Date().toISOString().slice(0, 10)}`
    const headers = ['Masa', 'Pengguna', 'E-mel', 'Ciri AI', 'Model', 'Token Digunakan', 'Input (Excerpt)', 'Output (Excerpt)']
    const rows = items.map((l) => {
      let inputEx = ''
      let outputEx = ''
      // input/output are Json (object or string); handle both
      const inp: any = typeof l.input === 'string' ? (() => { try { return JSON.parse(l.input) } catch { return l.input } })() : l.input
      const out: any = typeof l.output === 'string' ? (() => { try { return JSON.parse(l.output) } catch { return l.output } })() : l.output
      inputEx = (inp?.message || inp?.cu_id || JSON.stringify(inp) || '').toString().slice(0, 200)
      outputEx = (out?.reply || out?.draft || JSON.stringify(out) || '').toString().slice(0, 200)
      const u = userMap[l.userId]
      return [
        new Date(l.createdAt).toISOString(), u?.fullName || '', u?.email || '',
        l.feature, l.model, l.tokensUsed, inputEx, outputEx,
      ]
    })
    csv = [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\r\n')
  } else {
    return NextResponse.json({ error: 'Jenis eksport tidak sah' }, { status: 400 })
  }

  return new Response('\ufeff' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}.csv"`,
    },
  })
}
