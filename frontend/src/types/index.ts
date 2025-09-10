// 사용자 관련 타입
export interface User {
    id: number;
    email: string;
    name: string;
}

// 운동 관련 타입
export interface ExerciseCategory {
    id: number;
    name: string;
    description: string;
}

export interface Exercise {
    id: number;
    name: string;
    description: string;
    category_id: number;
    category_name: string;
}

export interface ProgramExercise {
    id: number;
    exercise_id: number;
    exercise_name: string;
    target_value: string;
    order: number;
}

// 프로그램 관련 타입
export interface Program {
    id: number;
    title: string;
    description: string;
    creator_name: string;
    workout_type: 'time_based' | 'rep_based' | 'wod';
    target_value: string;  // 기존 호환성을 위해 유지
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    participants: number;
    max_participants: number;
    created_at: string;
    is_registered: boolean;
    exercises: ProgramExercise[];  // 기존 운동 정보
    workout_pattern?: WorkoutPattern;  // WOD 패턴 정보
}

// 프로그램 생성 폼 타입
export interface CreateProgramForm {
    title: string;
    description: string;
    workout_type: 'time_based' | 'rep_based' | 'wod';
    target_value: string;  // 기존 호환성을 위해 유지
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    max_participants: number;
    selected_exercises: SelectedExercise[];  // 새로운 운동 선택
    workout_pattern: WorkoutPattern | null;  // WOD 패턴
}

export interface SelectedExercise {
    exercise_id: number;
    target_value: string;
    order: number;
}

// WOD 유형 정의
export type WorkoutType =
    | 'fixed_reps'      // 고정 횟수 (유형 2, 4)
    | 'ascending'       // 증가 패턴 (유형 3)
    | 'descending'      // 감소 패턴 (유형 1)
    | 'mixed_progression' // 혼합 진행 (유형 1)
    | 'time_cap';       // 시간 제한 (유형 5)

// 운동 세트 정의
export interface ExerciseSet {
    exercise_id: number;
    exercise_name: string;
    base_reps: number;        // 기본 횟수
    progression_type: 'fixed' | 'increase' | 'decrease' | 'mixed';
    progression_value?: number; // 증가/감소 값
    order: number;
}

// WOD 패턴 정의
export interface WorkoutPattern {
    type: WorkoutType;
    total_rounds: number;
    time_cap_per_round?: number; // 라운드당 시간 제한 (분)
    exercises: ExerciseSet[];
    description: string;
}


// 내 프로그램 타입 (내가 생성한 프로그램)
export interface MyProgram {
    id: number;
    title: string;
    description: string;
    is_open: boolean;
    participants: number;
    max_participants: number;
    created_at: string;
}

// 프로그램 결과 타입
export interface ProgramResult {
    user_name: string;
    result: string;
    completed: boolean;
    registered_at: string;
    status?: 'pending' | 'approved' | 'rejected' | 'left';
}

// 프로그램 결과 응답 타입
export interface ProgramResultsResponse {
    program_title: string;
    total_registrations: number;
    completed_count: number;
    results: ProgramResult[];
}

// 페이지 타입
export type Page = 'login' | 'register' | 'programs' | 'my' | 'create';

// 모달 타입
export interface ModalState {
    open: boolean;
    title: string;
    msg: string;
    type: 'info' | 'success' | 'warning' | 'error';
}

// API 응답 타입
export interface ApiResponse<T = any> {
    success?: boolean;
    data?: T;
    message?: string;
}

// 프로그램 목록 응답 타입
export interface ProgramsResponse {
    programs: Program[];
}

// 내 프로그램 목록 응답 타입
export interface MyProgramsResponse {
    programs: MyProgram[];
}

// 로그인 응답 타입
export interface LoginResponse {
    message: string;
    user_id: number;
    name: string;
}

// 회원가입 요청 타입
export interface RegisterRequest {
    email: string;
    password: string;
    name: string;
}

// 로그인 요청 타입
export interface LoginRequest {
    email: string;
    password: string;
}

// 결과 기록 요청 타입
export interface RecordResultRequest {
    result: string;
}

// 컴포넌트 Props 타입들
export interface LoginPageProps {
    setUser: (user: User) => void;
    goRegister: () => void;
    goPrograms: () => void;
}

export interface RegisterPageProps {
    goLogin: () => void;
}

export interface CreateProgramPageProps {
    goMy: () => void;
    goPrograms: () => void;
}

export interface CustomModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: string;
    type?: 'info' | 'success' | 'warning' | 'error';
}

export interface LoadingSpinnerProps {
    label?: string;
}

// 알림 관련 타입
export interface Notification {
    id: number;
    type: string;
    title: string;
    message: string;
    program_id?: number;
    is_read: boolean;
    created_at: string;
}

export interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    addNotification: (notification: Notification) => void;
    markAsRead: (notificationId: number) => void;
    markAllAsRead: () => void;
    fetchNotifications: () => void;
}

// 프로그램 참여 관련 타입
export interface ProgramParticipant {
    id: number;
    user_id: number;
    user_name: string;
    status: 'pending' | 'approved' | 'rejected' | 'left';
    joined_at: string;
    approved_at?: string;
    left_at?: string;
}

export interface ProgramParticipantsResponse {
    participants: ProgramParticipant[];
    total_count: number;
    approved_count: number;
    pending_count: number;
}

export interface ProgramWithParticipation extends Program {
    participation_status?: 'pending' | 'approved' | 'rejected' | 'left';
}
