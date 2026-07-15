'use client'
import { Fragment, useEffect, useState, useCallback } from 'react'
import { GlassCard, PageHeader, EmptyState } from '@/components/glass'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { toast } from 'sonner'
import {
  ShieldCheck, ShieldAlert, Download, Filter, Loader2, Lock, Bot, User,
  Activity, FileBarChart, ChevronDown, ChevronRight, Database,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

interface AuditItem {
  id: string
  tableName: string
  recordId: string
  action: string
  oldValues?: string | null
  newValues?: string | null
  performedBy?: { name: string; email: string } | null
  performedAt: string
  ipAddress?: string | null
  source: string
}

interface ReportData {
  total: number
  byTable: { label: string; count: number }[]
  byAction: { label: string; count: number }[]
  bySource: { label: string; count: number }[]
  byUser: { id: string | null; name: string; email?: string; count: number }[]
  aiActivity: { id: string; tableName: string; recordId: string; action: string; by?: string; at: string }[]
  dateRange: { from: string | null; to: string | null }
}

const SOURCE_META: Record<string, { label: string; color: string; icon: any }> = {
  user: { label: 'Pengguna', color: '#2d8fd6', icon: User },
  AI_GENERATED: { label: 'AI', color: '#9b59b6', icon: Bot },
  system: { label: 'Sistem', color: '#7895b2', icon: Activity },
}

const ACTION_META: Record<string, { color: string; label: string }> = {
  INSERT: { color: '#00c2a8', label: 'Cipta' },
  UPDATE: { color: '#e6b41e', label: 'Kemas Kini' },
  DELETE: { color: '#e63946', label: 'Padam' },
}

const PALETTE = ['#00c2a8', '#2d8fd6', '#e6b41e', '#e63946', '#9b59b6', '#3498db', '#1abc9c', '#f39c12']

export function AuditModule() {
  const [items, setItems] = useState<AuditItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ tableName: '', action: '', source: '', search: '', from: '', to: '' })
  const [expanded, setExpanded] = useState<string | null>(null)
  const [detailItem, setDetailItem] = useState<AuditItem | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [report, setReport] = useState<ReportData | null>(null)
  const [reportLoading, setReportLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.tableName) params.set('tableName', filters.tableName)
      if (filters.action) params.set('action', filters.action)
      if (filters.source) params.set('source', filters.source)
      if (filters.from) params.set('from', filters.from)
      if (filters.to) params.set('to', filters.to)
      if (filters.search) params.set('search', filters.search)
      params.set('pageSize', '100')
      const r = await fetch(`/api/audit?${params.toString()}`, { credentials: 'include' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Ralat')
      setItems(d.items || [])
      setTotal(d.total || 0)
    } catch (e: any) {
      toast.error(e.message || 'Gagal memuatkan log audit')
    } finally {
      setLoading(false)
    }
  }, [filters])

  const loadReport = useCallback(async () => {
    setReportLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.from) params.set('from', filters.from)
      if (filters.to) params.set('to', filters.to)
      const r = await fetch(`/api/audit/report?${params.toString()}`, { credentials: 'include' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Ralat')
      setReport(d)
    } catch (e: any) {
      toast.error(e.message || 'Gagal memuatkan laporan')
    } finally {
      setReportLoading(false)
    }
  }, [filters.from, filters.to])

  useEffect(() => { load() }, [load])
  useEffect(() => { loadReport() }, [loadReport])

  function openDetail(item: AuditItem) {
    setDetailItem(item)
    setDetailOpen(true)
  }

  async function exportCsv() {
    try {
      const params = new URLSearchParams()
      if (filters.tableName) params.set('tableName', filters.tableName)
      if (filters.action) params.set('action', filters.action)
      if (filters.source) params.set('source', filters.source)
      if (filters.from) params.set('from', filters.from)
      if (filters.to) params.set('to', filters.to)
      const r = await fetch(`/api/audit/export?${params.toString()}`, { credentials: 'include' })
      if (!r.ok) throw new Error('Ralat eksport')
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Eksport CSV berjaya dimuat turun')
    } catch (e: any) {
      toast.error(e.message || 'Gagal eksport')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ShieldCheck}
        title="Audit & Pematuhan"
        description="Log audit immutable · Jejak aktiviti pengguna, AI & sistem"
        actions={
          <Button variant="outline" className="border-white/20 text-cyan-100 hover:bg-white/10" onClick={exportCsv}>
            <Download className="w-4 h-4 mr-2" /> Eksport CSV
          </Button>
        }
      />

      {/* Immutability banner (FR-M13-03) */}
      <div className="glass-strong border border-emerald-400/30 rounded-xl p-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
          <Lock className="w-4 h-4 text-emerald-300" />
        </div>
        <div>
          <div className="text-sm font-semibold text-white">Log Audit Tidak Boleh Diubah (Immutable)</div>
          <div className="text-xs text-cyan-100/70 mt-0.5">
            Semua log audit hanya boleh ditambah (INSERT) dan tidak boleh diubahsuai atau dipadam.
            Ini bagi memastikan integriti jejak audit untuk pematuhan PDPA dan ISO 27001.
            Sebarang percubaan mengubahsuai akan direkodkan sebagai aktiviti tersendiri.
          </div>
        </div>
      </div>

      <Tabs defaultValue="logs" className="space-y-4">
        <TabsList className="glass border border-white/15 p-1 h-auto">
          <TabsTrigger value="logs" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-200 text-cyan-100/70">
            <Activity className="w-4 h-4 mr-2" /> Log Aktiviti
          </TabsTrigger>
          <TabsTrigger value="report" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-200 text-cyan-100/70">
            <FileBarChart className="w-4 h-4 mr-2" /> Laporan Pematuhan
          </TabsTrigger>
          <TabsTrigger value="ai" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-200 text-cyan-100/70">
            <Bot className="w-4 h-4 mr-2" /> Aktiviti AI
          </TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-4">
          {/* Filters */}
          <GlassCard className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
              <Input placeholder="Cari record ID / IP..." value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} className="bg-white/8 border-white/15 text-white placeholder:text-white/40 md:col-span-2 h-9" />
              <Input placeholder="Nama Jadual" value={filters.tableName} onChange={(e) => setFilters((f) => ({ ...f, tableName: e.target.value }))} className="bg-white/8 border-white/15 text-white placeholder:text-white/40 h-9" />
              <Select value={filters.action} onValueChange={(v) => setFilters((f) => ({ ...f, action: v === 'all' ? '' : v }))}>
                <SelectTrigger className="bg-white/8 border-white/15 text-white h-9"><SelectValue placeholder="Tindakan" /></SelectTrigger>
                <SelectContent className="glass-strong border-white/20 text-white">
                  <SelectItem value="all">Semua Tindakan</SelectItem>
                  <SelectItem value="INSERT">Cipta (INSERT)</SelectItem>
                  <SelectItem value="UPDATE">Kemas Kini (UPDATE)</SelectItem>
                  <SelectItem value="DELETE">Padam (DELETE)</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filters.source} onValueChange={(v) => setFilters((f) => ({ ...f, source: v === 'all' ? '' : v }))}>
                <SelectTrigger className="bg-white/8 border-white/15 text-white h-9"><SelectValue placeholder="Sumber" /></SelectTrigger>
                <SelectContent className="glass-strong border-white/20 text-white">
                  <SelectItem value="all">Semua Sumber</SelectItem>
                  <SelectItem value="user">Pengguna</SelectItem>
                  <SelectItem value="AI_GENERATED">AI</SelectItem>
                  <SelectItem value="system">Sistem</SelectItem>
                </SelectContent>
              </Select>
              <Input type="date" value={filters.from} onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))} className="bg-white/8 border-white/15 text-white h-9" />
              <Input type="date" value={filters.to} onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))} className="bg-white/8 border-white/15 text-white h-9" />
            </div>
            <div className="flex items-center justify-between mt-3">
              <div className="text-xs text-cyan-100/60 flex items-center gap-1.5">
                <Filter className="w-3 h-3" /> {total} rekod dijumpai
              </div>
              <Button variant="ghost" size="sm" className="text-cyan-100 hover:bg-white/10" onClick={() => setFilters({ tableName: '', action: '', source: '', search: '', from: '', to: '' })}>
                Reset Penapis
              </Button>
            </div>
          </GlassCard>

          {/* Table */}
          <GlassCard className="p-0 overflow-hidden">
            <div className="max-h-[60vh] overflow-y-auto scroll-area">
              <Table>
                <TableHeader className="sticky top-0 z-10 glass-strong">
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-cyan-100 w-8"></TableHead>
                    <TableHead className="text-cyan-100">Jadual</TableHead>
                    <TableHead className="text-cyan-100">Record ID</TableHead>
                    <TableHead className="text-cyan-100">Tindakan</TableHead>
                    <TableHead className="text-cyan-100">Oleh</TableHead>
                    <TableHead className="text-cyan-100">Masa</TableHead>
                    <TableHead className="text-cyan-100">Sumber</TableHead>
                    <TableHead className="text-cyan-100">IP</TableHead>
                    <TableHead className="text-cyan-100 text-right">Butiran</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12 text-cyan-100/60">
                        <Loader2 className="w-6 h-6 mx-auto animate-spin mb-2" /> Memuatkan log audit...
                      </TableCell>
                    </TableRow>
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9}>
                        <EmptyState icon={ShieldCheck} title="Tiada log audit dijumpai" hint="Cuba ubah penapis." />
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((a) => {
                      const isOpen = expanded === a.id
                      const act = ACTION_META[a.action] || { color: '#7895b2', label: a.action }
                      const src = SOURCE_META[a.source] || { color: '#7895b2', label: a.source, icon: Activity }
                      return (
                        <Fragment key={a.id}>
                          <TableRow className="border-white/5 hover:bg-white/5 cursor-pointer" onClick={() => setExpanded(isOpen ? null : a.id)}>
                            <TableCell className="text-cyan-100">
                              {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            </TableCell>
                            <TableCell className="text-cyan-100 font-mono text-xs">{a.tableName}</TableCell>
                            <TableCell className="text-cyan-100/70 font-mono text-xs max-w-[180px] truncate">{a.recordId}</TableCell>
                            <TableCell>
                              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full" style={{ background: `${act.color}22`, color: act.color }}>
                                {a.action}
                              </span>
                            </TableCell>
                            <TableCell className="text-cyan-100/80 text-xs">{a.performedBy?.name || 'Sistem'}</TableCell>
                            <TableCell className="text-cyan-100/60 text-xs">{new Date(a.performedAt).toLocaleString('ms-MY', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</TableCell>
                            <TableCell>
                              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full inline-flex items-center gap-1" style={{ background: `${src.color}22`, color: src.color }}>
                                <src.icon className="w-2.5 h-2.5" /> {src.label}
                              </span>
                            </TableCell>
                            <TableCell className="text-cyan-100/50 font-mono text-[10px]">{a.ipAddress || '-'}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" className="text-cyan-200 hover:text-white hover:bg-white/10 h-7" onClick={(e) => { e.stopPropagation(); openDetail(a) }}>
                                Butiran
                              </Button>
                            </TableCell>
                          </TableRow>
                          {isOpen && (
                            <TableRow className="bg-black/20 border-white/5">
                              <TableCell colSpan={9} className="p-4">
                                <div className="grid md:grid-cols-2 gap-4">
                                  <div>
                                    <div className="text-[10px] uppercase tracking-wider text-amber-300 mb-1.5 font-semibold">Nilai Lama (Old)</div>
                                    <pre className="text-[10px] text-cyan-100/80 bg-black/30 rounded-lg p-3 overflow-x-auto max-h-40 font-mono">{formatJson(a.oldValues)}</pre>
                                  </div>
                                  <div>
                                    <div className="text-[10px] uppercase tracking-wider text-emerald-300 mb-1.5 font-semibold">Nilai Baru (New)</div>
                                    <pre className="text-[10px] text-cyan-100/80 bg-black/30 rounded-lg p-3 overflow-x-auto max-h-40 font-mono">{formatJson(a.newValues)}</pre>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </GlassCard>
        </TabsContent>

        <TabsContent value="report" className="space-y-4">
          {reportLoading || !report ? (
            <GlassCard className="p-12 text-center">
              <Loader2 className="w-8 h-8 text-cyan-300 animate-spin mx-auto mb-3" />
              <div className="text-cyan-100/70 text-sm">Menjana laporan pematuhan...</div>
            </GlassCard>
          ) : (
            <>
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <GlassCard className="p-4">
                  <div className="text-xs text-cyan-100/60 uppercase">Jumlah Log</div>
                  <div className="text-2xl font-bold text-white mt-1">{report.total.toLocaleString()}</div>
                </GlassCard>
                {report.bySource.map((s) => {
                  const meta = SOURCE_META[s.label] || { label: s.label, color: '#7895b2' }
                  return (
                    <GlassCard key={s.label} className="p-4">
                      <div className="text-xs text-cyan-100/60 uppercase flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full" style={{ background: meta.color }} /> {meta.label}
                      </div>
                      <div className="text-2xl font-bold text-white mt-1">{s.count.toLocaleString()}</div>
                    </GlassCard>
                  )
                })}
              </div>

              {/* Charts grid */}
              <div className="grid lg:grid-cols-2 gap-4">
                <GlassCard className="p-4">
                  <div className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <Database className="w-4 h-4 text-cyan-300" /> Operasi Mengikut Jadual
                  </div>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={report.byTable.slice(0, 10)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                      <XAxis type="number" stroke="rgba(255,255,255,0.5)" fontSize={11} />
                      <YAxis type="category" dataKey="label" stroke="rgba(255,255,255,0.5)" fontSize={10} width={120} tick={{ fill: 'rgba(255,255,255,0.7)' }} />
                      <Tooltip
                        contentStyle={{
                          background: 'rgba(10,30,70,0.9)', border: '1px solid rgba(0,194,168,0.4)',
                          borderRadius: '10px', color: '#fff', fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                        {report.byTable.slice(0, 10).map((_, i) => (
                          <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </GlassCard>

                <GlassCard className="p-4">
                  <div className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-300" /> pecahan Mengikut Tindakan
                  </div>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={report.byAction}
                        dataKey="count"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        innerRadius={50}
                        paddingAngle={3}
                        label={(entry: any) => `${ACTION_META[entry.label]?.label || entry.label}: ${entry.count}`}
                        labelLine={false}
                      >
                        {report.byAction.map((e, i) => (
                          <Cell key={i} fill={ACTION_META[e.label]?.color || PALETTE[i]} stroke="rgba(255,255,255,0.2)" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: 'rgba(10,30,70,0.9)', border: '1px solid rgba(0,194,168,0.4)',
                          borderRadius: '10px', color: '#fff', fontSize: '12px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </GlassCard>
              </div>

              {/* Top users */}
              <GlassCard className="p-4">
                <div className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <User className="w-4 h-4 text-cyan-300" /> Pengguna Paling Aktif (Top 15)
                </div>
                <div className="space-y-1.5 max-h-72 overflow-y-auto scroll-area">
                  {report.byUser.map((u, i) => (
                    <div key={i} className="glass-subtle p-2.5 rounded-lg flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i < 3 ? 'bg-amber-500/20 text-amber-300' : 'bg-white/10 text-cyan-100/70'}`}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-white truncate">{u.name}</div>
                        <div className="text-[10px] text-cyan-100/50 truncate">{u.email || 'Sistem automatik'}</div>
                      </div>
                      <Badge className="bg-cyan-500/20 text-cyan-200 border-cyan-400/30">{u.count}</Badge>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </>
          )}
        </TabsContent>

        <TabsContent value="ai" className="space-y-4">
          <GlassCard className="p-4 border border-purple-400/20">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-purple-300" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white">Penjejak Aktiviti AI</div>
                <div className="text-xs text-cyan-100/70 mt-0.5">
                  Semua tindakan yang dijana oleh AI (source = AI_GENERATED) direkodkan dengan teliti untuk ketelusan dan akauntabiliti.
                  Ini termasuk penjanaan WIM, kurikulum, rubrik, mapping NOSS dan carian pintar.
                </div>
              </div>
            </div>
          </GlassCard>
          <GlassCard className="p-0 overflow-hidden">
            <div className="max-h-[55vh] overflow-y-auto scroll-area">
              {reportLoading ? (
                <div className="text-center py-12 text-cyan-100/60"><Loader2 className="w-6 h-6 mx-auto animate-spin" /></div>
              ) : !report || report.aiActivity.length === 0 ? (
                <EmptyState icon={Bot} title="Tiada aktiviti AI direkodkan" hint="Aktiviti AI akan muncul di sini selepas anda menjana kandungan." />
              ) : (
                <div className="divide-y divide-white/5">
                  {report.aiActivity.map((a) => (
                    <div key={a.id} className="p-3 hover:bg-white/5 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-400/30 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-purple-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-white">
                          <span className="font-mono text-purple-200">{a.tableName}</span>
                          <span className="mx-1.5 text-cyan-100/40">·</span>
                          <span className="text-[10px] uppercase px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-200">{a.action}</span>
                        </div>
                        <div className="text-[10px] text-cyan-100/60 mt-0.5">
                          {a.by || 'AI'} · {new Date(a.at).toLocaleString('ms-MY')}
                        </div>
                      </div>
                      <div className="text-[10px] text-cyan-100/40 font-mono truncate max-w-[120px]">{a.recordId}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </GlassCard>
        </TabsContent>
      </Tabs>

      {/* Detail dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="glass-strong border-white/20 text-white max-w-2xl max-h-[90vh] overflow-y-auto scroll-area">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-cyan-300" /> Butiran Log Audit
            </DialogTitle>
            <DialogDescription className="text-cyan-100/70">Rekod immutable · Tidak boleh diubahsuai</DialogDescription>
          </DialogHeader>
          {detailItem && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Field label="ID Log" value={detailItem.id} mono />
                <Field label="Jadual" value={detailItem.tableName} mono />
                <Field label="Record ID" value={detailItem.recordId} mono />
                <Field label="Tindakan" value={detailItem.action} />
                <Field label="Sumber" value={detailItem.source} />
                <Field label="IP Address" value={detailItem.ipAddress || '-'} mono />
                <Field label="Oleh" value={detailItem.performedBy?.name || 'Sistem'} />
                <Field label="E-mel" value={detailItem.performedBy?.email || '-'} />
                <Field label="Masa" value={new Date(detailItem.performedAt).toLocaleString('ms-MY')} />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-amber-300 mb-1.5 font-semibold">Nilai Lama</div>
                <pre className="text-[10px] text-cyan-100/80 bg-black/30 rounded-lg p-3 overflow-x-auto font-mono max-h-60">{formatJson(detailItem.oldValues)}</pre>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-emerald-300 mb-1.5 font-semibold">Nilai Baru</div>
                <pre className="text-[10px] text-cyan-100/80 bg-black/30 rounded-lg p-3 overflow-x-auto font-mono max-h-60">{formatJson(detailItem.newValues)}</pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="glass-subtle p-2.5 rounded-lg">
      <div className="text-[10px] uppercase tracking-wider text-cyan-100/50">{label}</div>
      <div className={`text-white truncate ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  )
}

function formatJson(s?: any): string {
  if (!s) return '— Tiada —'
  // PostgreSQL Json type returns object/array directly; SQLite returned string
  if (typeof s === 'object') {
    try {
      return JSON.stringify(s, null, 2)
    } catch {
      return String(s)
    }
  }
  try {
    return JSON.stringify(JSON.parse(s), null, 2)
  } catch {
    return s
  }
}
