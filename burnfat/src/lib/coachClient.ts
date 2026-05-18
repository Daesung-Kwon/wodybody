/**
 * Sprint 2.5 — 대화형 코치 백엔드 클라이언트.
 *
 * 백엔드: wodybody Flask `/api/burnfat/coach/*`.
 * - 메시지 전송은 SSE 스트리밍 → fetch + ReadableStream 으로 토큰 단위 수신
 *   (EventSource 는 GET 전용이라 POST 스트리밍에 부적합).
 * - 세션 소유권용 device_secret 을 X-Device-Secret 헤더로 자동 첨부.
 */
import { generateDeviceSecret } from './deviceSecret';
import type {
  CoachMessage,
  CoachMessageReference,
  CoachPersona,
  CoachSession,
  CoachVisibility,
} from '../types';

const WODYBODY_COACH_BASE = 'https://wodybody-production.up.railway.app/api/burnfat/coach';

function resolveCoachBase(): string {
  const adviceUrl = import.meta.env.VITE_AI_ADVICE_URL?.trim();
  if (adviceUrl && /\/ai\/advice\/?$/.test(adviceUrl)) {
    return adviceUrl.replace(/\/ai\/advice\/?$/, '/coach');
  }
  return WODYBODY_COACH_BASE;
}

/* ── device_secret — 디바이스당 1개 영속 ──────────────────────────────── */

const COACH_SECRET_KEY = 'burnfat:coach:deviceSecret';

export function getCoachDeviceSecret(): string {
  try {
    let s = localStorage.getItem(COACH_SECRET_KEY);
    if (!s) {
      s = generateDeviceSecret();
      localStorage.setItem(COACH_SECRET_KEY, s);
    }
    return s;
  } catch {
    return generateDeviceSecret();
  }
}

/** `[ref:W2,W3]` 인용 마커를 표시 텍스트에서 제거 (스트리밍 중 임시 표시 방지). */
const REF_MARKER_RE = /\[ref:[^\]]*\]/gi;
export function stripRefMarkers(text: string): string {
  return text.replace(REF_MARKER_RE, '').trim();
}

function deviceHeaders(json = false): Record<string, string> {
  const h: Record<string, string> = { 'X-Device-Secret': getCoachDeviceSecret() };
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

async function parseError(res: Response, fallback: string): Promise<string> {
  try {
    const j = JSON.parse(await res.text()) as { error?: string };
    if (j.error) return j.error;
  } catch {
    /* not json */
  }
  return fallback;
}

/* ── 세션 목록 / 복원 ──────────────────────────────────────────────────── */

export interface CoachSessionPreview {
  id: string;
  week_no: number;
  persona: CoachPersona;
  status: 'active' | 'archived';
  visibility: CoachVisibility;
  created_at: string;
  updated_at: string;
  preview: string;
  owned: boolean;
}

export async function fetchCoachSessions(
  participantId: string,
  weekNo: number
): Promise<CoachSessionPreview[]> {
  const url = `${resolveCoachBase()}/sessions?participant_id=${encodeURIComponent(
    participantId
  )}&week_no=${weekNo}`;
  const res = await fetch(url, { headers: deviceHeaders() });
  if (!res.ok) throw new Error(await parseError(res, '세션 목록을 불러오지 못했어요.'));
  const data = (await res.json()) as { sessions?: CoachSessionPreview[] };
  return data.sessions ?? [];
}

export async function fetchCoachSessionMessages(
  sessionId: string
): Promise<{ session: CoachSession; messages: CoachMessage[] }> {
  const res = await fetch(`${resolveCoachBase()}/sessions/${sessionId}/messages`, {
    headers: deviceHeaders(),
  });
  if (!res.ok) throw new Error(await parseError(res, '대화를 불러오지 못했어요.'));
  return (await res.json()) as { session: CoachSession; messages: CoachMessage[] };
}

export async function endCoachSession(sessionId: string): Promise<void> {
  const res = await fetch(`${resolveCoachBase()}/sessions/${sessionId}/end`, {
    method: 'POST',
    headers: deviceHeaders(),
  });
  if (!res.ok) throw new Error(await parseError(res, '세션 종료에 실패했어요.'));
}

export async function resetCoachMemory(participantId: string): Promise<void> {
  const res = await fetch(`${resolveCoachBase()}/memory/reset`, {
    method: 'POST',
    headers: deviceHeaders(true),
    body: JSON.stringify({ participant_id: participantId }),
  });
  if (!res.ok) throw new Error(await parseError(res, '기억 초기화에 실패했어요.'));
}

/* ── 메시지 전송 (SSE 스트리밍) ────────────────────────────────────────── */

export interface SendCoachMessageRequest {
  sessionId?: string;
  participantId: string;
  weekNo: number;
  content: string;
  persona?: CoachPersona;
  visibility?: CoachVisibility;
  /** 새 세션 생성 시 첫 어시스턴트 시드 메시지로 쓸 카드 콘텐츠. */
  seedContent?: string;
}

export interface CoachStreamHandlers {
  onStart?: (info: {
    sessionId: string;
    sessionCreated: boolean;
    weekMessagesUsed: number;
    weekMessagesLimit: number;
  }) => void;
  onDelta: (text: string) => void;
  onDone: (info: {
    sessionId: string;
    message: CoachMessage | null;
    references: CoachMessageReference[];
  }) => void;
  onError: (message: string) => void;
}

export async function streamCoachMessage(
  req: SendCoachMessageRequest,
  handlers: CoachStreamHandlers
): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${resolveCoachBase()}/messages`, {
      method: 'POST',
      headers: deviceHeaders(true),
      body: JSON.stringify({
        session_id: req.sessionId,
        participant_id: req.participantId,
        week_no: req.weekNo,
        content: req.content,
        persona: req.persona,
        visibility: req.visibility,
        seed_content: req.seedContent,
      }),
    });
  } catch {
    handlers.onError('네트워크 오류로 코치에 연결하지 못했어요.');
    return;
  }

  if (!res.ok) {
    handlers.onError(await parseError(res, `코치 요청 실패 (${res.status})`));
    return;
  }
  const reader = res.body?.getReader();
  if (!reader) {
    handlers.onError('응답 스트림을 열 수 없어요.');
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';
    for (const ev of events) {
      const dataLine = ev.split('\n').find((l) => l.startsWith('data:'));
      if (!dataLine) continue;
      const payload = dataLine.slice(5).trim();
      if (!payload) continue;
      let obj: Record<string, unknown>;
      try {
        obj = JSON.parse(payload) as Record<string, unknown>;
      } catch {
        continue;
      }
      if (typeof obj.error === 'string') {
        handlers.onError(obj.error);
        return;
      }
      if (obj.done === true) {
        handlers.onDone({
          sessionId: String(obj.session_id ?? req.sessionId ?? ''),
          message: (obj.message as CoachMessage | null) ?? null,
          references: Array.isArray(obj.references)
            ? (obj.references as CoachMessageReference[])
            : [],
        });
        continue;
      }
      if (typeof obj.delta === 'string') {
        handlers.onDelta(obj.delta);
        continue;
      }
      if (typeof obj.session_id === 'string' && 'session_created' in obj) {
        handlers.onStart?.({
          sessionId: String(obj.session_id),
          sessionCreated: obj.session_created === true,
          weekMessagesUsed:
            typeof obj.week_messages_used === 'number' ? obj.week_messages_used : 0,
          weekMessagesLimit:
            typeof obj.week_messages_limit === 'number' ? obj.week_messages_limit : 30,
        });
      }
    }
  }
}
