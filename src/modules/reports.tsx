'use client'
import { useEffect, useState, useCallback } from 'react'
import { GlassCard, PageHeader, EmptyState } from '@/components/glass'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { toast } from 'sonner'
import {
  BarChart3, Download, Printer, FileText, Award, Users, ShieldCheck, Bot,
  Loader2, Database, Calendar, RefreshCw, Building2, FileSpreadsheet, TrendingUp,
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend, LineChart, Line, RadialBarChart, RadialBar,
} from 'recharts'

const PALETTE = {
  cyan: '#00c2a8',
  blue: '#2d8fd6',
  amber: '#e6b41e',
  red: '#e63946',
  purple: '#9b59b6',
}
const CHART_PALETTE = [PALETTE.cyan, PALETTE.blue, PALETTE.amber, PALETTE.red, PALETTE.purple, '#3498db', '#1abc9c']

const STATUS_COLORS: Record<string, string> = {
  draft: '#7895b2', review: PALETTE.amber, approved: PALETTE.cyan,
  rejected: PALETTE.red, archived: '#6b7280', submitted: PALETTE.blue,
  audit: PALETTE.purple, self_assessment: '#3498db', expired: '#b04646', correction: '#f59e0b',
}

const TOOLTIP_STYLE = {
  background: 'rgba(10,30,70,0.9)',
  border: '1px solid rgba(0,194,168,0.4)',
  borderRadius: '10px',
  color: '#fff',
  fontSize: '12px',
}

interface ReportData {
  generatedAt: string
  dateRange: { from: string | null; to: string | null }
  filters: { institutionId: string; status: string; module: string }
  scope: string
  curriculumByInst: Array<{ institution: string; code: string; draft: number; review: number; approved: number; rejected: number; archived: number; total: number }>
  accredPerformance: {
    breakdown: Array<{ status: string; count: number }>
    kelulusan: number
    penolakan: number
    dalamProses: number
    avgProcessingDays: number
  }
  expertActivity: {
    totalExperts: number
    byCategory: Array<{ category: string; count: number }>
    totalHonorarium: number
    paidHonorarium: number
    pendingHonorarium: number
    honorariumByCategory: Array<{ category: string; amount: number; count: number }>
  }
  complianceData: {
    totalChecks: number
    passedChecks: number
    failedChecks: number
    passRate: number
    findingsBySeverity: Array<{ severity: string; count: number }>
    findingsByStatus: Array<{ status: string; count: number }>
    totalFindings: number
  }
  aiSummary: {
    totalGenerations: number
    totalTokens: number
    byFeature: Array<{ feature: string; count: number; tokens: number }>
  }
  institutions: Array<{ id: string; name: string; code: string }>
}

function fmtMYR(n: number) {
  return new Intl.NumberFormat('ms-MY', { style: 'currency', currency: 'MYR', maximumFractionDigits: 0 }).format(n)
}

