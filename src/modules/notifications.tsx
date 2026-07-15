'use client'
import { useEffect, useState, useCallback } from 'react'
import { GlassCard, PageHeader, EmptyState } from '@/components/glass'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { toast } from 'sonner'
import {
  Bell, BellRing, CheckCheck, Filter, Mail, MessageSquare, Smartphone,
  Webhook, AlertCircle, Info, AlertTriangle, Sparkles, Send,
  Loader2, Inbox, Workflow, ShieldCheck, Clock, FileText,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

interface NotifItem {
  id: string
  category: string
  title: string
  message: string
  link?: string | null
  isRead: boolean
  priority: string
  createdAt: string
}

interface Pref {
  emailEnabled: boolean
  inAppEnabled: boolean
  whatsappEnabled: boolean
  pushEnabled: boolean
  categories?: string | null
}

const CATEGORIES = [
  { value: 'workflow', label: 'Aliran Kerja', icon: Workflow, color: '#2d8fd6' },
  { value: 'system', label: 'Sistem', icon: Info, color: '#9b59b6' },
  { value: 'accreditation', label: 'Pentauliahan', icon: ShieldCheck, color: '#00c2a8' },
  { value: 'reminder', label: 'Peringatan', icon: Clock, color: '#e6b41e' },
  { value: 'ai', label: 'AI', icon: Sparkles, color: '#9b59b6' },
]

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-500',
  normal: 'bg-amber-400',
  low: 'bg-cyan-400',
}

