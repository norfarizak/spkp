import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, logAudit, sanitizeText } from '@/lib/auth'
import { db } from '@/lib/db'
import ZAI from 'z-ai-web-dev-sdk'

export async function POST(req: NextRequest) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  const { user } = ctx

  const body = await req.json().catch(() => ({} as any))
  const nossCode = sanitizeText(body.nossCode || '').slice(0, 50)
  const level = sanitizeText(body.level || 'Diploma').slice(0, 30)
  const field = sanitizeText(body.field || '').slice(0, 200)

  if (!nossCode) return NextResponse.json({ error: 'Kod NOSS diperlukan' }, { status: 400 })

  const noss = await db.nossLibrary.findUnique({ where: { nossCode }, include: { cus: true } })

  const prompt = `Berdasarkan NOSS berikut, jana draf struktur kurikulum TVET Malaysia:

NOSS Code: ${nossCode}
Tajuk NOSS: ${noss?.title || field}
Sektor: ${noss?.sector || field}
Tahap: ${level}

CU yang sedia ada dalam NOSS:
${noss?.cus.map((c) => `- ${c.cuCode}: ${c.title}`).join('\n') || 'Tiada'}

Tahap program dicadang: ${level}

Jana struktur kurikulum dalam Markdown:
# DRAF KURIKULUM - [Nama Program]
## Maklumat Asas
- Kod: [auto]
- Tahap: ${level}
- Tempoh: [bulan]
- Jumlah Kredit: [anggaran]

## Struktur Kursus
### Kursus 1: [nama]
- CU1: [code] - [title] - [credit]
- CU2: ...

### Kursus 2: [nama]
...

## CoCU (Ko-Kurikulum)
- [cadangan]

## Pemetaan NOSS
- 100% CU dipetakan kepada NOSS ${nossCode}

Jawab dalam Bahasa Melayu formal TVET.`

  try {
    const zai = await ZAI.create()
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: 'Anda penjana kurikulum TVET JTM Malaysia. Output Markdown dalam Bahasa Melayu.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.6,
      max_tokens: 1500,
    })
    const draft = completion.choices?.[0]?.message?.content || ''

    await db.aiGenerationLog.create({
      data: {
        userId: user.id,
        feature: 'curriculum_generator',
        input: { nossCode, level, field },
        output: { draft_length: draft.length },
        model: 'glm-5.2',
        tokensUsed: (completion.usage?.total_tokens as number) || Math.ceil(draft.length / 4),
      },
    })
    await logAudit({
      tableName: 'programs',
      recordId: nossCode,
      action: 'INSERT',
      newValues: { feature: 'ai_curriculum_generator' },
      performedById: user.id,
      source: 'AI_GENERATED',
    })

    return NextResponse.json({ draft, disclaimer: 'Draf AI - Perlu Semakan Manusia' })
  } catch (e: any) {
    console.error('[AI CURR GEN ERROR]', e)
    return NextResponse.json({ error: 'Penjanaan AI gagal.' }, { status: 500 })
  }
}
