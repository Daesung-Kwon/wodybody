/**
 * AI 조언: wodybody Flask → Grok(xAI) 프록시 전용.
 * - 기본(프로덕션·로컬): WODYBODY_GROK_AI_URL
 * - 덮어쓰기: VITE_AI_ADVICE_URL (스테이징·포크 시)
 */
const WODYBODY_GROK_AI_URL = 'https://wodybody-production.up.railway.app/api/burnfat/ai/advice';

function resolveAiAdviceUrl(): string {
  const fromEnv = import.meta.env.VITE_AI_ADVICE_URL?.trim();
  return fromEnv || WODYBODY_GROK_AI_URL;
}

export interface AIAdviceResponse {
  advice: string;
}

export interface AIAdviceRequest {
  participantId: string;
  userContext?: string;
  adviceStyle?: string;
  adviceGoal?: string;
}

interface AdviceErrorBody {
  error?: string;
}

function parseErrorMessage(res: Response, bodyText: string): string {
  try {
    const j = JSON.parse(bodyText) as AdviceErrorBody;
    if (j.error) {
      if (j.error === 'Failed to fetch participant' || j.error === 'Failed to fetch supporting data') {
        return '데이터를 불러오는 중 오류가 났어요. 잠시 후 다시 시도해 주세요.';
      }
      if (j.error === 'Participant not found') {
        return '참가자 정보를 찾을 수 없어요.';
      }
      if (j.error === 'AI service unavailable' || j.error === 'AI service not configured') {
        return 'AI 서비스에 일시적으로 연결할 수 없어요. 잠시 후 다시 시도해 주세요.';
      }
      if (j.error === 'Supabase not configured') {
        return '서버 설정 오류입니다. 관리자에게 문의해 주세요.';
      }
      return j.error;
    }
  } catch {
    // not JSON
  }
  if (res.status === 404) {
    return '참가자를 찾을 수 없어요.';
  }
  if (res.status === 502 || res.status === 503) {
    return 'AI 서비스에 일시적으로 연결할 수 없어요. 잠시 후 다시 시도해 주세요.';
  }
  return bodyText?.trim() || `AI 조언 요청 실패 (${res.status})`;
}

export async function fetchAIAdvice(req: AIAdviceRequest): Promise<AIAdviceResponse> {
  const url = resolveAiAdviceUrl();
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      participant_id: req.participantId,
      user_context: req.userContext?.trim() || undefined,
      advice_style: req.adviceStyle || undefined,
      advice_goal: req.adviceGoal || undefined,
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(parseErrorMessage(res, text));
  }

  let data: unknown;
  try {
    data = JSON.parse(text) as AIAdviceResponse;
  } catch {
    throw new Error('AI 응답을 해석할 수 없습니다.');
  }
  if (typeof data === 'object' && data && 'advice' in data && typeof (data as AIAdviceResponse).advice === 'string') {
    return data as AIAdviceResponse;
  }
  throw new Error('AI 응답 형식이 올바르지 않습니다.');
}
