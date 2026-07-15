import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/reports?from=&to=&institutionId=&status=&module=
// Returns aggregated JSON for all report types — also acts as Power BI ready endpoint (FR-M10-02)
export async function GET(req: NextRequest) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  const { session } = ctx

  const url = req.nextUrl
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')
  const institutionId = url.searchParams.get('institutionId') || ''
  const status = url.searchParams.get('status') || ''
  const moduleFilter = url.searchParams.get('module') || ''

  // Base date filter
  const dateWhere: any = {}
  if (from || to) {
    dateWhere.createdAt = {}
    if (from) dateWhere.createdAt.gte = new Date(from)
    if (to) dateWhere.createdAt.lte = new Date(to)
  }

  // Institution scoping (admin sees all, otherwise restricted)
  const isAdmin = session.roleCodes.includes('SUPER_ADMIN') || session.roleCodes.includes('ADMINISTRATOR')
  const instFilter = isAdmin
    ? (institutionId ? { institutionId } : {})
    : (session.institutionId ? { institutionId: session.institutionId } : { institutionId: 'none' })

  // =================== 1. Status Kurikulum mengikut Institusi/Program ===================
  const programInstStatus = await db.program.groupBy({
    by: ['institutionId', 'status'],
    _count: true,
    where: { ...instFilter, ...(status ? { status } : {}) },
  })
  const institutions = await db.institution.findMany({
    where: isAdmin ? (institutionId ? { id: institutionId } : {}) : (session.institutionId ? { id: session.institutionId } : {}),
    select: { id: true, name: true, code: true },
  })
  const instMap = Object.fromEntries(institutions.map((i) => [i.id, i]))
  const curriculumByInst = institutions.map((i) => {
    const rows = programInstStatus.filter((p) => p.institutionId === i.id)
    return {
      institution: i.name,
      code: i.code,
      draft: rows.filter((r) => r.status === 'draft').reduce((s, r) => s + r._count, 0),
      review: rows.filter((r) => r.status === 'review').reduce((s, r) => s + r._count, 0),
      approved: rows.filter((r) => r.status === 'approved').reduce((s, r) => s + r._count, 0),
      rejected: rows.filter((r) => r.status === 'rejected').reduce((s, r) => s + r._count, 0),
      archived: rows.filter((r) => r.status === 'archived').reduce((s, r) => s + r._count, 0),
      total: rows.reduce((s, r) => s + r._count, 0),
    }
  })

  // =================== 2. Prestasi Pentauliahan ===================
  const accredStatusGroups = await db.accreditationApplication.groupBy({
    by: ['status'],
    _count: true,
    where: { ...instFilter, ...dateWhere },
  })
  const accredsWithDates = await db.accreditationApplication.findMany({
    where: { ...instFilter, approvedAt: { not: null } },
    select: { submittedAt: true, approvedAt: true, status: true },
  })
  const avgProcessingDays = accredsWithDates.length
    ? accredsWithDates.reduce((s, a) => {
        const days = a.approvedAt ? (a.approvedAt.getTime() - a.submittedAt.getTime()) / (1000 * 60 * 60 * 24) : 0
        return s + days
      }, 0) / accredsWithDates.length
    : 0
  const accredPerformance = {
    breakdown: accredStatusGroups.map((g) => ({ status: g.status, count: g._count })),
    kelulusan: accredStatusGroups.find((g) => g.status === 'approved')?._count || 0,
    penolakan: accredStatusGroups.find((g) => g.status === 'rejected')?._count || 0,
    dalamProses: accredStatusGroups.filter((g) => !['approved', 'rejected', 'expired'].includes(g.status)).reduce((s, g) => s + g._count, 0),
    avgProcessingDays: Math.round(avgProcessingDays * 10) / 10,
  }

  // =================== 3. Aktiviti Panel Pakar & Honorarium ===================
  const expertCategoryGroups = await db.expert.groupBy({
    by: ['category'],
    _count: true,
    where: { ...(institutionId ? { institutionId } : {}) },
  })
  const honorariums = await db.expertHonorarium.findMany({
    select: { amount: true, status: true, expert: { select: { category: true, fullName: true } } },
  })
  const totalHonorarium = honorariums.reduce((s, h) => s + h.amount, 0)
  const paidHonorarium = honorariums.filter((h) => h.status === 'paid').reduce((s, h) => s + h.amount, 0)
  const honorariumByCategory = ['Industri', 'Akademik', 'Penilai'].map((cat) => ({
    category: cat,
    amount: honorariums.filter((h) => h.expert.category === cat).reduce((s, h) => s + h.amount, 0),
    count: honorariums.filter((h) => h.expert.category === cat).length,
  }))
  const expertActivity = {
    totalExperts: expertCategoryGroups.reduce((s, g) => s + g._count, 0),
    byCategory: expertCategoryGroups.map((g) => ({ category: g.category, count: g._count })),
    totalHonorarium,
    paidHonorarium,
    pendingHonorarium: honorariums.filter((h) => h.status === 'pending').reduce((s, h) => s + h.amount, 0),
    honorariumByCategory,
  }

  // =================== 4. Audit & Pematuhan ===================
  const complianceChecklists = await db.complianceChecklist.findMany({
    select: { isMet: true, application: { select: { institution: { select: { name: true } } } } },
  })
  const totalChecks = complianceChecklists.length
  const passedChecks = complianceChecklists.filter((c) => c.isMet).length
  const auditFindings = await db.auditFinding.findMany({
    select: { severity: true, status: true, category: true },
  })
  const findingsBySeverity = ['low', 'medium', 'high', 'critical'].map((sev) => ({
    severity: sev,
    count: auditFindings.filter((f) => f.severity === sev).length,
  }))
  const findingsByStatus = ['open', 'in_progress', 'resolved'].map((s) => ({
    status: s,
    count: auditFindings.filter((f) => f.status === s).length,
  }))
  const complianceData = {
    totalChecks,
    passedChecks,
    failedChecks: totalChecks - passedChecks,
    passRate: totalChecks ? Math.round((passedChecks / totalChecks) * 1000) / 10 : 0,
    findingsBySeverity,
    findingsByStatus,
    totalFindings: auditFindings.length,
  }

  // =================== 5. Penggunaan AI ===================
  const aiLogs = await db.aiGenerationLog.findMany({
    where: dateWhere,
    select: { feature: true, tokensUsed: true, createdAt: true, userId: true },
  })
  const features = ['wim_generator', 'curriculum_generator', 'rubric', 'mapping', 'chat', 'smart_search']
  const aiUsage = features.map((f) => {
    const items = aiLogs.filter((l) => l.feature === f)
    return {
      feature: f,
      count: items.length,
      tokens: items.reduce((s, l) => s + l.tokensUsed, 0),
    }
  }).filter((x) => x.count > 0)
  const aiSummary = {
    totalGenerations: aiLogs.length,
    totalTokens: aiLogs.reduce((s, l) => s + l.tokensUsed, 0),
    byFeature: aiUsage,
  }

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    dateRange: { from: from || null, to: to || null },
    filters: { institutionId, status, module: moduleFilter },
    scope: isAdmin ? (institutionId ? 'institution' : 'national') : 'institution',
    curriculumByInst,
    accredPerformance,
    expertActivity,
    complianceData,
    aiSummary,
    institutions: institutions.map((i) => ({ id: i.id, name: i.name, code: i.code })),
  })
}
