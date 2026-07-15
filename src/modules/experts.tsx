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
  Users, Plus, Search, Filter, Loader2, Calendar, Star, Award, Phone, Mail,
  Briefcase, Clock, CheckCircle2, XCircle, Banknote, ClipboardList, MessageSquare,
  Building2, ChevronRight, UserCog, CircleDollarSign,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'

interface ExpertItem {
  id: string
  userId?: string | null
  fullName: string
  icNumber?: string | null
  email?: string | null
  phone?: string | null
  category: string
  expertiseArea: string
  qualification?: string | null
  experienceYear: number
  organization?: string | null
  availability: string
  rating: number
  totalSessions: number
  status: string
  institution: { id: string; name: string } | null
  counts: { appointments: number; evaluations: number; honorariums: number }
}

interface ExpertDetail {
  id: string
  userId: string | null
  fullName: string
  icNumber: string | null
  email: string | null
  phone: string | null
  category: string
  expertiseArea: string
  qualification: string | null
  experienceYear: number
  organization: string | null
  availability: string
  rating: number
  totalSessions: number
  status: string
  institution: { id: string; name: string } | null
  user: { id: string; fullName: string; email: string } | null
  appointments: Array<{
    id: string; purpose: string; projectId: string | null; scheduledAt: string
    durationHour: number; status: string; notes: string | null
    assigner: { id: string; fullName: string } | null
    honorarium: { id: string; amount: number; currency: string; status: string; paidAt: string | null } | null
  }>
  evaluations: Array<{
    id: string; targetType: string; targetId: string | null; rating: number
    recommendation: string | null; comments: string | null; createdAt: string
  }>
  honorariums: Array<{
    id: string; appointmentId: string; amount: number; currency: string
    status: string; paidAt: string | null; createdAt: string
    appointment: { purpose: string; scheduledAt: string }
  }>
  stats: {
    totalAppointments: number
    totalEvaluations: number
    totalHonorariums: number
    totalPaid: number
    avgRating: number
  }
}

const CATEGORY_LABELS: Record<string, string> = {
  Industri: 'Industri',
  Akademik: 'Akademik',
  Penilai: 'Penilai',
}

const AVAILABILITY_LABELS: Record<string, string> = {
  available: 'Tersedia',
  busy: 'Sibuk',
  unavailable: 'Tidak Tersedia',
}

