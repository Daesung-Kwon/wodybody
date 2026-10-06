/**
 * Sprint 3 Phase C — E2E 네트워크 모킹 (Playwright page.route 기반).
 *
 * 당초 MSW(playwright-msw)로 설계했으나 playwright-msw@3 (CJS) 가 msw@2 (ESM) 를
 * Playwright 의 require 로더 안에서 불러올 수 없어(ESM/CJS cycle) Playwright 의
 * 네이티브 page.route 로 동등하게 구현했다. 격리 보장은 동일하다 — 운영 Supabase/Grok
 * 으로 가는 모든 요청을 가로채 모킹하고, 운영 도메인 호출은 즉시 실패시킨다.
 *
 * `installMockApi(page)` 는 매 테스트마다 새 in-memory 스토어를 만든다. 스토어는
 * 테스트(Node) 프로세스에 살아 있으므로 페이지 새로고침에도 데이터가 유지된다.
 */
import type { Page, Route } from '@playwright/test';

interface Row {
  id: string;
  [key: string]: unknown;
}

interface Store {
  challenges: Row[];
  participants: Row[];
  submissions: Row[];
  weeklyLogs: Row[];
}

function json(route: Route, data: unknown, status = 200): Promise<void> {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
}

export async function installMockApi(page: Page): Promise<void> {
  const store: Store = { challenges: [], participants: [], submissions: [], weeklyLogs: [] };
  let seq = 0;
  const uid = (prefix: string) => `${prefix}-${(seq += 1).toString().padStart(4, '0')}`;
  const now = () => new Date().toISOString();

  await page.route('**/*', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const method = req.method();
    const path = url.pathname;

    /* ── 운영 도메인 트립와이어 — 도달 시 격리 실패. ── */
    if (/\.supabase\.co$/.test(url.hostname) || url.hostname.includes('wodybody-production')) {
      return route.fulfill({ status: 599, body: `E2E 격리 위반: ${req.url()}` });
    }

    /* ── Plausible — 외부 호출 차단. ── */
    if (url.hostname === 'plausible.io') {
      return route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
    }

    /* ── 모킹 대상이 아니면 dev 서버로 통과. ── */
    if (!path.startsWith('/mock/')) return route.continue();

    /* ── PostgREST RPC ── */
    if (path === '/mock/rest/v1/rpc/create_challenge_with_pin') {
      const body = (req.postDataJSON() ?? {}) as Record<string, unknown>;
      const row: Row = {
        id: uid('challenge'),
        code: String(body.p_code ?? 'E2ECODE').toUpperCase(),
        title: body.p_title ?? '대결',
        start_date: body.p_start_date ?? null,
        end_date: body.p_end_date ?? null,
        stake_amount: body.p_stake_amount ?? 0,
        created_at: now(),
        ranking_unlocked: false,
        has_admin_pin: body.p_admin_pin != null,
      };
      store.challenges.push(row);
      return json(route, row);
    }
    if (path === '/mock/rest/v1/rpc/verify_admin_pin') return json(route, true);
    if (
      path === '/mock/rest/v1/rpc/update_submission' ||
      path === '/mock/rest/v1/rpc/update_weekly_log'
    ) {
      return route.fulfill({ status: 204 });
    }

    /* ── Room-scoped RPC (RLS lockdown 2026-10) ── */
    const rpcBody = () => (req.postDataJSON() ?? {}) as Record<string, unknown>;
    const roomByCode = (code: unknown) =>
      store.challenges.find((c) => String(c.code) === String(code ?? '').trim().toUpperCase());
    const publicParticipant = (p: Row) => ({
      id: p.id,
      challenge_id: p.challenge_id,
      nickname: p.nickname,
      age: p.age ?? null,
      gender: p.gender ?? null,
      height_cm: p.height_cm ?? null,
      target_body_fat: p.target_body_fat ?? null,
      created_at: p.created_at,
    });
    const stripSecret = (r: Row) => {
      const { device_secret_hash: _d, ...rest } = r;
      void _d;
      return rest;
    };
    const roomError = (message: string, code: string, status = 400) =>
      json(route, { code, message, details: null, hint: null }, status);

    if (path === '/mock/rest/v1/rpc/get_challenge_by_code') {
      const room = roomByCode(rpcBody().p_code);
      return json(route, room ? [room] : []);
    }
    if (path === '/mock/rest/v1/rpc/get_room_participants') {
      const room = roomByCode(rpcBody().p_code);
      if (!room) return json(route, []);
      const list = store.participants
        .filter((p) => p.challenge_id === room.id)
        .map((p) => ({
          ...publicParticipant(p),
          submissions: store.submissions.filter((s) => s.participant_id === p.id).map(stripSecret),
        }));
      return json(route, list);
    }
    if (path === '/mock/rest/v1/rpc/get_room_weekly_logs') {
      const body = rpcBody();
      const room = roomByCode(body.p_code);
      if (!room) return json(route, []);
      const memberIds = new Set(store.participants.filter((p) => p.challenge_id === room.id).map((p) => p.id));
      const list = store.weeklyLogs
        .filter((w) => memberIds.has(String(w.participant_id)))
        .filter((w) => !body.p_participant_id || w.participant_id === body.p_participant_id)
        .sort((a, b) => Number(a.week_no) - Number(b.week_no))
        .map(stripSecret);
      return json(route, list);
    }
    if (path === '/mock/rest/v1/rpc/join_challenge') {
      const body = rpcBody();
      const room = roomByCode(body.p_code);
      if (!room) return roomError('challenge_not_found', 'P0002');
      const nickname = String(body.p_nickname ?? '').trim();
      if (store.participants.some((p) => p.challenge_id === room.id && p.nickname === nickname)) {
        return roomError('duplicate key value violates unique constraint "participants_challenge_id_nickname_key"', '23505', 409);
      }
      const row: Row = {
        id: uid('participant'),
        challenge_id: room.id,
        nickname,
        age: null,
        gender: null,
        height_cm: null,
        target_body_fat: null,
        created_at: now(),
      };
      store.participants.push(row);
      return json(route, publicParticipant(row));
    }
    const memberOf = (body: Record<string, unknown>) => {
      const room = roomByCode(body.p_code);
      return room
        ? store.participants.find((p) => p.id === body.p_participant_id && p.challenge_id === room.id)
        : undefined;
    };
    if (path === '/mock/rest/v1/rpc/update_participant_basic_info') {
      const body = rpcBody();
      const p = memberOf(body);
      if (!p) return roomError('participant_not_in_room', '42501', 403);
      Object.assign(p, {
        age: body.p_age ?? null,
        gender: body.p_gender ?? null,
        height_cm: body.p_height_cm ?? null,
        target_body_fat: body.p_target_body_fat ?? null,
      });
      return json(route, publicParticipant(p));
    }
    if (path === '/mock/rest/v1/rpc/create_submission') {
      const body = rpcBody();
      const p = memberOf(body);
      if (!p) return roomError('participant_not_in_room', '42501', 403);
      const row: Row = {
        id: uid('submission'),
        participant_id: p.id,
        type: body.p_type,
        body_fat_rate: body.p_body_fat_rate,
        image_url: body.p_image_path ?? null,
        device_secret_hash: body.p_device_secret_hash ?? null,
        created_at: now(),
      };
      store.submissions.push(row);
      return json(route, stripSecret(row));
    }
    if (path === '/mock/rest/v1/rpc/create_weekly_log') {
      const body = rpcBody();
      const p = memberOf(body);
      if (!p) return roomError('participant_not_in_room', '42501', 403);
      const ts = now();
      const row: Row = {
        ...((body.p_log ?? {}) as Record<string, unknown>),
        id: uid('weeklylog'),
        participant_id: p.id,
        device_secret_hash: body.p_device_secret_hash ?? null,
        created_at: ts,
        updated_at: ts,
      };
      store.weeklyLogs.push(row);
      return json(route, stripSecret(row));
    }

    /* ── 직접 테이블 접근 — 운영(마이그레이션 B 이후)과 동일하게 거부 ── */
    if (/^\/mock\/rest\/v1\/(participants|submissions|weekly_logs|challenges|challenges_public)$/.test(path)) {
      return roomError(`permission denied for table ${path.split('/').pop()}`, '42501', 401);
    }

    /* ── 인증 이미지 서버측 서명 (backend /api/burnfat/images/sign) ── */
    if (path === '/mock/images/sign' && method === 'POST') {
      const body = rpcBody();
      const paths = Array.isArray(body.paths) ? (body.paths as string[]) : [];
      const urls = Object.fromEntries(paths.map((p) => [p, `http://localhost:5173/mock/signed/${p}`]));
      return json(route, { urls, expires_in: 3600 });
    }

    /* ── Storage — 인바디 이미지 업로드 ── */
    if (path.startsWith('/mock/storage/v1/object/inbody/')) {
      return json(route, { Key: 'inbody/e2e-mock.jpg', Id: uid('storage') });
    }

    /* ── AI 조언 — Sprint 2 JSON 스키마 stub ── */
    if (path === '/mock/ai/advice') {
      return json(route, {
        advice: 'E2E 모킹된 AI 조언입니다. 단백질 섭취를 늘리고 수분을 충분히 유지하세요.',
        summary: 'E2E 모킹 요약 — 이번 주는 기본기에 집중하세요.',
        action_items: ['하루 물 2L 마시기', '주 3회 근력 운동', '취침 7시간 확보'],
        cautions: ['급격한 절식은 정체를 부릅니다'],
        cached: false,
        week_no: 1,
      });
    }

    /* ── 코치 ── */
    if (path === '/mock/coach/sessions' && method === 'GET') {
      return json(route, { sessions: [] });
    }
    if (/^\/mock\/coach\/sessions\/[^/]+\/messages$/.test(path)) {
      return json(route, { session: null, messages: [] });
    }
    if (path === '/mock/coach/messages' && method === 'POST') {
      const reply = '안녕하세요! E2E 코치입니다. 이번 주 기록을 함께 살펴봐요.';
      const sse =
        `data: ${JSON.stringify({
          session_id: 'e2e-session',
          session_created: true,
          week_messages_used: 1,
          week_messages_limit: 30,
        })}\n\n` +
        `data: ${JSON.stringify({ delta: reply })}\n\n` +
        `data: ${JSON.stringify({
          done: true,
          session_id: 'e2e-session',
          message: {
            id: uid('coachmsg'),
            session_id: 'e2e-session',
            role: 'assistant',
            content: reply,
            tokens_in: 0,
            tokens_out: 0,
            references_jsonb: [],
            created_at: now(),
          },
          references: [],
        })}\n\n`;
      return route.fulfill({ status: 200, contentType: 'text/event-stream', body: sse });
    }
    if (/^\/mock\/coach\//.test(path)) {
      // end / memory reset 등 — 본 시나리오에서 미사용이지만 안전하게 204.
      return route.fulfill({ status: 204 });
    }

    // 그 외 /mock/* — 미정의 경로. 누락을 드러내도록 404.
    return route.fulfill({ status: 404, body: `mock: unhandled ${method} ${path}` });
  });
}
