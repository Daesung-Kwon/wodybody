# 타이머 통합 예시 코드

## MuiProgramsPage.tsx 통합 예시

기존 `MuiProgramsPage.tsx`에 새로운 타이머를 통합하는 방법입니다.

### 1. Import 추가

```typescript
// 기존
import MuiWorkoutTimer from './MuiWorkoutTimer';

// 새로 추가 (기존 import와 함께 사용 가능)
import MuiWorkoutTimerEnhanced from './MuiWorkoutTimerEnhanced';
```

### 2. 상태 추가 (선택적)

라운드별 시간을 기록하고 싶다면:

```typescript
const [roundTimes, setRoundTimes] = useState<number[]>([]);
```

### 3. 타이머 렌더링 부분 수정

**찾을 코드:**
```typescript
{showTimer && selectedProgram && (
    <MuiWorkoutTimer
        programTitle={selectedProgram.title}
        onComplete={(completionTime) => {
            setShowTimer(false);
            setShowRecordModal(true);
            setCompletionTime(completionTime);
        }}
        onCancel={() => {
            setShowTimer(false);
        }}
    />
)}
```

**변경할 코드:**
```typescript
{showTimer && selectedProgram && (
    <MuiWorkoutTimerEnhanced
        programTitle={selectedProgram.title}
        workoutPattern={selectedProgram.workout_pattern}
        onComplete={(completionTime, roundTimes) => {
            setShowTimer(false);
            setShowRecordModal(true);
            setCompletionTime(completionTime);
            setRoundTimes(roundTimes);  // 라운드 시간 저장 (선택적)
        }}
        onCancel={() => {
            setShowTimer(false);
        }}
    />
)}
```

### 4. 기록 저장 시 라운드 시간 포함 (선택적)

`handleSaveRecord` 함수 수정:

```typescript
const handleSaveRecord = async (notes: string, isPublic: boolean) => {
    if (!selectedProgram) return;

    try {
        // 라운드별 시간 포맷팅
        const roundTimesText = roundTimes.length > 0
            ? `\n\n라운드별 시간:\n${roundTimes.map((time, index) => 
                `라운드 ${index + 1}: ${formatTime(time)}`
              ).join('\n')}`
            : '';

        await workoutRecordsApi.createRecord(selectedProgram.id, {
            completion_time: completionTime,
            notes: notes + roundTimesText,
            is_public: isPublic
        });

        await fetchRecords();
        setShowRecordModal(false);
        setCompletionTime(0);
        setRoundTimes([]);  // 초기화

        // 성공 메시지
        console.log('기록이 저장되었습니다!');
    } catch (error) {
        console.error('기록 저장 실패:', error);
    }
};
```

---

## 완전한 통합 예시

전체 파일의 수정된 부분:

```typescript
import React, { useState, useEffect } from 'react';
// ... 기존 imports ...
import MuiWorkoutTimer from './MuiWorkoutTimer';  // 기존 타이머 (백업용)
import MuiWorkoutTimerEnhanced from './MuiWorkoutTimerEnhanced';  // 새 타이머
// ... 나머지 imports ...

const MuiProgramsPage: React.FC = () => {
    // ... 기존 상태들 ...
    const [showTimer, setShowTimer] = useState(false);
    const [completionTime, setCompletionTime] = useState(0);
    const [roundTimes, setRoundTimes] = useState<number[]>([]);  // 추가
    
    // ... 기존 함수들 ...
    
    const handleSaveRecord = async (notes: string, isPublic: boolean) => {
        if (!selectedProgram) return;

        try {
            // 라운드별 시간 포맷팅
            const roundTimesText = roundTimes.length > 0
                ? `\n\n라운드별 시간:\n${roundTimes.map((time, index) => 
                    `라운드 ${index + 1}: ${formatTime(time)}`
                  ).join('\n')}`
                : '';

            await workoutRecordsApi.createRecord(selectedProgram.id, {
                completion_time: completionTime,
                notes: notes + roundTimesText,
                is_public: isPublic
            });

            await fetchRecords();
            setShowRecordModal(false);
            setCompletionTime(0);
            setRoundTimes([]);

            console.log('기록이 저장되었습니다!');
        } catch (error) {
            console.error('기록 저장 실패:', error);
        }
    };
    
    // 시간 포맷팅 함수
    const formatTime = (seconds: number): string => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };
    
    return (
        <Box>
            {/* ... 기존 UI ... */}
            
            {/* 새로운 타이머 */}
            {showTimer && selectedProgram && (
                <MuiWorkoutTimerEnhanced
                    programTitle={selectedProgram.title}
                    workoutPattern={selectedProgram.workout_pattern}
                    onComplete={(completionTime, roundTimes) => {
                        setShowTimer(false);
                        setShowRecordModal(true);
                        setCompletionTime(completionTime);
                        setRoundTimes(roundTimes);
                    }}
                    onCancel={() => {
                        setShowTimer(false);
                    }}
                />
            )}
            
            {/* ... 나머지 UI ... */}
        </Box>
    );
};

export default MuiProgramsPage;
```

