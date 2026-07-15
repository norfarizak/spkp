'use client'
import { useEffect, useState, useCallback } from 'react'
import { GlassCard, PageHeader, StatusBadge, EmptyState } from '@/components/glass'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
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
  BookOpen, Plus, Search, Loader2, Eye, Edit, Send, CheckCircle2, XCircle,
  History, Building2, GraduationCap, Layers, FileText, ChevronRight, ChevronDown,
  Sparkles, PenLine, Clock, User, ArrowLeft, Save, ListTree,
} from 'lucide-react'

const LEVELS = ['Sijil', 'Diploma', 'Diploma Lanjutan', 'Pengkhususan']
const STATUSES = ['draft', 'review', 'approved', 'rejected', 'archived']

interface ProgramListItem {
  id: string
  code: string
  name: string
  nossCode: string | null
  level: string | null
  totalCredit: number
  durationMonth: number
  status: string
  version: number
  createdAt: string
  updatedAt: string
  institution: { id: string; name: string; code: string } | null
  createdBy: { id: string; fullName: string; email: string } | null
  _count: { cu: number; courses: number; cocu: number; wim: number }
}

interface Institution {
  id: string
  name: string
  code: string
  type: string
}

interface ProgramDetail {
  id: string
  code: string
  name: string
  nossCode: string | null
  level: string | null
  totalCredit: number
  durationMonth: number
  description: string | null
  status: string
  version: number
  createdAt: string
  updatedAt: string
  institution: any
  createdBy: any
  courses: any[]
  cu: any[]
  cocu: any[]
  accreds: any[]
}

