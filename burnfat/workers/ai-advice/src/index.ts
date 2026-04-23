/**
 * BurnFat AI 조언 - Cloudflare Workers AI
 * 일 10,000 Neurons 무료
 */

export interface Env {
  AI: { run: (model: string, options: object) => Promise<unknown> };
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    try {
      const { participant_id } = (await request.json()) as { participant_id?: string };
      if (!participant_id) {
        return json({ error: 'participant_id required' }, 400);
      }

      const supabaseUrl = env.SUPABASE_URL?.replace(/\/$/, '');
      const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
      if (!supabaseUrl || !supabaseKey) {
        return json({ error: 'Supabase not configured' }, 500);
      }

      const participant = await fetchParticipant(supabaseUrl, supabaseKey, participant_id);
      if (!participant) {
        return json({ error: 'Participant not found' }, 404);
      }

      const logs = await fetchWeeklyLogs(supabaseUrl, supabaseKey, participant_id);
      const { startDate, endDate } = await resolveChallengeDates(supabaseUrl, supabaseKey, participant as Record<string, unknown>);

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
- 반드시 한국어로 답변하세요.`;

      const userContent = `참가자: ${participant.nickname}
기본정보: ${ageStr}, ${genderStr}, ${targetStr}
대결 기간: ${startDate} ~ ${endDate}

주간 기록:
${logsSummary || '아직 기록 없음'}

위 데이터를 바탕으로 맞춤 조언을 해주세요.`;

      const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct-fp8-fast', {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        max_tokens: 300,
      });

      const raw = response as { response?: string } | string;
      const advice =
        (typeof raw === 'string' ? raw : raw?.response)?.trim() || '조언을 생성할 수 없습니다.';

      return json({ advice }, 200);
    } catch (err) {
      console.error('ai-advice error:', err);
      return json({ error: 'Internal server error' }, 500);
    }
  },
};

function json(body: object, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function fetchParticipant(
  supabaseUrl: string,
  key: string,
  participantId: string
): Promise<Record<string, unknown> | null> {
  const res = await fetch(
    `${supabaseUrl}/rest/v1/participants?id=eq.${participantId}&select=*`,
    {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
      },
    }
  );
  const data = await res.json();
  return Array.isArray(data) && data.length > 0 ? data[0] : null;
}

async function fetchWeeklyLogs(
  supabaseUrl: string,
  key: string,
  participantId: string
): Promise<Record<string, unknown>[]> {
  const res = await fetch(
    `${supabaseUrl}/rest/v1/weekly_logs?participant_id=eq.${participantId}&order=week_no.asc`,
    {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
      },
    }
  );
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function resolveChallengeDates(
  supabaseUrl: string,
  key: string,
  participant: Record<string, unknown>
): Promise<{ startDate: string; endDate: string }> {
  let startDate = '';
  let endDate = '';
  const challengeId = participant.challenge_id;
  if (challengeId) {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/challenges?id=eq.${challengeId}&select=start_date,end_date`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          Accept: 'application/json',
        },
      }
    );
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      startDate = String(data[0].start_date || '');
      endDate = String(data[0].end_date || '');
    }
  }
  return { startDate, endDate };
}