---

## A/B 테스트 설정 (선택적)

두 타이머를 동시에 유지하면서 A/B 테스트를 하고 싶다면:

```typescript
// 환경 변수나 feature flag 사용
const USE_ENHANCED_TIMER = process.env.REACT_APP_USE_ENHANCED_TIMER === 'true';

{showTimer && selectedProgram && (
    USE_ENHANCED_TIMER ? (
        <MuiWorkoutTimerEnhanced
            programTitle={selectedProgram.title}
            workoutPattern={selectedProgram.workout_pattern}
            onComplete={(completionTime, roundTimes) => {
                setShowTimer(false);
                setShowRecordModal(true);
                setCompletionTime(completionTime);
                setRoundTimes(roundTimes);
            }}
            onCancel={() => {
                setShowTimer(false);
            }}
        />
    ) : (
        <MuiWorkoutTimer
            programTitle={selectedProgram.title}
            onComplete={(completionTime) => {
                setShowTimer(false);
                setShowRecordModal(true);
                setCompletionTime(completionTime);
            }}
            onCancel={() => {
                setShowTimer(false);
            }}
        />
    )
)}
```

`.env` 파일에서:
```
REACT_APP_USE_ENHANCED_TIMER=true
```

---

## 점진적 마이그레이션 전략

### Phase 1: 병렬 실행 (1-2주)
- 두 타이머 모두 유지
- Feature flag로 새 타이머 선택적 활성화
- 베타 사용자에게만 노출

### Phase 2: 기본값 전환 (1주)
- 새 타이머를 기본값으로 설정
- 문제 발생 시 기존 타이머로 롤백 가능

### Phase 3: 완전 전환 (1주 후)
- 기존 타이머 제거
- 새 타이머만 사용

---

## 테스트 시나리오

### 시나리오 1: 기본 라운드 제한 모드
```typescript
const testPattern: WorkoutPattern = {
    type: 'round_based',
    total_rounds: 3,
    exercises: [
        {
            exercise_id: 1,
            exercise_name: 'Push-ups',
            base_reps: 10,
            progression_type: 'fixed',
            order: 0
        }
    ],
    description: 'Push-ups 10회 3라운드'
};
```

**테스트:**
1. 타이머 시작
2. "라운드 완료" 버튼 클릭 (3번)
3. 각 라운드 시간이 기록되는지 확인
4. 운동 완료 시 소리와 진동 확인

### 시나리오 2: 시간 제한 모드
```typescript
const testPattern: WorkoutPattern = {
    type: 'time_cap',
    total_rounds: 5,
    time_cap_per_round: 1,  // 1분
    exercises: [
        {
            exercise_id: 1,
            exercise_name: 'Burpees',
            base_reps: 10,
            progression_type: 'decrease',
            progression_value: 2,
            order: 0
        }
    ],
    description: 'Burpees 총 5라운드 (라운드당 1분)'
};
```

**테스트:**
1. 타이머 시작
2. 1분 후 자동으로 다음 라운드 전환 확인
3. 마지막 3초 카운트다운 확인
4. 5라운드 완료 시 종료 확인

