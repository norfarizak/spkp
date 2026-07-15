'use client'
import { useEffect, useState, useCallback } from 'react'
import { GlassCard, PageHeader, StatusBadge, EmptyState } from '@/components/glass'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import {
  FolderOpen, Upload, Search, FileText, FileSpreadsheet, FileImage, FileType,
  Eye, Plus, Tags, Clock, History, ShieldAlert, Loader2, FileBox, Trash2,
  Archive, CheckCircle2,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'

interface DocItem {
  id: string
  name: string
  category: string
  module?: string | null
  fileType: string
  fileSize: number
  description?: string | null
  tags?: string | null
  status: string
  owner?: { name: string; email: string } | null
  versionCount: number
  latestVersion: number
  createdAt: string
  updatedAt: string
}

interface DocDetail {
  document: DocItem & { ownerId?: string }
  versions: Array<{
    id: string
    version: number
    fileUrl?: string | null
    checksum?: string | null
    createdAt: string
    uploadedBy?: { name: string; email: string } | null
  }>
  canManage: boolean
}

const CATEGORIES = [
  { value: 'curriculum', label: 'Kurikulum' },
  { value: 'wim', label: 'WIM' },
  { value: 'accreditation', label: 'Pentauliahan' },
  { value: 'certificate', label: 'Sijil' },
  { value: 'general', label: 'Umum' },
]

const FILE_TYPES = [
  { value: 'pdf', label: 'PDF', icon: FileText },
  { value: 'docx', label: 'DOCX', icon: FileText },
  { value: 'xlsx', label: 'XLSX', icon: FileSpreadsheet },
  { value: 'image', label: 'Imej', icon: FileImage },
]

function humanSize(bytes: number) {
  if (!bytes) return '-'
  const units = ['B', 'KB', 'MB', 'GB']
  let v = bytes
  let i = 0
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++ }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${units[i]}`
}

function fileIcon(type: string) {
  const f = FILE_TYPES.find((x) => x.value === type)
  return f?.icon || FileType
}

export function DocumentsModule() {
  const user = useAppStore((s) => s.user)
  const [items, setItems] = useState<DocItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ category: '', fileType: '', search: '' })
  const [uploadOpen, setUploadOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [detail, setDetail] = useState<DocDetail | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.category) params.set('category', filters.category)
      if (filters.fileType) params.set('fileType', filters.fileType)
      if (filters.search) params.set('search', filters.search)
      const r = await fetch(`/api/documents?${params.toString()}`, { credentials: 'include' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Ralat')
      setItems(d.items || [])
    } catch (e: any) {
      toast.error(e.message || 'Gagal memuatkan dokumen')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { load() }, [load])

  async function openDetail(id: string) {
    setDetailId(id)
    setDetail(null)
    try {
      const r = await fetch(`/api/documents/${id}`, { credentials: 'include' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Ralat')
      setDetail(d)
    } catch (e: any) {
      toast.error(e.message || 'Gagal memuatkan butiran')
      setDetailId(null)
    }
  }

  async function changeStatus(id: string, status: string) {
    try {
      const r = await fetch(`/api/documents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
        credentials: 'include',
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Ralat')
      toast.success(`Status dikemas kini ke: ${status}`)
      openDetail(id)
      load()
    } catch (e: any) {
      toast.error(e.message || 'Gagal mengemas kini status')
    }
  }

  async function deleteDoc(id: string) {
    if (!confirm('Padam dokumen ini? Tindakan ini tidak boleh diundur.')) return
    try {
      const r = await fetch(`/api/documents/${id}`, { method: 'DELETE', credentials: 'include' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Ralat')
      toast.success('Dokumen dipadam')
      setDetailId(null)
      setDetail(null)
      load()
    } catch (e: any) {
      toast.error(e.message || 'Gagal memadam')
    }
  }

  async function addVersion(id: string) {
    try {
      const r = await fetch(`/api/documents/${id}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: 'Versi baharu' }),
        credentials: 'include',
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Ralat')
      toast.success(`Versi ${d.version?.version} ditambah`)
      openDetail(id)
      load()
    } catch (e: any) {
      toast.error(e.message || 'Gagal menambah versi')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FolderOpen}
        title="Pengurusan Dokumen"
        description="Repostrai pusat dokumen kurikulum, WIM, pentauliahan & sijil"
        actions={
          <Button
            className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 border-0 text-white"
            onClick={() => setUploadOpen(true)}
          >
            <Upload className="w-4 h-4 mr-2" /> Muat Naik Dokumen
          </Button>
        }
      />

      {/* Filters */}
      <GlassCard className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-100/60" />
            <Input
              placeholder="Cari nama, tag atau deskripsi..."
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              className="pl-10 bg-white/8 border-white/15 text-white placeholder:text-white/40"
            />
          </div>
          <Select value={filters.category} onValueChange={(v) => setFilters((f) => ({ ...f, category: v === 'all' ? '' : v }))}>
            <SelectTrigger className="bg-white/8 border-white/15 text-white">
              <SelectValue placeholder="Semua Kategori" />
            </SelectTrigger>
            <SelectContent className="glass-strong border-white/20 text-white">
              <SelectItem value="all">Semua Kategori</SelectItem>
              {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.fileType} onValueChange={(v) => setFilters((f) => ({ ...f, fileType: v === 'all' ? '' : v }))}>
            <SelectTrigger className="bg-white/8 border-white/15 text-white">
              <SelectValue placeholder="Semua Jenis Fail" />
            </SelectTrigger>
            <SelectContent className="glass-strong border-white/20 text-white">
              <SelectItem value="all">Semua Jenis Fail</SelectItem>
              {FILE_TYPES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </GlassCard>

      {/* Table */}
      <GlassCard className="p-0 overflow-hidden">
        <div className="max-h-[60vh] overflow-y-auto scroll-area">
          <Table>
            <TableHeader className="sticky top-0 z-10 glass-strong">
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-cyan-100">Nama Dokumen</TableHead>
                <TableHead className="text-cyan-100">Kategori</TableHead>
                <TableHead className="text-cyan-100">Jenis</TableHead>
                <TableHead className="text-cyan-100">Saiz</TableHead>
                <TableHead className="text-cyan-100">Pemilik</TableHead>
                <TableHead className="text-cyan-100 text-center">Versi</TableHead>
                <TableHead className="text-cyan-100">Dikemas Kini</TableHead>
                <TableHead className="text-cyan-100">Status</TableHead>
                <TableHead className="text-cyan-100 text-right">Tindakan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-cyan-100/60">
                    <Loader2 className="w-6 h-6 mx-auto animate-spin mb-2" /> Memuatkan dokumen...
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9}>
                    <EmptyState icon={FileBox} title="Tiada dokumen dijumpai" hint="Cuba ubah penapis atau muat naik dokumen baharu." />
                  </TableCell>
                </TableRow>
              ) : (
                items.map((d) => {
                  const Icon = fileIcon(d.fileType)
                  return (
                    <TableRow key={d.id} className="border-white/5 hover:bg-white/5">
                      <TableCell className="text-white">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg glass-subtle flex items-center justify-center">
                            <Icon className="w-4 h-4 text-cyan-300" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium truncate max-w-[260px]">{d.name}</div>
                            {d.tags && (
                              <div className="text-[10px] text-cyan-100/60 flex items-center gap-1 truncate">
                                <Tags className="w-2.5 h-2.5" /> {d.tags}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><Badge className="bg-cyan-500/15 text-cyan-200 border-cyan-400/30 uppercase text-[10px]">{d.category}</Badge></TableCell>
                      <TableCell className="text-cyan-100/80 uppercase text-xs">{d.fileType}</TableCell>
                      <TableCell className="text-cyan-100/80 text-xs">{humanSize(d.fileSize)}</TableCell>
                      <TableCell className="text-cyan-100/80 text-xs">{d.owner?.name || '-'}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="border-white/20 text-cyan-100 text-xs">v{d.latestVersion}</Badge>
                      </TableCell>
                      <TableCell className="text-cyan-100/60 text-xs">
                        {new Date(d.updatedAt).toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </TableCell>
                      <TableCell><StatusBadge status={d.status} /></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="text-cyan-200 hover:text-white hover:bg-white/10" onClick={() => openDetail(d.id)}>
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </GlassCard>

      {/* Upload dialog */}
      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onCreated={() => { setUploadOpen(false); load() }}
      />

      {/* Detail dialog */}
      <Dialog open={!!detailId} onOpenChange={(o) => { if (!o) { setDetailId(null); setDetail(null) } }}>
        <DialogContent className="glass-strong border-white/20 text-white max-w-2xl max-h-[90vh] overflow-y-auto scroll-area">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-300" /> Butiran Dokumen
            </DialogTitle>
            <DialogDescription className="text-cyan-100/70">Metadata, sejarah versi & polisi pengekalan</DialogDescription>
          </DialogHeader>
          {!detail ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-cyan-300 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Metadata */}
              <div className="glass-subtle p-4 rounded-lg space-y-2">
                <div className="text-lg font-bold text-white">{detail.document.name}</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <Meta label="Kategori" value={detail.document.category} />
                  <Meta label="Jenis Fail" value={detail.document.fileType.toUpperCase()} />
                  <Meta label="Saiz Fail" value={humanSize(detail.document.fileSize)} />
                  <Meta label="Pemilik" value={detail.document.owner?.name || '-'} />
                  <Meta label="Dicipta" value={new Date(detail.document.createdAt).toLocaleString('ms-MY')} />
                  <Meta label="Dikemas Kini" value={new Date(detail.document.updatedAt).toLocaleString('ms-MY')} />
                </div>
                {detail.document.description && (
                  <div className="text-xs text-cyan-100/80 pt-2 border-t border-white/10">
                    <span className="text-cyan-100/60">Deskripsi: </span>{detail.document.description}
                  </div>
                )}
                {detail.document.tags && (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {detail.document.tags.split(',').map((t, i) => (
                      <Badge key={i} className="bg-purple-500/15 text-purple-200 border-purple-400/30 text-[10px]">#{t.trim()}</Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Retention / status */}
              <div className="glass-subtle p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-semibold text-white flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-300" /> Polisi Pengekalan & Status
                  </div>
                  <StatusBadge status={detail.document.status} />
                </div>
                <p className="text-xs text-cyan-100/70">
                  Dokumen dengan status <span className="font-semibold text-white">aktif</span> dikekalkan selama 7 tahun mengikut polisi JTM.
                  Status <span className="font-semibold text-white">arkib</span> dipindahkan ke storan jangka panjang.
                  Status <span className="font-semibold text-white">tamat</span> ditandai untuk pelupusan terkawal.
                </p>
                {detail.canManage && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Button size="sm" variant="outline" className="border-cyan-400/30 text-cyan-200 hover:bg-cyan-500/10" onClick={() => changeStatus(detail.document.id, 'active')}>
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Aktif
                    </Button>
                    <Button size="sm" variant="outline" className="border-amber-400/30 text-amber-200 hover:bg-amber-500/10" onClick={() => changeStatus(detail.document.id, 'archived')}>
                      <Archive className="w-3 h-3 mr-1" /> Arkib
                    </Button>
                    <Button size="sm" variant="outline" className="border-red-400/30 text-red-200 hover:bg-red-500/10" onClick={() => changeStatus(detail.document.id, 'expired')}>
                      <Clock className="w-3 h-3 mr-1" /> Tamat
                    </Button>
                    <Button size="sm" variant="destructive" className="ml-auto" onClick={() => deleteDoc(detail.document.id)}>
                      <Trash2 className="w-3 h-3 mr-1" /> Padam
                    </Button>
                  </div>
                )}
              </div>

              {/* Versions */}
              <div className="glass-subtle p-4 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-semibold text-white flex items-center gap-2">
                    <History className="w-4 h-4 text-cyan-300" /> Sejarah Versi ({detail.versions.length})
                  </div>
                  <Button size="sm" variant="outline" className="border-cyan-400/30 text-cyan-200 hover:bg-cyan-500/10" onClick={() => addVersion(detail.document.id)}>
                    <Plus className="w-3 h-3 mr-1" /> Versi Baharu
                  </Button>
                </div>
                <div className="space-y-1.5 max-h-60 overflow-y-auto scroll-area">
                  {detail.versions.map((v) => (
                    <div key={v.id} className="flex items-center gap-3 glass p-2.5 rounded-lg border-white/10">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500/30 to-teal-500/20 flex items-center justify-center text-xs font-bold text-cyan-200">
                        v{v.version}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-white truncate">{v.fileUrl}</div>
                        <div className="text-[10px] text-cyan-100/60">
                          {v.uploadedBy?.name || 'Sistem'} · {new Date(v.createdAt).toLocaleString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <div className="text-[10px] text-cyan-100/40 font-mono">{v.checksum?.slice(0, 12)}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview placeholder (FR-M8-03) */}
              <div className="glass-subtle p-4 rounded-lg">
                <Button
                  variant="outline"
                  className="w-full border-cyan-400/30 text-cyan-200 hover:bg-cyan-500/10"
                  onClick={() => toast.info('Pratonton tidak tersedia dalam demo. Fail disimpan pada /uploads/...')}
                >
                  <Eye className="w-4 h-4 mr-2" /> Pratonton Dokumen
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-cyan-100/50 text-[10px] uppercase tracking-wider">{label}</div>
      <div className="text-white">{value}</div>
    </div>
  )
}

function UploadDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    name: '', category: 'general', module: '', description: '', tags: '',
    fileType: 'pdf', fileSize: 0, status: 'active',
  })
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!form.name.trim()) { toast.error('Nama dokumen diperlukan'); return }
    setSaving(true)
    try {
      const r = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
        credentials: 'include',
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Ralat')
      toast.success('Dokumen berjaya dimuat naik')
      setForm({ name: '', category: 'general', module: '', description: '', tags: '', fileType: 'pdf', fileSize: 0, status: 'active' })
      onCreated()
    } catch (e: any) {
      toast.error(e.message || 'Gagal memuat naik')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-white/20 text-white max-w-xl max-h-[90vh] overflow-y-auto scroll-area">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Upload className="w-5 h-5 text-cyan-300" /> Muat Naik Dokumen Baharu
          </DialogTitle>
          <DialogDescription className="text-cyan-100/70">Rekod metadata dokumen. Fail akan direkodkan sebagai versi pertama.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-cyan-100 text-xs">Nama Dokumen *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="cth: Modul Pengaturcaraan Web.pdf"
              className="bg-white/8 border-white/15 text-white placeholder:text-white/40 mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-cyan-100 text-xs">Kategori</Label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger className="bg-white/8 border-white/15 text-white mt-1"><SelectValue /></SelectTrigger>
                <SelectContent className="glass-strong border-white/20 text-white">
                  {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-cyan-100 text-xs">Jenis Fail</Label>
              <Select value={form.fileType} onValueChange={(v) => setForm((f) => ({ ...f, fileType: v }))}>
                <SelectTrigger className="bg-white/8 border-white/15 text-white mt-1"><SelectValue /></SelectTrigger>
                <SelectContent className="glass-strong border-white/20 text-white">
                  {FILE_TYPES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-cyan-100 text-xs">Modul (pilihan)</Label>
              <Input
                value={form.module}
                onChange={(e) => setForm((f) => ({ ...f, module: e.target.value }))}
                placeholder="cth: kurikulum, wim"
                className="bg-white/8 border-white/15 text-white placeholder:text-white/40 mt-1"
              />
            </div>
            <div>
              <Label className="text-cyan-100 text-xs">Saiz Fail (bytes)</Label>
              <Input
                type="number"
                value={form.fileSize}
                onChange={(e) => setForm((f) => ({ ...f, fileSize: Number(e.target.value) }))}
                placeholder="0"
                className="bg-white/8 border-white/15 text-white placeholder:text-white/40 mt-1"
              />
            </div>
          </div>
          <div>
            <Label className="text-cyan-100 text-xs">Deskripsi</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Deskripsi ringkas dokumen..."
              className="bg-white/8 border-white/15 text-white placeholder:text-white/40 mt-1 min-h-[70px]"
            />
          </div>
          <div>
            <Label className="text-cyan-100 text-xs">Tag (pisahkan dengan koma)</Label>
            <Input
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              placeholder="cth: tvet, programming, web"
              className="bg-white/8 border-white/15 text-white placeholder:text-white/40 mt-1"
            />
          </div>
          <div className="glass-subtle p-3 rounded-lg text-[10px] text-cyan-100/60 flex items-start gap-2">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-300 mt-0.5 flex-shrink-0" />
            <span>Dalam demo sandbox ini, fail sebenar tidak disimpan. Hanya metadata direkodkan dan URL demo (/uploads/...) dijana untuk versi pertama.</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" className="text-cyan-100 hover:bg-white/10" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button className="bg-gradient-to-r from-cyan-500 to-teal-500 border-0 text-white" disabled={saving} onClick={submit}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            Simpan Dokumen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
