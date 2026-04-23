// BurnFat V2: AI 체지방 감량 조언 Edge Function
// Supabase Edge Functions (Deno)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { participant_id } = await req.json();
    if (!participant_id) {
      return new Response(
        JSON.stringify({ error: 'participant_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiKey) {
      return new Response(
        JSON.stringify({ error: 'OPENAI_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: participant, error: pErr } = await supabase
      .from('participants')
      .select('*, challenges(start_date, end_date, title)')
      .eq('id', participant_id)
      .single();

    if (pErr || !participant) {
      return new Response(
        JSON.stringify({ error: 'Participant not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: logs } = await supabase
      .from('weekly_logs')
      .select('*')
      .eq('participant_id', participant_id)
      .order('week_no', { ascending: true });

    let startDate = '';
    let endDate = '';
    const ch = participant.challenges;
    if (ch) {
      const c = Array.isArray(ch) ? ch[0] : ch;
      startDate = (c as { start_date?: string })?.start_date || '';
      endDate = (c as { end_date?: string })?.end_date || '';
    }
    if (!startDate && participant.challenge_id) {
      const { data: chal } = await supabase.from('challenges').select('start_date, end_date').eq('id', participant.challenge_id).single();
      if (chal) {
        startDate = chal.start_date || '';
        endDate = chal.end_date || '';
      }
    }

    const logsSummary = (logs || [])
      .map((l: { week_no: number; body_fat_rate: number | null; weight_kg: number | null }) => {
        const parts = [`${l.week_no}주차: 체지방 ${l.body_fat_rate != null ? l.body_fat_rate + '%' : '미기록'}`];
        if (l.weight_kg != null) parts.push(`몸무게 ${l.weight_kg}kg`);
        return parts.join(', ');
      })
      .join('\n');

    const ageStr = participant.age != null ? `${participant.age}세` : '미입력';
    const genderStr = participant.gender === 'M' ? '남성' : participant.gender === 'F' ? '여성' : '미입력';
    const targetStr = participant.target_body_fat != null ? `목표 ${participant.target_body_fat}%` : '미설정';

    const systemPrompt = `당신은 체지방 감량 다이어트 전문 코치입니다. 
참가자의 주간 기록(체지방률, 몸무게 등)과 기본 정보(나이, 성별, 목표)를 바탕으로 
간결하고 현실적인 조언을 2~4문장으로 제공하세요.
- 주 0.3~0.5%p 감소는 무리 없는 범위임을 안내
- 소폭 상승 시 수분·식사 타이밍, 단백질·수면 점검 권유
- 정체 구간 시 운동 강도·식단 점검 제안
- 한국어로 답변`;

    const userContent = `참가자: ${participant.nickname}
기본정보: ${ageStr}, ${genderStr}, ${targetStr}
대결 기간: ${startDate} ~ ${endDate}

주간 기록:
${logsSummary || '아직 기록 없음'}

위 데이터를 바탕으로 맞춤 조언을 해주세요.`;

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error('OpenAI error:', errText);
      return new Response(
        JSON.stringify({ error: 'AI service error' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openaiData = await openaiRes.json();
    const advice = openaiData.choices?.[0]?.message?.content?.trim() || '조언을 생성할 수 없습니다.';

    return new Response(
      JSON.stringify({ advice }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('ai-advice error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
