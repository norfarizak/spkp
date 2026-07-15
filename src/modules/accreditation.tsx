'use client'
import { useEffect, useState, useCallback } from 'react'
import { GlassCard, PageHeader, StatusBadge, EmptyState, GlassPanel } from '@/components/glass'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Award, Plus, Search, Filter, Loader2, FileCheck, Calendar, AlertTriangle,
  CheckCircle2, XCircle, RotateCcw, FileSignature, ClipboardList, ShieldCheck,
  Clock, AlertCircle, Building2, ChevronRight, Printer,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'

interface AppItem {
  id: string
  applicationCode: string
  institutionId: string
  institutionName?: string
  programName?: string
  programCode?: string
  type: string
  status: string
  submittedAt: string
  auditDate?: string | null
  approvedAt?: string | null
  expiryDate?: string | null
  notes?: string | null
  applicantName?: string
  counts: { checklists: number; audits: number; certificates: number }
}

interface AppDetail {
  id: string
  applicationCode: string
  type: string
  status: string
  notes: string | null
  submittedAt: string
  auditDate: string | null
  approvedAt: string | null
  expiryDate: string | null
  institution: { id: string; name: string; code: string } | null
  program: { id: string; name: string; code: string; level: string | null } | null
  applicant: { id: string; fullName: string; email: string } | null
  checklists: Array<{
    id: string; item: string; requirement: string; isMet: boolean
    evidence: string | null; remarks: string | null; createdAt: string
  }>
  audits: Array<{
    id: string; scheduledAt: string; location: string | null; status: string
    auditor: { id: string; fullName: string; email: string } | null
    findings: Array<{
      id: string; category: string; description: string; severity: string
      status: string; correctiveAction: string | null; dueDate: string | null
      resolvedAt: string | null; auditor: { fullName: string } | null; createdAt: string
    }>
  }>
  certificates: Array<{
    id: string; certNumber: string; institutionName: string; programName: string
    type: string; issuedAt: string; expiryDate: string; status: string; signedBy: string | null
  }>
}

const STATUS_OPTIONS = ['submitted', 'self_assessment', 'audit', 'review', 'approved', 'rejected', 'expired']
const TYPE_OPTIONS = ['Penuh', 'Sementara', 'Pembaharuan']

const STATUS_LABELS: Record<string, string> = {
  submitted: 'Dihantar',
  self_assessment: 'Penilaian Kendiri',
  audit: 'Audit',
  review: 'Semakan',
  approved: 'Diluluskan',
  rejected: 'Ditolak',
  expired: 'Tamat Tempoh',
}

