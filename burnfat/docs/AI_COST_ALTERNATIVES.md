# AI 조언 비용 구조 및 무료 대안

> **운영 현황(2026)**: 최종 선택은 **xAI Grok** 입니다. wodybody Flask 백엔드(Railway)의 `/api/burnfat/ai/advice` 프록시로 호출합니다. 아래 내용은 당시 후보군 비교 기록으로 남겨둡니다.

---

## 1. 현재 사용: OpenAI gpt-4o-mini

| 항목 | 비용 |
|------|------|
| 입력 | $0.15 / 100만 토큰 |
| 출력 | $0.60 / 100만 토큰 |
| 예상 (1회 조언) | ~500 토큰 → **약 $0.0005 (0.5원)** |
| 월 1,000회 | ~$0.5 (약 700원) |

**특징**: 유료만 지원, 신용카드 등록 필요

---

## 2. 무료/저비용 대안

### 2.1 Cloudflare Workers AI (권장)

| 항목 | 내용 |
|------|------|
| **무료 한도** | **10,000 Neurons/일** (매일 00:00 UTC 리셋) |
| 초과 시 | $0.011 / 1,000 Neurons (Workers Paid 플랜 필요) |
| 장점 | 이미 Cloudflare Pages 사용 중 → Workers 추가로 연동 용이 |
| 모델 예시 | `@cf/meta/llama-3.2-1b-instruct`, `@cf/ibm-granite/granite-4.0-h-micro` 등 |

**대략적인 무료 범위** (llama-3.2-1b 기준):
- 입력 ~2,500 neurons/M tokens → 10,000 neurons ≈ 4M tokens
- 소규모 서비스(일 50~100회 조언)는 **무료 한도 내** 가능

---

### 2.2 Google Gemini API (무료 티어)

| 항목 | 내용 |
|------|------|
| **무료 티어** | 제한적 토큰, 신용카드 없이 사용 가능 |
| 제한 | 모델·요청 수 제한 (정확 수치는 Google AI Studio 확인) |
| 참고 | 무료 구간 데이터가 Google 제품 개선에 사용될 수 있음 |

---

### 2.3 기타 옵션

| 서비스 | 특징 | 비고 |
|--------|------|------|
| **Scitely** | 비영리, 개인/교육용 무제한 API | DeepSeek, Qwen 등 50+ 모델 |
| **Groq** | 무료 티어 (Llama 등) | 별도 API 키 필요 |
| **Hugging Face Inference** | 무료 티어 | rate limit 있음 |

---

## 3. BurnFat에 맞는 선택

| 우선순위 | 옵션 | 이유 |
|----------|------|------|
| **1** | **Cloudflare Workers AI** | 이미 CF Pages 사용, 무료 10K neurons/일, 별도 결제 없음 |
| 2 | Google Gemini | 무료 티어, Supabase Edge Function에서 fetch로 호출 가능 |
| 3 | OpenAI 유지 | 비용은 낮지만, 무료 한도 없음 |

---

## 4. Cloudflare Workers AI 전환 시 작업

1. **Cloudflare Worker** 생성 (예: `ai-advice` 라우트)
2. `@cloudflare/ai` SDK로 텍스트 생성 호출
3. Supabase Edge Function 대신 Worker URL 호출
4. 프론트엔드 `edgeFunctions.ts`에서 Worker URL로 요청

---

## 5. 참고 링크

- [Cloudflare Workers AI Pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)
- [Cloudflare Workers AI Models](https://developers.cloudflare.com/workers-ai/models)
- [Google Gemini API](https://ai.google.dev/gemini-api/docs)
- [OpenAI Pricing](https://openai.com/api/pricing/)
