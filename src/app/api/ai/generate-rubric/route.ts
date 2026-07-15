import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, logAudit, sanitizeText } from '@/lib/auth'
import ZAI from 'z-ai-web-dev-sdk'

export async function POST(req: NextRequest) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  const { user } = ctx

  const body = await req.json().catch(() => ({} as any))
  const learningOutcome = sanitizeText(body.learningOutcome || '').slice(0, 500)
  const assessmentType = sanitizeText(body.assessmentType || 'Praktikal').slice(0, 50)

  if (!learningOutcome) return NextResponse.json({ error: 'Learning Outcome diperlukan' }, { status: 400 })

  const prompt = `Jana rubrik pemarkahan TVET berdasarkan:

Learning Outcome: ${learningOutcome}
Jenis Penilaian: ${assessmentType}

Format output Markdown:
# RUBRIK PEMARKAHAN

| Kriteria | Band 4 (Cemerlang) 90-100 | Band 3 (Baik) 75-89 | Band 2 (Memuaskan) 60-74 | Band 1 (Lemah) <60 |
|---|---|---|---|---|
| [Kriteria 1] | ... | ... | ... | ... |
| [Kriteria 2] | ... | ... | ... | ... |
| [Kriteria 3] | ... | ... | ... | ... |

## Skor Maksimum: 100
## Lulus: Band 2 ke atas

Jana 4-5 kriteria penilaian yang relevan. Jawab dalam Bahasa Melayu formal TVET.`

  try {
    const zai = await ZAI.create()
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: 'Anda penjana rubrik TVET JTM Malaysia. Output Markdown table.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 1000,
    })
    const draft = completion.choices?.[0]?.message?.content || ''

    await logAudit({
      tableName: 'rubrics',
      recordId: 'ai-generated',
      action: 'INSERT',
      newValues: { feature: 'ai_rubric_generator', assessmentType },
      performedById: user.id,
      source: 'AI_GENERATED',
    })

    return NextResponse.json({ draft, disclaimer: 'Draf AI - Perlu Semakan Manusia' })
  } catch (e: any) {
    console.error('[AI RUBRIC ERROR]', e)
    return NextResponse.json({ error: 'Penjanaan AI gagal.' }, { status: 500 })
  }
}
