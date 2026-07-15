'use client'
import { useEffect } from 'react'
import { useAppStore, type ModuleKey, hasAnyRole } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  LayoutDashboard, BookOpen, Library, FileText, Award, Users,
  GitBranch, FolderOpen, BarChart3, ShieldCheck, Bell, Settings,
  Bot, LogOut, Menu, ChevronLeft, Search, Sun, Moon, Building2,
  ChevronDown, AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'

interface NavItem {
  key: ModuleKey
  label: string
  icon: any
  roles?: string[] // if set, only these roles see it; otherwise everyone
  badge?: string
}

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Utama',
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { key: 'workflow', label: 'Aliran Kerja', icon: GitBranch },
      { key: 'notifications', label: 'Notifikasi', icon: Bell },
    ],
  },
  {
    title: 'Akademik',
    items: [
      { key: 'curriculum', label: 'Kurikulum', icon: BookOpen, roles: ['SUPER_ADMIN', 'ADMINISTRATOR', 'PENARAH', 'TIMBALAN_PENARAH', 'BAHAGIAN_KURIKULUM', 'PEGAWAI_KURIKULUM', 'KETUA_PROGRAM', 'KETUA_JABATAN', 'PENSYARAH', 'PEGAWAI_QA', 'AUDITOR', 'VIEWER'] },
      { key: 'noss', label: 'NOSS Library', icon: Library, roles: ['SUPER_ADMIN', 'ADMINISTRATOR', 'PENARAH', 'TIMBALAN_PENARAH', 'BAHAGIAN_KURIKULUM', 'PEGAWAI_KURIKULUM', 'KETUA_PROGRAM', 'KETUA_JABATAN', 'PENSYARAH', 'PEGAWAI_QA', 'PANEL_INDUSTRI', 'PANEL_AKADEMIK', 'PANEL_PENILAI', 'AUDITOR', 'VIEWER'] },
      { key: 'wim', label: 'WIM', icon: FileText, roles: ['SUPER_ADMIN', 'ADMINISTRATOR', 'PENARAH', 'TIMBALAN_PENARAH', 'BAHAGIAN_KURIKULUM', 'PEGAWAI_QA', 'KETUA_PROGRAM', 'KETUA_JABATAN', 'PENSYARAH'] },
    ],
  },
  {
    title: 'Pentauliahan & Pakar',
    items: [
      { key: 'accreditation', label: 'Pentauliahan', icon: Award, roles: ['SUPER_ADMIN', 'ADMINISTRATOR', 'PENARAH', 'TIMBALAN_PENARAH', 'PEGAWAI_PENTAULIAHAN', 'PEGAWAI_QA', 'AUDITOR', 'PANEL_PENILAI', 'KETUA_PROGRAM'] },
      { key: 'experts', label: 'Panel Pakar', icon: Users, roles: ['SUPER_ADMIN', 'ADMINISTRATOR', 'PENARAH', 'TIMBALAN_PENARAH', 'BAHAGIAN_KURIKULUM', 'PEGAWAI_PENTAULIAHAN', 'KETUA_PROGRAM', 'KETUA_JABATAN', 'PANEL_INDUSTRI', 'PANEL_AKADEMIK', 'PANEL_PENILAI'] },
    ],
  },
  {
    title: 'Sistem',
    items: [
      { key: 'documents', label: 'Dokumen', icon: FolderOpen },
      { key: 'reports', label: 'Laporan', icon: BarChart3, roles: ['SUPER_ADMIN', 'ADMINISTRATOR', 'PENARAH', 'TIMBALAN_PENARAH', 'BAHAGIAN_KURIKULUM', 'PEGAWAI_KURIKULUM', 'PEGAWAI_PENTAULIAHAN', 'PEGAWAI_QA', 'KETUA_PROGRAM', 'KETUA_JABATAN', 'AUDITOR', 'VIEWER'] },
      { key: 'audit', label: 'Audit Log', icon: ShieldCheck, roles: ['SUPER_ADMIN', 'ADMINISTRATOR', 'AUDITOR', 'PEGAWAI_QA'] },
      { key: 'users', label: 'Pengguna & RBAC', icon: Users, roles: ['SUPER_ADMIN', 'ADMINISTRATOR'] },
      { key: 'settings', label: 'Tetapan', icon: Settings, roles: ['SUPER_ADMIN', 'ADMINISTRATOR'] },
      { key: 'ai', label: 'AI Assistant', icon: Bot, roles: ['SUPER_ADMIN', 'ADMINISTRATOR', 'PENSYARAH', 'PEGAWAI_KURIKULUM', 'KETUA_PROGRAM', 'BAHAGIAN_KURIKULUM'] },
    ],
  },
]

