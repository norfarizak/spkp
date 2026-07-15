'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'
import { Loader2, Shield, Lock, Mail, Sparkles, Building2, Award, Bot } from 'lucide-react'

const demoAccounts = [
  { label: 'Super Admin', email: 'admin@spkp-jtm.gov.my', desc: 'Akses penuh sistem' },
  { label: 'Pengarah', email: 'pengarah@ikbnkl.gov.my', desc: 'Kelulusan akhir' },
  { label: 'Pegawai Kurikulum', email: 'pegkur1@ikbnkl.gov.my', desc: 'Cipta/Edit kurikulum' },
  { label: 'Pensyarah', email: 'pensyarah1@ikbnkl.gov.my', desc: 'Cipta WIM & CU' },
]

export function LoginScreen() {
  const setUser = useAppStore((s) => s.setUser)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Sila masukkan e-mel dan kata laluan')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Log masuk gagal')
        return
      }
      toast.success(`Selamat datang, ${data.user.fullName}`)
      setUser(data.user)
    } catch {
      toast.error('Ralat rangkaian. Sila cuba lagi.')
    } finally {
      setLoading(false)
    }
  }

  function quickFill(em: string) {
    setEmail(em)
    setPassword('Spkp@2026')
  }

  return (
    <div className="glass-bg min-h-screen flex items-center justify-center p-4 relative">
      <div className="relative z-10 w-full max-w-5xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Branding panel */}
        <div className="hidden lg:block text-white space-y-6 fade-in-up">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-2xl glass-strong flex items-center justify-center">
              <Shield className="w-9 h-9 text-cyan-300" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-cyan-200/80">Kerajaan Malaysia</div>
              <div className="text-xl font-bold">Jabatan Tenaga Manusia</div>
            </div>
          </div>
          <h1 className="text-5xl font-bold leading-tight">
            Sistem Pengurusan<br />
            <span className="bg-gradient-to-r from-cyan-300 to-teal-200 bg-clip-text text-transparent">
              Kurikulum & Pentauliahan
            </span>
          </h1>
          <p className="text-lg text-cyan-50/80 max-w-md">
            Platform enterprise digital-first TVET — pembangunan kurikulum NOSS, pengurusan WIM,
            pentauliahan institusi, dan audit pematuhan dalam satu sistem bersepadu.
          </p>
          <div className="grid grid-cols-2 gap-3 max-w-md">
            {[
              { icon: Building2, label: '13 Modul Teras' },
              { icon: Award, label: 'Pentauliahan Digital' },
              { icon: Bot, label: 'AI GLM 5.2' },
              { icon: Sparkles, label: 'Kaca Glassmorphism' },
            ].map((f, i) => (
              <div key={i} className="glass-subtle p-3 flex items-center gap-2 text-sm">
                <f.icon className="w-4 h-4 text-cyan-300" />
                <span>{f.label}</span>
              </div>
            ))}
          </div>
          <div className="text-xs text-cyan-100/60 pt-4 border-t border-white/10">
            RBAC · Audit Trail · MFA · OWASP Top 10 Compliant · PDPA-Ready
          </div>
        </div>

        {/* Login card */}
        <Card className="glass-strong border-white/20 fade-in-up">
          <CardContent className="p-8">
            <div className="lg:hidden flex items-center gap-2 mb-6 text-white">
              <div className="w-12 h-12 rounded-xl glass flex items-center justify-center">
                <Shield className="w-7 h-7 text-cyan-300" />
              </div>
              <div>
                <div className="text-sm font-semibold">SPKP-JTM</div>
                <div className="text-xs text-cyan-100/70">Jabatan Tenaga Manusia</div>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-white mb-1">Log Masuk</h2>
            <p className="text-sm text-cyan-100/70 mb-6">Sila masukkan kredensial akaun JTM anda</p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-cyan-50/90">E-mel</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-200/60" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@spkp-jtm.gov.my"
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/15"
                    autoComplete="email"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-cyan-50/90">Kata Laluan</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-200/60" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••"
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/15"
                    autoComplete="current-password"
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white border-0 h-11 font-semibold shadow-lg shadow-cyan-500/30"
              >
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {loading ? 'Mengesahkan...' : 'Log Masuk Sistem'}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-white/10">
              <div className="text-xs uppercase tracking-wider text-cyan-100/60 mb-3">Akaun Demo (klik untuk autofill)</div>
              <div className="grid grid-cols-2 gap-2">
                {demoAccounts.map((a) => (
                  <button
                    key={a.email}
                    onClick={() => quickFill(a.email)}
                    className="glass-subtle hover-lift p-3 text-left transition group"
                  >
                    <div className="text-sm font-semibold text-white">{a.label}</div>
                    <div className="text-[10px] text-cyan-100/60 truncate">{a.email}</div>
                    <div className="text-[10px] text-cyan-200/50 mt-1">{a.desc}</div>
                  </button>
                ))}
              </div>
              <div className="mt-3 text-center text-[11px] text-cyan-100/50">
                Kata laluan demo: <code className="bg-white/10 px-1.5 py-0.5 rounded">Spkp@2026</code>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
