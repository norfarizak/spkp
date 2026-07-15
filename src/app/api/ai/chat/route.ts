import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, logAudit, sanitizeText } from '@/lib/auth'
import { db } from '@/lib/db'
import ZAI from 'z-ai-web-dev-sdk'

export async function POST(req: NextRequest) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 })
  const { user, session } = ctx

  const body = await req.json().catch(() => ({} as any))
  const message = sanitizeText(body.message || '').slice(0, 2000)
  if (!message) return NextResponse.json({ error: 'Mesej diperlukan' }, { status: 400 })

  // Gather minimal context about the system for RAG-lite
  const programCount = await db.program.count()
  const nossCount = await db.nossLibrary.count()
  const wimCount = await db.wimDocument.count()
  const expertCount = await db.expert.count()
  const systemContext = `Anda adalah GLM Assistant untuk SPKP-JTM (Sistem Pengurusan Kurikulum dan Pentauliahan Jabatan Tenaga Manusia Malaysia). 
Sistem ini menguruskan: ${programCount} program, ${nossCount} NOSS, ${wimCount} dokumen WIM, ${expertCount} panel pakar.
Pengguna semasa: ${user.fullName} (${session.roleCodes.join(', ')}).
Bahasa utama: Bahasa Melayu. Konteks: TVET Malaysia, NOSS (National Occupational Skills Standard), WIM (Working Instructional Material), Pentauliahan institusi.
Jawab dengan ringkas, profesional, dan bantu pengguna dengan tugasan TVET. Jika soalan di luar skop sistem, beritahu pengguna.`

  try {
    const zai = await ZAI.create()
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemContext },
        { role: 'user', content: message },
      ],
      temperature: 0.7,
      max_tokens: 800,
    })

    const reply = completion.choices?.[0]?.message?.content || 'Maaf, saya tidak dapat menjana respons. Sila cuba lagi.'

    await db.aiGenerationLog.create({
      data: {
        userId: user.id,
        feature: 'chat',
        input: { message },
        output: { reply: reply.slice(0, 500) },
        model: 'glm-5.2',
        tokensUsed: (completion.usage?.total_tokens as number) || Math.ceil(reply.length / 4),
      },
    })

    await logAudit({
      tableName: 'ai_generation_logs',
      recordId: user.id,
      action: 'INSERT',
      newValues: { feature: 'chat', message_length: message.length },
      performedById: user.id,
      source: 'AI_GENERATED',
    })

    return NextResponse.json({ reply, disclaimer: 'Draf AI - Perlu Semakan Manusia' })
  } catch (e: any) {
    console.error('[AI CHAT ERROR]', e)
    // Fallback response - don't expose internal errors
    const fallback = `Saya minta maaf, terdapat ralat sementara dalam pemprosesan. Soalan anda: "${message}". 

Saya boleh membantu anda dengan:
1. Menjana draf WIM (Working Instructional Material) berdasarkan CU/LO
2. Mencadangkan struktur kurikulum dari kod NOSS
3. Membuat rubrik pemarkahan
4. Mapping CU kepada NOSS rasmi
5. Menjawab soalan tentang proses pentauliahan

Sila cuba sekali lagi atau guna menu AI Assistant untuk fungsi penjanaan khusus.`

    return NextResponse.json({ reply: fallback, disclaimer: 'Draf AI - Perlu Semakan Manusia' })
  }
}
