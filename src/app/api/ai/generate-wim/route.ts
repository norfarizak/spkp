import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, logAudit, sanitizeText } from '@/lib/auth'
import { db } from '@/lib/db'
import ZAI from 'z-ai-web-dev-sdk'

export async function POST(req: NextRequest) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  const { user } = ctx

  const body = await req.json().catch(() => ({} as any))
  const cuId = body.cuId as string
  const sheetType = sanitizeText(body.sheetType || 'Assignment Sheet').slice(0, 50)
  const additionalContext = sanitizeText(body.context || '').slice(0, 1000)

  if (!cuId) return NextResponse.json({ error: 'CU ID diperlukan' }, { status: 400 })

  const cu = await db.competencyUnit.findUnique({
    where: { id: cuId },
    include: { program: true, outcomes: true },
  })
  if (!cu) return NextResponse.json({ error: 'CU tidak dijumpai' }, { status: 404 })

  const prompt = `Jana draf ${sheetType} TVET Malaysia yang lengkap dan profesional untuk Unit Kompetensi berikut:

Program: ${cu.program?.name || '-'}
Kod CU: ${cu.cuCode}
Tajuk CU: ${cu.title}
Learning Outcome: ${cu.learningOutcome || '-'}
Performance Criteria: ${cu.performanceCriteria || '-'}
Knowledge: ${cu.knowledge || '-'}
Skill: ${cu.skill || '-'}
Attitude: ${cu.attitude || '-'}
Tools/Equipment: ${cu.toolsEquipment || '-'}
Credit Hour: ${cu.creditHour}

Learning Outcomes (LO):
${cu.outcomes.map((o) => `- ${o.code}: ${o.description} (Band ${o.band})`).join('\n')}

Konteks tambahan: ${additionalContext || 'Tiada'}

Format output dalam Markdown:
# ${sheetType.toUpperCase()}
## Maklumat Asas
- Kod: WIM-[program_code]-[auto]
- Tajuk: [tajuk]
- Masa: [anggaran jam]
- Peralatan: [senarai]

## Objektif
[Objektif pembelajaran]

## Arahan Keselamatan
[Langkah keselamatan]

## Prosedur / Arahan Langkah Demi Langkah
1. ...
2. ...

## Kriteria Penilaian
[Senarai kriteria]

## Soalan Penilaian
1. ...
2. ...

## Rujukan
[Senarai rujukan]

Jawab dalam Bahasa Melayu formal TVET.`

  try {
    const zai = await ZAI.create()
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: 'Anda penjana WIM TVET JTM Malaysia yang profesional. Output mesti dalam Bahasa Melayu, format Markdown, siap digunakan sebagai draf.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.6,
      max_tokens: 1500,
    })

    const draft = completion.choices?.[0]?.message?.content || ''

    await db.aiGenerationLog.create({
      data: {
        userId: user.id,
        feature: 'wim_generator',
        input: { cuId, sheetType, context: additionalContext },
        output: { draft_length: draft.length },
        model: 'glm-5.2',
        tokensUsed: (completion.usage?.total_tokens as number) || Math.ceil(draft.length / 4),
      },
    })
    await logAudit({
      tableName: 'wim_documents',
      recordId: cuId,
      action: 'INSERT',
      newValues: { feature: 'ai_wim_generator', sheetType },
      performedById: user.id,
      source: 'AI_GENERATED',
    })

    return NextResponse.json({ draft, disclaimer: 'Draf AI - Perlu Semakan Manusia' })
  } catch (e: any) {
    console.error('[AI WIM GEN ERROR]', e)
    return NextResponse.json({ error: 'Penjanaan AI gagal. Sila cuba lagi.' }, { status: 500 })
  }
}