export function AccreditationModule() {
  const user = useAppStore((s) => s.user)
  const [items, setItems] = useState<AppItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ status: '', type: '', institutionId: '', q: '' })
  const [institutions, setInstitutions] = useState<{ id: string; name: string }[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [detail, setDetail] = useState<AppDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)

  const loadList = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      if (filters.status) p.set('status', filters.status)
      if (filters.type) p.set('type', filters.type)
      if (filters.institutionId) p.set('institutionId', filters.institutionId)
      if (filters.q) p.set('q', filters.q)
      const res = await fetch(`/api/accreditation?${p.toString()}`, { credentials: 'include' })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      setItems(d.items || [])
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    loadList()
  }, [loadList])

  // For institution filter dropdown: derive unique institutions from list (good enough for institution-scoped views).
  // For admin (national) views, we also fetch the full institution list for filtering.
  const institutionMap = new Map<string, string>()
  for (const i of items) {
    const key = String(i.institutionId || '')
    if (!institutionMap.has(key)) institutionMap.set(key, i.institutionName || '—')
  }
  const institutionOptions: [string, string][] = Array.from(institutionMap.entries())

  async function openDetail(id: string) {
    setDetailId(id)
    setDetailLoading(true)
    setDetail(null)
    try {
      const res = await fetch(`/api/accreditation/${id}`, { credentials: 'include' })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      setDetail(d.item)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setDetailLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Award}
        title="Pentauliahan Institusi"
        description="Urus permohonan pentauliahan program, audit pematuhan, dan pengeluaran sijil MQA/JPK"
        actions={
          <Button
            className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 border-0 text-white"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" /> Permohonan Baru
          </Button>
        }
      />

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatChip icon={FileCheck} label="Jumlah Permohonan" value={items.length} color="from-cyan-500 to-blue-500" />
        <StatChip icon={ClipboardList} label="Dalam Semakan" value={items.filter((i) => ['submitted', 'self_assessment', 'audit', 'review'].includes(i.status)).length} color="from-amber-500 to-orange-500" />
        <StatChip icon={ShieldCheck} label="Diluluskan" value={items.filter((i) => i.status === 'approved').length} color="from-emerald-500 to-teal-500" />
        <StatChip icon={AlertTriangle} label="Hampir Tamat" value={items.filter((i) => {
          if (!i.expiryDate) return false
          const days = Math.ceil((new Date(i.expiryDate).getTime() - Date.now()) / 86400000)
          return days > 0 && days <= 90
        }).length} color="from-rose-500 to-red-500" />
      </div>

      {/* Filters */}
      <GlassCard className="p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-100/60" />
            <Input
              placeholder="Cari kod permohonan, institusi, program..."
              value={filters.q}
              onChange={(e) => setFilters((s) => ({ ...s, q: e.target.value }))}
              className="pl-10 bg-white/8 border-white/15 text-white placeholder:text-white/40"
            />
          </div>
          <Select value={filters.status || 'all'} onValueChange={(v) => setFilters((s) => ({ ...s, status: v === 'all' ? '' : v }))}>
            <SelectTrigger className="bg-white/8 border-white/15 text-white w-full lg:w-48">
              <Filter className="w-3.5 h-3.5 mr-1 text-cyan-300" />
              <SelectValue placeholder="Semua Status" />
            </SelectTrigger>
            <SelectContent className="glass-strong border-white/20 text-white">
              <SelectItem value="all">Semua Status</SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.type || 'all'} onValueChange={(v) => setFilters((s) => ({ ...s, type: v === 'all' ? '' : v }))}>
            <SelectTrigger className="bg-white/8 border-white/15 text-white w-full lg:w-44">
              <SelectValue placeholder="Semua Jenis" />
            </SelectTrigger>
            <SelectContent className="glass-strong border-white/20 text-white">
              <SelectItem value="all">Semua Jenis</SelectItem>
              {TYPE_OPTIONS.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.institutionId || 'all'} onValueChange={(v) => setFilters((s) => ({ ...s, institutionId: v === 'all' ? '' : v }))}>
            <SelectTrigger className="bg-white/8 border-white/15 text-white w-full lg:w-52">
              <Building2 className="w-3.5 h-3.5 mr-1 text-cyan-300" />
              <SelectValue placeholder="Semua Institusi" />
            </SelectTrigger>
            <SelectContent className="glass-strong border-white/20 text-white">
              <SelectItem value="all">Semua Institusi</SelectItem>
              {institutionOptions.map(([id, name]) => (
                <SelectItem key={id} value={id}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </GlassCard>

      {/* Table */}
      <GlassCard className="p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-cyan-100/70">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Memuatkan data...
          </div>
        ) : items.length === 0 ? (
          <EmptyState icon={Award} title="Tiada permohonan pentauliahan" hint="Klik 'Permohonan Baru' untuk mula" />
        ) : (
          <div className="max-h-[28rem] overflow-y-auto scroll-area">
            <table className="w-full text-sm">
              <thead className="sticky top-0 glass-strong z-10">
                <tr className="text-left text-cyan-100/70 text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 font-semibold">Kod</th>
                  <th className="px-4 py-3 font-semibold">Institusi / Program</th>
                  <th className="px-4 py-3 font-semibold">Jenis</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Dihantar</th>
                  <th className="px-4 py-3 font-semibold">Tamat Tempoh</th>
                  <th className="px-4 py-3 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const expiry = it.expiryDate ? Math.ceil((new Date(it.expiryDate).getTime() - Date.now()) / 86400000) : null
                  const soon = expiry !== null && expiry > 0 && expiry <= 90
                  const expired = expiry !== null && expiry <= 0
                  return (
                    <tr key={it.id} className="border-t border-white/8 hover:bg-white/5 transition">
                      <td className="px-4 py-3">
                        <div className="font-mono text-cyan-200 font-semibold">{it.applicationCode}</div>
                        <div className="text-[10px] text-cyan-100/60">oleh {it.applicantName || '—'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-white text-sm font-medium truncate max-w-[200px]">{it.institutionName || '—'}</div>
                        <div className="text-[11px] text-cyan-100/60 truncate max-w-[200px]">{it.programCode ? `${it.programCode} · ` : ''}{it.programName || 'Program tidak ditentukan'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="border-cyan-400/30 text-cyan-200 bg-cyan-500/10 text-[10px]">
                          {it.type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={it.status} /></td>
                      <td className="px-4 py-3 text-cyan-100/80 text-xs">
                        {new Date(it.submittedAt).toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3">
                        {it.expiryDate ? (
                          <div className={`text-xs ${expired ? 'text-red-300' : soon ? 'text-amber-300' : 'text-cyan-100/70'}`}>
                            <div>{new Date(it.expiryDate).toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                            <div className="text-[10px]">{expired ? 'Tamat tempoh' : `${expiry} hari lagi`}</div>
                          </div>
                        ) : (
                          <span className="text-cyan-100/40 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" variant="ghost" className="text-cyan-200 hover:text-white hover:bg-white/10 h-8" onClick={() => openDetail(it.id)}>
                          <ChevronRight className="w-4 h-4" /> Butiran
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      <CreateApplicationDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => {
          setCreateOpen(false)
          loadList()
        }}
      />

      <ApplicationDetailDialog
        key={detailId || 'none'}
        id={detailId}
        open={!!detailId}
        loading={detailLoading}
        detail={detail}
        onOpenChange={(o) => { if (!o) { setDetailId(null); setDetail(null) } }}
        onRefresh={() => detailId && openDetail(detailId)}
        onListRefresh={loadList}
        currentUser={user}
      />
    </div>
  )
}

function StatChip({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <GlassCard className="p-4 relative overflow-hidden">
      <div className={`absolute -right-3 -top-3 w-16 h-16 rounded-full bg-gradient-to-br ${color} opacity-15 blur-xl`} />
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center`}>
          <Icon className="w-4.5 h-4.5 text-white" />
        </div>
        <div>
          <div className="text-2xl font-bold text-white leading-none">{value}</div>
          <div className="text-[11px] text-cyan-100/70 mt-1">{label}</div>
        </div>
      </div>
    </GlassCard>
  )
}

// =============== CREATE APPLICATION DIALOG ===============
function CreateApplicationDialog({
  open, onOpenChange, onCreated,
}: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: () => void }) {
  const [institutions, setInstitutions] = useState<{ id: string; name: string; code?: string }[]>([])
  const [programs, setPrograms] = useState<{ id: string; name: string; code: string }[]>([])
  const [institutionId, setInstitutionId] = useState('')
  const [programId, setProgramId] = useState('')
  const [type, setType] = useState('Penuh')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    // Use existing curriculum/institutions endpoint for institution dropdown
    fetch('/api/curriculum/institutions', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((d) => setInstitutions(d.list || []))
      .catch(() => {
        // Fallback: derive institutions from existing accreditation list
        fetch('/api/accreditation', { credentials: 'include' })
          .then((r) => r.json())
          .then((d2) => {
            const map = new Map<string, string>()
            for (const it of d2.items || []) {
              if (it.institutionId) map.set(it.institutionId, it.institutionName || '—')
            }
            setInstitutions(Array.from(map.entries()).map(([id, name]) => ({ id, name, code: '' })))
          })
          .catch(() => setInstitutions([]))
      })
  }, [open])

  useEffect(() => {
    if (!institutionId) {
      setPrograms([])
      return
    }
    fetch(`/api/curriculum?institutionId=${institutionId}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setPrograms(d.programs || []))
      .catch(() => setPrograms([]))
  }, [institutionId])

  async function submit() {
    if (!institutionId) return toast.error('Sila pilih institusi')
    if (!type) return toast.error('Sila pilih jenis pentauliahan')
    setSubmitting(true)
    try {
      const res = await fetch('/api/accreditation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ institutionId, programId: programId || undefined, type, notes }),
        credentials: 'include',
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      toast.success(`Permohonan ${d.applicationCode} berjaya dihantar`)
      setInstitutionId(''); setProgramId(''); setType('Penuh'); setNotes('')
      onCreated()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-white/20 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-cyan-300" /> Permohonan Pentauliahan Baru
          </DialogTitle>
          <DialogDescription className="text-cyan-100/70">
            Status permohonan akan bermula sebagai <strong>Dihantar</strong>. Checklist pematuhan standard MQA/JPK akan dijana secara automatik.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-cyan-100/80 mb-1.5 block text-xs">Institusi *</Label>
              <Select value={institutionId} onValueChange={setInstitutionId}>
                <SelectTrigger className="bg-white/8 border-white/15 text-white w-full">
                  <SelectValue placeholder="Pilih institusi" />
                </SelectTrigger>
                <SelectContent className="glass-strong border-white/20 text-white max-h-72">
                  {institutions.length === 0 ? (
                    <SelectItem value="none" disabled>Memuatkan...</SelectItem>
                  ) : (
                    institutions.map((i) => (
                      <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-cyan-100/80 mb-1.5 block text-xs">Program (pilihan)</Label>
              <Select value={programId} onValueChange={setProgramId}>
                <SelectTrigger className="bg-white/8 border-white/15 text-white w-full">
                  <SelectValue placeholder="Pilih program" />
                </SelectTrigger>
                <SelectContent className="glass-strong border-white/20 text-white max-h-72">
                  {programs.length === 0 ? (
                    <SelectItem value="none" disabled>{institutionId ? 'Tiada program' : 'Pilih institusi dahulu'}</SelectItem>
                  ) : (
                    programs.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.code} · {p.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-cyan-100/80 mb-1.5 block text-xs">Jenis Pentauliahan *</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="bg-white/8 border-white/15 text-white w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass-strong border-white/20 text-white">
                {TYPE_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t === 'Penuh' ? 'Penuh (5 tahun)' : t === 'Sementara' ? 'Sementara (2 tahun)' : 'Pembaharuan'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-cyan-100/80 mb-1.5 block text-xs">Catatan Tambahan</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Maklumat sokongan, justifikasi, atau arahan khas..."
              className="bg-white/8 border-white/15 text-white placeholder:text-white/40"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" className="text-cyan-100 hover:bg-white/10 hover:text-white">Batal</Button>
          </DialogClose>
          <Button
            onClick={submit}
            disabled={submitting}
            className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 border-0 text-white"
          >
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            Hantar Permohonan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// =============== APPLICATION DETAIL DIALOG ===============
function ApplicationDetailDialog({
  id, open, loading, detail, onOpenChange, onRefresh, onListRefresh, currentUser,
}: {
  id: string | null
  open: boolean
  loading: boolean
  detail: AppDetail | null
  onOpenChange: (v: boolean) => void
  onRefresh: () => void
  onListRefresh: () => void
  currentUser: any
}) {
  const [tab, setTab] = useState('overview')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-white/20 text-white max-w-5xl max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-cyan-300" />
            {detail ? detail.applicationCode : 'Memuat...'}
            {detail && <StatusBadge status={detail.status} />}
          </DialogTitle>
          <DialogDescription className="text-cyan-100/70">
            {detail?.institution?.name} · {detail?.program?.name || 'Program tidak ditentukan'} · Jenis: {detail?.type}
          </DialogDescription>
        </DialogHeader>

        {loading || !detail ? (
          <div className="flex items-center justify-center py-12 text-cyan-100/70">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Memuatkan butiran...
          </div>
        ) : (
          <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="bg-white/5 border border-white/10 p-1 self-start">
              <TabsTrigger value="overview" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-white text-cyan-100/70 text-xs">Ringkasan</TabsTrigger>
              <TabsTrigger value="checklist" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-white text-cyan-100/70 text-xs">Checklist Pematuhan</TabsTrigger>
              <TabsTrigger value="audit" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-white text-cyan-100/70 text-xs">Audit & Penemuan</TabsTrigger>
              <TabsTrigger value="certificate" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-white text-cyan-100/70 text-xs">Sijil</TabsTrigger>
              <TabsTrigger value="workflow" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-white text-cyan-100/70 text-xs">Aliran Kerja</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto scroll-area mt-3 pr-1">
              <TabsContent value="overview" className="mt-0">
                <OverviewTab detail={detail} />
              </TabsContent>
              <TabsContent value="checklist" className="mt-0">
                <ChecklistTab detail={detail} onRefresh={onRefresh} />
              </TabsContent>
              <TabsContent value="audit" className="mt-0">
                <AuditTab detail={detail} onRefresh={onRefresh} />
              </TabsContent>
              <TabsContent value="certificate" className="mt-0">
                <CertificateTab detail={detail} onRefresh={onRefresh} onListRefresh={onListRefresh} />
              </TabsContent>
              <TabsContent value="workflow" className="mt-0">
                <WorkflowTab detail={detail} onRefresh={onRefresh} onListRefresh={onListRefresh} currentUser={currentUser} />
              </TabsContent>
            </div>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}

function OverviewTab({ detail }: { detail: AppDetail }) {
  const expiry = detail.expiryDate ? Math.ceil((new Date(detail.expiryDate).getTime() - Date.now()) / 86400000) : null
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <InfoCard icon={Calendar} label="Tarikh Dihantar" value={new Date(detail.submittedAt).toLocaleDateString('ms-MY')} />
        <InfoCard icon={ClipboardList} label="Audit Dijadualkan" value={detail.auditDate ? new Date(detail.auditDate).toLocaleDateString('ms-MY') : 'Belum'} />
        <InfoCard icon={CheckCircle2} label="Diluluskan Pada" value={detail.approvedAt ? new Date(detail.approvedAt).toLocaleDateString('ms-MY') : '—'} />
        <InfoCard icon={Clock} label="Tamat Tempoh" value={detail.expiryDate ? new Date(detail.expiryDate).toLocaleDateString('ms-MY') : '—'} highlight={expiry !== null && expiry <= 90} />
      </div>

      {expiry !== null && expiry > 0 && expiry <= 90 && (
        <div className="glass-subtle p-3 rounded-lg border-l-2 border-l-amber-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-300" />
          <span className="text-sm text-amber-100">
            Sijil akan tamat tempoh dalam <strong>{expiry} hari</strong>. Sila mula permohonan pembaharuan.
          </span>
        </div>
      )}

      <GlassPanel className="p-4">
        <div className="text-xs uppercase tracking-wide text-cyan-100/70 mb-2">Catatan Permohonan</div>
        <div className="text-sm text-white whitespace-pre-wrap min-h-[60px]">{detail.notes || 'Tiada catatan.'}</div>
      </GlassPanel>

      <GlassPanel className="p-4">
        <div className="text-xs uppercase tracking-wide text-cyan-100/70 mb-3">Status Pematuhan</div>
        <ComplianceProgress checklists={detail.checklists} />
      </GlassPanel>
    </div>
  )
}

function ComplianceProgress({ checklists }: { checklists: AppDetail['checklists'] }) {
  const met = checklists.filter((c) => c.isMet).length
  const pct = checklists.length === 0 ? 0 : Math.round((met / checklists.length) * 100)
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-white">{met} / {checklists.length} item dipatuhi</span>
        <span className="text-sm font-bold text-cyan-200">{pct}%</span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${pct >= 80 ? 'bg-gradient-to-r from-emerald-400 to-teal-400' : pct >= 50 ? 'bg-gradient-to-r from-amber-400 to-orange-400' : 'bg-gradient-to-r from-rose-400 to-red-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function InfoCard({ icon: Icon, label, value, highlight }: { icon: any; label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`glass-subtle p-3 rounded-lg ${highlight ? 'border-l-2 border-l-amber-400' : ''}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-3.5 h-3.5 text-cyan-300" />
        <span className="text-[10px] uppercase tracking-wide text-cyan-100/60">{label}</span>
      </div>
      <div className={`text-sm font-semibold ${highlight ? 'text-amber-200' : 'text-white'}`}>{value}</div>
    </div>
  )
}

// =============== CHECKLIST TAB ===============
function ChecklistTab({ detail, onRefresh }: { detail: AppDetail; onRefresh: () => void }) {
  const [newItem, setNewItem] = useState({ item: '', requirement: '' })
  const [editing, setEditing] = useState<{ id: string; evidence: string; remarks: string; isMet: boolean } | null>(null)
  const [saving, setSaving] = useState(false)

  async function toggle(id: string, current: boolean) {
    try {
      const res = await fetch(`/api/accreditation/${detail.id}/checklist`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isMet: !current }),
        credentials: 'include',
      })
      if (!res.ok) throw new Error((await res.json()).error)
      onRefresh()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  async function addItem() {
    if (!newItem.item.trim()) return toast.error('Item diperlukan')
    setSaving(true)
    try {
      const res = await fetch(`/api/accreditation/${detail.id}/checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
        credentials: 'include',
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Item ditambah')
      setNewItem({ item: '', requirement: '' })
      onRefresh()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function saveEvidence() {
    if (!editing) return
    setSaving(true)
    try {
      const res = await fetch(`/api/accreditation/${detail.id}/checklist`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editing.id, evidence: editing.evidence, remarks: editing.remarks }),
        credentials: 'include',
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Bukti disimpan')
      setEditing(null)
      onRefresh()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-white">Senarai Semak Pematuhan</div>
          <div className="text-xs text-cyan-100/60">Tanda item yang dipatuhi & lampirkan bukti sokongan</div>
        </div>
        <ComplianceProgress checklists={detail.checklists} />
      </div>

      {/* Add new item */}
      <GlassPanel className="p-3 space-y-2">
        <div className="text-xs text-cyan-100/80 font-medium">Tambah Item Custom</div>
        <Input
          placeholder="Nama item (e.g. Sijil ISO 9001)"
          value={newItem.item}
          onChange={(e) => setNewItem((s) => ({ ...s, item: e.target.value }))}
          className="bg-white/8 border-white/15 text-white placeholder:text-white/40"
        />
        <Input
          placeholder="Keperluan / penerangan"
          value={newItem.requirement}
          onChange={(e) => setNewItem((s) => ({ ...s, requirement: e.target.value }))}
          className="bg-white/8 border-white/15 text-white placeholder:text-white/40"
        />
        <Button size="sm" onClick={addItem} disabled={saving} className="bg-cyan-500 hover:bg-cyan-400 text-white border-0">
          <Plus className="w-3.5 h-3.5 mr-1" /> Tambah
        </Button>
      </GlassPanel>

      {/* Items */}
      <div className="space-y-2">
        {detail.checklists.length === 0 ? (
          <EmptyState icon={ClipboardList} title="Tiada item checklist" />
        ) : (
          detail.checklists.map((c) => (
            <GlassPanel key={c.id} className={`p-3 ${c.isMet ? 'border-l-2 border-l-emerald-400' : 'border-l-2 border-l-amber-400'}`}>
              <div className="flex items-start gap-3">
                <Switch
                  checked={c.isMet}
                  onCheckedChange={() => toggle(c.id, c.isMet)}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{c.item}</span>
                    {c.isMet ? (
                      <Badge variant="outline" className="border-emerald-400/40 text-emerald-200 bg-emerald-500/10 text-[10px]">Dipatuhi</Badge>
                    ) : (
                      <Badge variant="outline" className="border-amber-400/40 text-amber-200 bg-amber-500/10 text-[10px]">Belum Dipatuhi</Badge>
                    )}
                  </div>
                  <div className="text-xs text-cyan-100/70 mt-0.5">{c.requirement || 'Tiada keperluan ditetapkan'}</div>
                  {c.evidence && <div className="text-xs text-cyan-200/80 mt-1">📄 {c.evidence}</div>}
                  {c.remarks && <div className="text-[11px] text-cyan-100/60 italic mt-1">{c.remarks}</div>}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-cyan-200 hover:bg-white/10 hover:text-white h-7 mt-1 px-2 text-[11px]"
                    onClick={() => setEditing({ id: c.id, evidence: c.evidence || '', remarks: c.remarks || '', isMet: c.isMet })}
                  >
                    Edit Bukti
                  </Button>
                </div>
              </div>
            </GlassPanel>
          ))
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="glass-strong border-white/20 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Kemaskini Bukti</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label className="text-cyan-100/80 mb-1.5 block text-xs">Bukti / Dokumen Sokongan</Label>
                <Textarea
                  value={editing.evidence}
                  onChange={(e) => setEditing({ ...editing, evidence: e.target.value })}
                  rows={3}
                  placeholder="e.g. Sijil ISO 9001 (No: MY-XXXX), Laporan Audit Dalaman 2025..."
                  className="bg-white/8 border-white/15 text-white placeholder:text-white/40"
                />
              </div>
              <div>
                <Label className="text-cyan-100/80 mb-1.5 block text-xs">Catatan</Label>
                <Textarea
                  value={editing.remarks}
                  onChange={(e) => setEditing({ ...editing, remarks: e.target.value })}
                  rows={2}
                  placeholder="Catatan tambahan..."
                  className="bg-white/8 border-white/15 text-white placeholder:text-white/40"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" className="text-cyan-100 hover:bg-white/10 hover:text-white" onClick={() => setEditing(null)}>Batal</Button>
            <Button onClick={saveEvidence} disabled={saving} className="bg-cyan-500 hover:bg-cyan-400 text-white border-0">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// =============== AUDIT TAB ===============
function AuditTab({ detail, onRefresh }: { detail: AppDetail; onRefresh: () => void }) {
  const [auditors, setAuditors] = useState<{ id: string; fullName: string }[]>([])
  const [newAudit, setNewAudit] = useState({ auditorId: '', scheduledAt: '', location: '' })
  const [newFinding, setNewFinding] = useState<{ auditId: string; category: string; description: string; severity: string; correctiveAction: string; dueDate: string } | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // Fetch users with AUDITOR role from /api/users
    fetch('/api/users?role=AUDITOR&limit=200', { credentials: 'include' })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((d) => setAuditors((d.users || []).map((u: any) => ({ id: u.id, fullName: u.fullName }))))
      .catch(() => setAuditors([]))
  }, [])

  async function scheduleAudit() {
    if (!newAudit.scheduledAt) return toast.error('Tarikh audit diperlukan')
    setSaving(true)
    try {
      const res = await fetch(`/api/accreditation/${detail.id}/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAudit),
        credentials: 'include',
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Audit dijadualkan & status dikemas kini ke Audit')
      setNewAudit({ auditorId: '', scheduledAt: '', location: '' })
      onRefresh()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function addFinding() {
    if (!newFinding) return
    if (!newFinding.description) return toast.error('Penerangan diperlukan')
    setSaving(true)
    try {
      const res = await fetch(`/api/accreditation/${detail.id}/findings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auditId: newFinding.auditId,
          category: newFinding.category,
          description: newFinding.description,
          severity: newFinding.severity,
          correctiveAction: newFinding.correctiveAction,
          dueDate: newFinding.dueDate || undefined,
        }),
        credentials: 'include',
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Penemuan ditambah')
      setNewFinding(null)
      onRefresh()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function updateFindingStatus(findingId: string, status: string) {
    try {
      const res = await fetch(`/api/accreditation/${detail.id}/findings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: findingId, status }),
        credentials: 'include',
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success(`Status: ${status}`)
      onRefresh()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  return (
    <div className="space-y-4">
      {/* Schedule new audit */}
      <GlassPanel className="p-3">
        <div className="text-xs text-cyan-100/80 font-medium mb-2 flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-cyan-300" /> Jadual Audit Baru
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Input
            type="datetime-local"
            value={newAudit.scheduledAt}
            onChange={(e) => setNewAudit((s) => ({ ...s, scheduledAt: e.target.value }))}
            className="bg-white/8 border-white/15 text-white"
          />
          <Select value={newAudit.auditorId || 'none'} onValueChange={(v) => setNewAudit((s) => ({ ...s, auditorId: v === 'none' ? '' : v }))}>
            <SelectTrigger className="bg-white/8 border-white/15 text-white">
              <SelectValue placeholder="Pilih Auditor" />
            </SelectTrigger>
            <SelectContent className="glass-strong border-white/20 text-white">
              <SelectItem value="none">Tidak ditentukan</SelectItem>
              {auditors.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.fullName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Lokasi (e.g. Makmal 1)"
            value={newAudit.location}
            onChange={(e) => setNewAudit((s) => ({ ...s, location: e.target.value }))}
            className="bg-white/8 border-white/15 text-white placeholder:text-white/40"
          />
        </div>
        <Button size="sm" onClick={scheduleAudit} disabled={saving} className="bg-cyan-500 hover:bg-cyan-400 text-white border-0 mt-2">
          <Calendar className="w-3.5 h-3.5 mr-1" /> Jadual
        </Button>
      </GlassPanel>

      {/* Audits list */}
      {detail.audits.length === 0 ? (
        <EmptyState icon={Calendar} title="Tiada audit dijadualkan" hint="Jadual audit untuk memulakan proses penilaian" />
      ) : (
        detail.audits.map((a) => (
          <GlassPanel key={a.id} className="p-3">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-cyan-300" />
              <span className="text-sm font-semibold text-white">{new Date(a.scheduledAt).toLocaleString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              <Badge variant="outline" className="border-cyan-400/30 text-cyan-200 bg-cyan-500/10 text-[10px]">{a.status}</Badge>
              {a.auditor && <span className="text-xs text-cyan-100/70">· Auditor: {a.auditor.fullName}</span>}
              {a.location && <span className="text-xs text-cyan-100/70">· 📍 {a.location}</span>}
              <Button
                size="sm"
                variant="ghost"
                className="text-cyan-200 hover:bg-white/10 hover:text-white h-7 ml-auto px-2 text-[11px]"
                onClick={() => setNewFinding({ auditId: a.id, category: 'Minor', description: '', severity: 'medium', correctiveAction: '', dueDate: '' })}
              >
                <Plus className="w-3 h-3 mr-1" /> Tambah Penemuan
              </Button>
            </div>
            <div className="space-y-2">
              {a.findings.length === 0 ? (
                <div className="text-xs text-cyan-100/50 italic">Tiada penemuan audit</div>
              ) : (
                a.findings.map((f) => (
                  <div key={f.id} className="glass-subtle p-2.5 rounded-lg">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <Badge variant="outline" className={`
                        ${f.category === 'Major' ? 'border-red-400/40 text-red-200 bg-red-500/10' : ''}
                        ${f.category === 'Minor' ? 'border-amber-400/40 text-amber-200 bg-amber-500/10' : ''}
                        ${f.category === 'Observation' ? 'border-blue-400/40 text-blue-200 bg-blue-500/10' : ''}
                        text-[10px]
                      `}>{f.category}</Badge>
                      <Badge variant="outline" className={`
                        ${f.severity === 'critical' ? 'border-red-400/40 text-red-200 bg-red-500/10' : ''}
                        ${f.severity === 'high' ? 'border-orange-400/40 text-orange-200 bg-orange-500/10' : ''}
                        ${f.severity === 'medium' ? 'border-amber-400/40 text-amber-200 bg-amber-500/10' : ''}
                        ${f.severity === 'low' ? 'border-cyan-400/40 text-cyan-200 bg-cyan-500/10' : ''}
                        text-[10px]
                      `}>{f.severity}</Badge>
                      <Badge variant="outline" className={`
                        ${f.status === 'resolved' ? 'border-emerald-400/40 text-emerald-200 bg-emerald-500/10' : ''}
                        ${f.status === 'in_progress' ? 'border-blue-400/40 text-blue-200 bg-blue-500/10' : ''}
                        ${f.status === 'open' ? 'border-red-400/40 text-red-200 bg-red-500/10' : ''}
                        text-[10px]
                      `}>{f.status}</Badge>
                      <span className="text-[10px] text-cyan-100/60 ml-auto">
                        {f.dueDate && `Tamat: ${new Date(f.dueDate).toLocaleDateString('ms-MY')}`}
                      </span>
                    </div>
                    <div className="text-sm text-white">{f.description}</div>
                    {f.correctiveAction && <div className="text-xs text-cyan-100/70 mt-1">🔧 {f.correctiveAction}</div>}
                    <div className="flex items-center gap-2 mt-2">
                      {f.status !== 'resolved' && (
                        <>
                          {f.status === 'open' && (
                            <Button size="sm" variant="ghost" className="text-blue-200 hover:bg-white/10 hover:text-white h-6 px-2 text-[10px]" onClick={() => updateFindingStatus(f.id, 'in_progress')}>
                              Mula Tindakan
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="text-emerald-200 hover:bg-white/10 hover:text-white h-6 px-2 text-[10px]" onClick={() => updateFindingStatus(f.id, 'resolved')}>
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Selesai
                          </Button>
                        </>
                      )}
                      {f.status === 'resolved' && f.resolvedAt && (
                        <span className="text-[10px] text-emerald-300/80">✓ Diselesaikan pada {new Date(f.resolvedAt).toLocaleDateString('ms-MY')}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlassPanel>
        ))
      )}

      {/* New finding dialog */}
      <Dialog open={!!newFinding} onOpenChange={(o) => !o && setNewFinding(null)}>
        <DialogContent className="glass-strong border-white/20 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Tambah Penemuan Audit</DialogTitle>
          </DialogHeader>
          {newFinding && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-cyan-100/80 mb-1.5 block text-xs">Kategori</Label>
                  <Select value={newFinding.category} onValueChange={(v) => setNewFinding({ ...newFinding, category: v })}>
                    <SelectTrigger className="bg-white/8 border-white/15 text-white w-full"><SelectValue /></SelectTrigger>
                    <SelectContent className="glass-strong border-white/20 text-white">
                      <SelectItem value="Major">Major</SelectItem>
                      <SelectItem value="Minor">Minor</SelectItem>
                      <SelectItem value="Observation">Observation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-cyan-100/80 mb-1.5 block text-xs">Keterukan</Label>
                  <Select value={newFinding.severity} onValueChange={(v) => setNewFinding({ ...newFinding, severity: v })}>
                    <SelectTrigger className="bg-white/8 border-white/15 text-white w-full"><SelectValue /></SelectTrigger>
                    <SelectContent className="glass-strong border-white/20 text-white">
                      <SelectItem value="low">Rendah</SelectItem>
                      <SelectItem value="medium">Sederhana</SelectItem>
                      <SelectItem value="high">Tinggi</SelectItem>
                      <SelectItem value="critical">Kritikal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-cyan-100/80 mb-1.5 block text-xs">Penerangan *</Label>
                <Textarea
                  value={newFinding.description}
                  onChange={(e) => setNewFinding({ ...newFinding, description: e.target.value })}
                  rows={3}
                  placeholder="Penerangan penemuan audit..."
                  className="bg-white/8 border-white/15 text-white placeholder:text-white/40"
                />
              </div>
              <div>
                <Label className="text-cyan-100/80 mb-1.5 block text-xs">Tindakan Pembetulan</Label>
                <Textarea
                  value={newFinding.correctiveAction}
                  onChange={(e) => setNewFinding({ ...newFinding, correctiveAction: e.target.value })}
                  rows={2}
                  placeholder="Cadangan tindakan pembetulan..."
                  className="bg-white/8 border-white/15 text-white placeholder:text-white/40"
                />
              </div>
              <div>
                <Label className="text-cyan-100/80 mb-1.5 block text-xs">Tarikh Akhir Tindakan</Label>
                <Input
                  type="date"
                  value={newFinding.dueDate}
                  onChange={(e) => setNewFinding({ ...newFinding, dueDate: e.target.value })}
                  className="bg-white/8 border-white/15 text-white"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" className="text-cyan-100 hover:bg-white/10 hover:text-white" onClick={() => setNewFinding(null)}>Batal</Button>
            <Button onClick={addFinding} disabled={saving} className="bg-cyan-500 hover:bg-cyan-400 text-white border-0">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Tambah
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// =============== CERTIFICATE TAB ===============
function CertificateTab({
  detail, onRefresh, onListRefresh,
}: { detail: AppDetail; onRefresh: () => void; onListRefresh: () => void }) {
  const [generating, setGenerating] = useState(false)
  const activeCert = detail.certificates.find((c) => c.status === 'active')

  async function generateCert() {
    setGenerating(true)
    try {
      const res = await fetch(`/api/accreditation/${detail.id}/certificate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signedBy: detail.applicant?.fullName || 'Pegawai Pentauliahan', yearsValid: 5 }),
        credentials: 'include',
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      toast.success(`Sijil ${d.certNumber} dijana`)
      onRefresh()
      onListRefresh()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-4">
      {detail.status !== 'approved' && (
        <GlassPanel className="p-3 border-l-2 border-l-amber-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-300" />
          <span className="text-sm text-amber-100">Sijil hanya boleh dijana selepas permohonan diluluskan.</span>
        </GlassPanel>
      )}

      {activeCert ? (
        <div className="glass-strong rounded-2xl p-8 border-2 border-cyan-400/40 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-cyan-400/20 to-transparent rounded-bl-full" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-amber-400/10 to-transparent rounded-tr-full" />
          <div className="relative z-10 text-center space-y-3">
            <div className="flex items-center justify-center gap-2 text-cyan-300">
              <ShieldCheck className="w-6 h-6" />
              <span className="text-[10px] uppercase tracking-widest">Sijil Pentauliahan Program</span>
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="text-[10px] text-cyan-100/60 uppercase tracking-widest">Jabatan Tenaga Manusia · Malaysia</div>
            <div className="text-3xl font-bold text-white tracking-wide font-mono">{activeCert.certNumber}</div>
            <div className="border-y border-white/20 py-3 my-3">
              <div className="text-[10px] uppercase tracking-wide text-cyan-100/60">Dianugerahkan kepada</div>
              <div className="text-lg font-bold text-white mt-1">{activeCert.institutionName}</div>
              <div className="text-sm text-cyan-100/80">{activeCert.programName}</div>
              <Badge variant="outline" className="mt-2 border-cyan-400/40 text-cyan-200 bg-cyan-500/10 text-[10px]">
                Pentauliahan {activeCert.type}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-cyan-100/60">Dikeluarkan</div>
                <div className="text-white font-medium">{new Date(activeCert.issuedAt).toLocaleDateString('ms-MY', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-cyan-100/60">Sah Sehingga</div>
                <div className="text-white font-medium">{new Date(activeCert.expiryDate).toLocaleDateString('ms-MY', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
              </div>
            </div>
            <div className="pt-4 text-xs text-cyan-100/80">
              <div className="text-[10px] uppercase tracking-wide text-cyan-100/60">Ditandatangani oleh</div>
              <div className="text-white font-semibold mt-0.5">{activeCert.signedBy || 'Pegawai Pentauliahan JTM'}</div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="text-cyan-200 hover:bg-white/10 hover:text-white mt-3"
              onClick={() => window.print()}
            >
              <Printer className="w-3.5 h-3.5 mr-1.5" /> Cetak Sijil
            </Button>
          </div>
        </div>
      ) : (
        detail.status === 'approved' && (
          <GlassPanel className="p-6 text-center">
            <FileSignature className="w-10 h-10 text-cyan-300 mx-auto mb-2" />
            <div className="text-sm text-white font-semibold mb-1">Permohonan Diluluskan</div>
            <div className="text-xs text-cyan-100/70 mb-4">Klik butang di bawah untuk menjana sijil pentauliahan rasmi.</div>
            <Button onClick={generateCert} disabled={generating} className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 border-0 text-white">
              {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileSignature className="w-4 h-4 mr-2" />}
              Jana Sijil
            </Button>
          </GlassPanel>
        )
      )}

      {/* Expiry reminder */}
      {activeCert && (
        <ExpiryReminder expiryDate={activeCert.expiryDate} />
      )}
    </div>
  )
}

function ExpiryReminder({ expiryDate }: { expiryDate: string }) {
  const days = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 86400000)
  let level: 'safe' | 'warn' | 'urgent' | 'expired' = 'safe'
  if (days <= 0) level = 'expired'
  else if (days <= 30) level = 'urgent'
  else if (days <= 90) level = 'warn'

  const config = {
    safe: { color: 'border-emerald-400/40 text-emerald-200 bg-emerald-500/10', icon: CheckCircle2, text: `Sijil sah untuk ${days} hari lagi` },
    warn: { color: 'border-amber-400/40 text-amber-200 bg-amber-500/10', icon: AlertTriangle, text: `Sijil tamat dalam ${days} hari — mula permohonan pembaharuan` },
    urgent: { color: 'border-orange-400/40 text-orange-200 bg-orange-500/10', icon: AlertTriangle, text: `URGEN: Sijil tamat dalam ${days} hari!` },
    expired: { color: 'border-red-400/40 text-red-200 bg-red-500/10', icon: XCircle, text: 'Sijil telah tamat tempoh — sila buat pembaharuan segera' },
  }[level]

  const Icon = config.icon
  return (
    <div className={`glass-subtle p-3 rounded-lg border-l-2 ${config.color.split(' ')[0]} flex items-center gap-2`}>
      <Icon className={`w-4 h-4 ${config.color.split(' ')[1]}`} />
      <span className={`text-sm ${config.color.split(' ')[1]}`}>{config.text}</span>
    </div>
  )
}

// =============== WORKFLOW TAB ===============
function WorkflowTab({
  detail, onRefresh, onListRefresh, currentUser,
}: { detail: AppDetail; onRefresh: () => void; onListRefresh: () => void; currentUser: any }) {
  const [remarks, setRemarks] = useState('')
  const [acting, setActing] = useState(false)

  const stages = ['submitted', 'self_assessment', 'audit', 'review', 'approved']
  const currentIdx = stages.indexOf(detail.status)
  const rejected = detail.status === 'rejected'

  // Determine allowed actions based on status
  const actions: Array<{ action: string; label: string; icon: any; color: string; needApprover?: boolean }> = []
  if (detail.status === 'submitted') actions.push({ action: 'submit', label: 'Hantar ke Penilaian Kendiri', icon: CheckCircle2, color: 'from-cyan-500 to-teal-500' })
  if (detail.status === 'self_assessment') {
    actions.push({ action: 'submit', label: 'Hantar ke Audit', icon: CheckCircle2, color: 'from-cyan-500 to-teal-500' })
    actions.push({ action: 'return', label: 'Pulangkan ke Dihantar', icon: RotateCcw, color: 'from-amber-500 to-orange-500' })
  }
  if (detail.status === 'audit') {
    actions.push({ action: 'submit', label: 'Hantar ke Semakan', icon: CheckCircle2, color: 'from-cyan-500 to-teal-500' })
    actions.push({ action: 'return', label: 'Pulangkan ke Penilaian Kendiri', icon: RotateCcw, color: 'from-amber-500 to-orange-500' })
  }
  if (detail.status === 'review') {
    actions.push({ action: 'approve', label: 'Luluskan', icon: CheckCircle2, color: 'from-emerald-500 to-teal-500', needApprover: true })
    actions.push({ action: 'reject', label: 'Tolak', icon: XCircle, color: 'from-rose-500 to-red-500', needApprover: true })
    actions.push({ action: 'return', label: 'Pulangkan untuk Pembetulan', icon: RotateCcw, color: 'from-amber-500 to-orange-500', needApprover: true })
  }
  if (detail.status === 'rejected') actions.push({ action: 'submit', label: 'Hantar Semula', icon: RotateCcw, color: 'from-cyan-500 to-teal-500' })

  async function doAction(action: string) {
    setActing(true)
    try {
      const res = await fetch(`/api/accreditation/${detail.id}/workflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, remarks }),
        credentials: 'include',
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      toast.success(`Status kini: ${d.status.toUpperCase()}`)
      setRemarks('')
      onRefresh()
      onListRefresh()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setActing(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Stepper */}
      <GlassPanel className="p-4">
        <div className="text-xs text-cyan-100/80 mb-3">Aliran Status Permohonan</div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {stages.map((s, i) => {
            const done = i < currentIdx
            const current = i === currentIdx
            return (
              <div key={s} className="flex items-center gap-1 flex-shrink-0">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border-2
                  ${done ? 'bg-emerald-500/30 border-emerald-400 text-emerald-200' : ''}
                  ${current ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200 pulse-soft' : ''}
                  ${!done && !current ? 'bg-white/5 border-white/20 text-cyan-100/40' : ''}
                `}>
                  {done ? '✓' : i + 1}
                </div>
                <div className={`text-[10px] ${current ? 'text-cyan-200 font-semibold' : done ? 'text-emerald-200/80' : 'text-cyan-100/50'}`}>
                  {STATUS_LABELS[s]}
                </div>
                {i < stages.length - 1 && <div className={`w-6 h-0.5 mx-1 ${done ? 'bg-emerald-400/50' : 'bg-white/15'}`} />}
              </div>
            )
          })}
        </div>
        {rejected && (
          <div className="mt-3 glass-subtle p-2 rounded-lg border-l-2 border-l-red-400 flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-300" />
            <span className="text-sm text-red-200">Permohonan ditolak. Boleh dihantar semula selepas pembetulan.</span>
          </div>
        )}
      </GlassPanel>

      {/* Action panel */}
      {actions.length > 0 && (
        <GlassPanel className="p-3">
          <div className="text-xs text-cyan-100/80 mb-2">Tindakan Aliran Kerja</div>
          <Textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={2}
            placeholder="Catatan untuk tindakan ini (akan dimasukkan ke sejarah aliran kerja)..."
            className="bg-white/8 border-white/15 text-white placeholder:text-white/40 mb-2"
          />
          <div className="flex flex-wrap gap-2">
            {actions.map((a) => {
              const Icon = a.icon
              return (
                <Button
                  key={a.action}
                  size="sm"
                  onClick={() => doAction(a.action)}
                  disabled={acting}
                  className={`bg-gradient-to-r ${a.color} hover:opacity-90 border-0 text-white`}
                >
                  {acting ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Icon className="w-3.5 h-3.5 mr-1.5" />}
                  {a.label}
                </Button>
              )
            })}
          </div>
          {actions.some((a) => a.needApprover) && (
            <div className="text-[10px] text-cyan-100/60 mt-2 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Tindakan kelulusan memerlukan peranan Pegawai/Penarah/Pentauliahan
            </div>
          )}
        </GlassPanel>
      )}

      {/* History stub */}
      <GlassPanel className="p-3">
        <div className="text-xs text-cyan-100/80 mb-2 flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-cyan-300" /> Sejarah Peralihan
        </div>
        <div className="text-xs text-cyan-100/70 space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-400" />
            <span>Dihantar oleh {detail.applicant?.fullName || 'Pemohon'} pada {new Date(detail.submittedAt).toLocaleString('ms-MY')}</span>
          </div>
          {detail.auditDate && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-400" />
              <span>Audit dijadualkan: {new Date(detail.auditDate).toLocaleString('ms-MY')}</span>
            </div>
          )}
          {detail.approvedAt && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Diluluskan pada {new Date(detail.approvedAt).toLocaleString('ms-MY')}</span>
            </div>
          )}
        </div>
      </GlassPanel>
    </div>
  )
}
