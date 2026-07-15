'use client'
import { useEffect, useState } from 'react'
import { GlassCard, PageHeader, StatusBadge } from '@/components/glass'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BookOpen, FileText, Award, Users, Library, GitBranch, ShieldCheck,
  TrendingUp, AlertTriangle, Clock, ArrowRight, Activity, Building2,
  CheckCircle2, XCircle, Bell,
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, LineChart, Line, Legend, Area, AreaChart,
} from 'recharts'
import { useAppStore } from '@/lib/store'

const STATUS_COLORS: Record<string, string> = {
  draft: '#7895b2',
  review: '#e6b41e',
  approved: '#00c2a8',
  rejected: '#e63946',
  archived: '#6b7280',
  submitted: '#2d8fd6',
  audit: '#9b59b6',
  self_assessment: '#3498db',
  expired: '#b04646',
  correction: '#f59e0b',
}

interface DashData {
  counts: any
  programStatus: any[]
  wimStatus: any[]
  accredStatus: any[]
  wfStatus: any[]
  pendingTasks: any[]
  recentAudit: any[]
  recentNotifs: any[]
  programsByInst: any[]
  trend: any[]
  isAdmin: boolean
  roleCodes: string[]
}

export function DashboardModule() {
  const user = useAppStore((s) => s.user)
  const setActiveModule = useAppStore((s) => s.setActiveModule)
  const [data, setData] = useState<DashData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-cyan-100/70 animate-pulse">Memuatkan data dashboard...</div>
      </div>
    )
  }

  const c = data.counts
  const kpiCards = [
    { label: 'Program Aktif', value: c.programs, icon: BookOpen, color: 'from-cyan-500 to-blue-500', module: 'curriculum' as const, trend: '+12%' },
    { label: 'Unit Kompetensi', value: c.cu, icon: FileText, color: 'from-teal-500 to-emerald-500', module: 'curriculum' as const, trend: '+5%' },
    { label: 'Dokumen WIM', value: c.wim, icon: FileText, color: 'from-purple-500 to-pink-500', module: 'wim' as const, trend: '+8%' },
    { label: 'Pentauliahan', value: c.accreds, icon: Award, color: 'from-amber-500 to-orange-500', module: 'accreditation' as const, trend: `${c.expiringCerts} hampir tamat` },
    { label: 'Panel Pakar', value: c.experts, icon: Users, color: 'from-rose-500 to-red-500', module: 'experts' as const, trend: 'Aktif' },
    { label: 'Aliran Kerja', value: c.workflows, icon: GitBranch, color: 'from-indigo-500 to-violet-500', module: 'workflow' as const, trend: 'Menunggu' },
    { label: 'Sijil Aktif', value: c.certs, icon: ShieldCheck, color: 'from-green-500 to-teal-500', module: 'accreditation' as const, trend: `${c.expiringCerts} expiring` },
    { label: 'Audit Log', value: c.auditLogs, icon: Activity, color: 'from-slate-500 to-gray-500', module: 'audit' as const, trend: 'Immutable' },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Building2}
        title={`Selamat Datang, ${user?.fullName?.split(' ').slice(0, 2).join(' ') || 'Pengguna'}`}
        description={data.isAdmin ? 'Dashboard Eksekutif & Nasional — agregat merentasi semua institusi' : `Dashboard ${user?.institutionName || 'Institusi'} · ${user?.roleName}`}
        actions={
          <>
            <div className="glass-subtle px-3 py-1.5 rounded-full text-xs text-cyan-100/80 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 pulse-soft" />
              Data dikemas kini: {new Date().toLocaleTimeString('ms-MY')}
            </div>
            <Button className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 border-0 text-white" onClick={() => setActiveModule('reports')}>
              <TrendingUp className="w-4 h-4 mr-2" /> Lihat Laporan
            </Button>
          </>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon
          return (
            <button
              key={kpi.label}
              onClick={() => setActiveModule(kpi.module)}
              className="text-left hover-lift"
            >
              <GlassCard className="p-5 relative overflow-hidden">
                <div className={`absolute -right-4 -top-4 w-20 h-20 rounded-full bg-gradient-to-br ${kpi.color} opacity-20 blur-xl`} />
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${kpi.color} flex items-center justify-center shadow-lg`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-[10px] text-cyan-100/60 bg-white/5 px-2 py-0.5 rounded-full">{kpi.trend}</span>
                </div>
                <div className="text-3xl font-bold text-white mb-1">{kpi.value.toLocaleString()}</div>
                <div className="text-xs text-cyan-100/70">{kpi.label}</div>
              </GlassCard>
            </button>
          )
        })}
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Trend area chart */}
        <GlassCard className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-300" /> Aktiviti Sistem 6 Bulan Terkini
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {data.trend.length === 0 ? (
              <div className="text-center text-cyan-100/50 py-8 text-sm">Tiada data trend</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={data.trend}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00c2a8" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="#00c2a8" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2d8fd6" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="#2d8fd6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="month" stroke="rgba(255,255,255,0.5)" fontSize={11} />
                  <YAxis stroke="rgba(255,255,255,0.5)" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(10,30,70,0.9)',
                      border: '1px solid rgba(0,194,168,0.4)',
                      borderRadius: '10px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Area type="monotone" dataKey="insert" stroke="#00c2a8" strokeWidth={2} fill="url(#g1)" name="Cipta" />
                  <Area type="monotone" dataKey="update" stroke="#2d8fd6" strokeWidth={2} fill="url(#g2)" name="Kemas Kini" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </GlassCard>

        {/* Program status pie */}
        <GlassCard>
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-cyan-300" /> Status Program
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={data.programStatus}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={45}
                  paddingAngle={3}
                >
                  {data.programStatus.map((entry, i) => (
                    <Cell key={i} fill={STATUS_COLORS[entry.status] || '#888'} stroke="rgba(255,255,255,0.2)" strokeWidth={2} />
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
          </CardContent>
        </GlassCard>
      </div>

      {/* Workflow + Pending Tasks */}
      <div className="grid lg:grid-cols-2 gap-4">
        <GlassCard>
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-cyan-300" /> Aliran Kerja Mengikut Status
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.wfStatus}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="status" stroke="rgba(255,255,255,0.5)" fontSize={10} />
                <YAxis stroke="rgba(255,255,255,0.5)" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(10,30,70,0.9)',
                    border: '1px solid rgba(0,194,168,0.4)',
                    borderRadius: '10px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="_count" radius={[6, 6, 0, 0]}>
                  {data.wfStatus.map((entry, i) => (
                    <Cell key={i} fill={STATUS_COLORS[entry.currentStatus] || '#888'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </GlassCard>

        <GlassCard>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-300" /> Tugasan Tertunggak
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-cyan-200 hover:text-white hover:bg-white/10" onClick={() => setActiveModule('workflow')}>
              Lihat Semua <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="pt-2 max-h-[220px] overflow-y-auto scroll-area">
            {data.pendingTasks.length === 0 ? (
              <div className="text-center py-6 text-cyan-100/60 text-sm flex flex-col items-center gap-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                Tiada tugasan tertunggak. Anda sudah up to date!
              </div>
            ) : (
              <div className="space-y-2">
                {data.pendingTasks.map((t) => {
                  const overdue = t.slaDueAt && new Date(t.slaDueAt) < new Date()
                  return (
                    <div key={t.id} className="glass-subtle p-3 rounded-lg flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${overdue ? 'bg-red-400 pulse-soft' : 'bg-amber-400'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white font-medium truncate">{t.entityType.replace('_', ' ')}</div>
                        <div className="text-[10px] text-cyan-100/60">
                          Status: {t.status} · Prioriti: {t.priority}
                        </div>
                      </div>
                      <div className="text-right">
                        <StatusBadge status={t.status} />
                        {t.slaDueAt && (
                          <div className={`text-[10px] mt-1 ${overdue ? 'text-red-300' : 'text-cyan-100/60'}`}>
                            SLA: {new Date(t.slaDueAt).toLocaleDateString('ms-MY', { day: '2-digit', month: 'short' })}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </GlassCard>
      </div>

      {/* Programs by Institution + Recent Notifications */}
      <div className="grid lg:grid-cols-2 gap-4">
        <GlassCard>
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Building2 className="w-4 h-4 text-cyan-300" /> Program Mengikut Institusi
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {data.programsByInst.length === 0 ? (
              <div className="text-center text-cyan-100/50 py-6 text-sm">Tiada data institusi</div>
            ) : (
              <div className="space-y-2 max-h-[260px] overflow-y-auto scroll-area">
                {data.programsByInst.map((p, i) => (
                  <div key={i} className="glass-subtle p-3 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-sm text-white font-medium truncate">{p.institution}</div>
                      <Badge className="bg-cyan-500/20 text-cyan-200 border-cyan-400/30 text-xs">{p.code}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-400 to-teal-400"
                          style={{ width: `${Math.min(100, p.count * 12)}%` }}
                        />
                      </div>
                      <span className="text-xs text-cyan-100/70 w-8 text-right">{p.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </GlassCard>

        <GlassCard>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Bell className="w-4 h-4 text-cyan-300" /> Notifikasi Terkini
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-cyan-200 hover:text-white hover:bg-white/10" onClick={() => setActiveModule('notifications')}>
              Semua <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="pt-2 max-h-[260px] overflow-y-auto scroll-area">
            <div className="space-y-2">
              {data.recentNotifs.map((n) => (
                <div key={n.id} className={`glass-subtle p-3 rounded-lg ${!n.isRead ? 'border-l-2 border-l-cyan-400' : ''}`}>
                  <div className="flex items-start gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 ${n.priority === 'high' ? 'bg-red-400' : n.priority === 'normal' ? 'bg-amber-400' : 'bg-cyan-400'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white font-medium">{n.title}</div>
                      <div className="text-xs text-cyan-100/70 mt-0.5 line-clamp-2">{n.message}</div>
                      <div className="text-[10px] text-cyan-100/50 mt-1">
                        {new Date(n.createdAt).toLocaleString('ms-MY', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </GlassCard>
      </div>

      {/* Audit feed + Security panel */}
      <div className="grid lg:grid-cols-3 gap-4">
        <GlassCard className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-300" /> Aktiviti Audit Terkini
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 max-h-[260px] overflow-y-auto scroll-area">
            <div className="space-y-1.5">
              {data.recentAudit.map((a) => (
                <div key={a.id} className="flex items-center gap-3 glass-subtle px-3 py-2 rounded-lg">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                    a.action === 'INSERT' ? 'bg-emerald-500/20 text-emerald-300' :
                    a.action === 'UPDATE' ? 'bg-amber-500/20 text-amber-300' :
                    'bg-red-500/20 text-red-300'
                  }`}>
                    {a.action === 'INSERT' ? 'I' : a.action === 'UPDATE' ? 'U' : 'D'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-white">
                      <span className="font-mono text-cyan-200">{a.table}</span>
                      {a.source === 'AI_GENERATED' && <span className="ml-2 text-[9px] bg-purple-500/20 text-purple-200 px-1.5 py-0.5 rounded">AI</span>}
                    </div>
                    <div className="text-[10px] text-cyan-100/60 truncate">
                      oleh {a.by || 'Sistem'} · {new Date(a.at).toLocaleString('ms-MY', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </GlassCard>

        <GlassCard>
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-300" /> Status Keselamatan
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 space-y-3">
            <SecRow label="RBAC + RLS" status="Aktif" ok />
            <SecRow label="MFA Pentadbir" status="Diwajibkan" ok />
            <SecRow label="Audit Trail" status="Immutable" ok />
            <SecRow label="TLS 1.2+" status="Aktif" ok />
            <SecRow label="Backup DR" status="Harian" ok />
            <SecRow label="PDPA" status="Patuh" ok />
            <SecRow label="Sijil Hampir Tamat" status={`${c.expiringCerts} sijil`} ok={c.expiringCerts === 0} warn={c.expiringCerts > 0} />
            <div className="pt-2 mt-2 border-t border-white/10 text-center">
              <div className="text-2xl font-bold text-emerald-300">0</div>
              <div className="text-[10px] text-cyan-100/60">Insiden Keselamatan Kritikal</div>
            </div>
          </CardContent>
        </GlassCard>
      </div>
    </div>
  )
}

function SecRow({ label, status, ok, warn }: { label: string; status: string; ok?: boolean; warn?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-cyan-100/70">{label}</span>
      <div className="flex items-center gap-1.5">
        {ok ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : warn ? <AlertTriangle className="w-3 h-3 text-amber-400" /> : <XCircle className="w-3 h-3 text-red-400" />}
        <span className={`text-xs ${ok ? 'text-emerald-300' : warn ? 'text-amber-300' : 'text-red-300'}`}>{status}</span>
      </div>
    </div>
  )
}

