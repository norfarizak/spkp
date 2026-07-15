'use client'
import { useEffect, useState, useCallback } from 'react'
import { GlassCard, PageHeader, StatusBadge, EmptyState } from '@/components/glass'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table'
import {
  Users, UserPlus, Search, ShieldCheck, KeyRound, Loader2, ChevronDown, ChevronRight,
  Trash2, Edit3, History, Lock, Unlock, ShieldAlert, Crown, Fingerprint, RefreshCw, Save,
  CheckCircle2, AlertTriangle, Info,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'

interface UserRow {
  id: string
  email: string
  fullName: string
  icNumber?: string | null
  staffId?: string | null
  phone?: string | null
  avatarUrl?: string | null
  status: string
  mfaEnabled: boolean
  mustResetPwd: boolean
  institutionId?: string | null
  institution?: { id: string; name: string; code: string } | null
  campus?: { id: string; name: string } | null
  department?: { id: string; name: string; code: string } | null
  roles: { id: string; code: string; name: string }[]
  lastLoginAt?: string | null
  failedAttempts: number
  lockedUntil?: string | null
  createdAt: string
}

interface RoleItem {
  id: string
  code: string
  name: string
  description?: string | null
  userCount: number
  permissions: { id: string; code: string; name: string; module: string }[]
}
interface PermItem {
  id: string
  code: string
  name: string
  module: string
}

interface LoginHistoryItem {
  id: string
  loginAt: string
  ipAddress?: string | null
  userAgent?: string | null
  success: boolean
  reason?: string | null
}

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMINISTRATOR: 'Pentadbir',
  PENARAH: 'Pengarah',
  TIMBALAN_PENARAH: 'Tim. Pengarah',
  BAHAGIAN_KURIKULUM: 'BG Kurikulum',
  PEGAWAI_KURIKULUM: 'Pg Kurikulum',
  PEGAWAI_PENTAULIAHAN: 'Pg Pentauliahan',
  PEGAWAI_QA: 'Pg QA',
  KETUA_PROGRAM: 'Ketua Program',
  KETUA_JABATAN: 'Ketua Jabatan',
  PENSYARAH: 'Pensyarah',
  PANEL_INDUSTRI: 'Panel Industri',
  PANEL_AKADEMIK: 'Panel Akademik',
  PANEL_PENILAI: 'Panel Penilai',
  AUDITOR: 'Auditor',
  VIEWER: 'Viewer',
  GUEST: 'Tetamu',
}

