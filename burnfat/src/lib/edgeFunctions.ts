// AI 조언 엔드포인트 우선순위:
// 1) VITE_AI_ADVICE_URL (권장: wodybody Flask 백엔드의 /api/burnfat/ai/advice - Grok 프록시)
// 2) Supabase Edge Function 폴백 (레거시)
const AI_ADVICE_URL =
  import.meta.env.VITE_AI_ADVICE_URL ||
  (import.meta.env.VITE_SUPABASE_URL
    ? `${import.meta.env.VITE_SUPABASE_URL.replace('.supabase.co', '.supabase.co/functions/v1')}/ai-advice`
    : '');

export interface AIAdviceResponse {
  advice: string;
}

export async function fetchAIAdvice(participantId: string): Promise<AIAdviceResponse> {
  if (!AI_ADVICE_URL) {
    throw new Error('AI 조언 URL이 설정되지 않았습니다. VITE_AI_ADVICE_URL 또는 VITE_SUPABASE_URL을 확인하세요.');
  }
  const res = await fetch(AI_ADVICE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ participant_id: participantId }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `AI 조언 요청 실패 (${res.status})`);
  }

  return res.json() as Promise<AIAdviceResponse>;
}
