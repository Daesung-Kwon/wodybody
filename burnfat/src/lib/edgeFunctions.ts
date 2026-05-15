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

/** Sprint 2: Grok 구조화 응답 — summary / 실천 항목 / 주의 항목. */
export interface StructuredAdvice {
  summary: string;
  actionItems: string[];
  cautions: string[];
}

export interface AIAdviceResponse {
  /** 평문 조언 — 항상 존재 (구버전 백엔드 호환). */
  advice: string;
  /** 구조화 조언 — 구버전 백엔드면 null (평문 폴백). */
  structured: StructuredAdvice | null;
  /** 서버 캐시에서 반환됐는지. */
  cached: boolean;
  /** 조언이 계산된 주차. 구버전 백엔드면 null. */
  weekNo: number | null;
}

export interface AIAdviceRequest {
  participantId: string;
  /** 캐시를 건너뛰고 새로 생성. */
  forceRefresh?: boolean;
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

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v ?? '').trim()).filter(Boolean);
}

export async function fetchAIAdvice(req: AIAdviceRequest): Promise<AIAdviceResponse> {
  const url = resolveAiAdviceUrl();
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      participant_id: req.participantId,
      force_refresh: req.forceRefresh || undefined,
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
    data = JSON.parse(text);
  } catch {
    throw new Error('AI 응답을 해석할 수 없습니다.');
  }
  if (typeof data !== 'object' || data === null) {
    throw new Error('AI 응답 형식이 올바르지 않습니다.');
  }

  const obj = data as Record<string, unknown>;
  const advice = typeof obj.advice === 'string' ? obj.advice : '';
  const summary = typeof obj.summary === 'string' ? obj.summary : '';
  const actionItems = toStringArray(obj.action_items);
  const cautions = toStringArray(obj.cautions);

  // 구버전 백엔드는 구조화 필드가 없다 → structured=null, 평문 advice 폴백.
  const hasStructured = summary !== '' || actionItems.length > 0;
  const structured: StructuredAdvice | null = hasStructured
    ? { summary, actionItems, cautions }
    : null;

  const effectiveAdvice = advice || summary;
  if (!effectiveAdvice) {
    throw new Error('AI 응답 형식이 올바르지 않습니다.');
  }

  return {
    advice: effectiveAdvice,
    structured,
    cached: obj.cached === true,
    weekNo: typeof obj.week_no === 'number' ? obj.week_no : null,
  };
}