const ROLE_COLOR: Record<string, string> = {
  SUPER_ADMIN: 'border-rose-400/50 bg-rose-500/15 text-rose-200',
  ADMINISTRATOR: 'border-amber-400/50 bg-amber-500/15 text-amber-200',
  PENARAH: 'border-purple-400/50 bg-purple-500/15 text-purple-200',
  TIMBALAN_PENARAH: 'border-violet-400/50 bg-violet-500/15 text-violet-200',
  BAHAGIAN_KURIKULUM: 'border-cyan-400/50 bg-cyan-500/15 text-cyan-200',
  PEGAWAI_KURIKULUM: 'border-cyan-400/50 bg-cyan-500/15 text-cyan-100',
  PEGAWAI_PENTAULIAHAN: 'border-teal-400/50 bg-teal-500/15 text-teal-200',
  PEGAWAI_QA: 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200',
  KETUA_PROGRAM: 'border-sky-400/50 bg-sky-500/15 text-sky-200',
  KETUA_JABATAN: 'border-blue-400/40 bg-blue-500/15 text-blue-200',
  PENSYARAH: 'border-lime-400/40 bg-lime-500/15 text-lime-200',
  PANEL_INDUSTRI: 'border-orange-400/40 bg-orange-500/15 text-orange-200',
  PANEL_AKADEMIK: 'border-orange-400/40 bg-orange-500/15 text-orange-100',
  PANEL_PENILAI: 'border-pink-400/40 bg-pink-500/15 text-pink-200',
  AUDITOR: 'border-red-400/40 bg-red-500/15 text-red-200',
  VIEWER: 'border-slate-400/40 bg-slate-500/15 text-slate-200',
  GUEST: 'border-slate-400/30 bg-slate-500/10 text-slate-300',
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    active: { cls: 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200', label: 'Aktif' },
    suspended: { cls: 'border-red-400/50 bg-red-500/15 text-red-200', label: 'Digantung' },
    pending: { cls: 'border-amber-400/50 bg-amber-500/15 text-amber-200', label: 'Menunggu' },
  }
  const c = map[status] || map.active
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold inline-block border ${c.cls}`}>{c.label}</span>
}

function fmtDate(d?: string | null) {
  if (!d) return '-'
  try {
    return new Date(d).toLocaleString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return d
  }
}

function PasswordPolicyCard() {
  const rules = [
    { label: 'Minimum 10 aksara', met: true },
    { label: 'Mengandungi huruf besar (A-Z)', met: true },
    { label: 'Mengandungi huruf kecil (a-z)', met: true },
    { label: 'Mengandungi nombor (0-9)', met: true },
    { label: 'Mengandungi simbol khas (!@#$%^&*)', met: true },
    { label: 'Tamat tempoh 90 hari', met: true },
  ]
  return (
    <GlassCard className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck className="w-4 h-4 text-cyan-300" />
        <div className="text-sm font-semibold text-white">Polisi Kata Laluan (FR-M12-05)</div>
      </div>
      <ul className="space-y-1.5">
        {rules.map((r) => (
          <li key={r.label} className="flex items-center gap-2 text-xs text-cyan-100/80">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 flex-shrink-0" />
            <span>{r.label}</span>
          </li>
        ))}
      </ul>
    </GlassCard>
  )
}

export function UsersModule() {
  const currentUser = useAppStore((s) => s.user)
  const [tab, setTab] = useState('list')
  const [users, setUsers] = useState<UserRow[]>([])
  const [roles, setRoles] = useState<RoleItem[]>([])
  const [perms, setPerms] = useState<PermItem[]>([])
  const [institutions, setInstitutions] = useState<{ id: string; name: string; code: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [instFilter, setInstFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const [expanded, setExpanded] = useState<Record<string, LoginHistoryItem[]>>({})

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<UserRow | null>(null)
  const [resetTarget, setResetTarget] = useState<UserRow | null>(null)
  const [historyLoading, setHistoryLoading] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('q', search)
      if (roleFilter !== 'all') params.set('role', roleFilter)
      if (instFilter !== 'all') params.set('institution', instFilter)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const res = await fetch(`/api/users?${params.toString()}`, { credentials: 'include' })
      const d = await res.json()
      if (d.error) { toast.error(d.error); return }
      setUsers(d.users || [])
      setRoles(d.roles || [])
      setInstitutions(d.institutions || [])
      setIsAdmin(d.isAdmin || false)
    } catch (e) {
      toast.error('Gagal memuatkan data pengguna')
    } finally {
      setLoading(false)
    }
  }, [search, roleFilter, instFilter, statusFilter])

  const fetchRoles = useCallback(async () => {
    try {
      const res = await fetch('/api/roles', { credentials: 'include' })
      const d = await res.json()
      if (d.roles) {
        setRoles(d.roles)
        setPerms(d.permissions || [])
      }
    } catch {}
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])
  useEffect(() => { if (tab === 'matrix') fetchRoles() }, [tab, fetchRoles])

  async function toggleExpand(u: UserRow) {
    if (expanded[u.id]) {
      const cp = { ...expanded }
      delete cp[u.id]
      setExpanded(cp)
      return
    }
    setHistoryLoading(u.id)
    try {
      const res = await fetch(`/api/users/${u.id}/login-history`, { credentials: 'include' })
      const d = await res.json()
      if (d.error) { toast.error(d.error); return }
      setExpanded({ ...expanded, [u.id]: d.history || [] })
    } catch {
      toast.error('Gagal memuatkan sejarah log masuk')
    } finally {
      setHistoryLoading(null)
    }
  }

  return (
    <div>
      <PageHeader
        title="Pengurusan Pengguna & RBAC"
        description="Urus pengguna, peranan, kebenaran, dan sejarah log masuk mengikut FR-M12"
        icon={Users}
        actions={
          <>
            <Button onClick={() => fetchUsers()} variant="ghost" className="btn-glass text-white hover:text-cyan-200">
              <RefreshCw className="w-4 h-4 mr-2" /> Muat Semula
            </Button>
            {isAdmin && (
              <Button onClick={() => setCreateOpen(true)} className="bg-gradient-to-r from-cyan-500 to-teal-500 text-white border-0 hover:from-cyan-400 hover:to-teal-400">
                <UserPlus className="w-4 h-4 mr-2" /> Tambah Pengguna
              </Button>
            )}
          </>
        }
      />

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="glass border border-white/15 p-1 h-auto">
          <TabsTrigger value="list" className="data-[state=active]:bg-cyan-500/30 data-[state=active]:text-white text-cyan-100/80">
            <Users className="w-4 h-4 mr-2" /> Senarai Pengguna
          </TabsTrigger>
          <TabsTrigger value="matrix" className="data-[state=active]:bg-cyan-500/30 data-[state=active]:text-white text-cyan-100/80">
            <ShieldCheck className="w-4 h-4 mr-2" /> Matriks Peranan & Kebenaran
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4 space-y-4">
          {/* Filters */}
          <GlassCard className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-100/60" />
                <Input
                  placeholder="Cari nama, e-mel, staff ID, IC..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 bg-white/8 border-white/15 text-white placeholder:text-white/40"
                  onKeyDown={(e) => { if (e.key === 'Enter') fetchUsers() }}
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="bg-white/8 border-white/15 text-white"><SelectValue placeholder="Peranan" /></SelectTrigger>
                <SelectContent className="glass-strong border-white/20 text-white">
                  <SelectItem value="all">Semua Peranan</SelectItem>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.code}>{ROLE_LABEL[r.code] || r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-white/8 border-white/15 text-white"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent className="glass-strong border-white/20 text-white">
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="suspended">Digantung</SelectItem>
                  <SelectItem value="pending">Menunggu</SelectItem>
                </SelectContent>
              </Select>
              {isAdmin && (
                <Select value={instFilter} onValueChange={setInstFilter}>
                  <SelectTrigger className="bg-white/8 border-white/15 text-white"><SelectValue placeholder="Institusi" /></SelectTrigger>
                  <SelectContent className="glass-strong border-white/20 text-white">
                    <SelectItem value="all">Semua Institusi</SelectItem>
                    {institutions.map((i) => (
                      <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="flex justify-end mt-3">
              <Button onClick={fetchUsers} className="bg-cyan-500/80 hover:bg-cyan-500 text-white">
                <Search className="w-4 h-4 mr-2" /> Cari
              </Button>
            </div>
          </GlassCard>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Users table */}
            <GlassCard className="p-4 lg:col-span-2">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-white">Senarai Pengguna ({users.length})</div>
                {!isAdmin && <div className="text-[10px] text-cyan-100/60">Papar institusi anda sahaja</div>}
              </div>
              {loading ? (
                <div className="py-10 flex items-center justify-center text-cyan-100/60">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" /> Memuatkan...
                </div>
              ) : users.length === 0 ? (
                <EmptyState icon={Users} title="Tiada pengguna dijumpai" hint="Laraskan penapis carian" />
              ) : (
                <div className="max-h-[28rem] overflow-y-auto scroll-area -mx-2">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10 hover:bg-transparent">
                        <TableHead className="text-cyan-100/70 w-8"></TableHead>
                        <TableHead className="text-cyan-100/70">Nama / E-mel</TableHead>
                        <TableHead className="text-cyan-100/70">Staff ID</TableHead>
                        <TableHead className="text-cyan-100/70">Institusi</TableHead>
                        <TableHead className="text-cyan-100/70">Peranan</TableHead>
                        <TableHead className="text-cyan-100/70">Status</TableHead>
                        <TableHead className="text-cyan-100/70">Log Masuk Akhir</TableHead>
                        <TableHead className="text-cyan-100/70 text-right">Tindakan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((u) => (
                        <>
                          <TableRow key={u.id} className="border-white/10 hover:bg-white/5">
                            <TableCell>
                              <button onClick={() => toggleExpand(u)} className="text-cyan-100/70 hover:text-cyan-200">
                                {expanded[u.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              </button>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium text-white text-sm">{u.fullName}</div>
                              <div className="text-[10px] text-cyan-100/60 flex items-center gap-1">
                                {u.email}
                                {u.mfaEnabled && <Fingerprint className="w-3 h-3 text-emerald-300" />}
                                {u.mustResetPwd && <KeyRound className="w-3 h-3 text-amber-300" />}
                              </div>
                            </TableCell>
                            <TableCell className="text-cyan-100/80 text-xs">{u.staffId || '-'}</TableCell>
                            <TableCell className="text-cyan-100/80 text-xs">
                              {u.institution ? (
                                <div>
                                  <div className="font-medium">{u.institution.code}</div>
                                  <div className="text-[10px] opacity-70 max-w-[120px] truncate">{u.institution.name}</div>
                                </div>
                              ) : '-'}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1 max-w-[200px]">
                                {u.roles.slice(0, 2).map((r) => (
                                  <span key={r.id} className={`text-[9px] px-1.5 py-0.5 rounded border ${ROLE_COLOR[r.code] || 'border-white/20 bg-white/5 text-cyan-100'}`}>
                                    {r.code === 'SUPER_ADMIN' && <Crown className="w-2.5 h-2.5 inline mr-0.5" />}
                                    {ROLE_LABEL[r.code] || r.code}
                                  </span>
                                ))}
                                {u.roles.length > 2 && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded border border-white/15 bg-white/5 text-cyan-100/60">+{u.roles.length - 2}</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell><StatusPill status={u.status} /></TableCell>
                            <TableCell className="text-cyan-100/80 text-xs">{fmtDate(u.lastLoginAt)}</TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end gap-1">
                                {isAdmin && (
                                  <>
                                    <button
                                      onClick={() => setEditTarget(u)}
                                      title="Kemaskini"
                                      className="p-1.5 rounded hover:bg-cyan-500/20 text-cyan-200"
                                    ><Edit3 className="w-3.5 h-3.5" /></button>
                                    <button
                                      onClick={() => setResetTarget(u)}
                                      title="Set Semula Kata Laluan"
                                      className="p-1.5 rounded hover:bg-amber-500/20 text-amber-200"
                                    ><KeyRound className="w-3.5 h-3.5" /></button>
                                    <DeleteUserButton u={u} onDone={fetchUsers} disabled={u.id === currentUser?.id} />
                                  </>
                                )}
                                {!isAdmin && (
                                  <History className="w-3.5 h-3.5 text-cyan-200/60" />
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                          {expanded[u.id] && (
                            <TableRow key={u.id + '-exp'} className="border-white/5 bg-black/10">
                              <TableCell colSpan={8} className="p-3">
                                <div className="glass-subtle rounded-lg p-3">
                                  <div className="flex items-center gap-2 mb-2">
                                    <History className="w-4 h-4 text-cyan-300" />
                                    <div className="text-sm font-semibold text-white">Sejarah Log Masuk Terkini</div>
                                    <div className="text-[10px] text-cyan-100/60">({expanded[u.id].length} rekod)</div>
                                  </div>
                                  {historyLoading === u.id ? (
                                    <div className="py-3 flex items-center gap-2 text-cyan-100/60 text-xs">
                                      <Loader2 className="w-3 h-3 animate-spin" /> Memuatkan...
                                    </div>
                                  ) : expanded[u.id].length === 0 ? (
                                    <div className="text-xs text-cyan-100/60 py-2">Tiada rekod log masuk.</div>
                                  ) : (
                                    <div className="max-h-48 overflow-y-auto scroll-area">
                                      <Table>
                                        <TableHeader>
                                          <TableRow className="border-white/10 hover:bg-transparent">
                                            <TableHead className="text-cyan-100/70 text-xs">Masa</TableHead>
                                            <TableHead className="text-cyan-100/70 text-xs">IP</TableHead>
                                            <TableHead className="text-cyan-100/70 text-xs">Status</TableHead>
                                            <TableHead className="text-cyan-100/70 text-xs">Sebab</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {expanded[u.id].map((h) => (
                                            <TableRow key={h.id} className="border-white/5">
                                              <TableCell className="text-xs text-cyan-100/80">{fmtDate(h.loginAt)}</TableCell>
                                              <TableCell className="text-xs text-cyan-100/80 font-mono">{h.ipAddress || '-'}</TableCell>
                                              <TableCell>
                                                {h.success ? (
                                                  <Badge className="bg-emerald-500/20 text-emerald-200 border-emerald-400/30 text-[9px]">Berjaya</Badge>
                                                ) : (
                                                  <Badge className="bg-red-500/20 text-red-200 border-red-400/30 text-[9px]">Gagal</Badge>
                                                )}
                                              </TableCell>
                                              <TableCell className="text-xs text-cyan-100/60">{h.reason || '-'}</TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </GlassCard>

            {/* Sidebar: stats & policy */}
            <div className="space-y-4">
              <GlassCard className="p-4">
                <div className="text-sm font-semibold text-white mb-3">Statistik Pantas</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="glass-subtle rounded-lg p-3">
                    <div className="text-2xl font-bold text-cyan-200">{users.length}</div>
                    <div className="text-[10px] text-cyan-100/60">Jumlah Pengguna</div>
                  </div>
                  <div className="glass-subtle rounded-lg p-3">
                    <div className="text-2xl font-bold text-emerald-200">{users.filter((u) => u.status === 'active').length}</div>
                    <div className="text-[10px] text-cyan-100/60">Aktif</div>
                  </div>
                  <div className="glass-subtle rounded-lg p-3">
                    <div className="text-2xl font-bold text-amber-200">{users.filter((u) => u.mfaEnabled).length}</div>
                    <div className="text-[10px] text-cyan-100/60">MFA Aktif</div>
                  </div>
                  <div className="glass-subtle rounded-lg p-3">
                    <div className="text-2xl font-bold text-rose-200">{users.filter((u) => u.status === 'suspended').length}</div>
                    <div className="text-[10px] text-cyan-100/60">Digantung</div>
                  </div>
                </div>
              </GlassCard>

              <PasswordPolicyCard />

              <GlassCard className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-cyan-300" />
                  <div className="text-sm font-semibold text-white">Peraturan Keselamatan</div>
                </div>
                <ul className="space-y-1 text-xs text-cyan-100/80">
                  <li>• Pentadbir boleh lihat semua institusi (FR-M12-03)</li>
                  <li>• Bukan pentadbir hanya lihat institusi sendiri</li>
                  <li>• Tidak boleh memadam akaun sendiri</li>
                  <li>• Tidak boleh buang peranan SUPER_ADMIN terakhir</li>
                  <li>• Pemberian SUPER_ADMIN hanya oleh SUPER_ADMIN</li>
                  <li>• Semua perubahan direkodkan dalam audit log</li>
                </ul>
              </GlassCard>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="matrix" className="mt-4">
          <RolePermissionMatrix roles={roles} perms={perms} reload={fetchRoles} canEdit={isAdmin} />
        </TabsContent>
      </Tabs>

      {createOpen && (
        <CreateUserDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          roles={roles}
          institutions={institutions}
          onDone={() => { setCreateOpen(false); fetchUsers() }}
        />
      )}
      {editTarget && (
        <EditUserDialog
          user={editTarget}
          roles={roles}
          institutions={institutions}
          onOpenChange={(v) => !v && setEditTarget(null)}
          onDone={() => { setEditTarget(null); fetchUsers() }}
        />
      )}
      {resetTarget && (
        <ResetPasswordDialog
          user={resetTarget}
          onOpenChange={(v) => !v && setResetTarget(null)}
          onDone={() => setResetTarget(null)}
        />
      )}
    </div>
  )
}

function DeleteUserButton({ u, onDone, disabled }: { u: UserRow; onDone: () => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  async function del() {
    setBusy(true)
    try {
      const res = await fetch(`/api/users/${u.id}`, { method: 'DELETE', credentials: 'include' })
      const d = await res.json()
      if (d.error) { toast.error(d.error); return }
      toast.success(`Pengguna ${u.fullName} telah dipadam`)
      setOpen(false)
      onDone()
    } catch {
      toast.error('Gagal memadam pengguna')
    } finally { setBusy(false) }
  }
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={disabled}
        title={disabled ? 'Tidak boleh memadam akaun sendiri' : 'Padam pengguna'}
        className="p-1.5 rounded hover:bg-red-500/20 text-red-300 disabled:opacity-30 disabled:cursor-not-allowed"
      ><Trash2 className="w-3.5 h-3.5" /></button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass-strong border-white/20 text-white">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-300" /> Sahkan Pemadaman
            </DialogTitle>
            <DialogDescription className="text-cyan-100/70">
              Adakah anda pasti ingin memadam pengguna <span className="font-semibold text-white">{u.fullName}</span> ({u.email})?
              Tindakan ini tidak boleh diundur.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" className="text-white hover:bg-white/10">Batal</Button>
            </DialogClose>
            <Button onClick={del} disabled={busy} className="bg-red-500/80 hover:bg-red-500 text-white">
              {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Padam
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function CreateUserDialog({
  open, onOpenChange, roles, institutions, onDone,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  roles: RoleItem[]
  institutions: { id: string; name: string; code: string }[]
  onDone: () => void
}) {
  const [form, setForm] = useState({
    email: '', fullName: '', icNumber: '', staffId: '', phone: '',
    institutionId: '', campusId: '', departmentId: '',
    password: '', confirm: '', status: 'active',
  })
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  function toggleRole(code: string) {
    setSelectedRoles((prev) => prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code])
  }

  async function submit() {
    if (!form.email || !form.fullName || !form.password) {
      toast.error('E-mel, nama penuh, dan kata laluan diperlukan'); return
    }
    if (form.password !== form.confirm) {
      toast.error('Kata laluan tidak sepadan'); return
    }
    if (selectedRoles.length === 0) {
      toast.error('Pilih sekurang-kurangnya satu peranan'); return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...form, roleCodes: selectedRoles }),
      })
      const d = await res.json()
      if (d.error) { toast.error(d.error); return }
      toast.success('Pengguna berjaya dicipta. Pengguna perlu set semula kata laluan pada log masuk pertama.')
      setForm({ email: '', fullName: '', icNumber: '', staffId: '', phone: '', institutionId: '', campusId: '', departmentId: '', password: '', confirm: '', status: 'active' })
      setSelectedRoles([])
      onDone()
    } catch {
      toast.error('Gagal mencipta pengguna')
    } finally { setBusy(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-white/20 text-white max-w-2xl max-h-[90vh] overflow-y-auto scroll-area">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-cyan-300" /> Tambah Pengguna Baharu
          </DialogTitle>
          <DialogDescription className="text-cyan-100/70">
            Pengguna baharu akan dikehendaki menukar kata laluan pada log masuk pertama (FR-M12-01).
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label className="text-cyan-100 text-xs">E-mel *</Label>
            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="bg-white/8 border-white/15 text-white" placeholder="user@institusi.gov.my" />
          </div>
          <div>
            <Label className="text-cyan-100 text-xs">Nama Penuh *</Label>
            <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className="bg-white/8 border-white/15 text-white" />
          </div>
          <div>
            <Label className="text-cyan-100 text-xs">No. Kad Pengenalan</Label>
            <Input value={form.icNumber} onChange={(e) => setForm({ ...form, icNumber: e.target.value })}
              className="bg-white/8 border-white/15 text-white" placeholder="000000-00-0000" />
          </div>
          <div>
            <Label className="text-cyan-100 text-xs">Staff ID</Label>
            <Input value={form.staffId} onChange={(e) => setForm({ ...form, staffId: e.target.value })}
              className="bg-white/8 border-white/15 text-white" placeholder="STF-2026-001" />
          </div>
          <div>
            <Label className="text-cyan-100 text-xs">No. Telefon</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="bg-white/8 border-white/15 text-white" placeholder="012-3456789" />
          </div>
          <div>
            <Label className="text-cyan-100 text-xs">Institusi</Label>
            <Select value={form.institutionId} onValueChange={(v) => setForm({ ...form, institutionId: v })}>
              <SelectTrigger className="bg-white/8 border-white/15 text-white"><SelectValue placeholder="Pilih institusi" /></SelectTrigger>
              <SelectContent className="glass-strong border-white/20 text-white">
                {institutions.map((i) => (
                  <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-cyan-100 text-xs">Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger className="bg-white/8 border-white/15 text-white"><SelectValue /></SelectTrigger>
              <SelectContent className="glass-strong border-white/20 text-white">
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="pending">Menunggu</SelectItem>
                <SelectItem value="suspended">Digantung</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label className="text-cyan-100 text-xs">Peranan *</Label>
            <div className="glass-subtle rounded-lg p-3 grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto scroll-area">
              {roles.map((r) => (
                <label key={r.id} className="flex items-center gap-2 text-xs text-cyan-100/90 cursor-pointer hover:text-white">
                  <Checkbox
                    checked={selectedRoles.includes(r.code)}
                    onCheckedChange={() => toggleRole(r.code)}
                    className="border-cyan-300/40 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"
                  />
                  <span>{ROLE_LABEL[r.code] || r.name}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-cyan-100 text-xs">Kata Laluan *</Label>
            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="bg-white/8 border-white/15 text-white" placeholder="Min 10 aksara, huruf besar/kecil, nombor, simbol" />
          </div>
          <div>
            <Label className="text-cyan-100 text-xs">Sahkan Kata Laluan *</Label>
            <Input type="password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              className="bg-white/8 border-white/15 text-white" />
          </div>
        </div>
        <div className="glass-subtle rounded-lg p-2 text-[10px] text-cyan-100/70 flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-300 flex-shrink-0 mt-0.5" />
          <span>Polisi: min 10 aksara, mesti ada huruf besar, huruf kecil, nombor, dan simbol khas. Kata laluan akan ditamat tempoh selepas 90 hari.</span>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="ghost" className="text-white hover:bg-white/10">Batal</Button></DialogClose>
          <Button onClick={submit} disabled={busy} className="bg-gradient-to-r from-cyan-500 to-teal-500 text-white border-0">
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />} Cipta Pengguna
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EditUserDialog({
  user, roles, institutions, onOpenChange, onDone,
}: {
  user: UserRow
  roles: RoleItem[]
  institutions: { id: string; name: string; code: string }[]
  onOpenChange: (v: boolean) => void
  onDone: () => void
}) {
  const [fullName, setFullName] = useState(user.fullName)
  const [phone, setPhone] = useState(user.phone || '')
  const [staffId, setStaffId] = useState(user.staffId || '')
  const [icNumber, setIcNumber] = useState(user.icNumber || '')
  const [institutionId, setInstitutionId] = useState(user.institutionId || '')
  const [status, setStatus] = useState(user.status)
  const [mfaEnabled, setMfaEnabled] = useState(user.mfaEnabled)
  const [mustResetPwd, setMustResetPwd] = useState(user.mustResetPwd)
  const [selectedRoles, setSelectedRoles] = useState<string[]>(user.roles.map((r) => r.code))
  const [busy, setBusy] = useState(false)

  function toggleRole(code: string) {
    setSelectedRoles((prev) => prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code])
  }

  async function save() {
    setBusy(true)
    try {
      // Update basic fields
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fullName, phone, staffId, icNumber, institutionId: institutionId || null,
          status, mfaEnabled, mustResetPwd,
        }),
      })
      const d = await res.json()
      if (d.error) { toast.error(d.error); setBusy(false); return }

      // Diff roles - add new ones, remove removed ones
      const oldCodes = new Set(user.roles.map((r) => r.code))
      const newCodes = new Set(selectedRoles)
      const toAdd = [...newCodes].filter((c) => !oldCodes.has(c))
      const toRemove = [...oldCodes].filter((c) => !newCodes.has(c))

      for (const code of toAdd) {
        await fetch(`/api/users/${user.id}/roles`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
          body: JSON.stringify({ roleCode: code }),
        })
      }
      for (const code of toRemove) {
        await fetch(`/api/users/${user.id}/roles?roleCode=${code}`, {
          method: 'DELETE', credentials: 'include',
        })
      }
      toast.success('Pengguna berjaya dikemaskini')
      onDone()
    } catch {
      toast.error('Gagal mengemaskini pengguna')
    } finally { setBusy(false) }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-white/20 text-white max-w-2xl max-h-[90vh] overflow-y-auto scroll-area">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-cyan-300" /> Kemaskini Pengguna
          </DialogTitle>
          <DialogDescription className="text-cyan-100/70">{user.email}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label className="text-cyan-100 text-xs">Nama Penuh</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="bg-white/8 border-white/15 text-white" />
          </div>
          <div>
            <Label className="text-cyan-100 text-xs">Staff ID</Label>
            <Input value={staffId} onChange={(e) => setStaffId(e.target.value)} className="bg-white/8 border-white/15 text-white" />
          </div>
          <div>
            <Label className="text-cyan-100 text-xs">No. Kad Pengenalan</Label>
            <Input value={icNumber} onChange={(e) => setIcNumber(e.target.value)} className="bg-white/8 border-white/15 text-white" />
          </div>
          <div>
            <Label className="text-cyan-100 text-xs">No. Telefon</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-white/8 border-white/15 text-white" />
          </div>
          <div>
            <Label className="text-cyan-100 text-xs">Institusi</Label>
            <Select value={institutionId} onValueChange={setInstitutionId}>
              <SelectTrigger className="bg-white/8 border-white/15 text-white"><SelectValue placeholder="Pilih institusi" /></SelectTrigger>
              <SelectContent className="glass-strong border-white/20 text-white">
                {institutions.map((i) => (
                  <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-cyan-100 text-xs">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="bg-white/8 border-white/15 text-white"><SelectValue /></SelectTrigger>
              <SelectContent className="glass-strong border-white/20 text-white">
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="pending">Menunggu</SelectItem>
                <SelectItem value="suspended">Digantung</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="glass-subtle rounded-lg p-3 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-white flex items-center gap-1.5">
                <Fingerprint className="w-3.5 h-3.5 text-emerald-300" /> MFA
              </div>
              <div className="text-[10px] text-cyan-100/60">Pengesahan dua faktor</div>
            </div>
            <Switch checked={mfaEnabled} onCheckedChange={setMfaEnabled} />
          </div>
          <div className="glass-subtle rounded-lg p-3 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-white flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-amber-300" /> Set Semula Kata Laluan
              </div>
              <div className="text-[10px] text-cyan-100/60">Paksa tukar kata laluan log masuk berikut</div>
            </div>
            <Switch checked={mustResetPwd} onCheckedChange={setMustResetPwd} />
          </div>
        </div>
        <div>
          <Label className="text-cyan-100 text-xs">Peranan</Label>
          <div className="glass-subtle rounded-lg p-3 grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto scroll-area">
            {roles.map((r) => (
              <label key={r.id} className="flex items-center gap-2 text-xs text-cyan-100/90 cursor-pointer hover:text-white">
                <Checkbox
                  checked={selectedRoles.includes(r.code)}
                  onCheckedChange={() => toggleRole(r.code)}
                  className="border-cyan-300/40 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"
                />
                <span>{ROLE_LABEL[r.code] || r.name}</span>
              </label>
            ))}
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="ghost" className="text-white hover:bg-white/10">Batal</Button></DialogClose>
          <Button onClick={save} disabled={busy} className="bg-gradient-to-r from-cyan-500 to-teal-500 text-white border-0">
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ResetPasswordDialog({
  user, onOpenChange, onDone,
}: {
  user: UserRow
  onOpenChange: (v: boolean) => void
  onDone: () => void
}) {
  const [pwd, setPwd] = useState('')
  const [confirm, setConfirm] = useState('')
  const [forceReset, setForceReset] = useState(true)
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (!pwd) { toast.error('Kata laluan diperlukan'); return }
    if (pwd !== confirm) { toast.error('Pengesahan tidak sepadan'); return }
    setBusy(true)
    try {
      const res = await fetch(`/api/users/${user.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ newPassword: pwd, forceReset }),
      })
      const d = await res.json()
      if (d.error) { toast.error(d.error); return }
      toast.success('Kata laluan telah diset semula')
      onDone()
    } catch {
      toast.error('Gagal set semula kata laluan')
    } finally { setBusy(false) }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-white/20 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-amber-300" /> Set Semula Kata Laluan
          </DialogTitle>
          <DialogDescription className="text-cyan-100/70">
            Untuk pengguna: <span className="font-semibold text-white">{user.fullName}</span> ({user.email})
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-cyan-100 text-xs">Kata Laluan Baharu</Label>
            <Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)}
              className="bg-white/8 border-white/15 text-white" placeholder="Min 10 aksara, huruf besar/kecil, nombor, simbol" />
          </div>
          <div>
            <Label className="text-cyan-100 text-xs">Sahkan Kata Laluan</Label>
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
              className="bg-white/8 border-white/15 text-white" />
          </div>
          <div className="glass-subtle rounded-lg p-3 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-white">Paksa Tukar pada Log Masuk Berikut</div>
              <div className="text-[10px] text-cyan-100/60">Pengguna perlu tukar kata laluan selepas log masuk</div>
            </div>
            <Switch checked={forceReset} onCheckedChange={setForceReset} />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="ghost" className="text-white hover:bg-white/10">Batal</Button></DialogClose>
          <Button onClick={submit} disabled={busy} className="bg-amber-500/80 hover:bg-amber-500 text-white">
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <KeyRound className="w-4 h-4 mr-2" />} Set Semula
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RolePermissionMatrix({
  roles, perms, reload, canEdit,
}: {
  roles: RoleItem[]
  perms: PermItem[]
  reload: () => void
  canEdit: boolean
}) {
  // Build state: map of `${roleId}:${permId}` => boolean
  const initial: Record<string, boolean> = {}
  for (const r of roles) {
    for (const p of perms) {
      const k = `${r.id}:${p.id}`
      initial[k] = r.permissions.some((rp) => rp.id === p.id)
    }
  }
  const [state, setState] = useState<Record<string, boolean>>(initial)
  const [original, setOriginal] = useState<Record<string, boolean>>(initial)
  const [busy, setBusy] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  // Reset when roles/perms change
  useEffect(() => {
    setState(initial)
    setOriginal(initial)
  }, [roles.length, perms.length])

  const changedKeys = Object.keys(state).filter((k) => state[k] !== original[k])
  const hasChanges = changedKeys.length > 0

  function toggle(roleId: string, permId: string) {
    if (!canEdit) return
    setState((prev) => ({ ...prev, [`${roleId}:${permId}`]: !prev[`${roleId}:${permId}`] }))
  }

  async function save() {
    setBusy(true)
    let added = 0, removed = 0
    try {
      for (const k of changedKeys) {
        const [roleId, permId] = k.split(':')
        const role = roles.find((r) => r.id === roleId)
        const perm = perms.find((p) => p.id === permId)
        if (!role || !perm) continue
        if (state[k]) {
          const res = await fetch(`/api/roles/${roleId}/permissions`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
            body: JSON.stringify({ permissionId: permId }),
          })
          if (res.ok) added++
        } else {
          const res = await fetch(`/api/roles/${roleId}/permissions?permissionId=${permId}`, {
            method: 'DELETE', credentials: 'include',
          })
          if (res.ok) removed++
        }
      }
      toast.success(`Perubahan disimpan: ${added} kebenaran ditambah, ${removed} dibuang`)
      setConfirmOpen(false)
      reload()
    } catch {
      toast.error('Gagal menyimpan perubahan')
    } finally { setBusy(false) }
  }

  // Group perms by module
  const moduleMap: Record<string, PermItem[]> = {}
  for (const p of perms) {
    if (!moduleMap[p.module]) moduleMap[p.module] = []
    moduleMap[p.module].push(p)
  }
  const modules = Object.keys(moduleMap).sort()

  return (
    <GlassCard className="p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
        <div>
          <div className="text-sm font-semibold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-300" /> Matriks Peranan × Kebenaran
          </div>
          <div className="text-[10px] text-cyan-100/60">
            {roles.length} peranan × {perms.length} kebenaran ({modules.length} modul)
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge className="bg-amber-500/20 text-amber-200 border-amber-400/40">
              {changedKeys.length} perubahan belum disimpan
            </Badge>
          )}
          {canEdit ? (
            <>
              <Button
                variant="ghost"
                className="btn-glass text-white hover:text-cyan-200"
                disabled={!hasChanges}
                onClick={() => { setState(original); toast.info('Perubahan dibatalkan') }}
              >
                Batal
              </Button>
              <Button
                onClick={() => setConfirmOpen(true)}
                disabled={!hasChanges || busy}
                className="bg-gradient-to-r from-cyan-500 to-teal-500 text-white border-0"
              >
                <Save className="w-4 h-4 mr-2" /> Simpan Perubahan
              </Button>
            </>
          ) : (
            <div className="text-[10px] text-cyan-100/60">Mod paparan sahaja</div>
          )}
        </div>
      </div>

      <div className="max-h-[36rem] overflow-auto scroll-area glass-subtle rounded-lg p-2">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="text-cyan-100/80 sticky left-0 bg-[#0d2750] z-10 min-w-[160px]">Peranan \ Kebenaran</TableHead>
              {modules.map((m) => (
                moduleMap[m].map((p, idx) => (
                  <TableHead key={p.id} className="text-cyan-100/70 text-[10px] text-center min-w-[90px]">
                    {idx === 0 && <div className="text-cyan-300 font-semibold mb-1 uppercase tracking-wide">{m}</div>}
                    <div title={p.name}>{p.code.split(':')[1]}</div>
                  </TableHead>
                ))
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.map((r) => (
              <TableRow key={r.id} className="border-white/10 hover:bg-white/5">
                <TableCell className="sticky left-0 bg-[#0d2750] z-10">
                  <div className="flex items-center gap-2">
                    {r.code === 'SUPER_ADMIN' && <Crown className="w-3 h-3 text-rose-300" />}
                    <div>
                      <div className="text-sm font-medium text-white">{ROLE_LABEL[r.code] || r.name}</div>
                      <div className="text-[10px] text-cyan-100/60">{r.userCount} pengguna</div>
                    </div>
                  </div>
                </TableCell>
                {modules.map((m) => (
                  moduleMap[m].map((p) => {
                    const k = `${r.id}:${p.id}`
                    const isChanged = state[k] !== original[k]
                    return (
                      <TableCell key={p.id} className="text-center">
                        <Checkbox
                          checked={!!state[k]}
                          onCheckedChange={() => toggle(r.id, p.id)}
                          disabled={!canEdit}
                          className={`mx-auto ${isChanged ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-[#0d2750]' : ''} border-cyan-300/40 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500`}
                        />
                      </TableCell>
                    )
                  })
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {!canEdit && (
        <div className="mt-3 text-[10px] text-cyan-100/60 flex items-center gap-2">
          <Lock className="w-3 h-3" /> Hanya pentadbir boleh mengubah matriks kebenaran.
        </div>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="glass-strong border-white/20 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-300" /> Sahkan Perubahan Matriks
            </DialogTitle>
            <DialogDescription className="text-cyan-100/70">
              Anda akan mengubah {changedKeys.length} kebenaran. Perubahan akan memberi kesan kepada pengguna yang mempunyai peranan berkenaan.
            </DialogDescription>
          </DialogHeader>
          <div className="glass-subtle rounded-lg p-3 max-h-48 overflow-y-auto scroll-area text-xs space-y-1">
            {changedKeys.slice(0, 30).map((k) => {
              const [rid, pid] = k.split(':')
              const r = roles.find((x) => x.id === rid)
              const p = perms.find((x) => x.id === pid)
              if (!r || !p) return null
              return (
                <div key={k} className="flex items-center justify-between">
                  <span className="text-cyan-100/80">{ROLE_LABEL[r.code] || r.code} → {p.code}</span>
                  <Badge className={state[k] ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30 text-[9px]' : 'bg-red-500/20 text-red-200 border-red-400/30 text-[9px]'}>
                    {state[k] ? '+ Tambah' : '- Buang'}
                  </Badge>
                </div>
              )
            })}
            {changedKeys.length > 30 && <div className="text-cyan-100/60">...dan {changedKeys.length - 30} lagi</div>}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="ghost" className="text-white hover:bg-white/10">Batal</Button></DialogClose>
            <Button onClick={save} disabled={busy} className="bg-gradient-to-r from-cyan-500 to-teal-500 text-white border-0">
              {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Sahkan & Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </GlassCard>
  )
}
