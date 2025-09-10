import {
    User,
    ProgramsResponse,
    MyProgramsResponse,
    LoginResponse,
    RegisterRequest,
    LoginRequest,
    CreateProgramForm,
    ProgramResultsResponse,
    RecordResultRequest,
    Notification,
    ExerciseCategory,
    Exercise,
    ProgramExercise
} from '../types';

// API 기본 설정
const API_BASE = '';

// 전역 리다이렉트 함수 (AuthProvider에서 설정됨)
let globalRedirectToLogin: (() => void) | null = null;

export const setGlobalRedirectToLogin = (redirectFn: () => void): void => {
    globalRedirectToLogin = redirectFn;
};

// 공통 fetch 함수
async function apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
        ...options,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        // 401 오류인 경우 자동으로 로그인 페이지로 이동
        if (response.status === 401) {
            if (globalRedirectToLogin) {
                globalRedirectToLogin();
            } else {
                // fallback: window.location을 사용
                window.location.href = '/';
            }
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
    login: (data: LoginRequest): Promise<LoginResponse> =>
        apiRequest<LoginResponse>('/api/login', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    // 회원가입
    register: (data: RegisterRequest): Promise<{ message: string }> =>
        apiRequest<{ message: string }>('/api/register', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    // 로그아웃
    logout: (): Promise<{ message: string }> =>
        apiRequest<{ message: string }>('/api/logout', {
            method: 'POST',
        }),
};

// 프로그램 관련 API
export const programApi = {
    // 프로그램 목록 조회
    getPrograms: (): Promise<ProgramsResponse> =>
        apiRequest<ProgramsResponse>('/api/programs'),

    // 내 프로그램 목록 조회
    getMyPrograms: (): Promise<MyProgramsResponse> =>
        apiRequest<MyProgramsResponse>('/api/user/programs'),

    // 프로그램 생성
    createProgram: (data: CreateProgramForm): Promise<{ message: string; program_id: number }> =>
        apiRequest<{ message: string; program_id: number }>('/api/programs', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    // 프로그램 공개
    openProgram: (programId: number): Promise<{ message: string }> =>
        apiRequest<{ message: string }>(`/api/programs/${programId}/open`, {
            method: 'POST',
        }),

    // 프로그램 참여 신청
    registerProgram: (programId: number): Promise<{ message: string }> =>
        apiRequest<{ message: string }>(`/api/programs/${programId}/register`, {
            method: 'POST',
        }),

    // 프로그램 참여 취소
    unregisterProgram: (programId: number): Promise<{ message: string }> =>
        apiRequest<{ message: string }>(`/api/programs/${programId}/unregister`, {
            method: 'POST',
        }),

    // 프로그램 결과 조회
    getProgramResults: (programId: number, completedOnly?: boolean): Promise<ProgramResultsResponse> => {
        const params = completedOnly ? '?completed_only=true' : '';
        return apiRequest<ProgramResultsResponse>(`/api/programs/${programId}/results${params}`);
    },

    // 결과 기록
    recordResult: (registrationId: number, data: RecordResultRequest): Promise<{ message: string }> =>
        apiRequest<{ message: string }>(`/api/registrations/${registrationId}/result`, {
            method: 'POST',
            body: JSON.stringify(data),
        }),

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

// 서버 연결 테스트
export const testApi = {
    test: (): Promise<{ message: string; timestamp: string }> =>
        apiRequest<{ message: string; timestamp: string }>('/api/test'),
};
