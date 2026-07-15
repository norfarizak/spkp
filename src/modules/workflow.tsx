'use client'
import { useEffect, useState, useCallback } from 'react'
import { GlassCard, PageHeader, StatusBadge, EmptyState, GlassPanel } from '@/components/glass'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  GitBranch, Filter, Loader2, Clock, AlertTriangle, CheckCircle2, XCircle,
  RotateCcw, Archive, ChevronRight, ArrowRight, User, Calendar, Flag,
  AlertCircle, History, ShieldCheck, Zap, FileText,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'

interface WfItem {
  id: string
  entityType: string
  entityId: string
  currentStatus: string
  currentOwner: { id: string; fullName: string } | null
  currentOwnerId: string | null
  slaDueAt: string | null
  priority: string
  createdAt: string
  updatedAt: string
  isOverdue: boolean
  within24h: boolean
  transitionCount: number
}

interface WfTransition {
  id: string
  fromStatus: string | null
  toStatus: string
  action: string
  remarks: string | null
  createdAt: string
  actionBy: { id: string; fullName: string } | null
}

interface WfDetail {
  id: string
  entityType: string
  entityId: string
  currentStatus: string
  currentOwner: { id: string; fullName: string; email: string } | null
  currentOwnerId: string | null
  slaDueAt: string | null
  priority: string
  createdAt: string
  updatedAt: string
  transitions: WfTransition[]
}

const ENTITY_LABELS: Record<string, string> = {
  program: 'Program Kurikulum',
  wim_document: 'Dokumen WIM',
  accreditation_application: 'Pentauliahan',
}

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Rendah',
  normal: 'Biasa',
  high: 'Tinggi',
  urgent: 'Mendesak',
}

const ACTION_LABELS: Record<string, string> = {
  submit: 'Hantar',
  approve: 'Lulus',
  reject: 'Tolak',
  return: 'Pulangkan',
  archive: 'Arkib',
}