export function ReportsModule() {
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ from: '', to: '', institutionId: '', status: '', module: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.from) params.set('from', filters.from)
      if (filters.to) params.set('to', filters.to)
      if (filters.institutionId) params.set('institutionId', filters.institutionId)
      if (filters.status) params.set('status', filters.status)
      if (filters.module) params.set('module', filters.module)
      const r = await fetch(`/api/reports?${params.toString()}`, { credentials: 'include' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Ralat')
      setData(d)
    } catch (e: any) {
      toast.error(e.message || 'Gagal memuatkan laporan')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { load() }, [load])

  async function exportCsv(type: string, label: string) {
    try {
      const params = new URLSearchParams()
      params.set('type', type)
      if (filters.from) params.set('from', filters.from)
      if (filters.to) params.set('to', filters.to)
      if (filters.institutionId) params.set('institutionId', filters.institutionId)
      if (filters.status) params.set('status', filters.status)
      const r = await fetch(`/api/reports/export?${params.toString()}`, { credentials: 'include' })
      if (!r.ok) throw new Error('Ralat eksport')
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${type}-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(`Eksport ${label} berjaya`)
    } catch (e: any) {
      toast.error(e.message || 'Gagal eksport')
    }
  }

  function printReport() {
    window.print()
    toast.info('Dialog cetakan dibuka')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={BarChart3}
        title="Pelaporan & Analitik"
        description="Laporan komprehensif kurikulum, pentauliahan, pakar, pematuhan & penggunaan AI"
        actions={
          <>
            <Button variant="outline" className="border-white/20 text-cyan-100 hover:bg-white/10" onClick={printReport}>
              <Printer className="w-4 h-4 mr-2" /> Cetak / PDF
            </Button>
            <Button variant="outline" className="border-white/20 text-cyan-100 hover:bg-white/10" onClick={load}>
              <RefreshCw className="w-4 h-4 mr-2" /> Muat Semula
            </Button>
          </>
        }
      />

      {/* Filters (FR-M10-03) */}
      <GlassCard className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-cyan-100/60" />
            <Input type="date" value={filters.from} onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))} className="bg-white/8 border-white/15 text-white h-9" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-cyan-100/50 text-xs">hingga</span>
            <Input type="date" value={filters.to} onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))} className="bg-white/8 border-white/15 text-white h-9" />
          </div>
          <Select value={filters.institutionId} onValueChange={(v) => setFilters((f) => ({ ...f, institutionId: v === 'all' ? '' : v }))}>
            <SelectTrigger className="bg-white/8 border-white/15 text-white h-9"><SelectValue placeholder="Semua Institusi" /></SelectTrigger>
            <SelectContent className="glass-strong border-white/20 text-white">
              <SelectItem value="all">Semua Institusi</SelectItem>
              {data?.institutions?.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.status} onValueChange={(v) => setFilters((f) => ({ ...f, status: v === 'all' ? '' : v }))}>
            <SelectTrigger className="bg-white/8 border-white/15 text-white h-9"><SelectValue placeholder="Semua Status" /></SelectTrigger>
            <SelectContent className="glass-strong border-white/20 text-white">
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="draft">Draf</SelectItem>
              <SelectItem value="review">Semakan</SelectItem>
              <SelectItem value="approved">Lulus</SelectItem>
              <SelectItem value="rejected">Ditolak</SelectItem>
              <SelectItem value="archived">Arkib</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.module} onValueChange={(v) => setFilters((f) => ({ ...f, module: v === 'all' ? '' : v }))}>
            <SelectTrigger className="bg-white/8 border-white/15 text-white h-9"><SelectValue placeholder="Semua Modul" /></SelectTrigger>
            <SelectContent className="glass-strong border-white/20 text-white">
              <SelectItem value="all">Semua Modul</SelectItem>
              <SelectItem value="curriculum">Kurikulum</SelectItem>
              <SelectItem value="wim">WIM</SelectItem>
              <SelectItem value="accreditation">Pentauliahan</SelectItem>
              <SelectItem value="experts">Pakar</SelectItem>
              <SelectItem value="ai">AI</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {data && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
            <div className="text-[10px] text-cyan-100/60 flex items-center gap-2">
              <Database className="w-3 h-3" /> Skop: <Badge className="bg-cyan-500/15 text-cyan-200 border-cyan-400/30 uppercase text-[9px]">{data.scope}</Badge>
              <span className="text-cyan-100/40">·</span>
              <span>Dijana: {new Date(data.generatedAt).toLocaleString('ms-MY')}</span>
            </div>
            <Button variant="ghost" size="sm" className="text-cyan-100 hover:bg-white/10" onClick={() => setFilters({ from: '', to: '', institutionId: '', status: '', module: '' })}>
              Reset
            </Button>
          </div>
        )}
      </GlassCard>

      {loading || !data ? (
        <GlassCard className="p-12 text-center">
          <Loader2 className="w-8 h-8 text-cyan-300 animate-spin mx-auto mb-3" />
          <div className="text-cyan-100/70 text-sm">Memuatkan data laporan...</div>
        </GlassCard>
      ) : (
        <Tabs defaultValue="curriculum" className="space-y-4">
          <TabsList className="glass border border-white/15 p-1 h-auto flex-wrap">
            <TabsTrigger value="curriculum" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-200 text-cyan-100/70">
              <FileText className="w-4 h-4 mr-2" /> Status Kurikulum
            </TabsTrigger>
            <TabsTrigger value="accred" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-200 text-cyan-100/70">
              <Award className="w-4 h-4 mr-2" /> Prestasi Pentauliahan
            </TabsTrigger>
            <TabsTrigger value="experts" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-200 text-cyan-100/70">
              <Users className="w-4 h-4 mr-2" /> Panel Pakar
            </TabsTrigger>
            <TabsTrigger value="compliance" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-200 text-cyan-100/70">
              <ShieldCheck className="w-4 h-4 mr-2" /> Audit & Pematuhan
            </TabsTrigger>
            <TabsTrigger value="ai" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-200 text-cyan-100/70">
              <Bot className="w-4 h-4 mr-2" /> Penggunaan AI
            </TabsTrigger>
          </TabsList>

          {/* 1. Status Kurikulum */}
          <TabsContent value="curriculum" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <KpiBox label="Jumlah Institusi" value={data.curriculumByInst.length} color={PALETTE.cyan} icon={Building2} />
              <KpiBox label="Jumlah Program" value={data.curriculumByInst.reduce((s, c) => s + c.total, 0)} color={PALETTE.blue} icon={FileText} />
              <KpiBox label="Lulus" value={data.curriculumByInst.reduce((s, c) => s + c.approved, 0)} color={PALETTE.cyan} icon={TrendingUp} />
              <KpiBox label="Dalam Semakan" value={data.curriculumByInst.reduce((s, c) => s + c.review, 0)} color={PALETTE.amber} icon={FileText} />
              <KpiBox label="Ditolak/Arkib" value={data.curriculumByInst.reduce((s, c) => s + c.rejected + c.archived, 0)} color={PALETTE.red} icon={FileText} />
            </div>
            <GlassCard className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-cyan-300" /> Status Kurikulum mengikut Institusi
                </div>
                <Button size="sm" variant="outline" className="border-cyan-400/30 text-cyan-200 hover:bg-cyan-500/10" onClick={() => exportCsv('curriculum', 'Kurikulum')}>
                  <Download className="w-3 h-3 mr-1" /> CSV
                </Button>
              </div>
              {data.curriculumByInst.length === 0 ? (
                <EmptyState icon={FileText} title="Tiada data kurikulum" />
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(260, data.curriculumByInst.length * 50)}>
                  <BarChart data={data.curriculumByInst} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                    <XAxis type="number" stroke="rgba(255,255,255,0.5)" fontSize={11} />
                    <YAxis type="category" dataKey="institution" stroke="rgba(255,255,255,0.7)" fontSize={10} width={120} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ fontSize: '11px', color: '#fff' }} />
                    <Bar dataKey="draft" stackId="a" fill={STATUS_COLORS.draft} name="Draf" />
                    <Bar dataKey="review" stackId="a" fill={STATUS_COLORS.review} name="Semakan" />
                    <Bar dataKey="approved" stackId="a" fill={STATUS_COLORS.approved} name="Lulus" />
                    <Bar dataKey="rejected" stackId="a" fill={STATUS_COLORS.rejected} name="Ditolak" />
                    <Bar dataKey="archived" stackId="a" fill={STATUS_COLORS.archived} name="Arkib" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </GlassCard>
          </TabsContent>

          {/* 2. Prestasi Pentauliahan */}
          <TabsContent value="accred" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiBox label="Kelulusan" value={data.accredPerformance.kelulusan} color={PALETTE.cyan} icon={Award} />
              <KpiBox label="Penolakan" value={data.accredPerformance.penolakan} color={PALETTE.red} icon={Award} />
              <KpiBox label="Dalam Proses" value={data.accredPerformance.dalamProses} color={PALETTE.amber} icon={Award} />
              <KpiBox label="Purata Proses (hari)" value={data.accredPerformance.avgProcessingDays} color={PALETTE.blue} icon={TrendingUp} />
            </div>
            <div className="grid lg:grid-cols-2 gap-4">
              <GlassCard className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-semibold text-white">pecahan Status Pentauliahan</div>
                  <Button size="sm" variant="outline" className="border-cyan-400/30 text-cyan-200 hover:bg-cyan-500/10" onClick={() => exportCsv('accred', 'Pentauliahan')}>
                    <Download className="w-3 h-3 mr-1" /> CSV
                  </Button>
                </div>
                {data.accredPerformance.breakdown.length === 0 ? (
                  <EmptyState icon={Award} title="Tiada data pentauliahan" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={data.accredPerformance.breakdown}
                        dataKey="count"
                        nameKey="status"
                        cx="50%" cy="50%"
                        outerRadius={100} innerRadius={55}
                        paddingAngle={3}
                        label={(e: any) => `${e.status}: ${e.count}`}
                        labelLine={false}
                      >
                        {data.accredPerformance.breakdown.map((e, i) => (
                          <Cell key={i} fill={STATUS_COLORS[e.status] || CHART_PALETTE[i]} stroke="rgba(255,255,255,0.2)" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </GlassCard>
              <GlassCard className="p-4">
                <div className="text-sm font-semibold text-white mb-3">Kadar Kelulusan vs Penolakan</div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[
                    { name: 'Lulus', value: data.accredPerformance.kelulusan, fill: PALETTE.cyan },
                    { name: 'Ditolak', value: data.accredPerformance.penolakan, fill: PALETTE.red },
                    { name: 'Dalam Proses', value: data.accredPerformance.dalamProses, fill: PALETTE.amber },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.7)" fontSize={11} />
                    <YAxis stroke="rgba(255,255,255,0.5)" fontSize={11} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </GlassCard>
            </div>
          </TabsContent>

          {/* 3. Panel Pakar & Honorarium */}
          <TabsContent value="experts" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiBox label="Jumlah Pakar" value={data.expertActivity.totalExperts} color={PALETTE.cyan} icon={Users} />
              <KpiBox label="Jumlah Honorarium" value={fmtMYR(data.expertActivity.totalHonorarium)} color={PALETTE.blue} icon={FileSpreadsheet} small />
              <KpiBox label="Telah Dibayar" value={fmtMYR(data.expertActivity.paidHonorarium)} color={PALETTE.cyan} icon={FileSpreadsheet} small />
              <KpiBox label="Belum Dibayar" value={fmtMYR(data.expertActivity.pendingHonorarium)} color={PALETTE.red} icon={FileSpreadsheet} small />
            </div>
            <div className="grid lg:grid-cols-2 gap-4">
              <GlassCard className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-semibold text-white">Honorarium Mengikut Kategori Pakar</div>
                  <Button size="sm" variant="outline" className="border-cyan-400/30 text-cyan-200 hover:bg-cyan-500/10" onClick={() => exportCsv('experts', 'Pakar')}>
                    <Download className="w-3 h-3 mr-1" /> CSV
                  </Button>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.expertActivity.honorariumByCategory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="category" stroke="rgba(255,255,255,0.7)" fontSize={11} />
                    <YAxis stroke="rgba(255,255,255,0.5)" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => fmtMYR(Number(v))} />
                    <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                      {data.expertActivity.honorariumByCategory.map((_, i) => (
                        <Cell key={i} fill={CHART_PALETTE[i]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </GlassCard>
              <GlassCard className="p-4">
                <div className="text-sm font-semibold text-white mb-3">pecahan Pakar Mengikut Kategori</div>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={data.expertActivity.byCategory}
                      dataKey="count"
                      nameKey="category"
                      cx="50%" cy="50%"
                      outerRadius={95} innerRadius={50}
                      paddingAngle={3}
                      label={(e: any) => `${e.category}: ${e.count}`}
                      labelLine={false}
                    >
                      {data.expertActivity.byCategory.map((_, i) => (
                        <Cell key={i} fill={CHART_PALETTE[i]} stroke="rgba(255,255,255,0.2)" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ fontSize: '11px', color: '#fff' }} />
                  </PieChart>
                </ResponsiveContainer>
              </GlassCard>
            </div>
          </TabsContent>

          {/* 4. Audit & Pematuhan */}
          <TabsContent value="compliance" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiBox label="Jumlah Semakan" value={data.complianceData.totalChecks} color={PALETTE.blue} icon={ShieldCheck} />
              <KpiBox label="Lulus" value={data.complianceData.passedChecks} color={PALETTE.cyan} icon={ShieldCheck} />
              <KpiBox label="Gagal" value={data.complianceData.failedChecks} color={PALETTE.red} icon={ShieldCheck} />
              <KpiBox label="Kadar Lulus %" value={data.complianceData.passRate + '%'} color={PALETTE.amber} icon={TrendingUp} small />
            </div>
            <div className="grid lg:grid-cols-3 gap-4">
              <GlassCard className="p-4 lg:col-span-1">
                <div className="text-sm font-semibold text-white mb-3">Kadar Pematuhan</div>
                <ResponsiveContainer width="100%" height={240}>
                  <RadialBarChart
                    innerRadius="55%"
                    outerRadius="100%"
                    data={[{ name: 'Lulus', value: data.complianceData.passRate, fill: PALETTE.cyan }]}
                    startAngle={90}
                    endAngle={-270}
                  >
                    <RadialBar background={{ fill: 'rgba(255,255,255,0.08)' }} dataKey="value" cornerRadius={10} />
                    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize="32" fontWeight="bold">
                      {data.complianceData.passRate}%
                    </text>
                  </RadialBarChart>
                </ResponsiveContainer>
              </GlassCard>
              <GlassCard className="p-4 lg:col-span-2">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-semibold text-white">penuhan Mengikut Keterukan</div>
                  <Button size="sm" variant="outline" className="border-cyan-400/30 text-cyan-200 hover:bg-cyan-500/10" onClick={() => exportCsv('compliance', 'Pematuhan')}>
                    <Download className="w-3 h-3 mr-1" /> CSV
                  </Button>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data.complianceData.findingsBySeverity}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="severity" stroke="rgba(255,255,255,0.7)" fontSize={11} />
                    <YAxis stroke="rgba(255,255,255,0.5)" fontSize={11} allowDecimals={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      <Cell fill="#3498db" />
                      <Cell fill={PALETTE.amber} />
                      <Cell fill="#f39c12" />
                      <Cell fill={PALETTE.red} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]">
                  {data.complianceData.findingsByStatus.map((f) => (
                    <div key={f.status} className="glass-subtle p-2 rounded text-center">
                      <div className="text-white font-bold text-lg">{f.count}</div>
                      <div className="text-cyan-100/60 uppercase">{f.status.replace('_', ' ')}</div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>
          </TabsContent>

          {/* 5. Penggunaan AI */}
          <TabsContent value="ai" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <KpiBox label="Jumlah Penjanaan" value={data.aiSummary.totalGenerations} color={PALETTE.purple} icon={Bot} />
              <KpiBox label="Jumlah Token" value={data.aiSummary.totalTokens.toLocaleString()} color={PALETTE.cyan} icon={Database} small />
              <KpiBox label="Ciri AI Aktif" value={data.aiSummary.byFeature.length} color={PALETTE.amber} icon={Bot} />
            </div>
            <GlassCard className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-white flex items-center gap-2">
                  <Bot className="w-4 h-4 text-purple-300" /> Penggunaan AI Mengikut Ciri
                </div>
                <Button size="sm" variant="outline" className="border-cyan-400/30 text-cyan-200 hover:bg-cyan-500/10" onClick={() => exportCsv('ai', 'AI')}>
                  <Download className="w-3 h-3 mr-1" /> CSV
                </Button>
              </div>
              {data.aiSummary.byFeature.length === 0 ? (
                <EmptyState icon={Bot} title="Tiada aktiviti AI direkodkan" hint="Cuba jana kandungan melalui modul AI Assistant." />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.aiSummary.byFeature}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="feature" stroke="rgba(255,255,255,0.7)" fontSize={10} />
                    <YAxis stroke="rgba(255,255,255,0.5)" fontSize={11} allowDecimals={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ fontSize: '11px', color: '#fff' }} />
                    <Bar dataKey="count" fill={PALETTE.purple} name="Penjanaan" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="tokens" fill={PALETTE.cyan} name="Token" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </GlassCard>
          </TabsContent>
        </Tabs>
      )}

      {/* Power BI notice */}
      <GlassCard className="p-4 border border-cyan-400/20">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
            <Database className="w-4 h-4 text-cyan-300" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-white">Endpoint Power BI (FR-M10-02)</div>
            <div className="text-xs text-cyan-100/70 mt-0.5">
              Semua data laporan tersedia sebagai JSON melalui endpoint <code className="bg-black/30 px-1.5 py-0.5 rounded text-cyan-200 text-[10px]">/api/reports</code> untuk integrasi Power BI / Tableau / Looker.
              Gunakan parameter <code className="bg-black/30 px-1.5 py-0.5 rounded text-cyan-200 text-[10px]">?from=&amp;to=&amp;institutionId=&amp;status=&amp;module=</code> untuk menapis data.
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  )
}

function KpiBox({ label, value, color, icon: Icon, small }: { label: string; value: any; color: string; icon: any; small?: boolean }) {
  return (
    <GlassCard className="p-4 relative overflow-hidden">
      <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full opacity-20 blur-xl" style={{ background: color }} />
      <div className="flex items-center justify-between mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}22`, border: `1px solid ${color}44` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
      </div>
      <div className={`font-bold text-white ${small ? 'text-base' : 'text-2xl'}`}>{value}</div>
      <div className="text-[10px] text-cyan-100/70 uppercase tracking-wider mt-0.5">{label}</div>
    </GlassCard>
  )
}
