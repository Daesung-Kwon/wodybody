# Live WOD PoC

영상 송출(Mux / IVS)은 포함하지 않는다. 이 브랜치는 드래프트이며 배포·운영 설정(`railway.toml`, `start.sh`, `vercel.json`)을 바꾸지 않는다.

## 한 프로세스 가정

리더보드 배치는 `backend/routes/live.py`의 프로세스 메모리 dirty set과 Socket.IO 백그라운드 태스크(약 1초)로만 이루어진다. Redis 어댑터가 없다.

이 가정은 현재 기동 명령과 같다. `backend/start.sh`는 `gunicorn --worker-class eventlet -w 1`이다. 워커를 늘리거나 레플리카를 두면 `live_{session_id}` 방과 탭 배치가 프로세스마다 갈라진다. 스케일 아웃 전에 Socket.IO message queue가 필요하다.

테이블은 요청 시 `checkfirst`로 만든다. 운영 Postgres에 넣는 SQL은 `backend/migrations/add_live_session_tables.sql`이며, 이 PoC는 그 파일을 실행하지 않는다.

## 시계

`started_at_ms`와 탭의 `server_ts_ms`는 UTC epoch 밀리초다. 클라이언트는 `/api/live/time`(그리고 소켓 ack `live_time_sync`)을 여러 번 찍어 NTP처럼 오프셋을 구한다. 남은 시간은 `started_at + duration - (Date.now() + offset)`이다.

허용 오차는 두 클라이언트 추정 시각 차이 ±250ms다. 측정 시나리오는 `frontend/src/lib/clockSync.test.ts`에 있다. 가장 짧은 RTT 샘플을 고르면, 시뮬레이트한 skew(+180ms / -220ms)와 비대칭 지연에서 클라이언트 간 차이는 **12ms**다.

## 점수

- AMRAP: 라운드 내림차순, 같으면 렙 내림차순. 동점은 같은 순위(1, 1, 3).
- For Time: 제한 시간(세션 `duration_sec`) 안에 완료한 사람만 시간 순. 완료자는 전원 미완주자보다 앞. 미완은 `reps_per_round`가 있으면 총 렙, 없으면 (라운드, 렙) 순.
- Rx와 Scaled는 별도 보드. 환산하지 않는다.

소켓 방 입장은 연결 때 검증한 토큰의 user id만 사용한다. 시작·종료는 `host_user_id`만 가능하다. `users.role`은 쓰지 않는다.
