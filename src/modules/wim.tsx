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
  FileText, Plus, Search, Loader2, Eye, Send, CheckCircle2, XCircle, ArrowLeft,
  Save, Sparkles, Bot, History, ListTree, Wand2, ArrowRight, Pencil, Clock,
  CheckCircle,
} from 'lucide-react'

const SHEET_TYPES = ['Assignment Sheet', 'Information Sheet', 'Work Sheet', 'Job Sheet', 'Operation Sheet']
const STATUSES = ['draft', 'review', 'approved', 'rejected', 'archived', 'correction']

interface WimListItem {
  id: string
  code: string
  title: string
  sheetType: string
  status: string
  version: number
  isAiGenerated: boolean
  updatedAt: string
  program: { id: string; code: string; name: string } | null
  cu: { id: string; cuCode: string; title: string } | null
  author: { id: string; fullName: string; email: string } | null
}

export function WimModule() {
  const user = useAppStore((s) => s.user)
  const canCreate = !!user && hasAnyRole(user.roles, 'SUPER_ADMIN', 'ADMINISTRATOR', 'PEGAWAI_KURIKULUM', 'KETUA_PROGRAM', 'PENSYARAH', 'BAHAGIAN_KURIKULUM')
  const canApprove = !!user && hasAnyRole(user.roles, 'SUPER_ADMIN', 'ADMINISTRATOR', 'PENARAH', 'TIMBALAN_PENARAH', 'BAHAGIAN_KURIKULUM', 'KETUA_JABATAN', 'PEGAWAI_QA', 'PEGAWAI_PENTAULIAHAN')

  const [list, setList] = useState<WimListItem[]>([])
  const [programs, setPrograms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [programFilter, setProgramFilter] = useState('all')
  const [sheetFilter, setSheetFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [aiFilter, setAiFilter] = useState('all')

  const [showTemplates, setShowTemplates] = useState(false)
  const [showAi, setShowAi] = useState(false)
  const [detail, setDetail] = useState<any>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [editor, setEditor] = useState<any>(null) // WIM being edited

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('q', search)
      if (programFilter !== 'all') params.set('programId', programFilter)
      if (sheetFilter !== 'all') params.set('sheetType', sheetFilter)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (aiFilter === 'true') params.set('isAiGenerated', 'true')
      if (aiFilter === 'false') params.set('isAiGenerated', 'false')
      const r = await fetch(`/api/wim?${params.toString()}`, { credentials: 'include' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setList(d.list || [])
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }, [search, programFilter, sheetFilter, statusFilter, aiFilter])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    fetch('/api/curriculum', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setPrograms(d.programs || []))
      .catch(() => {})
  }, [])

  async function openDetail(w: WimListItem) {
    try {
      const r = await fetch(`/api/wim/${w.id}`, { credentials: 'include' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setDetail(d.wim)
      setDetailOpen(true)
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  async function workflowAction(w: WimListItem, action: string) {
    const remarks = action === 'reject' || action === 'return'
      ? window.prompt('Catatan (wajib untuk reject/return):') || ''
      : ''
    if ((action === 'reject' || action === 'return') && !remarks) {
      toast.error('Catatan diperlukan')
      return
    }
    try {
      const r = await fetch(`/api/wim/${w.id}/workflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action, remarks }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      toast.success(`WIM berjaya ${action === 'submit' ? 'dihantar' : action === 'approve' ? 'diluluskan' : action === 'reject' ? 'ditolak' : action === 'return' ? 'dikembalikan' : 'diarkibkan'}`)
      load()
      if (detailOpen && detail?.id === w.id) openDetail(w)
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FileText}
        title="Pengurusan WIM"
        description="Work Instructional Materials — Assignment, Information, Work, Job & Operation Sheets"
        actions={
          canCreate && (
            <>
              <Button variant="outline" className="border-purple-400/30 text-purple-200 hover:bg-purple-500/10 bg-white/5" onClick={() => setShowAi(true)}>
                <Sparkles className="w-4 h-4 mr-2" /> Jana dengan AI
              </Button>
              <Button className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 border-0 text-white" onClick={() => setShowTemplates(true)}>
                <Plus className="w-4 h-4 mr-2" /> WIM Baru
              </Button>
            </>
          )
        }
      />

      <GlassCard className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-100/60" />
            <Input
              placeholder="Cari kod / tajuk WIM..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-white/8 border-white/15 text-white placeholder:text-white/40"
            />
          </div>
          <Select value={programFilter} onValueChange={setProgramFilter}>
            <SelectTrigger className="bg-white/8 border-white/15 text-white"><SelectValue placeholder="Program" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Program</SelectItem>
              {programs.map((p) => <SelectItem key={p.id} value={p.id}>{p.code}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sheetFilter} onValueChange={setSheetFilter}>
            <SelectTrigger className="bg-white/8 border-white/15 text-white"><SelectValue placeholder="Sheet" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Jenis</SelectItem>
              {SHEET_TYPES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-white/8 border-white/15 text-white"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={aiFilter} onValueChange={setAiFilter}>
            <SelectTrigger className="bg-white/8 border-white/15 text-white"><SelectValue placeholder="AI" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Sumber</SelectItem>
              <SelectItem value="true">AI Sahaja</SelectItem>
              <SelectItem value="false">Manual Sahaja</SelectItem>
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
          <EmptyState icon={FileText} title="Tiada WIM dijumpai" hint="Cipta WIM baharu menggunakan templat atau AI" />
        ) : (
          <ScrollArea className="max-h-[calc(100vh-340px)]">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-cyan-100/80">Kod</TableHead>
                  <TableHead className="text-cyan-100/80">Tajuk</TableHead>
                  <TableHead className="text-cyan-100/80">Jenis</TableHead>
                  <TableHead className="text-cyan-100/80">Program / CU</TableHead>
                  <TableHead className="text-cyan-100/80">AI</TableHead>
                  <TableHead className="text-cyan-100/80">Status</TableHead>
                  <TableHead className="text-cyan-100/80 text-center">V</TableHead>
                  <TableHead className="text-cyan-100/80 text-right">Tindakan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((w) => (
                  <TableRow key={w.id} className="border-white/5 hover:bg-white/5">
                    <TableCell className="font-mono text-cyan-200 font-semibold text-xs">{w.code}</TableCell>
                    <TableCell className="text-white max-w-xs">
                      <div className="truncate">{w.title}</div>
                      <div className="text-[10px] text-cyan-100/50">{w.author?.fullName}</div>
                    </TableCell>
                    <TableCell className="text-cyan-100/80 text-xs">{w.sheetType.replace(' Sheet', '')}</TableCell>
                    <TableCell className="text-cyan-100/80 text-xs">
                      <div className="font-mono text-cyan-300">{w.program?.code}</div>
                      <div className="text-[10px] text-cyan-100/50 font-mono">{w.cu?.cuCode}</div>
                    </TableCell>
                    <TableCell>
                      {w.isAiGenerated ? (
                        <Badge variant="outline" className="text-[9px] border-purple-400/40 text-purple-200 bg-purple-500/10"><Sparkles className="w-2.5 h-2.5 mr-1" /> AI</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] border-cyan-400/30 text-cyan-100/60 bg-white/5">Manual</Badge>
                      )}
                    </TableCell>
                    <TableCell><StatusBadge status={w.status} /></TableCell>
                    <TableCell className="text-center text-cyan-100/60 text-xs font-mono">v{w.version}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-cyan-100 hover:bg-white/10" onClick={() => openDetail(w)} title="Lihat">
                          <Eye className="w-4 h-4" />
                        </Button>
                        {canCreate && (w.status === 'draft' || w.status === 'rejected' || w.status === 'correction') && (
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-cyan-100 hover:bg-white/10" onClick={async () => {
                            const r = await fetch(`/api/wim/${w.id}`, { credentials: 'include' })
                            const d = await r.json()
                            if (!r.ok) return toast.error(d.error)
                            setEditor({ ...d.wim, _existing: true })
                          }} title="Edit">
                            <Pencil className="w-4 h-4" />
                          </Button>
                        )}
                        {canCreate && (w.status === 'draft' || w.status === 'rejected' || w.status === 'correction') && (
                          <Button size="sm" variant="ghost" className="h-8 px-2 text-emerald-300 hover:bg-emerald-500/10" onClick={() => workflowAction(w, 'submit')}>
                            <Send className="w-3 h-3 mr-1" /> Hantar
                          </Button>
                        )}
                        {canApprove && w.status === 'review' && (
                          <>
                            <Button size="sm" variant="ghost" className="h-8 px-2 text-emerald-300 hover:bg-emerald-500/10" onClick={() => workflowAction(w, 'approve')}>
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Lulus
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 px-2 text-red-300 hover:bg-red-500/10" onClick={() => workflowAction(w, 'reject')}>
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

      {/* Templates Dialog */}
      <TemplatesDialog
        open={showTemplates}
        onOpenChange={setShowTemplates}
        programs={programs}
        onCreated={(w) => { setShowTemplates(false); setEditor(w) }}
      />

      {/* AI Generator Dialog */}
      <AiWimDialog
        open={showAi}
        onOpenChange={setShowAi}
        programs={programs}
        onGenerated={(w) => { setShowAi(false); setEditor(w) }}
      />

      {/* Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent side="right" className="glass-strong border-white/20 text-white w-full sm:max-w-3xl overflow-y-auto">
          {detail && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" className="text-cyan-100/80 hover:bg-white/10 h-7 px-2" onClick={() => setDetailOpen(false)}>
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <SheetTitle className="text-white font-mono">{detail.code}</SheetTitle>
                  <StatusBadge status={detail.status} />
                  <Badge variant="outline" className="text-[10px] border-cyan-400/40 text-cyan-200 bg-cyan-500/10">v{detail.version}</Badge>
                  {detail.isAiGenerated && <Badge variant="outline" className="text-[9px] border-purple-400/40 text-purple-200 bg-purple-500/10"><Sparkles className="w-2.5 h-2.5 mr-1" /> AI</Badge>}
                </div>
                <SheetDescription className="text-cyan-100/80 text-base font-medium">{detail.title}</SheetDescription>
              </SheetHeader>

              <div className="px-4 pb-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mb-4">
                  <div className="glass-subtle rounded-lg p-2"><div className="text-[10px] text-cyan-100/60">Sheet Type</div><div className="text-white">{detail.sheetType}</div></div>
                  <div className="glass-subtle rounded-lg p-2"><div className="text-[10px] text-cyan-100/60">Program</div><div className="text-white font-mono text-xs">{detail.program?.code}</div></div>
                  <div className="glass-subtle rounded-lg p-2"><div className="text-[10px] text-cyan-100/60">CU</div><div className="text-white font-mono text-xs">{detail.cu?.cuCode}</div></div>
                  <div className="glass-subtle rounded-lg p-2"><div className="text-[10px] text-cyan-100/60">Pengarang</div><div className="text-white text-xs truncate">{detail.author?.fullName}</div></div>
                </div>

                <Tabs defaultValue="content">
                  <TabsList className="bg-white/8 border border-white/15">
                    <TabsTrigger value="content" className="data-[state=active]:bg-white/15 text-cyan-100"><FileText className="w-3 h-3 mr-1" /> Kandungan</TabsTrigger>
                    <TabsTrigger value="rubric" className="data-[state=active]:bg-white/15 text-cyan-100"><ListTree className="w-3 h-3 mr-1" /> Rubrik</TabsTrigger>
                    <TabsTrigger value="answer" className="data-[state=active]:bg-white/15 text-cyan-100"><CheckCircle className="w-3 h-3 mr-1" /> Skema Jawapan</TabsTrigger>
                    <TabsTrigger value="history" className="data-[state=active]:bg-white/15 text-cyan-100"><History className="w-3 h-3 mr-1" /> Aliran Kerja</TabsTrigger>
                  </TabsList>
                  <TabsContent value="content" className="mt-3">
                    <div className="glass-subtle rounded-lg p-3 max-h-[60vh] overflow-y-auto">
                      <pre className="text-xs text-cyan-50/90 whitespace-pre-wrap font-mono">{detail.content || 'Tiada kandungan'}</pre>
                    </div>
                  </TabsContent>
                  <TabsContent value="rubric" className="mt-3">
                    <div className="glass-subtle rounded-lg p-3 max-h-[60vh] overflow-y-auto">
                      <pre className="text-xs text-cyan-50/90 whitespace-pre-wrap font-mono">{detail.rubric || 'Tiada rubrik'}</pre>
                    </div>
                  </TabsContent>
                  <TabsContent value="answer" className="mt-3">
                    <div className="glass-subtle rounded-lg p-3 max-h-[60vh] overflow-y-auto">
                      <pre className="text-xs text-cyan-50/90 whitespace-pre-wrap font-mono">{detail.answerScheme || 'Tiada skema jawapan'}</pre>
                    </div>
                  </TabsContent>
                  <TabsContent value="history" className="mt-3">
                    {detail && <WimHistory wimId={detail.id} />}
                  </TabsContent>
                </Tabs>

                {detail.status === 'approved' && (
                  <div className="glass-subtle rounded-xl p-3 mt-3 flex items-center gap-2 border border-emerald-400/30 bg-emerald-500/5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    <span className="text-xs text-emerald-200">
                      <strong>Ditandatangani oleh:</strong> {detail.author?.fullName || '-'} · Diluluskan
                    </span>
                  </div>
                )}

                {(canCreate || canApprove) && (
                  <div className="mt-4 glass-subtle rounded-xl p-3 flex items-center justify-between gap-2 flex-wrap">
                    <div className="text-xs text-cyan-100/70 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" /> Status: <StatusBadge status={detail.status} />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {canCreate && (detail.status === 'draft' || detail.status === 'rejected' || detail.status === 'correction') && (
                        <Button size="sm" className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 border-0 text-white h-8" onClick={() => workflowAction({ id: detail.id } as any, 'submit')}>
                          <Send className="w-3 h-3 mr-1" /> Hantar
                        </Button>
                      )}
                      {canApprove && detail.status === 'review' && (
                        <>
                          <Button size="sm" className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 border-0 text-white h-8" onClick={() => workflowAction({ id: detail.id } as any, 'approve')}>
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Luluskan
                          </Button>
                          <Button size="sm" variant="outline" className="border-red-400/40 text-red-200 hover:bg-red-500/10 h-8" onClick={() => workflowAction({ id: detail.id } as any, 'reject')}>
                            <XCircle className="w-3 h-3 mr-1" /> Tolak
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Editor Sheet */}
      <WimEditor
        wim={editor}
        onClose={() => { setEditor(null); load() }}
        canApprove={canApprove}
      />
    </div>
  )
}

// ============ Templates Dialog ============
function TemplatesDialog({
  open, onOpenChange, programs, onCreated,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  programs: any[]
  onCreated: (w: any) => void
}) {
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedTpl, setSelectedTpl] = useState<any | null>(null)
  const [programId, setProgramId] = useState('')
  const [programCus, setProgramCus] = useState<any[]>([])
  const [cuId, setCuId] = useState('')
  const [code, setCode] = useState('')
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setLoading(true)
      fetch('/api/wim/templates', { credentials: 'include' })
        .then((r) => r.json())
        .then((d) => setTemplates(d.templates || []))
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }, [open])

  useEffect(() => {
    if (!programId) return
    fetch(`/api/curriculum/${programId}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setProgramCus(d.program?.cu || []))
      .catch(() => {})
  }, [programId])

  async function create() {
    if (!selectedTpl || !programId || !cuId || !code || !title) {
      return toast.error('Lengkapkan semua medan')
    }
    setSaving(true)
    try {
      const r = await fetch('/api/wim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          programId, cuId, code, title,
          sheetType: selectedTpl.sheetType,
          content: selectedTpl.content,
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      toast.success('WIM dicipta dari templat')
      setSelectedTpl(null); setCode(''); setTitle(''); setCuId(''); setProgramId('')
      onCreated(d.wim)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-white/20 text-white sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white"><ListTree className="w-5 h-5" /> Pustaka Templat WIM</DialogTitle>
          <DialogDescription className="text-cyan-100/70">Pilih templat untuk memulakan WIM baharu</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-cyan-300" /></div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3 max-h-[40vh] overflow-y-auto">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTpl(t)}
                className={`glass-subtle rounded-lg p-3 text-left hover:bg-white/10 transition border-2 ${selectedTpl?.id === t.id ? 'border-cyan-400' : 'border-transparent'}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="outline" className="text-[9px] border-cyan-400/40 text-cyan-200 bg-cyan-500/10">{t.sheetType}</Badge>
                  {t.category && <span className="text-[10px] text-cyan-100/50">{t.category}</span>}
                </div>
                <div className="text-sm text-white font-medium">{t.name}</div>
                <div className="text-[10px] text-cyan-100/50 mt-1 line-clamp-2">{t.content?.slice(0, 100)}</div>
              </button>
            ))}
            {templates.length === 0 && <EmptyState icon={ListTree} title="Tiada templat" />}
          </div>
        )}

        {selectedTpl && (
          <div className="glass-subtle rounded-lg p-3 space-y-3">
            <div className="text-xs text-cyan-100/80 font-semibold">Maklumat WIM Baharu</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-cyan-100/80 text-xs">Program *</Label>
                <Select value={programId} onValueChange={(v) => { setProgramId(v); setCuId('') }}>
                  <SelectTrigger className="bg-white/8 border-white/15 text-white w-full"><SelectValue placeholder="Pilih" /></SelectTrigger>
                  <SelectContent>
                    {programs.map((p) => <SelectItem key={p.id} value={p.id}>{p.code} - {p.name.slice(0, 40)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-cyan-100/80 text-xs">CU *</Label>
                <Select value={cuId} onValueChange={setCuId} disabled={!programCus.length}>
                  <SelectTrigger className="bg-white/8 border-white/15 text-white w-full"><SelectValue placeholder="Pilih CU" /></SelectTrigger>
                  <SelectContent>
                    {programCus.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.cuCode} - {c.title.slice(0, 40)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-cyan-100/80 text-xs">Kod WIM *</Label>
                <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="WIM-DTE001-AS01" className="bg-white/8 border-white/15 text-white" />
              </div>
              <div>
                <Label className="text-cyan-100/80 text-xs">Tajuk *</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-white/8 border-white/15 text-white" />
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" className="text-cyan-100 hover:bg-white/10" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button disabled={saving || !selectedTpl} className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 border-0 text-white" onClick={create}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-2" />} Cipta & Edit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============ AI WIM Generator Dialog ============
function AiWimDialog({
  open, onOpenChange, programs, onGenerated,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  programs: any[]
  onGenerated: (w: any) => void
}) {
  const [programId, setProgramId] = useState('')
  const [programCus, setProgramCus] = useState<any[]>([])
  const [cuId, setCuId] = useState('')
  const [sheetType, setSheetType] = useState('Assignment Sheet')
  const [generating, setGenerating] = useState(false)
  const [draft, setDraft] = useState('')

  useEffect(() => {
    if (!programId) return
    fetch(`/api/curriculum/${programId}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setProgramCus(d.program?.cu || []))
      .catch(() => {})
  }, [programId])

  async function generate() {
    if (!cuId) return toast.error('Pilih CU')
    setGenerating(true); setDraft('')
    try {
      const r = await fetch('/api/ai/generate-wim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ cuId, sheetType }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setDraft(d.draft)
      toast.success('Draf WIM dijana. Sila semak sebelum digunakan.')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setGenerating(false)
    }
  }

  async function saveAsWim() {
    if (!draft) return toast.error('Jana draf dahulu')
    if (!programId || !cuId) return toast.error('Pilih program & CU')
    const code = window.prompt('Kod WIM (cth: WIM-DTE001-AS01):') || ''
    if (!code) return
    const title = window.prompt('Tajuk WIM:', `${sheetType} - ${programCus.find(c => c.id === cuId)?.title || ''}`) || ''
    if (!title) return
    try {
      const r = await fetch('/api/wim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          programId, cuId, code, title, sheetType,
          content: draft,
          isAiGenerated: true,
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      toast.success('WIM AI disimpan sebagai draf')
      onGenerated(d.wim)
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-white/20 text-white sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white"><Sparkles className="w-5 h-5 text-purple-300" /> Jana WIM dengan AI</DialogTitle>
          <DialogDescription className="text-cyan-100/70">GLM-5.2 akan menjana draf berdasarkan CU yang dipilih</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label className="text-cyan-100/80 text-xs">Program</Label>
            <Select value={programId} onValueChange={(v) => { setProgramId(v); setCuId('') }}>
              <SelectTrigger className="bg-white/8 border-white/15 text-white w-full"><SelectValue placeholder="Pilih" /></SelectTrigger>
              <SelectContent>
                {programs.map((p) => <SelectItem key={p.id} value={p.id}>{p.code}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-cyan-100/80 text-xs">Unit Kompetensi</Label>
            <Select value={cuId} onValueChange={setCuId} disabled={!programCus.length}>
              <SelectTrigger className="bg-white/8 border-white/15 text-white w-full"><SelectValue placeholder="Pilih CU" /></SelectTrigger>
              <SelectContent>
                {programCus.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.cuCode} - {c.title.slice(0, 40)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-cyan-100/80 text-xs">Jenis Sheet</Label>
            <Select value={sheetType} onValueChange={setSheetType}>
              <SelectTrigger className="bg-white/8 border-white/15 text-white w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SHEET_TYPES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button disabled={generating || !cuId} className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 border-0 text-white w-full" onClick={generate}>
          {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />} Jana Draf dengan AI
        </Button>

        {draft && (
          <div className="space-y-2">
            <div className="glass-subtle rounded-lg p-2 text-[10px] text-purple-200 flex items-center gap-1.5 bg-purple-500/10 border border-purple-400/30">
              <Sparkles className="w-3 h-3" /> Draf AI - Perlu Semakan Manusia
            </div>
            <div className="glass-subtle rounded-lg p-3 max-h-[40vh] overflow-y-auto">
              <pre className="text-xs text-cyan-50/90 whitespace-pre-wrap font-mono">{draft}</pre>
            </div>
            <Button className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 border-0 text-white" onClick={saveAsWim}>
              <Save className="w-4 h-4 mr-2" /> Simpan sebagai WIM (Draf)
            </Button>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" className="text-cyan-100 hover:bg-white/10" onClick={() => onOpenChange(false)}>Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============ WIM Editor (Sheet) ============
function WimEditor({
  wim, onClose, canApprove,
}: {
  wim: any
  onClose: () => void
  canApprove: boolean
}) {
  const [content, setContent] = useState('')
  const [rubric, setRubric] = useState('')
  const [answerScheme, setAnswerScheme] = useState('')
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [generatingRubric, setGeneratingRubric] = useState(false)

  useEffect(() => {
    if (wim) {
      setContent(wim.content || '')
      setRubric(wim.rubric || '')
      setAnswerScheme(wim.answerScheme || '')
      setTitle(wim.title || '')
    }
  }, [wim])

  async function save() {
    if (!wim) return
    setSaving(true)
    try {
      const r = await fetch(`/api/wim/${wim.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content, rubric, answerScheme, title }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      toast.success(`WIM dikemas kini (v${d.wim.version})`)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function genRubric() {
    if (!wim?.cu?.learningOutcome) return toast.error('CU tiada Learning Outcome')
    setGeneratingRubric(true)
    try {
      const r = await fetch('/api/ai/generate-rubric', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ learningOutcome: wim.cu.learningOutcome }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setRubric(d.draft)
      toast.success('Rubrik dijana oleh AI')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setGeneratingRubric(false)
    }
  }

  if (!wim) return null

  return (
    <Sheet open={!!wim} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent side="right" className="glass-strong border-white/20 text-white w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" className="text-cyan-100/80 hover:bg-white/10 h-7 px-2" onClick={onClose}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <SheetTitle className="text-white font-mono">{wim.code}</SheetTitle>
            <Badge variant="outline" className="text-[10px] border-cyan-400/40 text-cyan-200 bg-cyan-500/10">v{wim.version}</Badge>
            {wim.isAiGenerated && <Badge variant="outline" className="text-[9px] border-purple-400/40 text-purple-200 bg-purple-500/10"><Sparkles className="w-2.5 h-2.5 mr-1" /> AI</Badge>}
          </div>
          <SheetDescription className="text-cyan-100/70">Editor WIM — setiap simpanan menambah versi</SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-6 space-y-3">
          <div>
            <Label className="text-cyan-100/80 text-xs">Tajuk</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-white/8 border-white/15 text-white" />
          </div>

          <Tabs defaultValue="content">
            <TabsList className="bg-white/8 border border-white/15">
              <TabsTrigger value="content" className="data-[state=active]:bg-white/15 text-cyan-100">Kandungan</TabsTrigger>
              <TabsTrigger value="rubric" className="data-[state=active]:bg-white/15 text-cyan-100">Rubrik</TabsTrigger>
              <TabsTrigger value="answer" className="data-[state=active]:bg-white/15 text-cyan-100">Skema Jawapan</TabsTrigger>
            </TabsList>
            <TabsContent value="content" className="mt-2">
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={20} className="bg-white/8 border-white/15 text-white font-mono text-xs" placeholder="Kandungan WIM (Markdown)..." />
            </TabsContent>
            <TabsContent value="rubric" className="mt-2 space-y-2">
              <Button size="sm" variant="outline" className="border-purple-400/30 text-purple-200 hover:bg-purple-500/10 bg-white/5" onClick={genRubric} disabled={generatingRubric}>
                {generatingRubric ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />} Jana Rubrik dengan AI
              </Button>
              <Textarea value={rubric} onChange={(e) => setRubric(e.target.value)} rows={15} className="bg-white/8 border-white/15 text-white font-mono text-xs" placeholder="Rubrik pemarkahan (Markdown)..." />
            </TabsContent>
            <TabsContent value="answer" className="mt-2">
              <Textarea value={answerScheme} onChange={(e) => setAnswerScheme(e.target.value)} rows={15} className="bg-white/8 border-white/15 text-white font-mono text-xs" placeholder="Skema jawapan..." />
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
            <Button variant="ghost" className="text-cyan-100 hover:bg-white/10" onClick={onClose}>Tutup</Button>
            <Button disabled={saving} className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 border-0 text-white" onClick={save}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Simpan & Naik Versi
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ============ WIM Workflow History ============
function WimHistory({ wimId }: { wimId: string }) {
  const [wf, setWf] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/wim/${wimId}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setWf(d.workflow))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [wimId])

  if (loading) return <div className="text-xs text-cyan-100/60 text-center py-4"><Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Memuatkan...</div>
  if (!wf) return <EmptyState icon={History} title="Tiada aliran kerja" />

  return (
    <div className="space-y-2">
      {wf.transitions?.length === 0 ? (
        <div className="text-xs text-cyan-100/60 text-center py-4">Belum ada transisi</div>
      ) : (
        wf.transitions?.map((t: any) => (
          <div key={t.id} className="glass-subtle rounded-lg p-2 text-xs">
            <div className="flex items-center justify-between mb-1">
              <Badge variant="outline" className={`text-[9px] ${t.action === 'approve' ? 'border-emerald-400/40 text-emerald-200 bg-emerald-500/10' : t.action === 'reject' ? 'border-red-400/40 text-red-200 bg-red-500/10' : 'border-cyan-400/40 text-cyan-200 bg-cyan-500/10'}`}>
                {t.action}
              </Badge>
              <span className="text-[10px] text-cyan-100/50">{new Date(t.createdAt).toLocaleString('ms-MY')}</span>
            </div>
            <div className="text-cyan-100/80">
              <span className="font-mono text-cyan-300">{t.fromStatus || 'start'}</span>
              <ArrowRight className="inline w-3 h-3 mx-1" />
              <span className="font-mono text-emerald-300">{t.toStatus}</span>
            </div>
            <div className="text-[10px] text-cyan-100/50 mt-0.5">oleh {t.actionBy?.fullName || 'sistem'}{t.remarks ? ` · ${t.remarks}` : ''}</div>
          </div>
        ))
      )}
    </div>
  )
}
