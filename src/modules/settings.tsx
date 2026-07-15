'use client'
import { useEffect, useState, useCallback } from 'react'
import { GlassCard, PageHeader, StatusBadge, EmptyState } from '@/components/glass'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table'
import {
  Settings as SettingsIcon, User, ShieldCheck, Bot, Database, Info,
  Save, Loader2, KeyRound, Fingerprint, RefreshCw, CheckCircle2, AlertTriangle,
  Lock, History, Building2, Clock, Mail, Phone, IdCard, BadgeCheck,
  Server, HardDriveDownload, Activity, Calendar, Bell,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'

interface SystemSetting {
  id: string
  key: string
  value: string
  category?: string | null
  updatedAt?: string
}

interface ProfileData {
  id: string
  email: string
  fullName: string
  icNumber?: string | null
  staffId?: string | null
  phone?: string | null
  avatarUrl?: string | null
  status: string
  mfaEnabled: boolean
  institutionName?: string | null
  institutionCode?: string | null
  roles: { id: string; code: string; name: string }[]
  lastLoginAt?: string | null
  lastLoginIp?: string | null
  createdAt?: string
}

const CATEGORY_LABEL: Record<string, string> = {
  general: 'Umum',
  security: 'Keselamatan',
  workflow: 'Aliran Kerja',
  ai: 'AI',
  accreditation: 'Pentauliahan',
}

const CATEGORY_COLOR: Record<string, string> = {
  general: 'border-cyan-400/40 bg-cyan-500/15 text-cyan-200',
  security: 'border-rose-400/40 bg-rose-500/15 text-rose-200',
  workflow: 'border-amber-400/40 bg-amber-500/15 text-amber-200',
  ai: 'border-purple-400/40 bg-purple-500/15 text-purple-200',
  accreditation: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200',
}

function fmtDate(d?: string | null) {
  if (!d) return '-'
  try {
    return new Date(d).toLocaleString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch { return d }
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

export function SettingsModule() {
  const [tab, setTab] = useState('profile')
  const [settings, setSettings] = useState<SystemSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  const fetchSettings = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/settings', { credentials: 'include' })
      const d = await res.json()
      if (d.error) { toast.error(d.error); return }
      setSettings(d.settings || [])
      setIsAdmin(d.isAdmin || false)
    } catch {
      toast.error('Gagal memuatkan tetapan')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  return (
    <div>
      <PageHeader
        title="Tetapan Sistem & Profil"
        description="Urus profil, keselamatan, AI, sandaran, dan konfigurasi sistem"
        icon={SettingsIcon}
        actions={
          <Button onClick={fetchSettings} variant="ghost" className="btn-glass text-white hover:text-cyan-200">
            <RefreshCw className="w-4 h-4 mr-2" /> Muat Semula
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="glass border border-white/15 p-1 h-auto flex-wrap">
          <TabsTrigger value="profile" className="data-[state=active]:bg-cyan-500/30 data-[state=active]:text-white text-cyan-100/80">
            <User className="w-4 h-4 mr-2" /> Profil Saya
          </TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-cyan-500/30 data-[state=active]:text-white text-cyan-100/80">
            <ShieldCheck className="w-4 h-4 mr-2" /> Keselamatan
          </TabsTrigger>
          <TabsTrigger value="system" className="data-[state=active]:bg-cyan-500/30 data-[state=active]:text-white text-cyan-100/80">
            <SettingsIcon className="w-4 h-4 mr-2" /> Sistem
          </TabsTrigger>
          <TabsTrigger value="ai" className="data-[state=active]:bg-cyan-500/30 data-[state=active]:text-white text-cyan-100/80">
            <Bot className="w-4 h-4 mr-2" /> AI
          </TabsTrigger>
          <TabsTrigger value="backup" className="data-[state=active]:bg-cyan-500/30 data-[state=active]:text-white text-cyan-100/80">
            <Database className="w-4 h-4 mr-2" /> Sandaran & DR
          </TabsTrigger>
          <TabsTrigger value="about" className="data-[state=active]:bg-cyan-500/30 data-[state=active]:text-white text-cyan-100/80">
            <Info className="w-4 h-4 mr-2" /> Perihal
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <ProfileTab />
        </TabsContent>
        <TabsContent value="security" className="mt-4">
          <SecurityTab settings={settings} isAdmin={isAdmin} reload={fetchSettings} />
        </TabsContent>
        <TabsContent value="system" className="mt-4">
          <SystemTab settings={settings} isAdmin={isAdmin} loading={loading} reload={fetchSettings} />
        </TabsContent>
        <TabsContent value="ai" className="mt-4">
          <AiTab settings={settings} isAdmin={isAdmin} reload={fetchSettings} />
        </TabsContent>
        <TabsContent value="backup" className="mt-4">
          <BackupTab />
        </TabsContent>
        <TabsContent value="about" className="mt-4">
          <AboutTab settings={settings} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ============== PROFILE TAB ==============
function ProfileTab() {
  const currentUser = useAppStore((s) => s.user)
  const setUser = useAppStore((s) => s.setUser)
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [phone, setPhone] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [saving, setSaving] = useState(false)

  // Change password
  const [oldPwd, setOldPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [changingPwd, setChangingPwd] = useState(false)

  // MFA
  const [mfaToggling, setMfaToggling] = useState(false)

  // Login history
  const [history, setHistory] = useState<any[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/profile', { credentials: 'include' })
      const d = await res.json()
      if (d.error) { toast.error(d.error); return }
      setProfile(d.profile)
      setPhone(d.profile.phone || '')
      setAvatarUrl(d.profile.avatarUrl || '')
    } catch {
      toast.error('Gagal memuatkan profil')
    } finally { setLoading(false) }
  }, [])

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const res = await fetch(`/api/users/${currentUser?.id}/login-history?limit=20`, { credentials: 'include' })
      const d = await res.json()
      if (d.error) { toast.error(d.error); return }
      setHistory(d.history || [])
    } catch {} finally { setHistoryLoading(false) }
  }, [currentUser?.id])

  useEffect(() => { fetchProfile(); fetchHistory() }, [fetchProfile, fetchHistory])

  async function saveProfile() {
    setSaving(true)
    try {
      const res = await fetch('/api/settings/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ phone, avatarUrl }),
      })
      const d = await res.json()
      if (d.error) { toast.error(d.error); return }
      toast.success('Profil dikemaskini')
      fetchProfile()
    } catch { toast.error('Gagal mengemaskini profil') }
    finally { setSaving(false) }
  }

  async function changePassword() {
    if (!oldPwd || !newPwd || !confirmPwd) { toast.error('Semua medan diperlukan'); return }
    if (newPwd !== confirmPwd) { toast.error('Pengesahan kata laluan tidak sepadan'); return }
    if (newPwd === oldPwd) { toast.error('Kata laluan baharu tidak boleh sama dengan lama'); return }
    setChangingPwd(true)
    try {
      const res = await fetch('/api/settings/change-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ oldPassword: oldPwd, newPassword: newPwd }),
      })
      const d = await res.json()
      if (d.error) { toast.error(d.error); return }
      toast.success('Kata laluan berjaya ditukar')
      setOldPwd(''); setNewPwd(''); setConfirmPwd('')
    } catch { toast.error('Gagal menukar kata laluan') }
    finally { setChangingPwd(false) }
  }

  async function toggleMFA() {
    if (!profile) return
    setMfaToggling(true)
    const target = !profile.mfaEnabled
    try {
      const res = await fetch('/api/settings/toggle-mfa', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ enable: target }),
      })
      const d = await res.json()
      if (d.error) { toast.error(d.error); return }
      toast.success(target ? 'MFA diaktifkan (disimulasi)' : 'MFA dinyahaktifkan')
      fetchProfile()
    } catch { toast.error('Gagal menukar MFA') }
    finally { setMfaToggling(false) }
  }

  if (loading || !profile) {
    return (
      <GlassCard className="p-10 flex items-center justify-center text-cyan-100/60">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Memuatkan profil...
      </GlassCard>
    )
  }

  const initials = (profile.fullName || 'U').split(' ').slice(0, 2).map((s) => s[0]).join('').toUpperCase()

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <GlassCard className="p-6 lg:col-span-1">
        <div className="flex flex-col items-center text-center">
          <Avatar className="w-24 h-24 border-4 border-cyan-400/40 mb-3">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt={profile.fullName} className="w-full h-full object-cover rounded-full" />
            ) : (
              <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-teal-500 text-white text-2xl font-bold">{initials}</AvatarFallback>
            )}
          </Avatar>
          <div className="text-lg font-bold text-white">{profile.fullName}</div>
          <div className="text-xs text-cyan-100/60 mb-2">{profile.email}</div>
          <div className="flex gap-1 flex-wrap justify-center mb-3">
            {profile.roles.map((r) => (
              <span key={r.id} className="text-[10px] px-2 py-0.5 rounded-full border border-cyan-400/30 bg-cyan-500/10 text-cyan-200">
                {ROLE_LABEL[r.code] || r.name}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2 mb-1">
            <StatusBadge status={profile.status} />
            {profile.mfaEnabled && (
              <span className="text-[10px] px-2 py-0.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 text-emerald-200 flex items-center gap-1">
                <Fingerprint className="w-3 h-3" /> MFA Aktif
              </span>
            )}
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-white/10 space-y-2 text-xs">
          <div className="flex items-center justify-between text-cyan-100/80">
            <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> Institusi</span>
            <span className="font-medium text-white text-right truncate max-w-[160px]">{profile.institutionName || '-'}</span>
          </div>
          <div className="flex items-center justify-between text-cyan-100/80">
            <span className="flex items-center gap-1.5"><IdCard className="w-3.5 h-3.5" /> Staff ID</span>
            <span className="font-medium text-white">{profile.staffId || '-'}</span>
          </div>
          <div className="flex items-center justify-between text-cyan-100/80">
            <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Log Masuk Akhir</span>
            <span className="font-medium text-white text-right text-[10px]">{fmtDate(profile.lastLoginAt)}</span>
          </div>
          <div className="flex items-center justify-between text-cyan-100/80">
            <span className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" /> IP Akhir</span>
            <span className="font-medium text-white text-[10px] font-mono">{profile.lastLoginIp || '-'}</span>
          </div>
          <div className="flex items-center justify-between text-cyan-100/80">
            <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Dicipta</span>
            <span className="font-medium text-white text-right text-[10px]">{fmtDate(profile.createdAt)}</span>
          </div>
        </div>
      </GlassCard>

      <div className="lg:col-span-2 space-y-4">
        {/* Editable profile fields */}
        <GlassCard className="p-5">
          <div className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <User className="w-4 h-4 text-cyan-300" /> Maklumat Boleh Edit
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-cyan-100 text-xs">No. Telefon</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-white/8 border-white/15 text-white" placeholder="012-3456789" />
            </div>
            <div>
              <Label className="text-cyan-100 text-xs">URL Avatar</Label>
              <Input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} className="bg-white/8 border-white/15 text-white" placeholder="https://..." />
            </div>
          </div>
          <div className="flex justify-end mt-3">
            <Button onClick={saveProfile} disabled={saving} className="bg-gradient-to-r from-cyan-500 to-teal-500 text-white border-0">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Simpan
            </Button>
          </div>
        </GlassCard>

        {/* Change password */}
        <GlassCard className="p-5">
          <div className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-amber-300" /> Tukar Kata Laluan
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-cyan-100 text-xs">Kata Laluan Lama</Label>
              <Input type="password" value={oldPwd} onChange={(e) => setOldPwd(e.target.value)} className="bg-white/8 border-white/15 text-white" />
            </div>
            <div>
              <Label className="text-cyan-100 text-xs">Kata Laluan Baharu</Label>
              <Input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} className="bg-white/8 border-white/15 text-white" />
            </div>
            <div>
              <Label className="text-cyan-100 text-xs">Sahkan</Label>
              <Input type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} className="bg-white/8 border-white/15 text-white" />
            </div>
          </div>
          <div className="glass-subtle rounded-lg p-2 mt-3 text-[10px] text-cyan-100/70 flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-300 flex-shrink-0 mt-0.5" />
            <span>Min 10 aksara; mesti ada huruf besar, huruf kecil, nombor, dan simbol khas. Kata laluan tamat tempoh selepas 90 hari.</span>
          </div>
          <div className="flex justify-end mt-3">
            <Button onClick={changePassword} disabled={changingPwd} className="bg-amber-500/80 hover:bg-amber-500 text-white">
              {changingPwd ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <KeyRound className="w-4 h-4 mr-2" />} Tukar Kata Laluan
            </Button>
          </div>
        </GlassCard>

        {/* MFA + Notifications */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <GlassCard className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-semibold text-white flex items-center gap-2">
                  <Fingerprint className="w-4 h-4 text-emerald-300" /> Pengesahan Dua Faktor (MFA)
                </div>
                <div className="text-[11px] text-cyan-100/60 mt-1">
                  Tambah lapisan keselamatan dengan kod 6 digit daripada aplikasi pengesah (mis. Google Authenticator).
                </div>
              </div>
              <Switch checked={profile.mfaEnabled} onCheckedChange={toggleMFA} disabled={mfaToggling} />
            </div>
            {profile.mfaEnabled && (
              <div className="mt-3 text-[10px] text-emerald-300/80 flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3" /> MFA aktif untuk akaun anda
              </div>
            )}
          </GlassCard>

          <GlassCard className="p-5">
            <div className="text-sm font-semibold text-white flex items-center gap-2 mb-2">
              <Bell className="w-4 h-4 text-cyan-300" /> Keutamaan Notifikasi
            </div>
            <div className="text-[11px] text-cyan-100/60 mb-3">
              Urus keutamaan saluran & kategori notifikasi anda.
            </div>
            <a href="#" onClick={(e) => { e.preventDefault(); useAppStore.getState().setActiveModule('notifications') }}>
              <Button variant="ghost" className="btn-glass text-white hover:text-cyan-200 w-full">
                Buka Modul Notifikasi
              </Button>
            </a>
          </GlassCard>
        </div>

        {/* Login history */}
        <GlassCard className="p-5">
          <div className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <History className="w-4 h-4 text-cyan-300" /> Sejarah Log Masuk Saya
          </div>
          {historyLoading ? (
            <div className="py-4 flex items-center justify-center text-cyan-100/60 text-xs">
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Memuatkan...
            </div>
          ) : history.length === 0 ? (
            <EmptyState icon={History} title="Tiada rekod log masuk" />
          ) : (
            <div className="max-h-60 overflow-y-auto scroll-area -mx-2">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-cyan-100/70 text-xs">Masa</TableHead>
                    <TableHead className="text-cyan-100/70 text-xs">IP</TableHead>
                    <TableHead className="text-cyan-100/70 text-xs">User Agent</TableHead>
                    <TableHead className="text-cyan-100/70 text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((h) => (
                    <TableRow key={h.id} className="border-white/5">
                      <TableCell className="text-xs text-cyan-100/80">{fmtDate(h.loginAt)}</TableCell>
                      <TableCell className="text-xs text-cyan-100/80 font-mono">{h.ipAddress || '-'}</TableCell>
                      <TableCell className="text-xs text-cyan-100/60 max-w-[200px] truncate">{h.userAgent || '-'}</TableCell>
                      <TableCell>
                        {h.success ? (
                          <Badge className="bg-emerald-500/20 text-emerald-200 border-emerald-400/30 text-[9px]">Berjaya</Badge>
                        ) : (
                          <Badge className="bg-red-500/20 text-red-200 border-red-400/30 text-[9px]">Gagal</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  )
}

// ============== SECURITY TAB ==============
function SecurityTab({ settings, isAdmin, reload }: { settings: SystemSetting[]; isAdmin: boolean; reload: () => void }) {
  const getVal = (k: string) => settings.find((s) => s.key === k)?.value || ''
  const [editing, setEditing] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  const items = [
    { key: 'session.timeout', label: 'Tamat Sesi (saat)', icon: Clock, desc: 'Tempoh sesi pengguna aktif sebelum log keluar automatik' },
    { key: 'password.min_length', label: 'Panjang Minimum Kata Laluan', icon: KeyRound, desc: 'Bilangan aksara minimum untuk kata laluan' },
    { key: 'password.expiry_days', label: 'Tamat Tempoh Kata Laluan (hari)', icon: Calendar, desc: 'Tempoh kata laluan sah sebelum perlu ditukar' },
    { key: 'login.max_attempts', label: 'Cubaan Log Masuk Maksimum', icon: Lock, desc: 'Bilangan cubaan gagal sebelum akaun dikunci' },
  ]

  async function save(key: string) {
    const val = editing[key]
    if (val === undefined) return
    setBusy(true)
    try {
      const res = await fetch(`/api/settings/${encodeURIComponent(key)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ value: val }),
      })
      const d = await res.json()
      if (d.error) { toast.error(d.error); return }
      toast.success(`Tetapan "${key}" dikemaskini`)
      const cp = { ...editing }; delete cp[key]; setEditing(cp)
      reload()
    } catch { toast.error('Gagal menyimpan') }
    finally { setBusy(false) }
  }

  return (
    <div className="space-y-4">
      <GlassCard className="p-5">
        <div className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-rose-300" /> Polisi Keselamatan
        </div>
        <div className="text-[11px] text-cyan-100/60 mb-3">Konfigurasi polisi kata laluan & sesi mengikut FR-M12-05</div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((it) => {
            const Icon = it.icon
            const currentVal = editing[it.key] !== undefined ? editing[it.key] : getVal(it.key)
            return (
              <div key={it.key} className="glass-subtle rounded-lg p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-cyan-300" />
                    <div>
                      <div className="text-xs font-semibold text-white">{it.label}</div>
                      <div className="text-[10px] text-cyan-100/60">{it.desc}</div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    value={currentVal}
                    onChange={(e) => setEditing({ ...editing, [it.key]: e.target.value })}
                    disabled={!isAdmin}
                    className="bg-white/8 border-white/15 text-white h-9"
                  />
                  <Button
                    size="sm"
                    onClick={() => save(it.key)}
                    disabled={!isAdmin || busy || editing[it.key] === undefined}
                    className="bg-cyan-500/80 hover:bg-cyan-500 text-white h-9"
                  >
                    <Save className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
        {!isAdmin && (
          <div className="mt-3 text-[10px] text-cyan-100/60 flex items-center gap-2">
            <Lock className="w-3 h-3" /> Hanya pentadbir boleh mengubah tetapan keselamatan.
          </div>
        )}
      </GlassCard>

      <GlassCard className="p-5">
        <div className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-300" /> Polisi Kata Laluan Aktif
        </div>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          {[
            `Minimum ${getVal('password.min_length') || '10'} aksara`,
            'Mengandungi huruf besar (A-Z)',
            'Mengandungi huruf kecil (a-z)',
            'Mengandungi nombor (0-9)',
            'Mengandungi simbol khas (!@#$%^&*)',
            `Tamat tempoh selepas ${getVal('password.expiry_days') || '90'} hari`,
            `Kunci akaun selepas ${getVal('login.max_attempts') || '5'} cubaan gagal`,
            `Sesi auto-tamat dalam ${Math.round(parseInt(getVal('session.timeout') || '3600', 10) / 60)} minit`,
          ].map((rule) => (
            <li key={rule} className="flex items-center gap-2 text-cyan-100/80">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 flex-shrink-0" />
              <span>{rule}</span>
            </li>
          ))}
        </ul>
      </GlassCard>
    </div>
  )
}

// ============== SYSTEM TAB ==============
function SystemTab({ settings, isAdmin, loading, reload }: { settings: SystemSetting[]; isAdmin: boolean; loading: boolean; reload: () => void }) {
  const [editing, setEditing] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const [newCat, setNewCat] = useState('general')
  const [showAdd, setShowAdd] = useState(false)

  const grouped: Record<string, SystemSetting[]> = {}
  for (const s of settings) {
    const c = s.category || 'general'
    if (!grouped[c]) grouped[c] = []
    grouped[c].push(s)
  }
  const cats = Object.keys(grouped).sort()

  async function save(key: string) {
    const val = editing[key]
    if (val === undefined) return
    setBusy(true)
    try {
      const res = await fetch(`/api/settings/${encodeURIComponent(key)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ value: val }),
      })
      const d = await res.json()
      if (d.error) { toast.error(d.error); return }
      toast.success(`Tetapan "${key}" dikemaskini`)
      const cp = { ...editing }; delete cp[key]; setEditing(cp)
      reload()
    } catch { toast.error('Gagal menyimpan') }
    finally { setBusy(false) }
  }

  async function addNew() {
    if (!newKey) { toast.error('Kunci diperlukan'); return }
    setBusy(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ key: newKey, value: newValue, category: newCat }),
      })
      const d = await res.json()
      if (d.error) { toast.error(d.error); return }
      toast.success('Tetapan baharu dicipta')
      setNewKey(''); setNewValue(''); setShowAdd(false)
      reload()
    } catch { toast.error('Gagal mencipta tetapan') }
    finally { setBusy(false) }
  }

  if (loading) {
    return (
      <GlassCard className="p-10 flex items-center justify-center text-cyan-100/60">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Memuatkan tetapan sistem...
      </GlassCard>
    )
  }

  return (
    <div className="space-y-4">
      <GlassCard className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-white">Tetapan Sistem ({settings.length})</div>
            <div className="text-[11px] text-cyan-100/60">Konfigurasi kunci-nilai dikumpulkan mengikut kategori</div>
          </div>
          {isAdmin && (
            <Button onClick={() => setShowAdd(!showAdd)} className="bg-gradient-to-r from-cyan-500 to-teal-500 text-white border-0">
              + Tetapan Baharu
            </Button>
          )}
        </div>
        {showAdd && isAdmin && (
          <div className="mt-3 glass-subtle rounded-lg p-3 grid grid-cols-1 md:grid-cols-4 gap-2">
            <Input placeholder="kunci.contoh" value={newKey} onChange={(e) => setNewKey(e.target.value)} className="bg-white/8 border-white/15 text-white h-9" />
            <Input placeholder="nilai" value={newValue} onChange={(e) => setNewValue(e.target.value)} className="bg-white/8 border-white/15 text-white h-9" />
            <Select value={newCat} onValueChange={setNewCat}>
              <SelectTrigger className="bg-white/8 border-white/15 text-white h-9"><SelectValue /></SelectTrigger>
              <SelectContent className="glass-strong border-white/20 text-white">
                {Object.keys(CATEGORY_LABEL).map((c) => (
                  <SelectItem key={c} value={c}>{CATEGORY_LABEL[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={addNew} disabled={busy} className="bg-cyan-500/80 hover:bg-cyan-500 text-white h-9">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Tambah
            </Button>
          </div>
        )}
      </GlassCard>

      {cats.map((cat) => (
        <GlassCard key={cat} className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${CATEGORY_COLOR[cat] || 'border-white/20 bg-white/5 text-cyan-100'}`}>
              {CATEGORY_LABEL[cat] || cat}
            </span>
            <div className="text-xs text-cyan-100/60">{grouped[cat].length} tetapan</div>
          </div>
          <div className="space-y-2">
            {grouped[cat].map((s) => {
              const val = editing[s.key] !== undefined ? editing[s.key] : s.value
              return (
                <div key={s.id} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-12 md:col-span-4">
                    <div className="text-xs font-mono text-cyan-200">{s.key}</div>
                    <div className="text-[10px] text-cyan-100/50">Dikemaskini: {fmtDate(s.updatedAt)}</div>
                  </div>
                  <div className="col-span-9 md:col-span-7">
                    <Input
                      value={val}
                      onChange={(e) => setEditing({ ...editing, [s.key]: e.target.value })}
                      disabled={!isAdmin}
                      className="bg-white/8 border-white/15 text-white h-9"
                    />
                  </div>
                  <div className="col-span-3 md:col-span-1 flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => save(s.key)}
                      disabled={!isAdmin || busy || editing[s.key] === undefined}
                      className="bg-cyan-500/80 hover:bg-cyan-500 text-white h-9 w-full"
                    >
                      <Save className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </GlassCard>
      ))}

      {!isAdmin && (
        <div className="text-[10px] text-cyan-100/60 flex items-center gap-2 px-2">
          <Lock className="w-3 h-3" /> Mod paparan sahaja. Hanya pentadbir boleh mengubah tetapan.
        </div>
      )}
    </div>
  )
}

// ============== AI TAB ==============
function AiTab({ settings, isAdmin, reload }: { settings: SystemSetting[]; isAdmin: boolean; reload: () => void }) {
  const getVal = (k: string) => settings.find((s) => s.key === k)?.value || ''
  const [model, setModel] = useState(getVal('ai.model'))
  const [disclaimer, setDisclaimer] = useState(getVal('ai.disclaimer'))
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setModel(getVal('ai.model'))
    setDisclaimer(getVal('ai.disclaimer'))
  }, [settings])

  async function save(key: string, val: string) {
    setBusy(true)
    try {
      const res = await fetch(`/api/settings/${encodeURIComponent(key)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ value: val }),
      })
      const d = await res.json()
      if (d.error) { toast.error(d.error); return }
      toast.success(`Tetapan AI "${key}" dikemaskini`)
      reload()
    } catch { toast.error('Gagal menyimpan') }
    finally { setBusy(false) }
  }

  return (
    <div className="space-y-4">
      <GlassCard className="p-5">
        <div className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
          <Bot className="w-4 h-4 text-purple-300" /> Konfigurasi AI
        </div>
        <div className="text-[11px] text-cyan-100/60 mb-4">Tetapan model AI dan teks penafian untuk semua penjanaan AI</div>

        <div className="space-y-3">
          <div>
            <Label className="text-cyan-100 text-xs">Nama Model AI</Label>
            <div className="flex gap-2">
              <Input value={model} onChange={(e) => setModel(e.target.value)} disabled={!isAdmin} className="bg-white/8 border-white/15 text-white" placeholder="glm-5.2" />
              <Button onClick={() => save('ai.model', model)} disabled={!isAdmin || busy} className="bg-cyan-500/80 hover:bg-cyan-500 text-white">
                <Save className="w-4 h-4 mr-2" /> Simpan
              </Button>
            </div>
          </div>
          <div>
            <Label className="text-cyan-100 text-xs">Teks Penafian AI</Label>
            <div className="flex gap-2">
              <Input value={disclaimer} onChange={(e) => setDisclaimer(e.target.value)} disabled={!isAdmin} className="bg-white/8 border-white/15 text-white" />
              <Button onClick={() => save('ai.disclaimer', disclaimer)} disabled={!isAdmin || busy} className="bg-cyan-500/80 hover:bg-cyan-500 text-white">
                <Save className="w-4 h-4 mr-2" /> Simpan
              </Button>
            </div>
            <div className="text-[10px] text-cyan-100/60 mt-1">Penafian ini akan dipaparkan pada setiap output AI di seluruh sistem</div>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-5">
        <div className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-300" /> Statistik Penggunaan AI
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="glass-subtle rounded-lg p-3">
            <div className="text-lg font-bold text-purple-200">{getVal('ai.model') || 'glm-5.2'}</div>
            <div className="text-[10px] text-cyan-100/60">Model Aktif</div>
          </div>
          <div className="glass-subtle rounded-lg p-3">
            <div className="text-lg font-bold text-cyan-200">6</div>
            <div className="text-[10px] text-cyan-100/60">Ciri AI</div>
          </div>
          <div className="glass-subtle rounded-lg p-3">
            <div className="text-lg font-bold text-emerald-200">Chat</div>
            <div className="text-[10px] text-cyan-100/60">Mod Utama</div>
          </div>
          <div className="glass-subtle rounded-lg p-3">
            <div className="text-lg font-bold text-amber-200">FR-M9-05</div>
            <div className="text-[10px] text-cyan-100/60">Pematuhan</div>
          </div>
        </div>
        <div className="glass-subtle rounded-lg p-3 mt-3 text-[11px] text-cyan-100/80 flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-300 flex-shrink-0 mt-0.5" />
          <span>Semua output AI ditandakan "{getVal('ai.disclaimer') || 'Draf AI - Perlu Semakan Manusia'}" dan direkodkan dalam audit log dengan source=AI_GENERATED.</span>
        </div>
      </GlassCard>
    </div>
  )
}

// ============== BACKUP & DR TAB ==============
function BackupTab() {
  const info = [
    { label: 'Frekuensi Sandaran', value: 'Harian (02:00 MYT)', icon: Clock },
    { label: 'Jenis Sandaran', value: 'Penuh (Ahad) / Beransur (Isnin-Sabtu)', icon: Database },
    { label: 'Penyimpanan', value: 'Cloud + Lokal (3 salinan)', icon: HardDriveDownload },
    { label: 'Tempoh Penyimpanan', value: '90 hari (harian) / 7 tahun (bulanan)', icon: Calendar },
    { label: 'RPO (Recovery Point Objective)', value: '24 jam', icon: Activity },
    { label: 'RTO (Recovery Time Objective)', value: '4 jam', icon: Server },
    { label: 'Pengesakan Terakhir', value: new Date().toLocaleDateString('ms-MY'), icon: CheckCircle2 },
    { label: 'Status DR', value: 'Aktif - Sandaran Selesai', icon: ShieldCheck },
  ]

  return (
    <div className="space-y-4">
      <GlassCard className="p-5">
        <div className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-300" /> Maklumat Sandaran & Pemulihan Bencana (DR)
        </div>
        <div className="text-[11px] text-cyan-100/60 mb-4">Maklumat ini adalah paparan sahaja (read-only). Konfigurasi diuruskan oleh pasukan infrastruktur.</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {info.map((it) => {
            const Icon = it.icon
            return (
              <div key={it.label} className="glass-subtle rounded-lg p-3 flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-cyan-500/15 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-cyan-300" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-cyan-100/60 uppercase tracking-wide">{it.label}</div>
                  <div className="text-sm font-semibold text-white">{it.value}</div>
                </div>
              </div>
            )
          })}
        </div>
      </GlassCard>

      <GlassCard className="p-5">
        <div className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-300" /> Status Pematuhan
        </div>
        <div className="space-y-2">
          {[
            'Sandaran automatik harian aktif',
            'Pengesakan integriti data mingguan',
            'Failover ke pelayan sandaran dalam 4 jam',
            'Pemulihan titik-masa sehingga 24 jam',
            'Pengekalan log audit selama 7 tahun (FR-M13-03)',
            'Penyulitan data rehat (AES-256) aktif',
          ].map((c) => (
            <div key={c} className="flex items-center gap-2 text-xs text-cyan-100/80">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 flex-shrink-0" />
              <span>{c}</span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  )
}

// ============== ABOUT TAB ==============
function AboutTab({ settings }: { settings: SystemSetting[] }) {
  const getVal = (k: string) => settings.find((s) => s.key === k)?.value || ''
  const features = [
    { code: 'M01', name: 'Dashboard', icon: Activity },
    { code: 'M02', name: 'Pengurusan Kurikulum', icon: Building2 },
    { code: 'M03', name: 'NOSS Library', icon: Database },
    { code: 'M04', name: 'WIM Builder', icon: KeyRound },
    { code: 'M05', name: 'Pentauliahan', icon: ShieldCheck },
    { code: 'M06', name: 'Panel Pakar', icon: User },
    { code: 'M07', name: 'Aliran Kerja', icon: History },
    { code: 'M08', name: 'Dokumen', icon: HardDriveDownload },
    { code: 'M09', name: 'AI Assistant', icon: Bot },
    { code: 'M10', name: 'Laporan', icon: Server },
    { code: 'M11', name: 'Notifikasi', icon: Bell },
    { code: 'M12', name: 'RBAC & Pengguna', icon: Lock },
    { code: 'M13', name: 'Audit Log', icon: ShieldCheck },
  ]

  return (
    <div className="space-y-4">
      <GlassCard className="p-6 text-center">
        <div className="w-20 h-20 mx-auto rounded-2xl glass-strong flex items-center justify-center mb-3">
          <ShieldCheck className="w-10 h-10 text-cyan-300" />
        </div>
        <div className="text-2xl font-bold text-white">{getVal('app.name') || 'SPKP-JTM'}</div>
        <div className="text-sm text-cyan-100/70 mb-2">Sistem Pengurusan Kurikulum dan Pentauliahan</div>
        <div className="text-xs text-cyan-100/60 mb-4">Jabatan Tenaga Manusia · Kementerian Sumber Manusia Malaysia</div>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <span className="text-[10px] px-3 py-1 rounded-full border border-cyan-400/30 bg-cyan-500/10 text-cyan-200">
            Versi {getVal('app.version') || '1.0.0'}
          </span>
          <span className="text-[10px] px-3 py-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 text-emerald-200">
            Persekitaran: {process.env.NODE_ENV || 'development'}
          </span>
          <span className="text-[10px] px-3 py-1 rounded-full border border-purple-400/30 bg-purple-500/10 text-purple-200">
            AI: {getVal('ai.model') || 'glm-5.2'}
          </span>
        </div>
      </GlassCard>

      <GlassCard className="p-5">
        <div className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Server className="w-4 h-4 text-cyan-300" /> Maklumat Teknikal
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          <div className="flex items-center justify-between glass-subtle rounded-lg p-2.5">
            <span className="text-cyan-100/70">Framework</span>
            <span className="font-mono text-white">Next.js 16 (App Router)</span>
          </div>
          <div className="flex items-center justify-between glass-subtle rounded-lg p-2.5">
            <span className="text-cyan-100/70">Bahasa</span>
            <span className="font-mono text-white">TypeScript 5</span>
          </div>
          <div className="flex items-center justify-between glass-subtle rounded-lg p-2.5">
            <span className="text-cyan-100/70">Pangkalan Data</span>
            <span className="font-mono text-white">SQLite + Prisma ORM</span>
          </div>
          <div className="flex items-center justify-between glass-subtle rounded-lg p-2.5">
            <span className="text-cyan-100/70">UI</span>
            <span className="font-mono text-white">TailwindCSS 4 + shadcn/ui</span>
          </div>
          <div className="flex items-center justify-between glass-subtle rounded-lg p-2.5">
            <span className="text-cyan-100/70">Pengesahan</span>
            <span className="font-mono text-white">PBKDF2 + HMAC Session</span>
          </div>
          <div className="flex items-center justify-between glass-subtle rounded-lg p-2.5">
            <span className="text-cyan-100/70">RBAC</span>
            <span className="font-mono text-white">17 Peranan × 17 Kebenaran</span>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-5">
        <div className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-300" /> Modul Tersedia (13)
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {features.map((f) => {
            const Icon = f.icon
            return (
              <div key={f.code} className="glass-subtle rounded-lg p-2.5 flex items-center gap-2">
                <Icon className="w-3.5 h-3.5 text-cyan-300 flex-shrink-0" />
                <div>
                  <div className="text-[10px] text-cyan-100/60">{f.code}</div>
                  <div className="text-xs text-white font-medium">{f.name}</div>
                </div>
              </div>
            )
          })}
        </div>
      </GlassCard>

      <GlassCard className="p-5">
        <div className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
          <Info className="w-4 h-4 text-cyan-300" /> Pematuhan & Piawaian
        </div>
        <div className="text-xs text-cyan-100/80 space-y-1.5">
          <div>• ISO/IEC 27001 - Pengurusan Keselamatan Maklumat</div>
          <div>• PDPA Malaysia 2010 - Perlindungan Data Peribadi</div>
          <div>• OWASP Top 10 - Pencegahan Serangan Web</div>
          <div>• MQA MQF 2.0 - Standard Akademik</div>
          <div>• JPK NOSS - Standard Kemahiran Kebangsaan</div>
        </div>
      </GlassCard>
    </div>
  )
}