export function ExpertsModule() {
  const user = useAppStore((s) => s.user)
  const [items, setItems] = useState<ExpertItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ category: '', availability: '', q: '' })
  const [createOpen, setCreateOpen] = useState(false)
  const [detail, setDetail] = useState<ExpertDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)

  const loadList = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      if (filters.category) p.set('category', filters.category)
      if (filters.availability) p.set('availability', filters.availability)
      if (filters.q) p.set('q', filters.q)
      const res = await fetch(`/api/experts?${p.toString()}`, { credentials: 'include' })
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
      const res = await fetch(`/api/experts/${id}`, { credentials: 'include' })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      setDetail(d.item)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setDetailLoading(false)
    }
  }

  const canManage = user ? user.roles.some((r) =>
    ['SUPER_ADMIN', 'ADMINISTRATOR', 'PEGAWAI_KURIKULUM', 'PEGAWAI_PENTAULIAHAN', 'BAHAGIAN_KURIKULUM', 'PENARAH', 'TIMBALAN_PENARAH', 'KETUA_PROGRAM', 'KETUA_JABATAN'].includes(r)
  ) : false

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Users}
        title="Panel Pakar"
        description="Pangkalan data pakar industri, akademik & penilai — pelantikan, penilaian & honorarium"
        actions={
          canManage ? (
            <Button
              className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 border-0 text-white"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" /> Tambah Pakar
            </Button>
          ) : null
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatChip icon={Users} label="Jumlah Pakar" value={items.length} color="from-cyan-500 to-blue-500" />
        <StatChip icon={CheckCircle2} label="Tersedia" value={items.filter((i) => i.availability === 'available').length} color="from-emerald-500 to-teal-500" />
        <StatChip icon={Briefcase} label="Sibuk" value={items.filter((i) => i.availability === 'busy').length} color="from-amber-500 to-orange-500" />
        <StatChip icon={Star} label="Penilaian ≥ 4" value={items.filter((i) => i.rating >= 4).length} color="from-purple-500 to-pink-500" />
      </div>

      {/* Filters */}
      <GlassCard className="p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-100/60" />
            <Input
              placeholder="Cari nama, e-mel, bidang kepakaran, organisasi..."
              value={filters.q}
              onChange={(e) => setFilters((s) => ({ ...s, q: e.target.value }))}
              className="pl-10 bg-white/8 border-white/15 text-white placeholder:text-white/40"
            />
          </div>
          <Select value={filters.category || 'all'} onValueChange={(v) => setFilters((s) => ({ ...s, category: v === 'all' ? '' : v }))}>
            <SelectTrigger className="bg-white/8 border-white/15 text-white w-full lg:w-44">
              <Filter className="w-3.5 h-3.5 mr-1 text-cyan-300" />
              <SelectValue placeholder="Semua Kategori" />
            </SelectTrigger>
            <SelectContent className="glass-strong border-white/20 text-white">
              <SelectItem value="all">Semua Kategori</SelectItem>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.availability || 'all'} onValueChange={(v) => setFilters((s) => ({ ...s, availability: v === 'all' ? '' : v }))}>
            <SelectTrigger className="bg-white/8 border-white/15 text-white w-full lg:w-48">
              <SelectValue placeholder="Semua Ketersediaan" />
            </SelectTrigger>
            <SelectContent className="glass-strong border-white/20 text-white">
              <SelectItem value="all">Semua Ketersediaan</SelectItem>
              {Object.entries(AVAILABILITY_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
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
          <EmptyState icon={Users} title="Tiada pakar dijumpai" hint="Tambah pakar atau laraskan penapis" />
        ) : (
          <div className="max-h-[28rem] overflow-y-auto scroll-area">
            <table className="w-full text-sm">
              <thead className="sticky top-0 glass-strong z-10">
                <tr className="text-left text-cyan-100/70 text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 font-semibold">Nama Pakar</th>
                  <th className="px-4 py-3 font-semibold">Kategori</th>
                  <th className="px-4 py-3 font-semibold">Bidang</th>
                  <th className="px-4 py-3 font-semibold">Organisasi</th>
                  <th className="px-4 py-3 font-semibold">Pengalaman</th>
                  <th className="px-4 py-3 font-semibold">Penilaian</th>
                  <th className="px-4 py-3 font-semibold">Sesi</th>
                  <th className="px-4 py-3 font-semibold">Ketersediaan</th>
                  <th className="px-4 py-3 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id} className="border-t border-white/8 hover:bg-white/5 transition">
                    <td className="px-4 py-3">
                      <div className="text-white font-medium">{it.fullName}</div>
                      <div className="text-[10px] text-cyan-100/60">{it.email || it.phone || '—'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`
                        ${it.category === 'Industri' ? 'border-cyan-400/40 text-cyan-200 bg-cyan-500/10' : ''}
                        ${it.category === 'Akademik' ? 'border-purple-400/40 text-purple-200 bg-purple-500/10' : ''}
                        ${it.category === 'Penilai' ? 'border-amber-400/40 text-amber-200 bg-amber-500/10' : ''}
                        text-[10px]
                      `}>
                        {it.category}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-cyan-100/90 text-xs max-w-[180px] truncate">{it.expertiseArea}</td>
                    <td className="px-4 py-3 text-cyan-100/80 text-xs">{it.organization || (it.institution?.name || '—')}</td>
                    <td className="px-4 py-3 text-cyan-100/80 text-xs">{it.experienceYear} thn</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Star className={`w-3.5 h-3.5 ${it.rating >= 4 ? 'text-amber-300' : 'text-cyan-200/60'}`} fill="currentColor" />
                        <span className="text-white text-xs font-semibold">{it.rating.toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-cyan-100/80 text-xs">{it.totalSessions}</td>
                    <td className="px-4 py-3">
                      <AvailabilityBadge status={it.availability} />
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

      <CreateExpertDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => {
          setCreateOpen(false)
          loadList()
        }}
      />

      <ExpertDetailDialog
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

function AvailabilityBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; label: string }> = {
    available: { color: 'border-emerald-400/40 text-emerald-200 bg-emerald-500/10', label: 'Tersedia' },
    busy: { color: 'border-amber-400/40 text-amber-200 bg-amber-500/10', label: 'Sibuk' },
    unavailable: { color: 'border-red-400/40 text-red-200 bg-red-500/10', label: 'Tidak Tersedia' },
  }
  const c = config[status] || config.available
  return <Badge variant="outline" className={`${c.color} text-[10px]`}>{c.label}</Badge>
}