export function WorkflowModule() {
  const user = useAppStore((s) => s.user)
  const [items, setItems] = useState<WfItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ entityType: '', currentStatus: '', priority: '', overdue: '', mineOnly: false })
  const [detail, setDetail] = useState<WfDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)

  const loadList = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      if (filters.entityType) p.set('entityType', filters.entityType)
      if (filters.currentStatus) p.set('currentStatus', filters.currentStatus)
      if (filters.priority) p.set('priority', filters.priority)
      if (filters.overdue) p.set('overdue', filters.overdue)
      if (filters.mineOnly) p.set('mineOnly', '1')
      const res = await fetch(`/api/workflow?${p.toString()}`, { credentials: 'include' })
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

  async function openDetail(id: string) {
    setDetailId(id)
    setDetailLoading(true)
    setDetail(null)
    try {
      const res = await fetch(`/api/workflow/${id}`, { credentials: 'include' })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      setDetail(d.item)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setDetailLoading(false)
    }
  }

  const canApprove = user ? user.roles.some((r) =>
    ['SUPER_ADMIN', 'ADMINISTRATOR', 'PENARAH', 'TIMBALAN_PENARAH', 'BAHAGIAN_KURIKULUM', 'KETUA_JABATAN', 'PEGAWAI_QA', 'PEGAWAI_PENTAULIAHAN'].includes(r)
  ) : false

  const overdueCount = items.filter((i) => i.isOverdue).length
  const within24hCount = items.filter((i) => i.within24h).length

  return (
    <div className="space-y-5">
      <PageHeader
        icon={GitBranch}
        title="Enjin Aliran Kerja"
        description="Pantau & luluskan aliran kerja kurikulum, WIM & pentauliahan dengan SLA & auto-notifikasi"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatChip icon={GitBranch} label="Jumlah Aliran Kerja" value={items.length} color="from-cyan-500 to-blue-500" />
        <StatChip icon={Clock} label="Menunggu Tindakan" value={items.filter((i) => !['approved', 'rejected', 'archived'].includes(i.currentStatus)).length} color="from-amber-500 to-orange-500" />
        <StatChip icon={AlertTriangle} label="Lewat (SLA)" value={overdueCount} color="from-rose-500 to-red-500" pulse={overdueCount > 0} />
        <StatChip icon={Zap} label="Tindakan < 24j" value={within24hCount} color="from-orange-500 to-amber-500" />
      </div>

      {/* Filters */}
      <GlassCard className="p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <Select value={filters.entityType || 'all'} onValueChange={(v) => setFilters((s) => ({ ...s, entityType: v === 'all' ? '' : v }))}>
            <SelectTrigger className="bg-white/8 border-white/15 text-white w-full lg:w-52">
              <Filter className="w-3.5 h-3.5 mr-1 text-cyan-300" />
              <SelectValue placeholder="Semua Jenis Entiti" />
            </SelectTrigger>
            <SelectContent className="glass-strong border-white/20 text-white">
              <SelectItem value="all">Semua Jenis</SelectItem>
              {Object.entries(ENTITY_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.currentStatus || 'all'} onValueChange={(v) => setFilters((s) => ({ ...s, currentStatus: v === 'all' ? '' : v }))}>
            <SelectTrigger className="bg-white/8 border-white/15 text-white w-full lg:w-44">
              <SelectValue placeholder="Semua Status" />
            </SelectTrigger>
            <SelectContent className="glass-strong border-white/20 text-white">
              <SelectItem value="all">Semua Status</SelectItem>
              {['draft', 'review', 'correction', 'submitted', 'self_assessment', 'audit', 'approved', 'rejected', 'archived'].map((s) => (
                <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.priority || 'all'} onValueChange={(v) => setFilters((s) => ({ ...s, priority: v === 'all' ? '' : v }))}>
            <SelectTrigger className="bg-white/8 border-white/15 text-white w-full lg:w-40">
              <Flag className="w-3.5 h-3.5 mr-1 text-cyan-300" />
              <SelectValue placeholder="Semua Prioriti" />
            </SelectTrigger>
            <SelectContent className="glass-strong border-white/20 text-white">
              <SelectItem value="all">Semua Prioriti</SelectItem>
              {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.overdue || 'all'} onValueChange={(v) => setFilters((s) => ({ ...s, overdue: v === 'all' ? '' : v }))}>
            <SelectTrigger className="bg-white/8 border-white/15 text-white w-full lg:w-40">
              <SelectValue placeholder="SLA" />
            </SelectTrigger>
            <SelectContent className="glass-strong border-white/20 text-white">
              <SelectItem value="all">Semua</SelectItem>
              <SelectItem value="1">Lewat Sahaja</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={filters.mineOnly ? 'default' : 'ghost'}
            className={filters.mineOnly
              ? 'bg-cyan-500 hover:bg-cyan-400 text-white border-0'
              : 'btn-glass text-white hover:bg-white/10'}
            onClick={() => setFilters((s) => ({ ...s, mineOnly: !s.mineOnly }))}
          >
            <User className="w-3.5 h-3.5 mr-1.5" /> Tugasan Saya
          </Button>
        </div>
      </GlassCard>

      {/* Table */}
      <GlassCard className="p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-cyan-100/70">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Memuatkan data...
          </div>
        ) : items.length === 0 ? (
          <EmptyState icon={GitBranch} title="Tiada aliran kerja" hint="Laraskan penapis atau cipta entiti baru" />
        ) : (
          <div className="max-h-[28rem] overflow-y-auto scroll-area">
            <table className="w-full text-sm">
              <thead className="sticky top-0 glass-strong z-10">
                <tr className="text-left text-cyan-100/70 text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 font-semibold">Entiti</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Pemilik</th>
                  <th className="px-4 py-3 font-semibold">Prioriti</th>
                  <th className="px-4 py-3 font-semibold">SLA</th>
                  <th className="px-4 py-3 font-semibold">Kemas Kini</th>
                  <th className="px-4 py-3 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id} className="border-t border-white/8 hover:bg-white/5 transition">
                    <td className="px-4 py-3">
                      <div className="text-white text-sm font-medium">{ENTITY_LABELS[it.entityType] || it.entityType}</div>
                      <div className="text-[10px] text-cyan-100/60 font-mono">{it.entityId.slice(-8)}</div>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={it.currentStatus} /></td>
                    <td className="px-4 py-3 text-cyan-100/90 text-xs">
                      {it.currentOwner?.fullName || 'Tidak ditentukan'}
                      {it.currentOwnerId === user?.id && (
                        <Badge variant="outline" className="ml-1 border-cyan-400/40 text-cyan-200 bg-cyan-500/10 text-[9px]">Saya</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <PriorityBadge priority={it.priority} />
                    </td>
                    <td className="px-4 py-3">
                      {it.slaDueAt ? (
                        <div className="text-xs">
                          {it.isOverdue ? (
                            <span className="text-red-300 font-semibold flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Lewat
                            </span>
                          ) : it.within24h ? (
                            <span className="text-amber-300 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> &lt; 24j
                            </span>
                          ) : (
                            <span className="text-cyan-100/70">{new Date(it.slaDueAt).toLocaleDateString('ms-MY', { day: '2-digit', month: 'short' })}</span>
                          )}
                          <div className="text-[10px] text-cyan-100/60">
                            {Math.ceil((new Date(it.slaDueAt).getTime() - Date.now()) / 86400000)} hari
                          </div>
                        </div>
                      ) : (
                        <span className="text-cyan-100/40 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-cyan-100/70 text-xs">
                      {new Date(it.updatedAt).toLocaleDateString('ms-MY', { day: '2-digit', month: 'short' })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="ghost" className="text-cyan-200 hover:text-white hover:bg-white/10 h-8" onClick={() => openDetail(it.id)}>
                        <ChevronRight className="w-4 h-4" /> Butiran
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      <WorkflowDetailDialog
        key={detailId || 'none'}
        id={detailId}
        open={!!detailId}
        loading={detailLoading}
        detail={detail}
        onOpenChange={(o) => { if (!o) { setDetailId(null); setDetail(null) } }}
        onRefresh={() => detailId && openDetail(detailId)}
        onListRefresh={loadList}
        canApprove={canApprove}
        currentUser={user}
      />
    </div>
  )
}

function StatChip({ icon: Icon, label, value, color, pulse }: { icon: any; label: string; value: number; color: string; pulse?: boolean }) {
  return (
    <GlassCard className="p-4 relative overflow-hidden">
      <div className={`absolute -right-3 -top-3 w-16 h-16 rounded-full bg-gradient-to-br ${color} opacity-15 blur-xl ${pulse ? 'animate-pulse' : ''}`} />
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

function PriorityBadge({ priority }: { priority: string }) {
  const config: Record<string, string> = {
    low: 'border-cyan-400/40 text-cyan-200 bg-cyan-500/10',
    normal: 'border-blue-400/40 text-blue-200 bg-blue-500/10',
    high: 'border-amber-400/40 text-amber-200 bg-amber-500/10',
    urgent: 'border-red-400/40 text-red-200 bg-red-500/10',
  }
  return (
    <Badge variant="outline" className={`${config[priority] || config.normal} text-[10px]`}>
      {PRIORITY_LABELS[priority] || priority}
    </Badge>
  )
}

// =============== WORKFLOW DETAIL DIALOG ===============
function WorkflowDetailDialog({
  id, open, loading, detail, onOpenChange, onRefresh, onListRefresh, canApprove, currentUser,
}: {
  id: string | null; open: boolean; loading: boolean; detail: WfDetail | null
  onOpenChange: (v: boolean) => void; onRefresh: () => void; onListRefresh: () => void
  canApprove: boolean; currentUser: any
}) {
  const [remarks, setRemarks] = useState('')
  const [nextOwnerId, setNextOwnerId] = useState('')
  const [acting, setActing] = useState(false)
  const [assignees, setAssignees] = useState<{ id: string; fullName: string }[]>([])

  useEffect(() => {
    if (!open) return
    fetch('/api/users?limit=100', { credentials: 'include' })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((d) => setAssignees((d.users || []).map((u: any) => ({ id: u.id, fullName: u.fullName }))))
      .catch(() => setAssignees([]))
  }, [open])

  async function doAction(action: string) {
    if (!detail) return
    setActing(true)
    try {
      const res = await fetch(`/api/workflow/${detail.id}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, remarks, nextOwnerId: nextOwnerId || undefined }),
        credentials: 'include',
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      toast.success(`Aksi "${ACTION_LABELS[action]}" berjaya. Status: ${d.currentStatus}`)
      setRemarks('')
      setNextOwnerId('')
      onRefresh()
      onListRefresh()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setActing(false)
    }
  }

  // Determine allowed actions based on status and entity type
  function getActions(detail: WfDetail): Array<{ action: string; label: string; icon: any; color: string; needApprover?: boolean }> {
    const acts: Array<{ action: string; label: string; icon: any; color: string; needApprover?: boolean }> = []
    const s = detail.currentStatus
    const isAccred = detail.entityType === 'accreditation_application'

    if (isAccred) {
      if (s === 'submitted') acts.push({ action: 'submit', label: 'Hantar ke Penilaian Kendiri', icon: ArrowRight, color: 'from-cyan-500 to-teal-500' })
      if (s === 'self_assessment') {
        acts.push({ action: 'submit', label: 'Hantar ke Audit', icon: ArrowRight, color: 'from-cyan-500 to-teal-500' })
        acts.push({ action: 'return', label: 'Pulangkan', icon: RotateCcw, color: 'from-amber-500 to-orange-500', needApprover: true })
      }
      if (s === 'audit') {
        acts.push({ action: 'submit', label: 'Hantar ke Semakan', icon: ArrowRight, color: 'from-cyan-500 to-teal-500' })
        acts.push({ action: 'return', label: 'Pulangkan ke Penilaian Kendiri', icon: RotateCcw, color: 'from-amber-500 to-orange-500' })
      }
      if (s === 'review') {
        acts.push({ action: 'approve', label: 'Luluskan', icon: CheckCircle2, color: 'from-emerald-500 to-teal-500', needApprover: true })
        acts.push({ action: 'reject', label: 'Tolak', icon: XCircle, color: 'from-rose-500 to-red-500', needApprover: true })
        acts.push({ action: 'return', label: 'Pulangkan untuk Pembetulan', icon: RotateCcw, color: 'from-amber-500 to-orange-500', needApprover: true })
      }
      if (s === 'rejected') acts.push({ action: 'submit', label: 'Hantar Semula', icon: RotateCcw, color: 'from-cyan-500 to-teal-500' })
    } else {
      if (s === 'draft') acts.push({ action: 'submit', label: 'Hantar ke Semakan', icon: ArrowRight, color: 'from-cyan-500 to-teal-500' })
      if (s === 'correction') acts.push({ action: 'submit', label: 'Hantar Semula ke Semakan', icon: ArrowRight, color: 'from-cyan-500 to-teal-500' })
      if (s === 'review') {
        acts.push({ action: 'approve', label: 'Luluskan', icon: CheckCircle2, color: 'from-emerald-500 to-teal-500', needApprover: true })
        acts.push({ action: 'reject', label: 'Tolak', icon: XCircle, color: 'from-rose-500 to-red-500', needApprover: true })
        acts.push({ action: 'return', label: 'Pulangkan untuk Pembetulan', icon: RotateCcw, color: 'from-amber-500 to-orange-500', needApprover: true })
      }
      if (s === 'approved') acts.push({ action: 'archive', label: 'Arkibkan', icon: Archive, color: 'from-slate-500 to-gray-500' })
      if (s === 'rejected') acts.push({ action: 'submit', label: 'Hantar Semula', icon: RotateCcw, color: 'from-cyan-500 to-teal-500' })
    }
    return acts
  }

  const isOverdue = detail?.slaDueAt && new Date(detail.slaDueAt) < new Date() && !['approved', 'rejected', 'archived'].includes(detail.currentStatus)
  const within24h = detail?.slaDueAt && !isOverdue && (new Date(detail.slaDueAt).getTime() - Date.now()) < 24 * 3600 * 1000

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-white/20 text-white max-w-4xl max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-cyan-300" />
            {detail ? ENTITY_LABELS[detail.entityType] : 'Memuat...'}
            {detail && <StatusBadge status={detail.currentStatus} />}
            {detail && <PriorityBadge priority={detail.priority} />}
          </DialogTitle>
          <DialogDescription className="text-cyan-100/70">
            {detail ? `ID Entiti: ${detail.entityId}` : 'Memuatkan butiran...'}
          </DialogDescription>
        </DialogHeader>

        {loading || !detail ? (
          <div className="flex items-center justify-center py-12 text-cyan-100/70">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Memuatkan butiran...
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto scroll-area pr-1 space-y-4">
            {/* SLA banner */}
            {detail.slaDueAt && (
              <div className={`glass-subtle p-3 rounded-lg flex items-center gap-3 ${
                isOverdue ? 'border-l-2 border-l-red-400' :
                within24h ? 'border-l-2 border-l-amber-400' :
                'border-l-2 border-l-cyan-400'
              }`}>
                <Clock className={`w-5 h-5 ${isOverdue ? 'text-red-300' : within24h ? 'text-amber-300' : 'text-cyan-300'}`} />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-white">
                    {isOverdue ? 'SLA telah lewat!' : within24h ? 'SLA hampir tamat (< 24 jam)' : 'SLA'})
                  </div>
                  <div className="text-xs text-cyan-100/70">
                    Tamat: {new Date(detail.slaDueAt).toLocaleString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    <span className="ml-2">
                      ({Math.ceil((new Date(detail.slaDueAt).getTime() - Date.now()) / 86400000)} hari)
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Info cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <InfoCard icon={FileText} label="Jenis Entiti" value={ENTITY_LABELS[detail.entityType] || detail.entityType} />
              <InfoCard icon={User} label="Pemilik Semasa" value={detail.currentOwner?.fullName || '—'} />
              <InfoCard icon={Calendar} label="Dicipta" value={new Date(detail.createdAt).toLocaleDateString('ms-MY')} />
            </div>

            {/* Stepper */}
            <Stepper detail={detail} />

            {/* Action panel */}
            {(() => {
              const actions = getActions(detail)
              if (actions.length === 0) {
                return (
                  <GlassPanel className="p-3 border-l-2 border-l-cyan-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-cyan-300" />
                    <span className="text-sm text-cyan-100">Tiada tindakan tersedia pada status ini ({detail.currentStatus}).</span>
                  </GlassPanel>
                )
              }
              const approverActions = actions.filter((a) => a.needApprover)
              const blockedActions = approverActions.filter((a) => !canApprove)
              return (
                <GlassPanel className="p-3 space-y-2">
                  <div className="text-xs text-cyan-100/80 font-medium flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-cyan-300" /> Tindakan Aliran Kerja
                  </div>
                  <div>
                    <Label className="text-cyan-100/80 mb-1.5 block text-xs">Pemilik Seterusnya (pilihan)</Label>
                    <Select value={nextOwnerId || 'keep'} onValueChange={(v) => setNextOwnerId(v === 'keep' ? '' : v)}>
                      <SelectTrigger className="bg-white/8 border-white/15 text-white w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="glass-strong border-white/20 text-white max-h-72">
                        <SelectItem value="keep">Kekalkan pemilik semasa</SelectItem>
                        {assignees.map((a) => (
                          <SelectItem key={a.id} value={a.id}>{a.fullName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="text-[10px] text-cyan-100/60 mt-1">Notifikasi automatik akan dihantar kepada pemilik seterusnya.</div>
                  </div>
                  <div>
                    <Label className="text-cyan-100/80 mb-1.5 block text-xs">Catatan</Label>
                    <Textarea
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      rows={2}
                      placeholder="Catatan untuk tindakan ini..."
                      className="bg-white/8 border-white/15 text-white placeholder:text-white/40"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {actions.map((a) => {
                      const Icon = a.icon
                      const blocked = a.needApprover && !canApprove
                      return (
                        <Button
                          key={a.action}
                          size="sm"
                          onClick={() => doAction(a.action)}
                          disabled={acting || blocked}
                          className={`bg-gradient-to-r ${a.color} hover:opacity-90 border-0 text-white ${blocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                          title={blocked ? 'Memerlukan kuasa kelulusan' : undefined}
                        >
                          {acting ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Icon className="w-3.5 h-3.5 mr-1.5" />}
                          {a.label}
                        </Button>
                      )
                    })}
                  </div>
                  {blockedActions.length > 0 && (
                    <div className="text-[10px] text-cyan-100/60 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Tindakan kelulusan ({blockedActions.length}) memerlukan peranan Pegawai Kelulusan.
                    </div>
                  )}
                </GlassPanel>
              )
            })()}

            {/* Transition history */}
            <GlassPanel className="p-3">
              <div className="text-xs text-cyan-100/80 font-medium mb-3 flex items-center gap-2">
                <History className="w-3.5 h-3.5 text-cyan-300" /> Sejarah Peralihan ({detail.transitions.length})
              </div>
              {detail.transitions.length === 0 ? (
                <div className="text-xs text-cyan-100/50 italic">Tiada sejarah peralihan</div>
              ) : (
                <div className="space-y-2">
                  {detail.transitions.map((t, i) => (
                    <div key={t.id} className="flex items-start gap-2">
                      <div className="flex flex-col items-center mt-1">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${
                          t.action === 'approve' ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200' :
                          t.action === 'reject' ? 'bg-red-500/20 border-red-400 text-red-200' :
                          t.action === 'return' ? 'bg-amber-500/20 border-amber-400 text-amber-200' :
                          t.action === 'archive' ? 'bg-slate-500/20 border-slate-400 text-slate-200' :
                          'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                        }`}>{i + 1}</div>
                        {i < detail.transitions.length - 1 && <div className="w-0.5 h-8 bg-white/15 mt-1" />}
                      </div>
                      <div className="flex-1 glass-subtle p-2.5 rounded-lg mb-1">
                        <div className="flex flex-wrap items-center gap-2 mb-0.5">
                          <Badge variant="outline" className={`
                            ${t.action === 'approve' ? 'border-emerald-400/40 text-emerald-200 bg-emerald-500/10' : ''}
                            ${t.action === 'reject' ? 'border-red-400/40 text-red-200 bg-red-500/10' : ''}
                            ${t.action === 'return' ? 'border-amber-400/40 text-amber-200 bg-amber-500/10' : ''}
                            ${t.action === 'archive' ? 'border-slate-400/40 text-slate-200 bg-slate-500/10' : ''}
                            ${t.action === 'submit' ? 'border-cyan-400/40 text-cyan-200 bg-cyan-500/10' : ''}
                            text-[10px]
                          `}>
                            {ACTION_LABELS[t.action] || t.action}
                          </Badge>
                          <span className="text-xs text-white">
                            {t.fromStatus ? t.fromStatus.replace(/_/g, ' ') : 'mula'}
                            <ArrowRight className="w-3 h-3 inline mx-1 text-cyan-300" />
                            <strong>{t.toStatus.replace(/_/g, ' ')}</strong>
                          </span>
                          <span className="text-[10px] text-cyan-100/60 ml-auto">
                            {new Date(t.createdAt).toLocaleString('ms-MY', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="text-[11px] text-cyan-100/70">
                          oleh <span className="text-cyan-200">{t.actionBy?.fullName || 'Sistem'}</span>
                        </div>
                        {t.remarks && (
                          <div className="text-[11px] text-cyan-100/70 italic mt-1 p-1.5 bg-white/5 rounded">
                            &ldquo;{t.remarks}&rdquo;
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassPanel>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function InfoCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="glass-subtle p-3 rounded-lg">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-3.5 h-3.5 text-cyan-300" />
        <span className="text-[10px] uppercase tracking-wide text-cyan-100/60">{label}</span>
      </div>
      <div className="text-sm font-semibold text-white">{value}</div>
    </div>
  )
}

function Stepper({ detail }: { detail: WfDetail }) {
  const isAccred = detail.entityType === 'accreditation_application'
  const stages = isAccred
    ? ['submitted', 'self_assessment', 'audit', 'review', 'approved']
    : ['draft', 'review', 'approved']
  const rejected = detail.currentStatus === 'rejected'
  const currentIdx = stages.indexOf(detail.currentStatus)

  return (
    <GlassPanel className="p-4">
      <div className="text-xs text-cyan-100/80 mb-3">Aliran Status</div>
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
              <div className={`text-[10px] capitalize ${current ? 'text-cyan-200 font-semibold' : done ? 'text-emerald-200/80' : 'text-cyan-100/50'}`}>
                {s.replace(/_/g, ' ')}
              </div>
              {i < stages.length - 1 && <div className={`w-6 h-0.5 mx-1 ${done ? 'bg-emerald-400/50' : 'bg-white/15'}`} />}
            </div>
          )
        })}
      </div>
      {rejected && (
        <div className="mt-3 glass-subtle p-2 rounded-lg border-l-2 border-l-red-400 flex items-center gap-2">
          <XCircle className="w-4 h-4 text-red-300" />
          <span className="text-sm text-red-200">Ditolak. Boleh dihantar semula selepas pembetulan.</span>
        </div>
      )}
    </GlassPanel>
  )
}
