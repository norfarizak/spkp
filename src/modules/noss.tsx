'use client'
import { useEffect, useState, useCallback } from 'react'
import { GlassCard, PageHeader, StatusBadge, EmptyState } from '@/components/glass'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { useAppStore, hasAnyRole } from '@/lib/store'
import {
  Library, Plus, Search, Loader2, Eye, Trash2, ArrowLeft, Save, GitCompare,
  Map, Sparkles, AlertTriangle, CheckCircle2, XCircle, FileText, Building2,
  TrendingUp, History, Calendar,
} from 'lucide-react'

const SECTORS = ['Elektrik', 'Multimedia', 'Automotif', 'IT', 'Mekanikal', 'Pembinaan', 'Pertanian', ' kosmetik']
const LEVELS = ['1', '2', '3', '4', '5']

interface NossListItem {
  id: string
  nossCode: string
  title: string
  sector: string | null
  level: string | null
  version: string | null
  publishedYear: number | null
  status: string
  _count: { cus: number }
}

export function NossModule() {
  const user = useAppStore((s) => s.user)
  const canCreate = !!user && hasAnyRole(user.roles, 'SUPER_ADMIN', 'ADMINISTRATOR', 'PEGAWAI_KURIKULUM', 'KETUA_PROGRAM', 'PENSYARAH', 'BAHAGIAN_KURIKULUM')
  const isAdmin = !!user && hasAnyRole(user.roles, 'SUPER_ADMIN', 'ADMINISTRATOR')

  const [list, setList] = useState<NossListItem[]>([])
  const [programs, setPrograms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sectorFilter, setSectorFilter] = useState('all')
  const [levelFilter, setLevelFilter] = useState('all')
  const [showImport, setShowImport] = useState(false)

  const [detail, setDetail] = useState<any>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [gapAnalysisOpen, setGapAnalysisOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('q', search)
      if (sectorFilter !== 'all') params.set('sector', sectorFilter)
      if (levelFilter !== 'all') params.set('level', levelFilter)
      const r = await fetch(`/api/noss?${params.toString()}`, { credentials: 'include' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setList(d.list || [])
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }, [search, sectorFilter, levelFilter])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    fetch('/api/curriculum', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setPrograms(d.programs || []))
      .catch(() => {})
  }, [])

  async function openDetail(n: NossListItem) {
    try {
      const r = await fetch(`/api/noss/${n.id}`, { credentials: 'include' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setDetail(d.noss)
      setDetailOpen(true)
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  async function deleteNoss(n: NossListItem) {
    if (!confirm(`Padam NOSS ${n.nossCode}? Tindakan ini tidak boleh diundur.`)) return
    try {
      const r = await fetch(`/api/noss/${n.id}`, { method: 'DELETE', credentials: 'include' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      toast.success('NOSS dipadam')
      load()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Library}
        title="Pustaka NOSS"
        description="Pangkalan data Standard Operasi Pekerjaan Kebangsaan (NOSS) & pemetaan ke kurikulum"
        actions={
          <>
            <Button variant="outline" className="border-cyan-400/30 text-cyan-200 hover:bg-cyan-500/10 bg-white/5" onClick={() => setGapAnalysisOpen(true)}>
              <TrendingUp className="w-4 h-4 mr-2" /> Analisis Jurang
            </Button>
            {canCreate && (
              <Button className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 border-0 text-white" onClick={() => setShowImport(true)}>
                <Plus className="w-4 h-4 mr-2" /> Import NOSS
              </Button>
            )}
          </>
        }
      />

      <GlassCard className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-100/60" />
            <Input
              placeholder="Cari kod / tajuk / sektor / penerangan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-white/8 border-white/15 text-white placeholder:text-white/40"
            />
          </div>
          <Select value={sectorFilter} onValueChange={setSectorFilter}>
            <SelectTrigger className="bg-white/8 border-white/15 text-white"><SelectValue placeholder="Sektor" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Sektor</SelectItem>
              {SECTORS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="bg-white/8 border-white/15 text-white"><SelectValue placeholder="Tahap" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tahap</SelectItem>
              {LEVELS.map((l) => <SelectItem key={l} value={l}>Tahap {l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </GlassCard>

      <GlassCard className="p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-cyan-100/70">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Memuatkan...
          </div>
        ) : list.length === 0 ? (
          <EmptyState icon={Library} title="Tiada NOSS dijumpai" hint="Cuba ubah penapis atau import NOSS baharu" />
        ) : (
          <ScrollArea className="max-h-[calc(100vh-340px)]">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-cyan-100/80">Kod NOSS</TableHead>
                  <TableHead className="text-cyan-100/80">Tajuk</TableHead>
                  <TableHead className="text-cyan-100/80">Sektor</TableHead>
                  <TableHead className="text-cyan-100/80">Tahap</TableHead>
                  <TableHead className="text-cyan-100/80 text-center">V</TableHead>
                  <TableHead className="text-cyan-100/80 text-center">Tahun</TableHead>
                  <TableHead className="text-cyan-100/80 text-center">CU</TableHead>
                  <TableHead className="text-cyan-100/80">Status</TableHead>
                  <TableHead className="text-cyan-100/80 text-right">Tindakan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((n) => (
                  <TableRow key={n.id} className="border-white/5 hover:bg-white/5">
                    <TableCell className="font-mono text-cyan-200 font-semibold">{n.nossCode}</TableCell>
                    <TableCell className="text-white max-w-md"><div className="truncate">{n.title}</div></TableCell>
                    <TableCell className="text-cyan-100/80 text-sm">{n.sector || '-'}</TableCell>
                    <TableCell className="text-cyan-100/80 text-sm">{n.level || '-'}</TableCell>
                    <TableCell className="text-center text-cyan-100/60 text-xs font-mono">{n.version || '-'}</TableCell>
                    <TableCell className="text-center text-cyan-100/60 text-sm">{n.publishedYear || '-'}</TableCell>
                    <TableCell className="text-center text-cyan-100/60 text-sm">{n._count.cus}</TableCell>
                    <TableCell><StatusBadge status={n.status} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-cyan-100 hover:bg-white/10" onClick={() => openDetail(n)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        {isAdmin && (
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-300 hover:bg-red-500/10" onClick={() => deleteNoss(n)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </GlassCard>

      {/* Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent side="right" className="glass-strong border-white/20 text-white w-full sm:max-w-2xl overflow-y-auto">
          {detail && (
            <NossDetail noss={detail} onClose={() => setDetailOpen(false)} canCreate={canCreate} />
          )}
        </SheetContent>
      </Sheet>

      {/* Import Dialog */}
      <ImportNossDialog open={showImport} onOpenChange={setShowImport} onSaved={() => { setShowImport(false); load() }} />

      {/* Gap Analysis Dialog */}
      <GapAnalysisDialog open={gapAnalysisOpen} onOpenChange={setGapAnalysisOpen} programs={programs} />
    </div>
  )
}

// ============ NOSS Detail ============
function NossDetail({ noss, onClose, canCreate }: { noss: any; onClose: () => void; canCreate: boolean }) {
  const [tab, setTab] = useState('cus')
  const [related, setRelated] = useState<any[]>([])
  const [compareNoss, setCompareNoss] = useState<string>('')
  const [compareData, setCompareData] = useState<any>(null)
  const [mapping, setMapping] = useState<any[]>([])
  const [addMapOpen, setAddMapOpen] = useState(false)

  async function loadMapping() {
    try {
      const r = await fetch(`/api/noss/${noss.id}/mapping`, { credentials: 'include' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setMapping(d.mappings || [])
    } catch (e: any) { toast.error(e.message) }
  }

  useEffect(() => {
    loadMapping()
  }, [noss.id])

  async function loadRelated() {
    try {
      const r = await fetch(`/api/noss/${noss.id}`, { credentials: 'include' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setRelated(d.related || [])
    } catch (e: any) { toast.error(e.message) }
  }

  async function compare() {
    if (!compareNoss) return toast.error('Pilih NOSS untuk dibandingkan')
    try {
      const r = await fetch(`/api/noss/${compareNoss}`, { credentials: 'include' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setCompareData(d.noss)
    } catch (e: any) { toast.error(e.message) }
  }

  async function deleteMapping(id: string) {
    try {
      const r = await fetch(`/api/noss/${noss.id}/mapping?mappingId=${id}`, { method: 'DELETE', credentials: 'include' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      toast.success('Pemetaan dipadam')
      loadMapping()
    } catch (e: any) { toast.error(e.message) }
  }

  return (
    <>
      <SheetHeader>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" className="text-cyan-100/80 hover:bg-white/10 h-7 px-2" onClick={onClose}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <SheetTitle className="text-white font-mono">{noss.nossCode}</SheetTitle>
          <StatusBadge status={noss.status} />
        </div>
        <SheetDescription className="text-cyan-100/80 text-base font-medium">{noss.title}</SheetDescription>
      </SheetHeader>

      <div className="px-4 pb-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="glass-subtle rounded-lg p-2"><div className="text-[10px] text-cyan-100/60">Sektor</div><div className="text-white">{noss.sector || '-'}</div></div>
        <div className="glass-subtle rounded-lg p-2"><div className="text-[10px] text-cyan-100/60">Tahap</div><div className="text-white">{noss.level || '-'}</div></div>
        <div className="glass-subtle rounded-lg p-2"><div className="text-[10px] text-cyan-100/60">Versi</div><div className="text-white font-mono">{noss.version || '-'}</div></div>
        <div className="glass-subtle rounded-lg p-2"><div className="text-[10px] text-cyan-100/60">Tahun</div><div className="text-white font-mono">{noss.publishedYear || '-'}</div></div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="px-4">
        <TabsList className="bg-white/8 border border-white/15">
          <TabsTrigger value="cus" className="data-[state=active]:bg-white/15 text-cyan-100"><FileText className="w-3 h-3 mr-1" /> CU NOSS ({noss.cus?.length || 0})</TabsTrigger>
          <TabsTrigger value="mapping" className="data-[state=active]:bg-white/15 text-cyan-100"><Map className="w-3 h-3 mr-1" /> Pemetaan ({mapping.length})</TabsTrigger>
          <TabsTrigger value="compare" className="data-[state=active]:bg-white/15 text-cyan-100"><GitCompare className="w-3 h-3 mr-1" /> Banding Versi</TabsTrigger>
        </TabsList>

        <TabsContent value="cus" className="mt-3 pb-6">
          <ScrollArea className="max-h-[55vh]">
            <div className="space-y-2">
              {(!noss.cus || noss.cus.length === 0) ? (
                <EmptyState icon={FileText} title="Tiada CU di bawah NOSS ini" />
              ) : (
                noss.cus.map((c: any) => (
                  <div key={c.id} className="glass-subtle rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-cyan-200 text-sm font-semibold">{c.cuCode}</span>
                      {c._count?.mappings > 0 && (
                        <Badge variant="outline" className="text-[9px] border-emerald-400/40 text-emerald-200 bg-emerald-500/10">{c._count.mappings} dipetakan</Badge>
                      )}
                    </div>
                    <div className="text-white text-sm font-medium">{c.title}</div>
                    {c.learningOutcome && <div className="text-xs text-cyan-100/60 mt-1"><strong>LO:</strong> {c.learningOutcome}</div>}
                    {c.performanceCriteria && <div className="text-xs text-cyan-100/60 mt-0.5"><strong>PC:</strong> {c.performanceCriteria.slice(0, 200)}{c.performanceCriteria.length > 200 ? '...' : ''}</div>}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="mapping" className="mt-3 pb-6">
          <div className="flex justify-between items-center mb-2">
            <div className="text-xs text-cyan-100/70">Pemetaan dari CU kurikulum ke NOSS CU</div>
            {canCreate && <Button size="sm" className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 border-0 text-white h-7" onClick={() => setAddMapOpen(true)}><Plus className="w-3 h-3 mr-1" /> Peta Baru</Button>}
          </div>
          <ScrollArea className="max-h-[55vh]">
            {mapping.length === 0 ? (
              <EmptyState icon={Map} title="Tiada pemetaan" hint="Tambah pemetaan manual atau gunakan AI di modul AI" />
            ) : (
              <div className="space-y-2">
                {mapping.map((m: any) => (
                  <div key={m.id} className="glass-subtle rounded-lg p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-cyan-100/60">CU Kurikulum</div>
                        <div className="text-white text-sm font-medium truncate">
                          <span className="font-mono text-cyan-200">{m.cu?.cuCode}</span> · {m.cu?.title}
                        </div>
                        <div className="text-[10px] text-cyan-100/50 mt-0.5">
                          {m.cu?.program?.code} · {m.cu?.program?.institution?.code}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-[10px] text-cyan-100/60">Confidence</div>
                        <div className={`text-lg font-bold ${m.confidenceScore >= 75 ? 'text-emerald-300' : m.confidenceScore >= 50 ? 'text-amber-300' : 'text-red-300'}`}>{Math.round(m.confidenceScore)}%</div>
                      </div>
                      {canCreate && (
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-300 hover:bg-red-500/10" onClick={() => deleteMapping(m.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="compare" className="mt-3 pb-6">
          <div className="space-y-3">
            <div className="glass-subtle rounded-lg p-3">
              <Label className="text-cyan-100/80 text-xs">Pilih NOSS lain untuk dibandingkan</Label>
              <div className="flex gap-2 mt-1">
                <Select value={compareNoss} onValueChange={setCompareNoss} onOpenChange={(o) => { if (o && related.length === 0) loadRelated() }}>
                  <SelectTrigger className="bg-white/8 border-white/15 text-white w-full"><SelectValue placeholder="Pilih NOSS" /></SelectTrigger>
                  <SelectContent>
                    {related.length === 0 ? <SelectItem value="_" disabled>Tiada NOSS berkaitan dijumpai</SelectItem> :
                      related.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.nossCode} v{r.version || '?'} - {r.title.slice(0, 60)}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button size="sm" className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 border-0 text-white" onClick={compare}><GitCompare className="w-3 h-3 mr-1" /> Banding</Button>
              </div>
            </div>

            {compareData && (
              <div className="grid grid-cols-2 gap-3">
                <div className="glass-subtle rounded-lg p-3">
                  <div className="flex items-center gap-1 mb-2">
                    <Calendar className="w-3 h-3 text-cyan-300" />
                    <span className="font-mono text-cyan-200 text-sm font-semibold">{noss.nossCode}</span>
                    <Badge variant="outline" className="text-[9px] border-cyan-400/40 text-cyan-200 bg-cyan-500/10">v{noss.version || '?'}</Badge>
                  </div>
                  <div className="text-xs text-white mb-2">{noss.title}</div>
                  <div className="text-[10px] text-cyan-100/60">CU: {noss.cus?.length || 0} · Tahun: {noss.publishedYear || '-'}</div>
                </div>
                <div className="glass-subtle rounded-lg p-3">
                  <div className="flex items-center gap-1 mb-2">
                    <Calendar className="w-3 h-3 text-amber-300" />
                    <span className="font-mono text-amber-200 text-sm font-semibold">{compareData.nossCode}</span>
                    <Badge variant="outline" className="text-[9px] border-amber-400/40 text-amber-200 bg-amber-500/10">v{compareData.version || '?'}</Badge>
                  </div>
                  <div className="text-xs text-white mb-2">{compareData.title}</div>
                  <div className="text-[10px] text-cyan-100/60">CU: {compareData.cus?.length || 0} · Tahun: {compareData.publishedYear || '-'}</div>
                </div>
              </div>
            )}

            {compareData && (
              <div className="glass-subtle rounded-lg p-3">
                <div className="text-xs text-cyan-100/80 mb-2 font-semibold">Perbezaan Struktur CU</div>
                <ScrollArea className="max-h-72">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10">
                        <TableHead className="text-cyan-100/70">{noss.nossCode} CU</TableHead>
                        <TableHead className="text-cyan-100/70">{compareData.nossCode} CU</TableHead>
                        <TableHead className="text-cyan-100/70 text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        const a = noss.cus || []
                        const b = compareData.cus || []
                        const rows: any[] = []
                        const maxLen = Math.max(a.length, b.length)
                        for (let i = 0; i < maxLen; i++) {
                          const ca = a[i]; const cb = b[i]
                          const same = ca && cb && ca.cuCode === cb.cuCode
                          const isAdd = !ca && cb
                          const isDel = ca && !cb
                          rows.push(
                            <TableRow key={i} className="border-white/5">
                              <TableCell className="text-xs">
                                {ca ? <><span className="font-mono text-cyan-200">{ca.cuCode}</span> <span className="text-cyan-100/60">{ca.title?.slice(0, 30)}</span></> : <span className="text-cyan-100/30">-</span>}
                              </TableCell>
                              <TableCell className="text-xs">
                                {cb ? <><span className="font-mono text-amber-200">{cb.cuCode}</span> <span className="text-cyan-100/60">{cb.title?.slice(0, 30)}</span></> : <span className="text-cyan-100/30">-</span>}
                              </TableCell>
                              <TableCell className="text-center">
                                {same ? <CheckCircle2 className="w-3 h-3 text-emerald-300 mx-auto" /> : isAdd ? <Plus className="w-3 h-3 text-emerald-300 mx-auto" /> : isDel ? <XCircle className="w-3 h-3 text-red-300 mx-auto" /> : <AlertTriangle className="w-3 h-3 text-amber-300 mx-auto" />}
                              </TableCell>
                            </TableRow>
                          )
                        }
                        return rows
                      })()}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <AddMappingDialog
        open={addMapOpen}
        onOpenChange={setAddMapOpen}
        nossId={noss.id}
        cus={noss.cus || []}
        onSaved={() => { setAddMapOpen(false); loadMapping() }}
      />
    </>
  )
}

// ============ Import NOSS Dialog ============
function ImportNossDialog({
  open, onOpenChange, onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    nossCode: '', title: '', sector: '', level: '', version: '', publishedYear: 0, description: '',
  })
  const [cus, setCus] = useState<any[]>([{ cuCode: '', title: '', learningOutcome: '', performanceCriteria: '' }])
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!form.nossCode || !form.title) return toast.error('Kod dan Tajuk diperlukan')
    setSaving(true)
    try {
      const payload = { ...form, cus: cus.filter((c) => c.cuCode && c.title) }
      const r = await fetch('/api/noss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      toast.success('NOSS berjaya diimport')
      setForm({ nossCode: '', title: '', sector: '', level: '', version: '', publishedYear: 0, description: '' })
      setCus([{ cuCode: '', title: '', learningOutcome: '', performanceCriteria: '' }])
      onSaved()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-white/20 text-white sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white"><Plus className="w-5 h-5" /> Import NOSS Baharu</DialogTitle>
          <DialogDescription className="text-cyan-100/70">Kemasukan manual data NOSS (ekstrak PDF di luar skop)</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-cyan-100/80 text-xs">Kod NOSS *</Label>
              <Input value={form.nossCode} onChange={(e) => setForm({ ...form, nossCode: e.target.value.toUpperCase() })} placeholder="EE-010-3:2020" className="bg-white/8 border-white/15 text-white" />
            </div>
            <div>
              <Label className="text-cyan-100/80 text-xs">Versi</Label>
              <Input value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} placeholder="2020" className="bg-white/8 border-white/15 text-white" />
            </div>
          </div>
          <div>
            <Label className="text-cyan-100/80 text-xs">Tajuk *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-white/8 border-white/15 text-white" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-cyan-100/80 text-xs">Sektor</Label>
              <Input value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} placeholder="Elektrik" className="bg-white/8 border-white/15 text-white" />
            </div>
            <div>
              <Label className="text-cyan-100/80 text-xs">Tahap</Label>
              <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
                <SelectTrigger className="bg-white/8 border-white/15 text-white w-full"><SelectValue placeholder="Tahap" /></SelectTrigger>
                <SelectContent>
                  {LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-cyan-100/80 text-xs">Tahun Terbit</Label>
              <Input type="number" value={form.publishedYear} onChange={(e) => setForm({ ...form, publishedYear: Number(e.target.value) })} className="bg-white/8 border-white/15 text-white" />
            </div>
          </div>
          <div>
            <Label className="text-cyan-100/80 text-xs">Penerangan</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="bg-white/8 border-white/15 text-white" />
          </div>

          <div className="border-t border-white/10 pt-3">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-cyan-100/80 text-sm font-semibold">Unit Kompetensi NOSS</Label>
              <Button size="sm" variant="outline" className="border-cyan-400/30 text-cyan-200 hover:bg-cyan-500/10 h-7" onClick={() => setCus([...cus, { cuCode: '', title: '', learningOutcome: '', performanceCriteria: '' }])}>
                <Plus className="w-3 h-3 mr-1" /> Tambah CU
              </Button>
            </div>
            <ScrollArea className="max-h-48">
              <div className="space-y-2">
                {cus.map((c, i) => (
                  <div key={i} className="glass-subtle rounded-lg p-2 space-y-2">
                    <div className="flex gap-2">
                      <Input value={c.cuCode} onChange={(e) => { const n = [...cus]; n[i].cuCode = e.target.value.toUpperCase(); setCus(n) }} placeholder="Kod CU" className="bg-white/8 border-white/15 text-white h-8 text-xs" />
                      <Input value={c.title} onChange={(e) => { const n = [...cus]; n[i].title = e.target.value; setCus(n) }} placeholder="Tajuk CU" className="bg-white/8 border-white/15 text-white h-8 text-xs" />
                      {cus.length > 1 && (
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-300 hover:bg-red-500/10" onClick={() => setCus(cus.filter((_, j) => j !== i))}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" className="text-cyan-100 hover:bg-white/10" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button disabled={saving} className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 border-0 text-white" onClick={save}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Import NOSS
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============ Add Mapping Dialog ============
function AddMappingDialog({
  open, onOpenChange, nossId, cus, onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  nossId: string
  cus: any[]
  onSaved: () => void
}) {
  // We need a CU from a program to map. Fetch programs+CU for selection.
  const [programs, setPrograms] = useState<any[]>([])
  const [selectedProgram, setSelectedProgram] = useState('')
  const [programCus, setProgramCus] = useState<any[]>([])
  const [selectedCu, setSelectedCu] = useState('')
  const [selectedNossCu, setSelectedNossCu] = useState('')
  const [confidence, setConfidence] = useState(80)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/curriculum', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setPrograms(d.programs || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedProgram) return
    fetch(`/api/curriculum/${selectedProgram}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setProgramCus(d.program?.cu || []))
      .catch(() => {})
  }, [selectedProgram])

  async function save() {
    if (!selectedCu || !selectedNossCu) return toast.error('Pilih CU dan NOSS CU')
    setSaving(true)
    try {
      const r = await fetch(`/api/noss/${nossId}/mapping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ cuId: selectedCu, nossCuId: selectedNossCu, confidenceScore: confidence }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      toast.success('Pemetaan ditambah')
      setSelectedCu(''); setSelectedNossCu(''); setConfidence(80)
      onSaved()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-white/20 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white"><Map className="w-5 h-5" /> Tambah Pemetaan</DialogTitle>
          <DialogDescription className="text-cyan-100/70">Peta CU kurikulum ke CU NOSS</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-cyan-100/80 text-xs">Program</Label>
            <Select value={selectedProgram} onValueChange={(v) => { setSelectedProgram(v); setSelectedCu('') }}>
              <SelectTrigger className="bg-white/8 border-white/15 text-white w-full"><SelectValue placeholder="Pilih program" /></SelectTrigger>
              <SelectContent>
                {programs.map((p) => <SelectItem key={p.id} value={p.id}>{p.code} - {p.name.slice(0, 50)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-cyan-100/80 text-xs">CU Kurikulum</Label>
            <Select value={selectedCu} onValueChange={setSelectedCu} disabled={!programCus.length}>
              <SelectTrigger className="bg-white/8 border-white/15 text-white w-full"><SelectValue placeholder="Pilih CU" /></SelectTrigger>
              <SelectContent>
                {programCus.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.cuCode} - {c.title.slice(0, 50)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-cyan-100/80 text-xs">CU NOSS</Label>
            <Select value={selectedNossCu} onValueChange={setSelectedNossCu}>
              <SelectTrigger className="bg-white/8 border-white/15 text-white w-full"><SelectValue placeholder="Pilih CU NOSS" /></SelectTrigger>
              <SelectContent>
                {cus.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.cuCode} - {c.title.slice(0, 50)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-cyan-100/80 text-xs">Confidence Score: {confidence}%</Label>
            <input type="range" min="0" max="100" value={confidence} onChange={(e) => setConfidence(Number(e.target.value))} className="w-full accent-cyan-400" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" className="text-cyan-100 hover:bg-white/10" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button disabled={saving} className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 border-0 text-white" onClick={save}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Simpan Pemetaan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============ Gap Analysis Dialog ============
function GapAnalysisDialog({
  open, onOpenChange, programs,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  programs: any[]
}) {
  const [selectedProgram, setSelectedProgram] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<any>(null)

  async function analyze() {
    if (!selectedProgram) return toast.error('Pilih program')
    setAnalyzing(true); setResult(null)
    try {
      const r = await fetch('/api/ai/mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ programId: selectedProgram }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setResult(d)
      toast.success(`Analisis siap: ${d.summary.mapped}/${d.summary.total} CU dipetakan`)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setAnalyzing(false)
    }
  }

  const coverage = result?.summary?.coveragePercent || 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-white/20 text-white sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white"><TrendingUp className="w-5 h-5" /> Analisis Jurang NOSS</DialogTitle>
          <DialogDescription className="text-cyan-100/70">Semak liputan pemetaan CU ke NOSS untuk program</DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Select value={selectedProgram} onValueChange={setSelectedProgram}>
            <SelectTrigger className="bg-white/8 border-white/15 text-white flex-1"><SelectValue placeholder="Pilih program" /></SelectTrigger>
            <SelectContent>
              {programs.map((p) => <SelectItem key={p.id} value={p.id}>{p.code} - {p.name.slice(0, 50)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button disabled={analyzing} className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 border-0 text-white" onClick={analyze}>
            {analyzing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />} Analisis
          </Button>
        </div>

        {result && (
          <div className="space-y-3">
            {result.disclaimer && (
              <div className="glass-subtle rounded-lg p-2 text-[10px] text-purple-200 flex items-center gap-1.5 bg-purple-500/10 border border-purple-400/30">
                <Sparkles className="w-3 h-3" /> {result.disclaimer}
              </div>
            )}

            <div className="glass-subtle rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-cyan-100/80">Liputan Pemetaan</span>
                <span className={`text-2xl font-bold ${coverage >= 75 ? 'text-emerald-300' : coverage >= 50 ? 'text-amber-300' : 'text-red-300'}`}>{coverage}%</span>
              </div>
              <Progress value={coverage} className="h-2" />
              <div className="grid grid-cols-3 gap-2 mt-3 text-center text-xs">
                <div><div className="text-cyan-100/60">Jumlah CU</div><div className="text-white font-bold text-lg">{result.summary.total}</div></div>
                <div><div className="text-cyan-100/60">Dipetakan</div><div className="text-emerald-300 font-bold text-lg">{result.summary.mapped}</div></div>
                <div><div className="text-cyan-100/60">Jurang</div><div className="text-red-300 font-bold text-lg">{result.summary.gaps}</div></div>
              </div>
            </div>

            {result.mappings?.length > 0 && (
              <div className="glass-subtle rounded-lg p-3">
                <div className="text-xs text-cyan-100/80 font-semibold mb-2 flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-300" /> CU Dipetakan</div>
                <ScrollArea className="max-h-48">
                  <div className="space-y-1">
                    {result.mappings.map((m: any, i: number) => (
                      <div key={i} className="text-xs flex items-center justify-between gap-2 py-1 border-b border-white/5">
                        <div className="flex-1 min-w-0">
                          <span className="font-mono text-cyan-200">{m.cuCode}</span>
                          <span className="text-cyan-100/60"> → </span>
                          <span className="font-mono text-emerald-200">{m.nossCuCode}</span>
                          <div className="text-[10px] text-cyan-100/50 truncate">{m.cuTitle}</div>
                        </div>
                        <Badge variant="outline" className={`text-[9px] ${m.confidence >= 75 ? 'border-emerald-400/40 text-emerald-200 bg-emerald-500/10' : m.confidence >= 50 ? 'border-amber-400/40 text-amber-200 bg-amber-500/10' : 'border-red-400/40 text-red-200 bg-red-500/10'}`}>{m.confidence}%</Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {result.gaps?.length > 0 && (
              <div className="glass-subtle rounded-lg p-3">
                <div className="text-xs text-cyan-100/80 font-semibold mb-2 flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-amber-300" /> Jurang (CU Tidak Dipetakan)</div>
                <ScrollArea className="max-h-40">
                  <div className="space-y-1">
                    {result.gaps.map((g: any, i: number) => (
                      <div key={i} className="text-xs py-1 border-b border-white/5">
                        <span className="font-mono text-red-300">{g.cuCode}</span> · <span className="text-cyan-100/70">{g.cuTitle}</span>
                        <div className="text-[10px] text-amber-200/70">{g.issue}</div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" className="text-cyan-100 hover:bg-white/10" onClick={() => onOpenChange(false)}>Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