// =============== CREATE EXPERT DIALOG ===============
function CreateExpertDialog({
  open, onOpenChange, onCreated,
}: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: () => void }) {
  const [institutions, setInstitutions] = useState<{ id: string; name: string; code?: string }[]>([])
  const [form, setForm] = useState({
    fullName: '', icNumber: '', email: '', phone: '', category: 'Industri',
    expertiseArea: '', qualification: '', organization: '', experienceYear: 0,
    institutionId: '', availability: 'available',
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    fetch('/api/curriculum/institutions', { credentials: 'include' })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((d) => setInstitutions(d.list || []))
      .catch(() => setInstitutions([]))
  }, [open])

  async function submit() {
    if (!form.fullName.trim()) return toast.error('Nama penuh diperlukan')
    if (!form.category) return toast.error('Kategori diperlukan')
    if (!form.expertiseArea.trim()) return toast.error('Bidang kepakaran diperlukan')
    setSubmitting(true)
    try {
      const res = await fetch('/api/experts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
        credentials: 'include',
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      toast.success(`Pakar ${d.fullName} ditambah`)
      setForm({ fullName: '', icNumber: '', email: '', phone: '', category: 'Industri', expertiseArea: '', qualification: '', organization: '', experienceYear: 0, institutionId: '', availability: 'available' })
      onCreated()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-white/20 text-white max-w-2xl max-h-[90vh] overflow-y-auto scroll-area">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <UserCog className="w-5 h-5 text-cyan-300" /> Tambah Pakar Baru
          </DialogTitle>
          <DialogDescription className="text-cyan-100/70">
            Daftar pakar ke pangkalan data panel pakar JTM.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-cyan-100/80 mb-1.5 block text-xs">Nama Penuh *</Label>
              <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="bg-white/8 border-white/15 text-white" />
            </div>
            <div>
              <Label className="text-cyan-100/80 mb-1.5 block text-xs">No. KP</Label>
              <Input value={form.icNumber} onChange={(e) => setForm({ ...form, icNumber: e.target.value })} className="bg-white/8 border-white/15 text-white" />
            </div>
            <div>
              <Label className="text-cyan-100/80 mb-1.5 block text-xs">E-mel</Label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-white/8 border-white/15 text-white" />
            </div>
            <div>
              <Label className="text-cyan-100/80 mb-1.5 block text-xs">Telefon</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="bg-white/8 border-white/15 text-white" />
            </div>
            <div>
              <Label className="text-cyan-100/80 mb-1.5 block text-xs">Kategori *</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger className="bg-white/8 border-white/15 text-white w-full"><SelectValue /></SelectTrigger>
                <SelectContent className="glass-strong border-white/20 text-white">
                  <SelectItem value="Industri">Industri</SelectItem>
                  <SelectItem value="Akademik">Akademik</SelectItem>
                  <SelectItem value="Penilai">Penilai</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-cyan-100/80 mb-1.5 block text-xs">Ketersediaan</Label>
              <Select value={form.availability} onValueChange={(v) => setForm({ ...form, availability: v })}>
                <SelectTrigger className="bg-white/8 border-white/15 text-white w-full"><SelectValue /></SelectTrigger>
                <SelectContent className="glass-strong border-white/20 text-white">
                  <SelectItem value="available">Tersedia</SelectItem>
                  <SelectItem value="busy">Sibuk</SelectItem>
                  <SelectItem value="unavailable">Tidak Tersedia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label className="text-cyan-100/80 mb-1.5 block text-xs">Bidang Kepakaran *</Label>
              <Input value={form.expertiseArea} onChange={(e) => setForm({ ...form, expertiseArea: e.target.value })} placeholder="e.g. Automotif, Elektrik, Multimedia" className="bg-white/8 border-white/15 text-white" />
            </div>
            <div>
              <Label className="text-cyan-100/80 mb-1.5 block text-xs">Kelayakan</Label>
              <Input value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} placeholder="e.g. PhD, Sarjana, Sijil Kemahiran" className="bg-white/8 border-white/15 text-white" />
            </div>
            <div>
              <Label className="text-cyan-100/80 mb-1.5 block text-xs">Tahun Pengalaman</Label>
              <Input type="number" min={0} value={form.experienceYear} onChange={(e) => setForm({ ...form, experienceYear: Number(e.target.value) })} className="bg-white/8 border-white/15 text-white" />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-cyan-100/80 mb-1.5 block text-xs">Organisasi</Label>
              <Input value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} placeholder="e.g. PROTON, Universiti Malaya" className="bg-white/8 border-white/15 text-white" />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-cyan-100/80 mb-1.5 block text-xs">Institusi (pilihan)</Label>
              <Select value={form.institutionId || 'none'} onValueChange={(v) => setForm({ ...form, institutionId: v === 'none' ? '' : v })}>
                <SelectTrigger className="bg-white/8 border-white/15 text-white w-full"><SelectValue placeholder="Tidak berkaitan" /></SelectTrigger>
                <SelectContent className="glass-strong border-white/20 text-white max-h-72">
                  <SelectItem value="none">Tidak berkaitan</SelectItem>
                  {institutions.map((i) => (
                    <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" className="text-cyan-100 hover:bg-white/10 hover:text-white">Batal</Button>
          </DialogClose>
          <Button onClick={submit} disabled={submitting} className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 border-0 text-white">
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            Tambah Pakar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// =============== EXPERT DETAIL DIALOG ===============
function ExpertDetailDialog({
  id, open, loading, detail, onOpenChange, onRefresh, onListRefresh, currentUser,
}: {
  id: string | null; open: boolean; loading: boolean; detail: ExpertDetail | null
  onOpenChange: (v: boolean) => void; onRefresh: () => void; onListRefresh: () => void; currentUser: any
}) {
  const [tab, setTab] = useState('profile')

  const isSelf = detail?.userId && currentUser?.id === detail.userId
  const canManage = currentUser ? currentUser.roles.some((r) =>
    ['SUPER_ADMIN', 'ADMINISTRATOR', 'PEGAWAI_KURIKULUM', 'PEGAWAI_PENTAULIAHAN', 'BAHAGIAN_KURIKULUM', 'PENARAH', 'TIMBALAN_PENARAH', 'KETUA_PROGRAM', 'KETUA_JABATAN'].includes(r)
  ) : false

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-white/20 text-white max-w-5xl max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-300" />
            {detail ? detail.fullName : 'Memuat...'}
            {detail && <AvailabilityBadge status={detail.availability} />}
            {isSelf && <Badge variant="outline" className="border-cyan-400/40 text-cyan-200 bg-cyan-500/10 text-[10px]">Profil Saya</Badge>}
          </DialogTitle>
          <DialogDescription className="text-cyan-100/70">
            {detail ? `${detail.category} · ${detail.expertiseArea} · ${detail.organization || '—'}` : 'Memuatkan butiran...'}
          </DialogDescription>
        </DialogHeader>

        {loading || !detail ? (
          <div className="flex items-center justify-center py-12 text-cyan-100/70">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Memuatkan butiran...
          </div>
        ) : (
          <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="bg-white/5 border border-white/10 p-1 self-start">
              <TabsTrigger value="profile" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-white text-cyan-100/70 text-xs">Profil</TabsTrigger>
              <TabsTrigger value="appointments" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-white text-cyan-100/70 text-xs">Pelantikan ({detail.appointments.length})</TabsTrigger>
              <TabsTrigger value="evaluations" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-white text-cyan-100/70 text-xs">Penilaian ({detail.evaluations.length})</TabsTrigger>
              <TabsTrigger value="honorariums" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-white text-cyan-100/70 text-xs">Honorarium ({detail.honorariums.length})</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto scroll-area mt-3 pr-1">
              <TabsContent value="profile" className="mt-0">
                <ProfileTab detail={detail} isSelf={!!isSelf} canManage={canManage} onRefresh={onRefresh} />
              </TabsContent>
              <TabsContent value="appointments" className="mt-0">
                <AppointmentsTab detail={detail} onRefresh={onRefresh} canManage={canManage} />
              </TabsContent>
              <TabsContent value="evaluations" className="mt-0">
                <EvaluationsTab detail={detail} onRefresh={onRefresh} canManage={canManage} />
              </TabsContent>
              <TabsContent value="honorariums" className="mt-0">
                <HonorariumsTab detail={detail} onRefresh={onRefresh} onListRefresh={onListRefresh} canManage={canManage} />
              </TabsContent>
            </div>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}

function ProfileTab({ detail, isSelf, canManage, onRefresh }: { detail: ExpertDetail; isSelf: boolean; canManage: boolean; onRefresh: () => void }) {
  const [updating, setUpdating] = useState(false)

  async function toggleAvailability() {
    setUpdating(true)
    const next = detail.availability === 'available' ? 'unavailable' : 'available'
    try {
      const res = await fetch(`/api/experts/${detail.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availability: next }),
        credentials: 'include',
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success(`Ketersediaan: ${AVAILABILITY_LABELS[next]}`)
      onRefresh()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatBox icon={Briefcase} label="Jumlah Sesi" value={detail.stats.totalAppointments.toString()} color="text-cyan-300" />
        <StatBox icon={Star} label="Penilaian Purata" value={detail.stats.avgRating.toFixed(2)} color="text-amber-300" />
        <StatBox icon={MessageSquare} label="Penilaian Diberi" value={detail.stats.totalEvaluations.toString()} color="text-purple-300" />
        <StatBox icon={Banknote} label="Jumlah Dibayar" value={`RM ${detail.stats.totalPaid.toFixed(0)}`} color="text-emerald-300" />
      </div>

      <GlassPanel className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <InfoRow icon={Users} label="Nama Penuh" value={detail.fullName} />
          <InfoRow icon={Award} label="Kategori" value={detail.category} />
          <InfoRow icon={Briefcase} label="Bidang Kepakaran" value={detail.expertiseArea} />
          <InfoRow icon={Building2} label="Organisasi" value={detail.organization || '—'} />
          <InfoRow icon={Award} label="Kelayakan" value={detail.qualification || '—'} />
          <InfoRow icon={Clock} label="Tahun Pengalaman" value={`${detail.experienceYear} tahun`} />
          <InfoRow icon={Mail} label="E-mel" value={detail.email || '—'} />
          <InfoRow icon={Phone} label="Telefon" value={detail.phone || '—'} />
          <InfoRow icon={Building2} label="Institusi" value={detail.institution?.name || '—'} />
          <InfoRow icon={Star} label="Penilaian" value={`${detail.rating.toFixed(1)} / 5.0`} />
        </div>
      </GlassPanel>

      {/* Availability self-service (FR-M6-03) */}
      <GlassPanel className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-300" /> Ketersediaan Diri
            </div>
            <div className="text-xs text-cyan-100/70 mt-1">
              {isSelf
                ? 'Anda boleh mengemas kini ketersediaan anda sendiri.'
                : canManage
                ? 'Pakar ini boleh mengemas kini ketersediaan sendiri melalui akaun pengguna mereka.'
                : 'Hanya pakar itu sendiri atau pegawai boleh mengemas kini ketersediaan.'}
            </div>
          </div>
          {(isSelf || canManage) && (
            <div className="flex items-center gap-2">
              <Switch checked={detail.availability === 'available'} disabled={updating} onCheckedChange={toggleAvailability} />
              <span className={`text-sm font-medium ${detail.availability === 'available' ? 'text-emerald-300' : 'text-amber-300'}`}>
                {AVAILABILITY_LABELS[detail.availability]}
              </span>
            </div>
          )}
        </div>
      </GlassPanel>
    </div>
  )
}

function StatBox({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="glass-subtle p-3 rounded-lg">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-3.5 h-3.5 ${color}`} />
        <span className="text-[10px] uppercase tracking-wide text-cyan-100/60">{label}</span>
      </div>
      <div className="text-lg font-bold text-white">{value}</div>
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 glass-subtle px-3 py-2 rounded-lg">
      <Icon className="w-3.5 h-3.5 text-cyan-300 flex-shrink-0" />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wide text-cyan-100/60">{label}</div>
        <div className="text-white text-xs font-medium truncate">{value}</div>
      </div>
    </div>
  )
}

// =============== APPOINTMENTS TAB ===============
function AppointmentsTab({ detail, onRefresh, canManage }: { detail: ExpertDetail; onRefresh: () => void; canManage: boolean }) {
  const [newAppt, setNewAppt] = useState({ purpose: '', scheduledAt: '', durationHour: 1, notes: '', amount: '', projectId: '' })
  const [saving, setSaving] = useState(false)

  async function create() {
    if (!newAppt.purpose) return toast.error('Tujuan diperlukan')
    if (!newAppt.scheduledAt) return toast.error('Tarikh diperlukan')
    setSaving(true)
    try {
      const res = await fetch(`/api/experts/${detail.id}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purpose: newAppt.purpose,
          scheduledAt: newAppt.scheduledAt,
          durationHour: newAppt.durationHour,
          notes: newAppt.notes,
          amount: newAppt.amount ? Number(newAppt.amount) : undefined,
          projectId: newAppt.projectId || undefined,
        }),
        credentials: 'include',
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      toast.success('Pelantikan dicipta')
      setNewAppt({ purpose: '', scheduledAt: '', durationHour: 1, notes: '', amount: '', projectId: '' })
      onRefresh()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function updateStatus(apptId: string, status: string) {
    try {
      const res = await fetch(`/api/experts/appointments/${apptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
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
      {canManage && (
        <GlassPanel className="p-3">
          <div className="text-xs text-cyan-100/80 font-medium mb-2 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-cyan-300" /> Cipta Pelantikan Baru
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input placeholder="Tujuan (e.g. Penilaian Kurikulum)" value={newAppt.purpose} onChange={(e) => setNewAppt({ ...newAppt, purpose: e.target.value })} className="bg-white/8 border-white/15 text-white placeholder:text-white/40" />
            <Input type="datetime-local" value={newAppt.scheduledAt} onChange={(e) => setNewAppt({ ...newAppt, scheduledAt: e.target.value })} className="bg-white/8 border-white/15 text-white" />
            <Input type="number" min="0.5" step="0.5" placeholder="Tempoh (jam)" value={newAppt.durationHour} onChange={(e) => setNewAppt({ ...newAppt, durationHour: Number(e.target.value) })} className="bg-white/8 border-white/15 text-white" />
            <Input type="number" min="0" placeholder="Honorarium (RM, pilihan)" value={newAppt.amount} onChange={(e) => setNewAppt({ ...newAppt, amount: e.target.value })} className="bg-white/8 border-white/15 text-white" />
            <Input placeholder="ID Projek (pilihan)" value={newAppt.projectId} onChange={(e) => setNewAppt({ ...newAppt, projectId: e.target.value })} className="bg-white/8 border-white/15 text-white placeholder:text-white/40" />
            <Input placeholder="Catatan" value={newAppt.notes} onChange={(e) => setNewAppt({ ...newAppt, notes: e.target.value })} className="bg-white/8 border-white/15 text-white placeholder:text-white/40" />
          </div>
          <Button size="sm" onClick={create} disabled={saving} className="bg-cyan-500 hover:bg-cyan-400 text-white border-0 mt-2">
            <Plus className="w-3.5 h-3.5 mr-1" /> Cipta Pelantikan
          </Button>
        </GlassPanel>
      )}

      {detail.appointments.length === 0 ? (
        <EmptyState icon={Calendar} title="Tiada pelantikan" hint={canManage ? 'Cipta pelantikan baharu di atas' : undefined} />
      ) : (
        <div className="space-y-2">
          {detail.appointments.map((a) => (
            <GlassPanel key={a.id} className="p-3">
              <div className="flex flex-wrap items-start gap-2">
                <Calendar className="w-4 h-4 text-cyan-300 mt-1" />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-white">{a.purpose}</span>
                    <Badge variant="outline" className={`
                      ${a.status === 'scheduled' ? 'border-cyan-400/40 text-cyan-200 bg-cyan-500/10' : ''}
                      ${a.status === 'completed' ? 'border-emerald-400/40 text-emerald-200 bg-emerald-500/10' : ''}
                      ${a.status === 'cancelled' ? 'border-red-400/40 text-red-200 bg-red-500/10' : ''}
                      text-[10px]
                    `}>{a.status}</Badge>
                  </div>
                  <div className="text-xs text-cyan-100/70 mt-0.5">
                    {new Date(a.scheduledAt).toLocaleString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} · {a.durationHour}j
                    {a.assigner && ` · oleh ${a.assigner.fullName}`}
                  </div>
                  {a.notes && <div className="text-[11px] text-cyan-100/60 italic mt-1">{a.notes}</div>}
                  {a.honorarium && (
                    <div className="text-[11px] text-emerald-200/80 mt-1 flex items-center gap-1">
                      <Banknote className="w-3 h-3" /> Honorarium: {a.honorarium.currency} {a.honorarium.amount.toFixed(2)} ({a.honorarium.status})
                    </div>
                  )}
                </div>
                {canManage && a.status === 'scheduled' && (
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="text-emerald-200 hover:bg-white/10 hover:text-white h-7 px-2 text-[10px]" onClick={() => updateStatus(a.id, 'completed')}>
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Selesai
                    </Button>
                    <Button size="sm" variant="ghost" className="text-red-200 hover:bg-white/10 hover:text-white h-7 px-2 text-[10px]" onClick={() => updateStatus(a.id, 'cancelled')}>
                      <XCircle className="w-3 h-3 mr-1" /> Batal
                    </Button>
                  </div>
                )}
              </div>
            </GlassPanel>
          ))}
        </div>
      )}
    </div>
  )
}

// =============== EVALUATIONS TAB ===============
function EvaluationsTab({ detail, onRefresh, canManage }: { detail: ExpertDetail; onRefresh: () => void; canManage: boolean }) {
  const [newEval, setNewEval] = useState({ targetType: 'curriculum', targetId: '', rating: 4, recommendation: '', comments: '' })
  const [saving, setSaving] = useState(false)

  async function create() {
    setSaving(true)
    try {
      const res = await fetch(`/api/experts/${detail.id}/evaluations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEval),
        credentials: 'include',
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      toast.success(`Penilaian direkodkan (purata: ${d.avgRating.toFixed(2)})`)
      setNewEval({ targetType: 'curriculum', targetId: '', rating: 4, recommendation: '', comments: '' })
      onRefresh()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <GlassPanel className="p-3">
          <div className="text-xs text-cyan-100/80 font-medium mb-2 flex items-center gap-2">
            <MessageSquare className="w-3.5 h-3.5 text-cyan-300" /> Rekod Penilaian
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Select value={newEval.targetType} onValueChange={(v) => setNewEval({ ...newEval, targetType: v })}>
              <SelectTrigger className="bg-white/8 border-white/15 text-white w-full"><SelectValue /></SelectTrigger>
              <SelectContent className="glass-strong border-white/20 text-white">
                <SelectItem value="curriculum">Kurikulum</SelectItem>
                <SelectItem value="wim">Dokumen WIM</SelectItem>
                <SelectItem value="accreditation">Pentauliahan</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="ID Sasaran (pilihan)" value={newEval.targetId} onChange={(e) => setNewEval({ ...newEval, targetId: e.target.value })} className="bg-white/8 border-white/15 text-white" />
            <div className="sm:col-span-2 flex items-center gap-2">
              <Label className="text-cyan-100/80 text-xs">Penarafan:</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setNewEval({ ...newEval, rating: r })}
                    className={`w-7 h-7 rounded flex items-center justify-center transition ${r <= newEval.rating ? 'text-amber-300' : 'text-white/20 hover:text-white/50'}`}
                  >
                    <Star className="w-5 h-5" fill={r <= newEval.rating ? 'currentColor' : 'none'} />
                  </button>
                ))}
              </div>
              <span className="text-white text-sm ml-2">{newEval.rating}/5</span>
            </div>
            <Input placeholder="Cadangan (singkat)" value={newEval.recommendation} onChange={(e) => setNewEval({ ...newEval, recommendation: e.target.value })} className="bg-white/8 border-white/15 text-white sm:col-span-2" />
            <Textarea placeholder="Komen terperinci..." value={newEval.comments} onChange={(e) => setNewEval({ ...newEval, comments: e.target.value })} rows={2} className="bg-white/8 border-white/15 text-white sm:col-span-2" />
          </div>
          <Button size="sm" onClick={create} disabled={saving} className="bg-cyan-500 hover:bg-cyan-400 text-white border-0 mt-2">
            <Plus className="w-3.5 h-3.5 mr-1" /> Rekod
          </Button>
        </GlassPanel>
      )}

      {detail.evaluations.length === 0 ? (
        <EmptyState icon={MessageSquare} title="Tiada penilaian direkodkan" />
      ) : (
        <div className="space-y-2">
          {detail.evaluations.map((e) => (
            <GlassPanel key={e.id} className="p-3">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-purple-400/40 text-purple-200 bg-purple-500/10 text-[10px] capitalize">{e.targetType}</Badge>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((r) => (
                      <Star key={r} className={`w-3.5 h-3.5 ${r <= e.rating ? 'text-amber-300' : 'text-white/15'}`} fill={r <= e.rating ? 'currentColor' : 'none'} />
                    ))}
                  </div>
                </div>
                <span className="text-[10px] text-cyan-100/60">{new Date(e.createdAt).toLocaleDateString('ms-MY')}</span>
              </div>
              {e.recommendation && <div className="text-sm text-white font-medium">{e.recommendation}</div>}
              {e.comments && <div className="text-xs text-cyan-100/70 mt-1">{e.comments}</div>}
            </GlassPanel>
          ))}
        </div>
      )}
    </div>
  )
}

// =============== HONORARIUMS TAB ===============
function HonorariumsTab({
  detail, onRefresh, onListRefresh, canManage,
}: { detail: ExpertDetail; onRefresh: () => void; onListRefresh: () => void; canManage: boolean }) {
  const [acting, setActing] = useState<string | null>(null)

  async function markPaid(honorariumId: string) {
    setActing(honorariumId)
    try {
      const res = await fetch(`/api/experts/${detail.id}/honorariums`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: honorariumId, status: 'paid' }),
        credentials: 'include',
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Honorarium ditandai sebagai dibayar')
      onRefresh()
      onListRefresh()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setActing(null)
    }
  }

  async function cancel(honorariumId: string) {
    setActing(honorariumId)
    try {
      const res = await fetch(`/api/experts/${detail.id}/honorariums`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: honorariumId, status: 'cancelled' }),
        credentials: 'include',
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Honorarium dibatalkan')
      onRefresh()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setActing(null)
    }
  }

  const totalPaid = detail.honorariums.filter((h) => h.status === 'paid').reduce((s, h) => s + h.amount, 0)
  const totalPending = detail.honorariums.filter((h) => h.status === 'pending').reduce((s, h) => s + h.amount, 0)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <GlassPanel className="p-3">
          <div className="text-[10px] uppercase tracking-wide text-cyan-100/60">Jumlah Dibayar</div>
          <div className="text-2xl font-bold text-emerald-300">RM {totalPaid.toFixed(2)}</div>
        </GlassPanel>
        <GlassPanel className="p-3">
          <div className="text-[10px] uppercase tracking-wide text-cyan-100/60">Tertunggak</div>
          <div className="text-2xl font-bold text-amber-300">RM {totalPending.toFixed(2)}</div>
        </GlassPanel>
      </div>

      {detail.honorariums.length === 0 ? (
        <EmptyState icon={CircleDollarSign} title="Tiada rekod honorarium" />
      ) : (
        <div className="space-y-2">
          {detail.honorariums.map((h) => (
            <GlassPanel key={h.id} className="p-3">
              <div className="flex items-start gap-2">
                <Banknote className="w-4 h-4 text-emerald-300 mt-1" />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-white">{h.currency} {h.amount.toFixed(2)}</span>
                    <Badge variant="outline" className={`
                      ${h.status === 'paid' ? 'border-emerald-400/40 text-emerald-200 bg-emerald-500/10' : ''}
                      ${h.status === 'pending' ? 'border-amber-400/40 text-amber-200 bg-amber-500/10' : ''}
                      ${h.status === 'cancelled' ? 'border-red-400/40 text-red-200 bg-red-500/10' : ''}
                      text-[10px]
                    `}>{h.status}</Badge>
                  </div>
                  <div className="text-xs text-cyan-100/70 mt-0.5">
                    {h.appointment?.purpose || 'Pelantikan'} · {new Date(h.appointment?.scheduledAt || h.createdAt).toLocaleDateString('ms-MY')}
                  </div>
                  {h.paidAt && <div className="text-[10px] text-emerald-200/80 mt-1">Dibayar: {new Date(h.paidAt).toLocaleDateString('ms-MY')}</div>}
                </div>
                {canManage && h.status === 'pending' && (
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" disabled={acting === h.id} className="text-emerald-200 hover:bg-white/10 hover:text-white h-7 px-2 text-[10px]" onClick={() => markPaid(h.id)}>
                      {acting === h.id ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                      Tanda Dibayar
                    </Button>
                    <Button size="sm" variant="ghost" disabled={acting === h.id} className="text-red-200 hover:bg-white/10 hover:text-white h-7 px-2 text-[10px]" onClick={() => cancel(h.id)}>
                      <XCircle className="w-3 h-3 mr-1" /> Batal
                    </Button>
                  </div>
                )}
              </div>
            </GlassPanel>
          ))}
        </div>
      )}
    </div>
  )
}
