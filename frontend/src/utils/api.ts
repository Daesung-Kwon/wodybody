import {
    User,
    ProgramsResponse,
    MyProgramsResponse,
    LoginResponse,
    RegisterRequest,
    LoginRequest,
    CreateProgramForm,
    Notification,
    ExerciseCategory,
    Exercise,
    ProgramExercise,
    WorkoutRecordsResponse,
    CreateWorkoutRecordRequest,
    UpdateWorkoutRecordRequest,
    PersonalStats,
    PersonalGoalsResponse,
    CreateGoalRequest,
    ProgramDetail,
    WodStatus,
    UserPreferences,
    DailyAssignment,
    PushTokenRegistration,
    PushTokenInfo
} from '../types';
import { getAccessToken, setAccessToken } from '../lib/tokenStore';
import { apiBaseUrl } from '../lib/env';

const API_BASE = apiBaseUrl();

let globalRedirectToLogin: (() => void) | null = null;

export const setGlobalRedirectToLogin = (redirectFn: () => void): void => {
    globalRedirectToLogin = redirectFn;
};

async function apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {}),
    };

    const accessToken = await getAccessToken();
    if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const fetchOptions: RequestInit = {
        credentials: 'omit',
        ...options,
        headers,
    };

    const response = await fetch(`${API_BASE}${endpoint}`, fetchOptions);

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        if (response.status === 401) {
            if (endpoint === '/api/login') {
                throw new Error(errorData.message || '로그인에 실패했습니다');
            }
            await setAccessToken(null);
            if (globalRedirectToLogin) globalRedirectToLogin();
            else if (typeof window !== 'undefined') window.location.href = '/login';
            throw new Error('로그인이 필요합니다');
        }

        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
}