export function CurriculumModule() {
  const user = useAppStore((s) => s.user)
  const canCreate = !!user && hasAnyRole(user.roles, 'SUPER_ADMIN', 'ADMINISTRATOR', 'PEGAWAI_KURIKULUM', 'KETUA_PROGRAM', 'PENSYARAH')
  const canApprove = !!user && hasAnyRole(user.roles, 'SUPER_ADMIN', 'ADMINISTRATOR', 'PENARAH', 'TIMBALAN_PENARAH', 'BAHAGIAN_KURIKULUM', 'KETUA_JABATAN', 'PEGAWAI_QA', 'PEGAWAI_PENTAULIAHAN')

  const [list, setList] = useState<ProgramListItem[]>([])
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [levelFilter, setLevelFilter] = useState('all')
  const [institutionFilter, setInstitutionFilter] = useState('all')

  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<ProgramListItem | null>(null)
  const [detail, setDetail] = useState<ProgramDetail | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [history, setHistory] = useState<any[] | null>(null)
  const [editingCu, setEditingCu] = useState<any | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('q', search)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (levelFilter !== 'all') params.set('level', levelFilter)
      if (institutionFilter !== 'all') params.set('institutionId', institutionFilter)
      const r = await fetch(`/api/curriculum?${params.toString()}`, { credentials: 'include' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setList(d.programs || [])
    } catch (e: any) {
      toast.error(e.message || 'Gagal memuatkan data')
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, levelFilter, institutionFilter])

  useEffect(() => {
    fetch('/api/curriculum/institutions', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setInstitutions(d.list || []))
      .catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])

  async function openDetail(p: ProgramListItem) {
    try {
      const r = await fetch(`/api/curriculum/${p.id}`, { credentials: 'include' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setDetail(d.program)
      setDetailOpen(true)
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  async function openHistory(p: ProgramListItem) {
    try {
      const r = await fetch(`/api/curriculum/${p.id}/history`, { credentials: 'include' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setHistory(d.logs || [])
      setHistoryOpen(true)
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  async function workflowAction(p: ProgramListItem, action: string) {
    const remarks = action === 'reject' || action === 'return'
      ? window.prompt('Catatan (wajib untuk reject/return):') || ''
      : ''
    if ((action === 'reject' || action === 'return') && !remarks) {
      toast.error('Catatan diperlukan untuk reject/return')
      return
    }
    try {
      const r = await fetch(`/api/curriculum/${p.id}/workflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action, remarks }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      toast.success(`Program berjaya ${action === 'submit' ? 'dihantar' : action === 'approve' ? 'diluluskan' : action === 'reject' ? 'ditolak' : action === 'return' ? 'dikembalikan' : 'diarkibkan'}`)
      load()
      if (detailOpen && detail?.id === p.id) {
        openDetail(p)
      }
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={BookOpen}
        title="Pengurusan Kurikulum"
        description="Urus program, kursus, modul, dan unit kompetensi (CU) mengikut standard NOSS"
        actions={
          canCreate && (
            <Button
              className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 border-0 text-white"
              onClick={() => { setEditing(null); setShowCreate(true) }}
            >
              <Plus className="w-4 h-4 mr-2" /> Program Baru
            </Button>
          )
        }
      />

      {/* Filters */}
      <GlassCard className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-100/60" />
            <Input
              placeholder="Cari kod / nama / NOSS..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-white/8 border-white/15 text-white placeholder:text-white/40"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-white/8 border-white/15 text-white"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="bg-white/8 border-white/15 text-white"><SelectValue placeholder="Tahap" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tahap</SelectItem>
              {LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={institutionFilter} onValueChange={setInstitutionFilter}>
            <SelectTrigger className="bg-white/8 border-white/15 text-white"><SelectValue placeholder="Institusi" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Institusi</SelectItem>
              {institutions.map((i) => <SelectItem key={i.id} value={i.id}>{i.code} - {i.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </GlassCard>

      {/* Table */}
      <GlassCard className="p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-cyan-100/70">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Memuatkan...
          </div>
        ) : list.length === 0 ? (
          <EmptyState icon={BookOpen} title="Tiada program dijumpai" hint="Cuba ubah penapis atau cipta program baru" />
        ) : (
          <ScrollArea className="max-h-[calc(100vh-340px)]">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-cyan-100/80">Kod</TableHead>
                  <TableHead className="text-cyan-100/80">Nama Program</TableHead>
                  <TableHead className="text-cyan-100/80">Institusi</TableHead>
                  <TableHead className="text-cyan-100/80">Tahap</TableHead>
                  <TableHead className="text-cyan-100/80 text-right">Kredit</TableHead>
                  <TableHead className="text-cyan-100/80">Status</TableHead>
                  <TableHead className="text-cyan-100/80 text-center">V</TableHead>
                  <TableHead className="text-cyan-100/80 text-right">Tindakan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((p) => (
                  <TableRow key={p.id} className="border-white/5 hover:bg-white/5">
                    <TableCell className="font-mono text-cyan-200 font-semibold">{p.code}</TableCell>
                    <TableCell className="text-white max-w-md">
                      <div className="truncate">{p.name}</div>
                      {p.nossCode && <div className="text-[10px] text-cyan-100/50 font-mono">NOSS: {p.nossCode}</div>}
                    </TableCell>
                    <TableCell className="text-cyan-100/80 text-sm">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3 h-3" />
                        <span className="truncate max-w-[140px]">{p.institution?.code || '-'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-cyan-100/80 text-sm">{p.level || '-'}</TableCell>
                    <TableCell className="text-cyan-100/80 text-right font-mono">{p.totalCredit.toFixed(1)}</TableCell>
                    <TableCell><StatusBadge status={p.status} /></TableCell>
                    <TableCell className="text-center text-cyan-100/60 text-xs font-mono">v{p.version}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-cyan-100 hover:bg-white/10" onClick={() => openDetail(p)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-cyan-100 hover:bg-white/10" onClick={() => openHistory(p)} title="Sejarah versi">
                          <History className="w-4 h-4" />
                        </Button>
                        {canCreate && (p.status === 'draft' || p.status === 'rejected' || p.status === 'correction') && (
                          <Button size="sm" variant="ghost" className="h-8 px-2 text-emerald-300 hover:bg-emerald-500/10" onClick={() => workflowAction(p, 'submit')}>
                            <Send className="w-3 h-3 mr-1" /> Hantar
                          </Button>
                        )}
                        {canApprove && p.status === 'review' && (
                          <>
                            <Button size="sm" variant="ghost" className="h-8 px-2 text-emerald-300 hover:bg-emerald-500/10" onClick={() => workflowAction(p, 'approve')}>
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Lulus
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 px-2 text-red-300 hover:bg-red-500/10" onClick={() => workflowAction(p, 'reject')}>
                              <XCircle className="w-3 h-3 mr-1" /> Tolak
                            </Button>
                          </>
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

      {/* Create / Edit Dialog */}
      <ProgramFormDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        institutions={institutions}
        onSaved={() => { setShowCreate(false); load() }}
        user={user}
      />

      {/* Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent side="right" className="glass-strong border-white/20 text-white w-full sm:max-w-2xl overflow-y-auto">
          {detail && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" className="text-cyan-100/80 hover:bg-white/10 h-7 px-2" onClick={() => setDetailOpen(false)}>
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <SheetTitle className="text-white">{detail.code}</SheetTitle>
                  <StatusBadge status={detail.status} />
                  <Badge variant="outline" className="text-[10px] border-cyan-400/40 text-cyan-200 bg-cyan-500/10">v{detail.version}</Badge>
                </div>
                <SheetDescription className="text-cyan-100/70">{detail.name}</SheetDescription>
              </SheetHeader>

              <ProgramDetailView
                program={detail}
                canCreate={canCreate}
                canApprove={canApprove}
                onEditCu={(cu) => setEditingCu(cu)}
                onRefresh={() => openDetail({ id: detail.id } as any)}
                onWorkflow={(action) => workflowAction({ id: detail.id } as any, action)}
              />
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* CU Editor Dialog */}
      <CuEditorDialog
        cu={editingCu}
        onOpenChange={(v) => { if (!v) setEditingCu(null) }}
        onSaved={() => {
          setEditingCu(null)
          if (detail) openDetail({ id: detail.id } as any)
        }}
      />

      {/* History Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="glass-strong border-white/20 text-white sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white"><History className="w-5 h-5" /> Sejarah Versi</DialogTitle>
            <DialogDescription className="text-cyan-100/70">Log audit untuk program ini</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-96">
            {history && history.length === 0 ? (
              <EmptyState icon={History} title="Tiada sejarah" />
            ) : (
              <div className="space-y-2">
                {history?.map((log) => (
                  <div key={log.id} className="glass-subtle rounded-lg p-3 text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="outline" className={`text-[9px] ${log.action === 'INSERT' ? 'border-emerald-400/40 text-emerald-300 bg-emerald-500/10' : log.action === 'UPDATE' ? 'border-cyan-400/40 text-cyan-300 bg-cyan-500/10' : 'border-red-400/40 text-red-300 bg-red-500/10'}`}>
                        {log.action}
                      </Badge>
                      <span className="text-[10px] text-cyan-100/50">{new Date(log.performedAt).toLocaleString('ms-MY')}</span>
                    </div>
                    <div className="text-xs text-cyan-100/80">
                      <span className="font-semibold">{log.tableName}</span> oleh <span className="text-cyan-200">{log.performedBy?.fullName || 'sistem'}</span>
                    </div>
                    {log.source === 'AI_GENERATED' && <Badge className="mt-1 text-[9px] bg-purple-500/20 text-purple-200 border-purple-400/30">AI</Badge>}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============ Program Form Dialog ============
function ProgramFormDialog({
  open, onOpenChange, institutions, onSaved, user,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  institutions: Institution[]
  onSaved: () => void
  user: any
}) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    code: '', name: '', nossCode: '', level: '', durationMonth: 0, description: '',
    institutionId: user?.institutionId || '',
  })

  async function save() {
    if (!form.code || !form.name) return toast.error('Kod dan Nama diperlukan')
    if (!form.institutionId) return toast.error('Institusi diperlukan')
    setSaving(true)
    try {
      const r = await fetch('/api/curriculum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      toast.success('Program berjaya dicipta')
      setForm({ code: '', name: '', nossCode: '', level: '', durationMonth: 0, description: '', institutionId: user?.institutionId || '' })
      onSaved()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-white/20 text-white sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white"><Plus className="w-5 h-5" /> Cipta Program Baru</DialogTitle>
          <DialogDescription className="text-cyan-100/70">Lengkapkan maklumat asas program pengajian</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-cyan-100/80 text-xs">Kod Program *</Label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="DTE001" className="bg-white/8 border-white/15 text-white" />
            </div>
            <div>
              <Label className="text-cyan-100/80 text-xs">Kod NOSS</Label>
              <Input value={form.nossCode} onChange={(e) => setForm({ ...form, nossCode: e.target.value.toUpperCase() })} placeholder="EE-010-3:2020" className="bg-white/8 border-white/15 text-white" />
            </div>
          </div>
          <div>
            <Label className="text-cyan-100/80 text-xs">Nama Program *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Diploma Teknologi Elektrik" className="bg-white/8 border-white/15 text-white" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-cyan-100/80 text-xs">Tahap</Label>
              <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
                <SelectTrigger className="bg-white/8 border-white/15 text-white w-full"><SelectValue placeholder="Pilih tahap" /></SelectTrigger>
                <SelectContent>
                  {LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-cyan-100/80 text-xs">Tempoh (bulan)</Label>
              <Input type="number" value={form.durationMonth} onChange={(e) => setForm({ ...form, durationMonth: Number(e.target.value) })} className="bg-white/8 border-white/15 text-white" />
            </div>
          </div>
          <div>
            <Label className="text-cyan-100/80 text-xs">Institusi *</Label>
            <Select value={form.institutionId} onValueChange={(v) => setForm({ ...form, institutionId: v })}>
              <SelectTrigger className="bg-white/8 border-white/15 text-white w-full"><SelectValue placeholder="Pilih institusi" /></SelectTrigger>
              <SelectContent>
                {institutions.map((i) => <SelectItem key={i.id} value={i.id}>{i.code} - {i.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-cyan-100/80 text-xs">Penerangan</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="bg-white/8 border-white/15 text-white" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" className="text-cyan-100 hover:bg-white/10" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button disabled={saving} className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 border-0 text-white" onClick={save}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============ Program Detail View ============
function ProgramDetailView({
  program, canCreate, canApprove, onEditCu, onRefresh, onWorkflow,
}: {
  program: ProgramDetail
  canCreate: boolean
  canApprove: boolean
  onEditCu: (cu: any) => void
  onRefresh: () => void
  onWorkflow: (action: string) => void
}) {
  const [tab, setTab] = useState('overview')
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set())
  const [showAddCu, setShowAddCu] = useState(false)

  const toggleCourse = (id: string) => {
    setExpandedCourses((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  return (
    <div className="px-4 pb-6">
      {/* Info cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="glass-subtle rounded-xl p-3">
          <div className="text-[10px] uppercase text-cyan-100/60">Institusi</div>
          <div className="text-sm text-white font-semibold truncate">{program.institution?.name || '-'}</div>
        </div>
        <div className="glass-subtle rounded-xl p-3">
          <div className="text-[10px] uppercase text-cyan-100/60">Jumlah Kredit</div>
          <div className="text-sm text-white font-semibold font-mono">{program.totalCredit.toFixed(1)}</div>
        </div>
        <div className="glass-subtle rounded-xl p-3">
          <div className="text-[10px] uppercase text-cyan-100/60">Tempoh</div>
          <div className="text-sm text-white font-semibold">{program.durationMonth} bulan</div>
        </div>
        <div className="glass-subtle rounded-xl p-3">
          <div className="text-[10px] uppercase text-cyan-100/60">Dicipta Oleh</div>
          <div className="text-sm text-white font-semibold truncate">{program.createdBy?.fullName || '-'}</div>
        </div>
      </div>

      {program.status === 'approved' && (
        <div className="glass-subtle rounded-xl p-3 mb-4 flex items-center gap-2 border border-emerald-400/30 bg-emerald-500/5">
          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          <span className="text-xs text-emerald-200">
            <strong>Ditandatangani oleh:</strong> {program.createdBy?.fullName || '-'} · Diluluskan pada {new Date(program.updatedAt).toLocaleDateString('ms-MY')}
          </span>
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-white/8 border border-white/15">
          <TabsTrigger value="overview" className="data-[state=active]:bg-white/15 text-cyan-100"><ListTree className="w-3 h-3 mr-1" /> Hierarki</TabsTrigger>
          <TabsTrigger value="cu" className="data-[state=active]:bg-white/15 text-cyan-100"><FileText className="w-3 h-3 mr-1" /> Unit Kompetensi ({program.cu.length})</TabsTrigger>
          <TabsTrigger value="cocu" className="data-[state=active]:bg-white/15 text-cyan-100"><Layers className="w-3 h-3 mr-1" /> Co-CU ({program.cocu.length})</TabsTrigger>
          <TabsTrigger value="accred" className="data-[state=active]:bg-white/15 text-cyan-100"><GraduationCap className="w-3 h-3 mr-1" /> Pentauliahan ({program.accreds.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-3">
          {/* Hierarchy tree */}
          <div className="space-y-2">
            {program.courses.length === 0 && program.cu.length === 0 ? (
              <EmptyState icon={ListTree} title="Tiada struktur kursus" hint="Tambah CU untuk membina hierarki kurikulum" />
            ) : (
              <>
                {program.courses.map((c) => (
                  <div key={c.id} className="glass-subtle rounded-lg">
                    <button onClick={() => toggleCourse(c.id)} className="w-full flex items-center gap-2 p-3 text-left hover:bg-white/5 rounded-lg transition">
                      {expandedCourses.has(c.id) ? <ChevronDown className="w-4 h-4 text-cyan-300" /> : <ChevronRight className="w-4 h-4 text-cyan-300" />}
                      <span className="font-mono text-cyan-200 text-sm font-semibold">{c.code}</span>
                      <span className="text-white text-sm flex-1 truncate">{c.name}</span>
                      <Badge variant="outline" className="text-[9px] border-cyan-400/40 text-cyan-200 bg-cyan-500/10">S{c.semester} · {c.creditHour}cr · {c._count.modules} modul</Badge>
                    </button>
                    {expandedCourses.has(c.id) && (
                      <div className="pl-10 pb-2 space-y-1">
                        {c.modules.length === 0 ? (
                          <div className="text-xs text-cyan-100/50 py-1">Tiada modul</div>
                        ) : (
                          c.modules.map((m: any) => (
                            <div key={m.id} className="text-sm text-cyan-100/80 py-1 px-2 rounded hover:bg-white/5">
                              <span className="font-mono text-cyan-300">{m.code}</span> · {m.name} · {m.hours}j · {m._count.cus} CU
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {program.cu.length > 0 && (
                  <div className="glass-subtle rounded-lg p-3">
                    <div className="text-xs uppercase text-cyan-100/60 mb-1">CU Tanpa Modul</div>
                    <div className="text-sm text-cyan-100">{program.cu.filter((c) => !c.moduleId).length} CU tidak ditugaskan kepada modul</div>
                  </div>
                )}
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="cu" className="mt-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-cyan-100/70">{program.cu.length} Unit Kompetensi · Auto-jumlah kredit: <span className="font-mono text-cyan-200">{program.cu.reduce((s, c) => s + (c.creditHour || 0), 0).toFixed(1)}</span></div>
            {canCreate && (program.status === 'draft' || program.status === 'correction' || program.status === 'rejected') && (
              <Button size="sm" className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 border-0 text-white h-7" onClick={() => setShowAddCu(true)}>
                <Plus className="w-3 h-3 mr-1" /> CU Baru
              </Button>
            )}
          </div>
          <ScrollArea className="max-h-[50vh]">
            <div className="space-y-2">
              {program.cu.length === 0 ? (
                <EmptyState icon={FileText} title="Tiada CU" />
              ) : (
                program.cu.map((cu) => (
                  <div key={cu.id} className="glass-subtle rounded-lg p-3 hover:bg-white/5 transition">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-cyan-200 text-sm font-semibold">{cu.cuCode}</span>
                          <Badge variant="outline" className="text-[9px] border-cyan-400/40 text-cyan-200 bg-cyan-500/10">{cu.creditHour}cr</Badge>
                          <StatusBadge status={cu.status} />
                          {cu.nossMapping?.length > 0 && (
                            <Badge variant="outline" className="text-[9px] border-emerald-400/40 text-emerald-200 bg-emerald-500/10">
                              NOSS: {cu.nossMapping[0].nossCu.cuCode} ({Math.round(cu.nossMapping[0].confidenceScore)}%)
                            </Badge>
                          )}
                          {cu._count.wim > 0 && (
                            <Badge variant="outline" className="text-[9px] border-purple-400/40 text-purple-200 bg-purple-500/10">{cu._count.wim} WIM</Badge>
                          )}
                        </div>
                        <div className="text-white text-sm mt-1 font-medium">{cu.title}</div>
                        {cu.learningOutcome && (
                          <div className="text-xs text-cyan-100/60 mt-1 line-clamp-2">{cu.learningOutcome}</div>
                        )}
                      </div>
                      {canCreate && (program.status === 'draft' || program.status === 'correction' || program.status === 'rejected') && (
                        <Button size="sm" variant="ghost" className="h-7 text-cyan-100 hover:bg-white/10 flex-shrink-0" onClick={() => onEditCu(cu)}>
                          <PenLine className="w-3 h-3 mr-1" /> Edit
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="cocu" className="mt-3">
          {program.cocu.length === 0 ? (
            <EmptyState icon={Layers} title="Tiada Co-Curiculum Unit (CoCU)" />
          ) : (
            <div className="grid sm:grid-cols-2 gap-2">
              {program.cocu.map((c) => (
                <div key={c.id} className="glass-subtle rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-cyan-200 text-sm font-semibold">{c.code}</span>
                    <Badge variant="outline" className="text-[9px] border-cyan-400/40 text-cyan-200 bg-cyan-500/10">{c.hours}j</Badge>
                  </div>
                  <div className="text-white text-sm mt-1">{c.name}</div>
                  {c.category && <div className="text-xs text-cyan-100/60 mt-0.5">{c.category}</div>}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="accred" className="mt-3">
          {program.accreds.length === 0 ? (
            <EmptyState icon={GraduationCap} title="Tiada permohonan pentauliahan" hint="Mohon pentauliahan melalui modul Pentauliahan" />
          ) : (
            <div className="space-y-2">
              {program.accreds.map((a) => (
                <div key={a.id} className="glass-subtle rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <div className="font-mono text-cyan-200 text-sm">{a.applicationCode}</div>
                    <div className="text-xs text-cyan-100/60">{a.type}</div>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Workflow actions footer */}
      {(canCreate || canApprove) && (
        <div className="mt-4 glass-subtle rounded-xl p-3 flex items-center justify-between gap-2 flex-wrap">
          <div className="text-xs text-cyan-100/70 flex items-center gap-1.5">
            <Clock className="w-3 h-3" /> Status semasa: <StatusBadge status={program.status} />
          </div>
          <div className="flex gap-2 flex-wrap">
            {canCreate && (program.status === 'draft' || program.status === 'rejected' || program.status === 'correction') && (
              <Button size="sm" className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 border-0 text-white h-8" onClick={() => onWorkflow('submit')}>
                <Send className="w-3 h-3 mr-1" /> Hantar untuk Semakan
              </Button>
            )}
            {canApprove && program.status === 'review' && (
              <>
                <Button size="sm" className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 border-0 text-white h-8" onClick={() => onWorkflow('approve')}>
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Luluskan
                </Button>
                <Button size="sm" variant="outline" className="border-red-400/40 text-red-200 hover:bg-red-500/10 h-8" onClick={() => onWorkflow('reject')}>
                  <XCircle className="w-3 h-3 mr-1" /> Tolak
                </Button>
                <Button size="sm" variant="outline" className="border-amber-400/40 text-amber-200 hover:bg-amber-500/10 h-8" onClick={() => onWorkflow('return')}>
                  <ArrowLeft className="w-3 h-3 mr-1" /> Pulangkan
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      <AddCuDialog
        open={showAddCu}
        onOpenChange={setShowAddCu}
        programId={program.id}
        onSaved={() => { setShowAddCu(false); onRefresh() }}
      />
    </div>
  )
}

// ============ CU Editor Dialog ============
function CuEditorDialog({
  cu, onOpenChange, onSaved,
}: {
  cu: any
  onOpenChange: (v: boolean) => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (cu) {
      setForm({
        title: cu.title || '',
        learningOutcome: cu.learningOutcome || '',
        performanceCriteria: cu.performanceCriteria || '',
        knowledge: cu.knowledge || '',
        skill: cu.skill || '',
        attitude: cu.attitude || '',
        toolsEquipment: cu.toolsEquipment || '',
        creditHour: cu.creditHour || 0,
        status: cu.status || 'draft',
      })
    }
  }, [cu])

  async function save() {
    if (!cu) return
    setSaving(true)
    try {
      const r = await fetch(`/api/curriculum/cu/${cu.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      toast.success(`CU dikemas kini (v${d.cu.version})`)
      onSaved()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (!cu || !form) return null

  return (
    <Dialog open={!!cu} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-white/20 text-white sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <PenLine className="w-5 h-5" /> Edit CU: <span className="font-mono text-cyan-200">{cu.cuCode}</span>
          </DialogTitle>
          <DialogDescription className="text-cyan-100/70">
            Versi semasa: v{cu.version}. Setiap simpanan akan menambah versi (FR-M2-03).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-cyan-100/80 text-xs">Tajuk</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-white/8 border-white/15 text-white" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-cyan-100/80 text-xs">Kredit Jam</Label>
              <Input type="number" step="0.5" value={form.creditHour} onChange={(e) => setForm({ ...form, creditHour: Number(e.target.value) })} className="bg-white/8 border-white/15 text-white" />
            </div>
            <div>
              <Label className="text-cyan-100/80 text-xs">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger className="bg-white/8 border-white/15 text-white w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">draft</SelectItem>
                  <SelectItem value="review">review</SelectItem>
                  <SelectItem value="approved">approved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-cyan-100/80 text-xs">Learning Outcome</Label>
            <Textarea value={form.learningOutcome} onChange={(e) => setForm({ ...form, learningOutcome: e.target.value })} rows={3} className="bg-white/8 border-white/15 text-white" />
          </div>
          <div>
            <Label className="text-cyan-100/80 text-xs">Performance Criteria</Label>
            <Textarea value={form.performanceCriteria} onChange={(e) => setForm({ ...form, performanceCriteria: e.target.value })} rows={4} className="bg-white/8 border-white/15 text-white" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-cyan-100/80 text-xs">Knowledge</Label>
              <Textarea value={form.knowledge} onChange={(e) => setForm({ ...form, knowledge: e.target.value })} rows={3} className="bg-white/8 border-white/15 text-white" />
            </div>
            <div>
              <Label className="text-cyan-100/80 text-xs">Skill</Label>
              <Textarea value={form.skill} onChange={(e) => setForm({ ...form, skill: e.target.value })} rows={3} className="bg-white/8 border-white/15 text-white" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-cyan-100/80 text-xs">Attitude</Label>
              <Textarea value={form.attitude} onChange={(e) => setForm({ ...form, attitude: e.target.value })} rows={2} className="bg-white/8 border-white/15 text-white" />
            </div>
            <div>
              <Label className="text-cyan-100/80 text-xs">Tools & Equipment</Label>
              <Textarea value={form.toolsEquipment} onChange={(e) => setForm({ ...form, toolsEquipment: e.target.value })} rows={2} className="bg-white/8 border-white/15 text-white" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" className="text-cyan-100 hover:bg-white/10" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button disabled={saving} className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 border-0 text-white" onClick={save}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Simpan & Naik Versi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============ Add CU Dialog ============
function AddCuDialog({
  open, onOpenChange, programId, onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  programId: string
  onSaved: () => void
}) {
  const [form, setForm] = useState({ cuCode: '', title: '', creditHour: 0, learningOutcome: '', performanceCriteria: '' })
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!form.cuCode || !form.title) return toast.error('Kod CU dan Tajuk diperlukan')
    setSaving(true)
    try {
      const r = await fetch(`/api/curriculum/${programId}/cu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      toast.success('CU berjaya ditambah')
      setForm({ cuCode: '', title: '', creditHour: 0, learningOutcome: '', performanceCriteria: '' })
      onSaved()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-white/20 text-white sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white"><Plus className="w-5 h-5" /> Tambah CU Baru</DialogTitle>
          <DialogDescription className="text-cyan-100/70">Unit Kompetensi baru di bawah program ini</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-cyan-100/80 text-xs">Kod CU *</Label>
              <Input value={form.cuCode} onChange={(e) => setForm({ ...form, cuCode: e.target.value.toUpperCase() })} placeholder="CU001" className="bg-white/8 border-white/15 text-white" />
            </div>
            <div>
              <Label className="text-cyan-100/80 text-xs">Kredit Jam</Label>
              <Input type="number" step="0.5" value={form.creditHour} onChange={(e) => setForm({ ...form, creditHour: Number(e.target.value) })} className="bg-white/8 border-white/15 text-white" />
            </div>
          </div>
          <div>
            <Label className="text-cyan-100/80 text-xs">Tajuk *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-white/8 border-white/15 text-white" />
          </div>
          <div>
            <Label className="text-cyan-100/80 text-xs">Learning Outcome</Label>
            <Textarea value={form.learningOutcome} onChange={(e) => setForm({ ...form, learningOutcome: e.target.value })} rows={2} className="bg-white/8 border-white/15 text-white" />
          </div>
          <div>
            <Label className="text-cyan-100/80 text-xs">Performance Criteria</Label>
            <Textarea value={form.performanceCriteria} onChange={(e) => setForm({ ...form, performanceCriteria: e.target.value })} rows={3} className="bg-white/8 border-white/15 text-white" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" className="text-cyan-100 hover:bg-white/10" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button disabled={saving} className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 border-0 text-white" onClick={save}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Tambah CU
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