### 시나리오 3: 증가 패턴
```typescript
const testPattern: WorkoutPattern = {
    type: 'round_based',
    total_rounds: 4,
    exercises: [
        {
            exercise_id: 1,
            exercise_name: 'Wall Balls',
            base_reps: 5,
            progression_type: 'increase',
            progression_value: 3,
            order: 0
        }
    ],
    description: 'Wall Balls 증가 패턴'
};
```

**테스트:**
1. 타이머 시작
2. 각 라운드의 운동 횟수 확인:
   - 라운드 1: 5회
   - 라운드 2: 8회
   - 라운드 3: 11회
   - 라운드 4: 14회

---

## 백워드 호환성

기존 프로그램에 `workout_pattern`이 없는 경우:

```typescript
{showTimer && selectedProgram && (
    <MuiWorkoutTimerEnhanced
        programTitle={selectedProgram.title}
        workoutPattern={selectedProgram.workout_pattern}  // undefined일 수 있음
        onComplete={(completionTime, roundTimes) => {
            // workout_pattern이 없으면 roundTimes는 빈 배열
            setShowTimer(false);
            setShowRecordModal(true);
            setCompletionTime(completionTime);
            if (roundTimes.length > 0) {
                setRoundTimes(roundTimes);
            }
        }}
        onCancel={() => {
            setShowTimer(false);
        }}
    />
)}
```

컴포넌트 내부에서 `workoutPattern`이 없으면:
- 기본 1라운드로 동작
- 라운드 추적 UI는 표시되지만 기능은 제한적
- 기본 타이머와 유사하게 동작

---

## 디버깅 팁

### 1. 콘솔 로그 확인

타이머 시작 시:
```
✅ Wake Lock 활성화
AudioContext 초기화 완료
알림 권한: granted
```

라운드 완료 시:
```
라운드 1/5 완료 (시간: 45초)
라운드 완료 알림 전송
```

### 2. 브라우저 개발자 도구

**Application > Storage > Notifications**
- 알림 권한 상태 확인
- 보낸 알림 목록 확인

**Application > Background Services > Push**
- 알림이 전송되었는지 확인

### 3. Wake Lock 확인

Chrome DevTools에서:
```javascript
// 콘솔에서 실행
navigator.wakeLock.request('screen').then(lock => {
    console.log('Wake Lock 테스트 성공:', lock);
}).catch(err => {
    console.error('Wake Lock 테스트 실패:', err);
});
```

---

## 성능 최적화

### 1. 메모이제이션

라운드 계산 함수를 메모이제이션:

```typescript
const calculatedReps = useMemo(() => {
    if (!workoutPattern) return [];
    
    return workoutPattern.exercises.map(exercise => ({
        ...exercise,
        reps: calculateRepsForRound(exercise, roundTracker.currentRound)
    }));
}, [workoutPattern, roundTracker.currentRound]);
```

### 2. 렌더링 최적화

불필요한 리렌더링 방지:

```typescript
const MuiWorkoutTimerEnhanced = React.memo(({
    onComplete,
    onCancel,
    programTitle,
    workoutPattern
}: MuiWorkoutTimerEnhancedProps) => {
    // ... 컴포넌트 내용
});
```

---

## 트러블슈팅

### 문제: TypeScript 에러 발생

```
Property 'workout_pattern' does not exist on type 'Program'
```

**해결:**
`types/index.ts`에서 `Program` 인터페이스에 `workout_pattern` 확인:

```typescript
export interface Program {
    // ... 기존 필드들
    workout_pattern?: WorkoutPattern;  // 이미 정의되어 있어야 함
}
```

### 문제: AudioContext 관련 경고

```
The AudioContext was not allowed to start
```

**해결:**
사용자 제스처(클릭) 후에 AudioContext가 시작되므로 정상입니다.
타이머 시작 버튼을 클릭하면 자동으로 해결됩니다.

---

**작성일**: 2025-10-14  
**버전**: 1.0  
**다음 단계**: 실제 환경에서 테스트 후 피드백 주세요!