// 사용자 관련 API
export const userApi = {
    // 프로필 조회
    getProfile: (): Promise<User> =>
        apiRequest<User>('/api/user/profile'),

    // 로그인
    login: async (data: LoginRequest): Promise<LoginResponse> => {
        const response = await apiRequest<LoginResponse & { access_token?: string }>('/api/login', {
            method: 'POST',
            body: JSON.stringify(data),
        });

        // access_token 저장 (사파리 포함 전 브라우저 공통)
        if (response.access_token) {
            await setAccessToken(response.access_token);
        }

        return response;
    },

    // 회원가입
    register: (data: RegisterRequest): Promise<{ message: string }> =>
        apiRequest<{ message: string }>('/api/register', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    // 로그아웃
    logout: async (): Promise<{ message: string }> => {
        await setAccessToken(null);
        return apiRequest<{ message: string }>('/api/logout', {
            method: 'POST',
        });
    },
};

// 프로그램 관련 API (PT 모델로 전환 — 마켓플레이스 메서드는 deprecate되어 제거됨)
//
// 제거된 메서드 (백엔드는 410 Gone 반환):
//  - openProgram(), registerProgram(), unregisterProgram(),
//  - getProgramResults(), recordResult(),
//  - participationApi.joinProgram(), leaveProgram() (아래 별도 export 제거)
export const programApi = {
    // 프로그램 목록 조회 (라이브러리 후보 풀)
    getPrograms: (): Promise<ProgramsResponse> =>
        apiRequest<ProgramsResponse>('/api/programs'),

    // 내 프로그램 목록 조회 (Library 화면)
    getMyPrograms: (): Promise<MyProgramsResponse> =>
        apiRequest<MyProgramsResponse>('/api/user/programs'),

    // 프로그램 생성 (Library의 + 버튼)
    createProgram: (data: CreateProgramForm): Promise<{ message: string; program_id: number }> =>
        apiRequest<{ message: string; program_id: number }>('/api/programs', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    // 프로그램 수정
    updateProgram: (programId: number, data: CreateProgramForm): Promise<{ message: string }> =>
        apiRequest<{ message: string }>(`/api/programs/${programId}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    // 프로그램 상세 조회
    getProgramDetail: (programId: number): Promise<{ program: ProgramDetail }> =>
        apiRequest<{ program: ProgramDetail }>(`/api/programs/${programId}`),

    // 프로그램 삭제
    deleteProgram: (programId: number): Promise<{ message: string }> =>
        apiRequest<{ message: string }>(`/api/programs/${programId}`, {
            method: 'DELETE',
        }),
};

// 알림 API
export const notificationApi = {
    getNotifications: (): Promise<Notification[]> =>
        apiRequest<Notification[]>('/api/notifications'),

    markAsRead: (notificationId: number): Promise<{ message: string }> =>
        apiRequest<{ message: string }>(`/api/notifications/${notificationId}/read`, {
            method: 'PUT',
        }),

    markAllAsRead: (): Promise<{ message: string }> =>
        apiRequest<{ message: string }>('/api/notifications/read-all', {
            method: 'PUT',
        }),
};

// 운동 관련 API
export const exerciseApi = {
    // 운동 카테고리 목록 조회
    getCategories: (): Promise<{ categories: ExerciseCategory[] }> =>
        apiRequest<{ categories: ExerciseCategory[] }>('/api/exercise-categories'),

    // 운동 종류 목록 조회
    getExercises: (categoryId?: number): Promise<{ exercises: Exercise[] }> => {
        const params = categoryId ? `?category_id=${categoryId}` : '';
        return apiRequest<{ exercises: Exercise[] }>(`/api/exercises${params}`);
    },

    // 프로그램의 운동 목록 조회
    getProgramExercises: (programId: number): Promise<{ exercises: ProgramExercise[] }> =>
        apiRequest<{ exercises: ProgramExercise[] }>(`/api/programs/${programId}/exercises`),
};

// 프로그램 참여 관련 API (PT 전환으로 deprecate — 더 이상 export하지 않음).
// 백엔드에서는 MARKETPLACE_ENABLED=false 일 때 410 Gone을 반환한다.
// (이전 코드: joinProgram, leaveProgram, getProgramParticipants, approveParticipant)

// 운동 기록 API
export const workoutRecordsApi = {
    // 운동 기록 생성
    createRecord: (programId: number, data: CreateWorkoutRecordRequest): Promise<{ message: string; record_id: number; completion_time: number; completed_at: string }> =>
        apiRequest<{ message: string; record_id: number; completion_time: number; completed_at: string }>(`/api/programs/${programId}/records`, {
            method: 'POST',
            body: JSON.stringify(data)
        }),

    // 프로그램의 운동 기록 조회
    getProgramRecords: (programId: number): Promise<WorkoutRecordsResponse> =>
        apiRequest<WorkoutRecordsResponse>(`/api/programs/${programId}/records`),

    // 사용자의 개인 운동 기록 조회
    getUserRecords: (): Promise<WorkoutRecordsResponse> =>
        apiRequest<WorkoutRecordsResponse>('/api/users/records'),

    // 운동 기록 수정
    updateRecord: (recordId: number, data: UpdateWorkoutRecordRequest): Promise<{ message: string; completion_time: number; notes: string; is_public: boolean }> =>
        apiRequest<{ message: string; completion_time: number; notes: string; is_public: boolean }>(`/api/records/${recordId}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        }),

    // 운동 기록 삭제
    deleteRecord: (recordId: number): Promise<{ message: string }> =>
        apiRequest<{ message: string }>(`/api/records/${recordId}`, { method: 'DELETE' }),
};

// 개인 통계 API
export const personalStatsApi = {
    // 개인 통계 조회
    getStats: (): Promise<PersonalStats> =>
        apiRequest<PersonalStats>('/api/users/records/stats'),
};

// 개인 목표 API
export const personalGoalsApi = {
    // 개인 목표 조회
    getGoals: (): Promise<PersonalGoalsResponse> =>
        apiRequest<PersonalGoalsResponse>('/api/users/goals'),

    // 개인 목표 생성/수정
    createGoal: (data: CreateGoalRequest): Promise<{ message: string; goal_id: number; target_time: number }> =>
        apiRequest<{ message: string; goal_id: number; target_time: number }>('/api/users/goals', {
            method: 'POST',
            body: JSON.stringify(data)
        }),

    // 개인 목표 삭제
    deleteGoal: (goalId: number): Promise<{ message: string }> =>
        apiRequest<{ message: string }>(`/api/users/goals/${goalId}`, { method: 'DELETE' }),
};

// WOD 현황 API
export const wodStatusApi = {
    // WOD 현황 조회
    getStatus: (): Promise<WodStatus> =>
        apiRequest<WodStatus>('/api/user/wod-status'),
};

// 서버 연결 테스트
export const testApi = {
    test: (): Promise<{ message: string; timestamp: string }> =>
        apiRequest<{ message: string; timestamp: string }>('/api/test'),
};

// 비밀번호 재설정 API
export const passwordResetApi = {
    // 비밀번호 재설정 요청 (인증번호 이메일 전송)
    requestReset: (email: string): Promise<{ message: string; email: string }> =>
        apiRequest<{ message: string; email: string }>('/api/password-reset/request', {
            method: 'POST',
            body: JSON.stringify({ email })
        }),

    // 인증번호 확인
    verifyCode: (email: string, code: string): Promise<{ message: string; verified: boolean; reset_id: number }> =>
        apiRequest<{ message: string; verified: boolean; reset_id: number }>('/api/password-reset/verify', {
            method: 'POST',
            body: JSON.stringify({ email, code })
        }),

    // 비밀번호 재설정
    resetPassword: (email: string, reset_id: number, new_password: string): Promise<{ message: string; success: boolean }> =>
        apiRequest<{ message: string; success: boolean }>('/api/password-reset/reset', {
            method: 'POST',
            body: JSON.stringify({ email, reset_id, new_password })
        }),
};

// 이메일 인증 API (회원가입용)
export const emailVerificationApi = {
    // 이메일 인증번호 전송
    requestVerification: (email: string): Promise<{ message: string; email: string }> =>
        apiRequest<{ message: string; email: string }>('/api/email-verification/request', {
            method: 'POST',
            body: JSON.stringify({ email })
        }),

    // 인증번호 확인
    verifyCode: (email: string, code: string): Promise<{ message: string; verified: boolean; verification_id: number }> =>
        apiRequest<{ message: string; verified: boolean; verification_id: number }>('/api/email-verification/verify', {
            method: 'POST',
            body: JSON.stringify({ email, code })
        }),
};

// ==================================================================
// PT 모델 — 오늘의 WOD / 선호 / 푸시 토큰
// ==================================================================

export const todayApi = {
    /** 오늘의 추천 조회 (없으면 서버에서 생성). */
    getToday: (): Promise<DailyAssignment> =>
        apiRequest<DailyAssignment>('/api/today'),

    /** 추천 새로받기 — 일 한도(기본 3회) 초과 시 429. */
    refresh: (): Promise<DailyAssignment> =>
        apiRequest<DailyAssignment>('/api/today/refresh', { method: 'POST' }),

    /** 오늘의 WOD 완료 기록. completion_time은 초 단위. */
    complete: (data: { completion_time: number; notes?: string }): Promise<{ message: string; record_id: number; assignment: DailyAssignment }> =>
        apiRequest<{ message: string; record_id: number; assignment: DailyAssignment }>('/api/today/complete', {
            method: 'POST',
            body: JSON.stringify(data)
        }),

    /** 오늘 건너뛰기. */
    skip: (): Promise<{ message: string; assignment: DailyAssignment }> =>
        apiRequest<{ message: string; assignment: DailyAssignment }>('/api/today/skip', { method: 'POST' }),

    /** easy / moderate / hard 피드백. */
    feedback: (rating: 'easy' | 'moderate' | 'hard'): Promise<{ message: string; assignment: DailyAssignment }> =>
        apiRequest<{ message: string; assignment: DailyAssignment }>('/api/today/feedback', {
            method: 'POST',
            body: JSON.stringify({ rating })
        }),
};

export const preferencesApi = {
    /** 선호 조회 — 미입력 시 기본값 객체. */
    get: (): Promise<UserPreferences> =>
        apiRequest<UserPreferences>('/api/me/preferences'),

    /** 선호 저장/갱신. 부분 업데이트 허용 (변경된 필드만 보내기 가능). */
    update: (data: Partial<UserPreferences>): Promise<UserPreferences> =>
        apiRequest<UserPreferences>('/api/me/preferences', {
            method: 'PUT',
            body: JSON.stringify(data)
        }),
};

export const pushApi = {
    /** 디바이스 푸시 토큰 등록. 같은 토큰이 있으면 갱신. */
    register: (data: PushTokenRegistration): Promise<{ message: string; token: PushTokenInfo }> =>
        apiRequest<{ message: string; token: PushTokenInfo }>('/api/me/push-tokens', {
            method: 'POST',
            body: JSON.stringify(data)
        }),

    /** 자기 디바이스 토큰 목록(미리보기). */
    list: (): Promise<{ tokens: PushTokenInfo[] }> =>
        apiRequest<{ tokens: PushTokenInfo[] }>('/api/me/push-tokens'),

    /** 토큰 비활성화. */
    deactivate: (tokenId: number): Promise<{ message: string }> =>
        apiRequest<{ message: string }>(`/api/me/push-tokens/${tokenId}`, { method: 'DELETE' }),
};
