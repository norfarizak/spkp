'use client'
import { useState } from 'react'
import { GlassCard, PageHeader } from '@/components/glass'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Bot, Sparkles, Wand2, FileText, BookOpen, GraduationCap, Search, Send, Loader2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

export function AiModule() {
  const [loading, setLoading] = useState<string | null>(null)
  const [wimCuId, setWimCuId] = useState('')
  const [wimSheetType, setWimSheetType] = useState('Assignment Sheet')
  const [wimOutput, setWimOutput] = useState('')
  const [currNoss, setCurrNoss] = useState('EE-010-3:2020')
  const [currLevel, setCurrLevel] = useState('Diploma')
  const [currOutput, setCurrOutput] = useState('')
  const [rubricLO, setRubricLO] = useState('')
  const [rubricOutput, setRubricOutput] = useState('')
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])

  async function genWim() {
    if (!wimCuId) return toast.error('Masukkan CU ID')
    setLoading('wim')
    setWimOutput('')
    try {
      const res = await fetch('/api/ai/generate-wim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cuId: wimCuId, sheetType: wimSheetType }),
        credentials: 'include',
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      setWimOutput(d.draft)
      toast.success('Draf WIM dijana. Sila semak sebelum digunakan.')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(null)
    }
  }

  async function genCurriculum() {
    if (!currNoss) return toast.error('Masukkan kod NOSS')
    setLoading('curr')
    setCurrOutput('')
    try {
      const res = await fetch('/api/ai/generate-curriculum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nossCode: currNoss, level: currLevel }),
        credentials: 'include',
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      setCurrOutput(d.draft)
      toast.success('Draf kurikulum dijana')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(null)
    }
  }

  async function genRubric() {
    if (!rubricLO) return toast.error('Masukkan Learning Outcome')
    setLoading('rubric')
    setRubricOutput('')
    try {
      const res = await fetch('/api/ai/generate-rubric', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ learningOutcome: rubricLO }),
        credentials: 'include',
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      setRubricOutput(d.draft)
      toast.success('Rubrik dijana')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(null)
    }
  }

  async function doSearch() {
    if (!searchQ.trim()) return
    setLoading('search')
    try {
      const res = await fetch(`/api/ai/smart-search?q=${encodeURIComponent(searchQ)}`, { credentials: 'include' })
      const d = await res.json()
      setSearchResults(d.results || [])
    } catch (e) {
      toast.error('Carian gagal')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Bot}
        title="AI Assistant (GLM 5.2)"
        description="Penjanaan kurikulum, WIM, rubrik & mapping NOSS dikuasakan z.ai GLM 5.2"
        actions={
          <Badge className="bg-purple-500/20 text-purple-200 border-purple-400/40">
            <Sparkles className="w-3 h-3 mr-1" /> Powered by GLM 5.2
          </Badge>
        }
      />

      <GlassCard className="p-4 border-l-4 border-l-amber-400">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-300 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-semibold text-amber-200 mb-1">Governans AI</div>
            <div className="text-cyan-100/80 text-xs">
              Semua output AI dilabel <strong>Draf AI - Perlu Semakan Manusia</strong> dan tidak boleh melangkau langkah kelulusan rasmi dalam Enjin Aliran Kerja. Setiap penjanaan direkod dalam audit log dengan penanda <code className="bg-white/10 px-1 rounded">source = AI_GENERATED</code>.
            </div>
          </div>
        </div>
      </GlassCard>

      <Tabs defaultValue="wim">
        <TabsList className="glass border-white/15">
          <TabsTrigger value="wim" className="data-[state=active]:bg-white/15 data-[state=active]:text-white text-cyan-100"><FileText className="w-3.5 h-3.5 mr-1.5" /> WIM Generator</TabsTrigger>
          <TabsTrigger value="curr" className="data-[state=active]:bg-white/15 data-[state=active]:text-white text-cyan-100"><BookOpen className="w-3.5 h-3.5 mr-1.5" /> Kurikulum</TabsTrigger>
          <TabsTrigger value="rubric" className="data-[state=active]:bg-white/15 data-[state=active]:text-white text-cyan-100"><GraduationCap className="w-3.5 h-3.5 mr-1.5" /> Rubrik</TabsTrigger>
          <TabsTrigger value="search" className="data-[state=active]:bg-white/15 data-[state=active]:text-white text-cyan-100"><Search className="w-3.5 h-3.5 mr-1.5" /> Smart Search</TabsTrigger>
        </TabsList>

        <TabsContent value="wim" className="mt-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <GlassCard className="p-5 space-y-3">
              <h3 className="text-white font-semibold flex items-center gap-2"><Wand2 className="w-4 h-4 text-cyan-300" /> Penjana WIM</h3>
              <div>
                <Label className="text-cyan-100/80 text-xs">Competency Unit ID</Label>
                <Input value={wimCuId} onChange={(e) => setWimCuId(e.target.value)} placeholder="cuid... (dari halaman Kurikulum)" className="bg-white/10 border-white/15 text-white" />
              </div>
              <div>
                <Label className="text-cyan-100/80 text-xs">Jenis Sheet</Label>
                <Select value={wimSheetType} onValueChange={setWimSheetType}>
                  <SelectTrigger className="bg-white/10 border-white/15 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="glass-strong border-white/20 text-white">
                    {['Assignment Sheet', 'Information Sheet', 'Work Sheet', 'Job Sheet', 'Operation Sheet'].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={genWim} disabled={loading === 'wim'} className="bg-gradient-to-r from-cyan-500 to-teal-500 border-0 text-white w-full">
                {loading === 'wim' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Jana Draf WIM
              </Button>
            </GlassCard>
            <GlassCard className="p-5">
              <h3 className="text-white font-semibold mb-3">Output</h3>
              {wimOutput ? (
                <pre className="text-xs text-cyan-50 whitespace-pre-wrap max-h-[400px] overflow-y-auto scroll-area bg-black/20 p-3 rounded-lg">{wimOutput}</pre>
              ) : (
                <div className="text-center py-12 text-cyan-100/40 text-sm">Output draf akan dipaparkan di sini</div>
              )}
            </GlassCard>
          </div>
        </TabsContent>

        <TabsContent value="curr" className="mt-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <GlassCard className="p-5 space-y-3">
              <h3 className="text-white font-semibold flex items-center gap-2"><BookOpen className="w-4 h-4 text-cyan-300" /> Penjana Kurikulum</h3>
              <div>
                <Label className="text-cyan-100/80 text-xs">Kod NOSS</Label>
                <Input value={currNoss} onChange={(e) => setCurrNoss(e.target.value)} className="bg-white/10 border-white/15 text-white" />
              </div>
              <div>
                <Label className="text-cyan-100/80 text-xs">Tahap Program</Label>
                <Select value={currLevel} onValueChange={setCurrLevel}>
                  <SelectTrigger className="bg-white/10 border-white/15 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="glass-strong border-white/20 text-white">
                    {['Sijil', 'Diploma', 'Diploma Lanjutan'].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={genCurriculum} disabled={loading === 'curr'} className="bg-gradient-to-r from-cyan-500 to-teal-500 border-0 text-white w-full">
                {loading === 'curr' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Jana Struktur Kurikulum
              </Button>
            </GlassCard>
            <GlassCard className="p-5">
              <h3 className="text-white font-semibold mb-3">Output</h3>
              {currOutput ? (
                <pre className="text-xs text-cyan-50 whitespace-pre-wrap max-h-[400px] overflow-y-auto scroll-area bg-black/20 p-3 rounded-lg">{currOutput}</pre>
              ) : (
                <div className="text-center py-12 text-cyan-100/40 text-sm">Output draf akan dipaparkan di sini</div>
              )}
            </GlassCard>
          </div>
        </TabsContent>

        <TabsContent value="rubric" className="mt-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <GlassCard className="p-5 space-y-3">
              <h3 className="text-white font-semibold flex items-center gap-2"><GraduationCap className="w-4 h-4 text-cyan-300" /> Penjana Rubrik</h3>
              <div>
                <Label className="text-cyan-100/80 text-xs">Learning Outcome</Label>
                <Textarea value={rubricLO} onChange={(e) => setRubricLO(e.target.value)} placeholder="cth: Pelajar dapat memasang litar kawalan motor elektrik mengikut SOP" className="bg-white/10 border-white/15 text-white min-h-[100px]" />
              </div>
              <Button onClick={genRubric} disabled={loading === 'rubric'} className="bg-gradient-to-r from-cyan-500 to-teal-500 border-0 text-white w-full">
                {loading === 'rubric' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Jana Rubrik
              </Button>
            </GlassCard>
            <GlassCard className="p-5">
              <h3 className="text-white font-semibold mb-3">Output</h3>
              {rubricOutput ? (
                <pre className="text-xs text-cyan-50 whitespace-pre-wrap max-h-[400px] overflow-y-auto scroll-area bg-black/20 p-3 rounded-lg">{rubricOutput}</pre>
              ) : (
                <div className="text-center py-12 text-cyan-100/40 text-sm">Output rubrik akan dipaparkan di sini</div>
              )}
            </GlassCard>
          </div>
        </TabsContent>

        <TabsContent value="search" className="mt-4">
          <GlassCard className="p-5">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2"><Search className="w-4 h-4 text-cyan-300" /> AI Smart Search</h3>
            <div className="flex gap-2">
              <Input value={searchQ} onChange={(e) => setSearchQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doSearch()} placeholder="Cari merentasi kurikulum, NOSS, WIM, CU..." className="bg-white/10 border-white/15 text-white" />
              <Button onClick={doSearch} disabled={loading === 'search'} className="bg-gradient-to-r from-cyan-500 to-teal-500 border-0 text-white">
                {loading === 'search' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
            <div className="mt-4 space-y-2 max-h-[400px] overflow-y-auto scroll-area">
              {searchResults.length === 0 ? (
                <div className="text-center py-8 text-cyan-100/40 text-sm">Hasil carian akan dipaparkan di sini</div>
              ) : (
                searchResults.map((r) => (
                  <div key={r.type + r.id} className="glass-subtle p-3 rounded-lg flex items-center gap-3">
                    <Badge className="bg-cyan-500/20 text-cyan-200 border-cyan-400/30">{r.type}</Badge>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white font-medium truncate">{r.title}</div>
                      <div className="text-[10px] text-cyan-100/60 truncate">{r.subtitle} · {r.meta}</div>
                    </div>
                    <Badge variant="outline" className="text-[9px] border-white/20 text-cyan-100">{r.status}</Badge>
                  </div>
                ))
              )}
            </div>
          </GlassCard>
        </TabsContent>
      </Tabs>
    </div>
  )
}