export function NotificationsModule() {
  const user = useAppStore((s) => s.user)
  const [items, setItems] = useState<NotifItem[]>([])
  const [stats, setStats] = useState<{ category: string; count: number }[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('all')
  const [isReadFilter, setIsReadFilter] = useState('all')
  const [pref, setPref] = useState<Pref | null>(null)
  const [prefSaving, setPrefSaving] = useState(false)
  const canTestPush = (user?.roles || []).some((r) => r === 'SUPER_ADMIN' || r === 'ADMINISTRATOR')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (category !== 'all') params.set('category', category)
      if (isReadFilter !== 'all') params.set('isRead', isReadFilter)
      const r = await fetch(`/api/notifications?${params.toString()}`, { credentials: 'include' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Ralat')
      setItems(d.items || [])
      setStats(d.stats || [])
      setUnread(d.unread || 0)
    } catch (e: any) {
      toast.error(e.message || 'Gagal memuatkan notifikasi')
    } finally {
      setLoading(false)
    }
  }, [category, isReadFilter])

  const loadPref = useCallback(async () => {
    try {
      const r = await fetch('/api/notifications/preferences', { credentials: 'include' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Ralat')
      setPref(d.preference)
    } catch {}
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { loadPref() }, [loadPref])

  async function markRead(id: string) {
    try {
      const r = await fetch(`/api/notifications/${id}/read`, { method: 'PATCH', credentials: 'include' })
      if (!r.ok) throw new Error('Ralat')
      setItems((arr) => arr.map((n) => n.id === id ? { ...n, isRead: true } : n))
      setUnread((u) => Math.max(0, u - 1))
    } catch (e: any) {
      toast.error('Gagal menandakan sebagai dibaca')
    }
  }

  async function markAllRead() {
    try {
      const r = await fetch('/api/notifications/read-all', { method: 'POST', credentials: 'include' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Ralat')
      toast.success(`${d.updated} notifikasi ditandakan sebagai dibaca`)
      load()
    } catch (e: any) {
      toast.error(e.message || 'Gagal')
    }
  }

  async function savePref(next: Pref) {
    setPrefSaving(true)
    try {
      const r = await fetch('/api/notifications/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
        credentials: 'include',
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Ralat')
      setPref(d.preference)
      toast.success('Keutamaan notifikasi disimpan')
    } catch (e: any) {
      toast.error(e.message || 'Gagal menyimpan')
    } finally {
      setPrefSaving(false)
    }
  }

  async function sendTest() {
    try {
      const r = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Notifikasi Ujian',
          message: `Notifikasi ujian dihantar oleh ${user?.fullName} pada ${new Date().toLocaleString('ms-MY')}.`,
          category: 'system', priority: 'normal',
        }),
        credentials: 'include',
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Ralat')
      toast.success('Notifikasi ujian dihantar')
      load()
    } catch (e: any) {
      toast.error(e.message || 'Gagal menghantar')
    }
  }

  const statsMerged = CATEGORIES.map((c) => ({
    category: c.value,
    label: c.label,
    count: stats.find((s) => s.category === c.value)?.count || 0,
    color: c.color,
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        icon={BellRing}
        title="Pusat Notifikasi"
        description="Semua notifikasi sistem, aliran kerja & peringatan anda"
        actions={
          <>
            <Button variant="outline" className="border-white/20 text-cyan-100 hover:bg-white/10" onClick={markAllRead} disabled={!unread}>
              <CheckCheck className="w-4 h-4 mr-2" /> Tanda Semua Dibaca
            </Button>
            {canTestPush && (
              <Button className="bg-gradient-to-r from-cyan-500 to-teal-500 border-0 text-white" onClick={sendTest}>
                <Send className="w-4 h-4 mr-2" /> Hantar Ujian
              </Button>
            )}
          </>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {statsMerged.map((s) => {
          const cat = CATEGORIES.find((c) => c.value === s.category)!
          const Icon = cat.icon
          return (
            <GlassCard key={s.category} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${s.color}22`, border: `1px solid ${s.color}44` }}>
                  <Icon className="w-4 h-4" style={{ color: s.color }} />
                </div>
                <span className="text-2xl font-bold text-white">{s.count}</span>
              </div>
              <div className="text-xs text-cyan-100/70">{s.label}</div>
            </GlassCard>
          )
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Notification list */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters */}
          <GlassCard className="p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="w-4 h-4 text-cyan-100/60" />
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-white/8 border-white/15 text-white h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="glass-strong border-white/20 text-white">
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={isReadFilter} onValueChange={setIsReadFilter}>
                <SelectTrigger className="bg-white/8 border-white/15 text-white h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="glass-strong border-white/20 text-white">
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="false">Belum Dibaca</SelectItem>
                  <SelectItem value="true">Telah Dibaca</SelectItem>
                </SelectContent>
              </Select>
              {unread > 0 && (
                <Badge className="bg-red-500/20 text-red-200 border-red-400/30 ml-auto">{unread} belum dibaca</Badge>
              )}
            </div>
          </GlassCard>

          <GlassCard className="p-0 overflow-hidden">
            <div className="max-h-[60vh] overflow-y-auto scroll-area">
              {loading ? (
                <div className="text-center py-12 text-cyan-100/60">
                  <Loader2 className="w-6 h-6 mx-auto animate-spin mb-2" /> Memuatkan...
                </div>
              ) : items.length === 0 ? (
                <EmptyState icon={Inbox} title="Tiada notifikasi" hint="Anda sudah up to date!" />
              ) : (
                <div className="divide-y divide-white/5">
                  {items.map((n) => {
                    const cat = CATEGORIES.find((c) => c.value === n.category)
                    const Icon = cat?.icon || Bell
                    return (
                      <div
                        key={n.id}
                        className={`p-4 hover:bg-white/5 transition cursor-pointer ${!n.isRead ? 'border-l-2 border-l-cyan-400 bg-cyan-500/5' : ''}`}
                        onClick={() => !n.isRead && markRead(n.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${cat?.color || '#2d8fd6'}22`, border: `1px solid ${cat?.color || '#2d8fd6'}44` }}>
                            <Icon className="w-4 h-4" style={{ color: cat?.color || '#2d8fd6' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="text-sm font-medium text-white">{n.title}</div>
                              <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${PRIORITY_COLORS[n.priority] || 'bg-cyan-400'}`} />
                            </div>
                            <div className="text-xs text-cyan-100/70 mt-1 line-clamp-2">{n.message}</div>
                            <div className="flex items-center gap-2 mt-2 text-[10px] text-cyan-100/50">
                              <Badge className="bg-white/5 text-cyan-100/70 border-white/10 uppercase text-[9px]">{n.category}</Badge>
                              {n.priority === 'high' && <Badge className="bg-red-500/20 text-red-200 border-red-400/30 text-[9px]">Tinggi</Badge>}
                              <Clock className="w-2.5 h-2.5" /> {new Date(n.createdAt).toLocaleString('ms-MY', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              {!n.isRead && <span className="text-cyan-300">· Klik untuk tandakan dibaca</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </GlassCard>
        </div>

        {/* Sidebar: preferences + breakdown */}
        <div className="space-y-4">
          <GlassCard className="p-4">
            <div className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Webhook className="w-4 h-4 text-cyan-300" /> Saluran Notifikasi
            </div>
            {!pref ? (
              <div className="text-center py-6 text-cyan-100/50 text-xs"><Loader2 className="w-4 h-4 mx-auto animate-spin" /></div>
            ) : (
              <div className="space-y-3">
                <PrefRow icon={Mail} label="E-mel" desc="Terima notifikasi melalui e-mel" checked={pref.emailEnabled} onChange={(v) => savePref({ ...pref, emailEnabled: v })} disabled={prefSaving} />
                <PrefRow icon={Bell} label="Dalam Aplikasi" desc="Paparan notifikasi dalam sistem" checked={pref.inAppEnabled} onChange={(v) => savePref({ ...pref, inAppEnabled: v })} disabled={prefSaving} />
                <PrefRow icon={MessageSquare} label="WhatsApp" desc="Notifikasi ringkas melalui WhatsApp" checked={pref.whatsappEnabled} onChange={(v) => savePref({ ...pref, whatsappEnabled: v })} disabled={prefSaving} />
                <PrefRow icon={Smartphone} label="Push Notification" desc="Notifikasi pada peranti mudah alih" checked={pref.pushEnabled} onChange={(v) => savePref({ ...pref, pushEnabled: v })} disabled={prefSaving} />
              </div>
            )}
            <div className="glass-subtle p-2.5 rounded-lg text-[10px] text-cyan-100/60 mt-3 flex items-start gap-2">
              <AlertCircle className="w-3 h-3 text-cyan-300 mt-0.5 flex-shrink-0" />
              <span>Keutamaan disimpan automatik. WhatsApp hanya tersedia untuk notifikasi keutamaan tinggi.</span>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-300" /> pecahan Mengikut Kategori
            </div>
            {statsMerged.every((s) => s.count === 0) ? (
              <div className="text-center py-6 text-cyan-100/50 text-xs">Tiada data</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={statsMerged.filter((s) => s.count > 0)}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    innerRadius={40}
                    paddingAngle={3}
                  >
                    {statsMerged.filter((s) => s.count > 0).map((e, i) => (
                      <Cell key={i} fill={e.color} stroke="rgba(255,255,255,0.2)" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(10,30,70,0.9)',
                      border: '1px solid rgba(0,194,168,0.4)',
                      borderRadius: '10px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px', color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  )
}

function PrefRow({
  icon: Icon, label, desc, checked, onChange, disabled,
}: { icon: any; label: string; desc: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 glass-subtle p-3 rounded-lg">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${checked ? 'bg-cyan-500/20' : 'bg-white/5'}`}>
          <Icon className={`w-4 h-4 ${checked ? 'text-cyan-300' : 'text-cyan-100/50'}`} />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-medium text-white">{label}</div>
          <div className="text-[10px] text-cyan-100/60 truncate">{desc}</div>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  )
}
