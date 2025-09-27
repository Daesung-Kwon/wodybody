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
    ProgramExercise,
    ProgramParticipantsResponse,
    WorkoutRecordsResponse,
    CreateWorkoutRecordRequest,
    UpdateWorkoutRecordRequest,
    PersonalStats,
    PersonalGoalsResponse,
    CreateGoalRequest,
    ProgramDetail,
    WodStatus
} from '../types';

// API 기본 설정
const API_BASE = 'http://localhost:5001';

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

        // 401 오류인 경우 - 로그인 API가 아닌 경우에만 자동 리다이렉트
        if (response.status === 401) {
            // 로그인 API인 경우 서버 메시지를 그대로 사용
            if (endpoint === '/api/login') {
                throw new Error(errorData.message || '로그인에 실패했습니다');
            }

            // 다른 API인 경우에만 자동으로 로그인 페이지로 이동
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

// 프로그램 참여 관련 API
export const participationApi = {
    // 프로그램 참여 신청
    joinProgram: (programId: number): Promise<{ message: string }> =>
        apiRequest<{ message: string }>(`/api/programs/${programId}/join`, { method: 'POST' }),

    // 프로그램 참여 취소/신청 취소
    leaveProgram: (programId: number): Promise<{ message: string }> =>
        apiRequest<{ message: string }>(`/api/programs/${programId}/leave`, { method: 'DELETE' }),

    // 프로그램 참여자 목록 조회
    getProgramParticipants: (programId: number): Promise<ProgramParticipantsResponse> =>
        apiRequest<ProgramParticipantsResponse>(`/api/programs/${programId}/participants`),

    // 참여자 승인/거부
    approveParticipant: (programId: number, userId: number, action: 'approve' | 'reject'): Promise<{ message: string }> =>
        apiRequest<{ message: string }>(`/api/programs/${programId}/participants/${userId}/approve`, {
            method: 'PUT',
            body: JSON.stringify({ action })
        }),
};

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