export function AppShell({ children, onNavigate }: { children: React.ReactNode; onNavigate?: (m: ModuleKey) => void }) {
  const { user, activeModule, setActiveModule, theme, toggleTheme, sidebarCollapsed, toggleSidebar } = useAppStore()
  const roles = user?.roles || []
  const isAdmin = hasAnyRole(roles, 'SUPER_ADMIN', 'ADMINISTRATOR')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    } catch {}
    useAppStore.getState().setUser(null)
    toast.success('Anda telah log keluar')
  }

  function nav(m: ModuleKey) {
    setActiveModule(m)
    onNavigate?.(m)
  }

  const initials = (user?.fullName || 'U').split(' ').slice(0, 2).map((s) => s[0]).join('').toUpperCase()

  return (
    <div className={`glass-bg ${theme === 'light' ? 'glass-bg-light' : ''} app-shell relative`}>
      <div className="relative z-10 flex min-h-screen">
        {/* Sidebar */}
        <aside
          className={`glass-sidebar flex flex-col transition-all duration-300 ${
            sidebarCollapsed ? 'w-20' : 'w-64'
          }`}
        >
          {/* Logo */}
          <div className="p-4 border-b border-white/10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl glass-strong flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-6 h-6 text-cyan-300" />
            </div>
            {!sidebarCollapsed && (
              <div className="text-white overflow-hidden">
                <div className="text-sm font-bold leading-tight">SPKP-JTM</div>
                <div className="text-[10px] text-cyan-100/70 truncate">Jabatan Tenaga Manusia</div>
              </div>
            )}
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto py-4 px-3 scroll-area">
            {NAV_GROUPS.map((group) => {
              const visible = group.items.filter((it) => !it.roles || hasAnyRole(roles, ...it.roles))
              if (visible.length === 0) return null
              return (
                <div key={group.title} className="mb-5">
                  {!sidebarCollapsed && (
                    <div className="text-[10px] uppercase tracking-wider text-cyan-100/50 px-3 mb-2 font-semibold">
                      {group.title}
                    </div>
                  )}
                  <div className="space-y-1">
                    {visible.map((item) => {
                      const Icon = item.icon
                      const active = activeModule === item.key
                      return (
                        <button
                          key={item.key}
                          onClick={() => nav(item.key)}
                          title={sidebarCollapsed ? item.label : undefined}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm group ${
                            active
                              ? 'bg-gradient-to-r from-cyan-500/30 to-teal-500/20 text-white border border-cyan-400/30 shadow-lg'
                              : 'text-cyan-50/80 hover:bg-white/10 hover:text-white border border-transparent'
                          }`}
                        >
                          <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-cyan-300' : ''}`} />
                          {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                          {active && !sidebarCollapsed && (
                            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-300 pulse-soft" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </nav>

          {/* Collapse toggle */}
          <div className="p-3 border-t border-white/10">
            <button
              onClick={toggleSidebar}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-cyan-100/70 hover:bg-white/10 hover:text-white transition text-xs"
            >
              <ChevronLeft className={`w-4 h-4 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} />
              {!sidebarCollapsed && <span>Tutup Menu</span>}
            </button>
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <header className="glass border-b border-white/10 px-4 lg:px-6 py-3 flex items-center gap-3 sticky top-0 z-30">
            <button
              onClick={toggleSidebar}
              className="lg:hidden btn-glass p-2 rounded-lg"
              aria-label="Toggle menu"
            >
              <Menu className="w-5 h-5 text-white" />
            </button>

            <div className="flex-1 max-w-xl hidden md:block">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-100/60" />
                <Input
                  placeholder="Carian AI pintar merentasi kurikulum, NOSS, dokumen..."
                  className="pl-10 bg-white/8 border-white/15 text-white placeholder:text-white/40 h-10"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const q = (e.target as HTMLInputElement).value.trim()
                      if (q) {
                        toast.info(`Mencari: "${q}"`)
                        setActiveModule('ai')
                      }
                    }
                  }}
                />
              </div>
            </div>

            <div className="flex-1 md:hidden" />

            {/* Institution switcher (admin only) */}
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="btn-glass h-10 gap-2 text-white">
                    <Building2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Semua Institusi</span>
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="glass-strong border-white/20 text-white w-64">
                  <DropdownMenuLabel className="text-cyan-100">Tukar Institusi</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem className="hover:bg-white/10 focus:bg-white/10">
                    <Building2 className="w-4 h-4 mr-2" /> Semua Institusi (Admin)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="btn-glass h-10 w-10 text-white"
              onClick={toggleTheme}
              aria-label="Tukar tema"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>

            {/* Notifications */}
            <button
              onClick={() => nav('notifications')}
              className="btn-glass h-10 w-10 rounded-lg flex items-center justify-center text-white relative"
              aria-label="Notifikasi"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[9px] flex items-center justify-center text-white font-bold">3</span>
            </button>

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 glass-subtle pl-2 pr-3 py-1.5 rounded-full hover-lift">
                  <Avatar className="w-8 h-8 border-2 border-cyan-400/40">
                    <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-teal-500 text-white text-xs font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block text-left">
                    <div className="text-xs font-semibold text-white leading-tight max-w-[140px] truncate">{user?.fullName}</div>
                    <div className="text-[10px] text-cyan-100/70 truncate">{user?.roleName}</div>
                  </div>
                  <ChevronDown className="w-3 h-3 text-cyan-100/60 hidden sm:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="glass-strong border-white/20 text-white w-64">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <span className="text-sm font-semibold text-white">{user?.fullName}</span>
                    <span className="text-xs text-cyan-100/70">{user?.email}</span>
                    <div className="flex gap-1 pt-1 flex-wrap">
                      {user?.roles.slice(0, 2).map((r) => (
                        <Badge key={r} variant="outline" className="text-[9px] border-cyan-400/40 text-cyan-200 bg-cyan-500/10">
                          {r.replace(/_/g, ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem className="hover:bg-white/10 focus:bg-white/10 cursor-pointer" onClick={() => nav('settings')}>
                  <Settings className="w-4 h-4 mr-2" /> Tetapan Akaun
                </DropdownMenuItem>
                <DropdownMenuItem className="hover:bg-white/10 focus:bg-white/10 cursor-pointer" onClick={() => nav('audit')}>
                  <ShieldCheck className="w-4 h-4 mr-2" /> Audit & Aktiviti Saya
                </DropdownMenuItem>
                {user?.mfaEnabled && (
                  <div className="px-2 py-1.5 text-[10px] text-emerald-300/80 flex items-center gap-1.5">
                    <AlertCircle className="w-3 h-3" /> MFA Aktif
                  </div>
                )}
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem className="hover:bg-red-500/20 focus:bg-red-500/20 text-red-300 cursor-pointer" onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" /> Log Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>

          {/* Content */}
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            <div className="fade-in-up">{children}</div>
          </main>

          {/* Footer */}
          <footer className="glass border-t border-white/10 px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-cyan-100/60">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3 h-3" />
              <span>© 2026 Jabatan Tenaga Manusia · Kementerian Sumber Manusia Malaysia</span>
            </div>
            <div className="flex items-center gap-3">
              <span>SPKP-JTM v1.0.0</span>
              <span className="hidden sm:inline">·</span>
              <span className="hidden sm:inline">RBAC + RLS + MFA Aktif</span>
              <span className="hidden sm:inline">·</span>
              <span className="hidden sm:inline text-emerald-300/70">Sistem Selamat</span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  )
}
