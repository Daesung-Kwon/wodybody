# 운동 타이머 개선 기능 사용 가이드

## 📋 목차
1. [개선된 기능 소개](#개선된-기능-소개)
2. [새로운 컴포넌트 사용법](#새로운-컴포넌트-사용법)
3. [기존 타이머에서 마이그레이션](#기존-타이머에서-마이그레이션)
4. [사용자 설정](#사용자-설정)
5. [브라우저 호환성](#브라우저-호환성)
6. [문제 해결](#문제-해결)

---

## 🎯 개선된 기능 소개

### 1. Wake Lock API
- **화면 잠금 방지**: 운동 중 화면이 자동으로 꺼지지 않습니다
- **타이머 정확도**: 백그라운드 전환 시에도 정확한 타이머 동작
- **자동 관리**: 운동 시작 시 자동 활성화, 완료/취소 시 자동 해제

### 2. 음향 효과
- **라운드 완료 알림**: 각 라운드 완료 시 비프음
- **카운트다운**: 시간 제한 모드에서 마지막 3초 틱 소리
- **운동 완료**: 전체 운동 완료 시 축하 멜로디
- **Web Audio API 사용**: 별도 파일 없이 동적 생성

### 3. 라운드 추적
- **현재 라운드 표시**: 실시간 라운드 진행 상황
- **진행률 표시**: 전체 및 라운드별 진행률 시각화
- **완료 기록**: 각 라운드 완료 시간 기록
- **운동 정보**: 현재 라운드의 운동 및 횟수 표시

### 4. 시간 제한 모드
- **자동 라운드 전환**: 시간 초과 시 자동으로 다음 라운드로 전환
- **카운트다운**: 마지막 3초 시각적/청각적 피드백
- **진행률 표시**: 현재 라운드의 남은 시간 시각화

### 5. 브라우저 알림
- **백그라운드 알림**: 앱이 백그라운드에 있어도 알림 수신
- **라운드 완료 알림**: 각 라운드 완료 시 알림
- **운동 완료 알림**: 전체 운동 완료 시 알림

### 6. 진동 피드백 (모바일)
- **촉각 피드백**: 시각/청각이 제한된 상황에서도 알림
- **다양한 패턴**: 라운드 완료, 운동 완료, 틱 소리 등

### 7. 사용자 설정
- **음향 On/Off**: 음향 효과 켜기/끄기
- **진동 On/Off**: 진동 피드백 켜기/끄기
- **실시간 전환**: 운동 중에도 설정 변경 가능

---

## 🚀 새로운 컴포넌트 사용법

### 기본 사용법

```typescript
import MuiWorkoutTimerEnhanced from './components/MuiWorkoutTimerEnhanced';
import { WorkoutPattern } from './types';

// 프로그램 정보
const programTitle = "Murph WOD";
const workoutPattern: WorkoutPattern = {
    type: 'round_based',
    total_rounds: 5,
    exercises: [
        {
            exercise_id: 1,
            exercise_name: 'Pull-ups',
            base_reps: 5,
            progression_type: 'fixed',
            order: 0
        },
        {
            exercise_id: 2,
            exercise_name: 'Push-ups',
            base_reps: 10,
            progression_type: 'fixed',
            order: 1
        },
        {
            exercise_id: 3,
            exercise_name: 'Air Squats',
            base_reps: 15,
            progression_type: 'fixed',
            order: 2
        }
    ],
    description: 'Pull-ups, Push-ups, Air Squats 총 5라운드'
};

// 타이머 컴포넌트 사용
<MuiWorkoutTimerEnhanced
    programTitle={programTitle}
    workoutPattern={workoutPattern}
    onComplete={(completionTime, roundTimes) => {
        console.log('운동 완료!');
        console.log('총 시간:', completionTime, '초');
        console.log('라운드별 시간:', roundTimes);
        // 기록 저장 로직
    }}
    onCancel={() => {
        console.log('운동 취소');
        // 취소 처리 로직
    }}
/>
```

### 시간 제한 모드

```typescript
const workoutPattern: WorkoutPattern = {
    type: 'time_cap',
    total_rounds: 10,
    time_cap_per_round: 1,  // 라운드당 1분
    exercises: [
        {
            exercise_id: 1,
            exercise_name: 'Burpees',
            base_reps: 10,
            progression_type: 'decrease',
            progression_value: 1,  // 매 라운드 1개씩 감소
            order: 0
        }
    ],
    description: 'Burpees 총 10라운드 (라운드당 1분 제한)'
};

<MuiWorkoutTimerEnhanced
    programTitle="Death by Burpees"
    workoutPattern={workoutPattern}
    onComplete={(completionTime, roundTimes) => {
        // 시간 제한 모드에서는 자동으로 라운드 전환
        console.log('라운드별 시간:', roundTimes);
    }}
    onCancel={() => {
        console.log('운동 취소');
    }}
/>
```

### 증가 패턴

```typescript
const workoutPattern: WorkoutPattern = {
    type: 'round_based',
    total_rounds: 5,
    exercises: [
        {
            exercise_id: 1,
            exercise_name: 'Double-unders',
            base_reps: 10,
            progression_type: 'increase',
            progression_value: 5,  // 매 라운드 5개씩 증가
            order: 0
        }
    ],
    description: 'Double-unders 총 5라운드'
};

// 라운드별 횟수: 10 -> 15 -> 20 -> 25 -> 30
```

---

## 🔄 기존 타이머에서 마이그레이션

### 1. Import 변경

**Before:**
```typescript
import MuiWorkoutTimer from './components/MuiWorkoutTimer';
```

**After:**
```typescript
import MuiWorkoutTimerEnhanced from './components/MuiWorkoutTimerEnhanced';
```

### 2. Props 변경

**Before:**
```typescript
<MuiWorkoutTimer
    programTitle={selectedProgram.title}
    onComplete={(completionTime) => {
        // 완료 처리
    }}
    onCancel={() => {
        // 취소 처리
    }}
/>
```

**After:**
```typescript
<MuiWorkoutTimerEnhanced
    programTitle={selectedProgram.title}
    workoutPattern={selectedProgram.workout_pattern}  // 추가
    onComplete={(completionTime, roundTimes) => {  // roundTimes 추가
        // 완료 처리
        console.log('라운드별 시간:', roundTimes);
    }}
    onCancel={() => {
        // 취소 처리
    }}
/>
```

### 3. MuiProgramsPage.tsx 수정 예시

**Before:**
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

**After:**
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

### 4. 상태 추가 (선택적)

라운드별 시간을 저장하고 싶다면:

```typescript
const [roundTimes, setRoundTimes] = useState<number[]>([]);

// 기록 저장 시 라운드 시간도 함께 저장
const handleSaveRecord = async (notes: string, isPublic: boolean) => {
    try {
        await workoutRecordsApi.createRecord(selectedProgram.id, {
            completion_time: completionTime,
            notes: notes + `\n라운드별 시간: ${roundTimes.map((t, i) => `R${i+1}: ${formatTime(t)}`).join(', ')}`,
            is_public: isPublic
        });
        // ...
    } catch (error) {
        // ...
    }
};
```

---

## ⚙️ 사용자 설정

### 음향 효과 제어

타이머 상단 우측의 스피커 아이콘을 클릭하여 음향 효과를 켜거나 끌 수 있습니다.

- 🔊 **음향 On**: 라운드 완료, 틱 소리, 운동 완료 소리 재생
- 🔇 **음향 Off**: 모든 소리 꺼짐

### 진동 피드백 제어 (모바일)

타이머 상단 우측의 진동 아이콘을 클릭하여 진동을 켜거나 끌 수 있습니다.

- 📳 **진동 On**: 라운드 완료, 틱, 운동 완료 시 진동
- 📴 **진동 Off**: 진동 꺼짐

**참고:** Android 기기에서만 지원됩니다. iOS는 Vibration API를 지원하지 않습니다.

### 브라우저 알림

운동 시작 시 알림 권한을 요청합니다. 

- ✅ **허용**: 백그라운드에서도 라운드/운동 완료 알림 수신
- ❌ **차단**: 알림 없이 진행 (음향과 진동은 계속 작동)

**알림 권한 다시 설정하는 방법:**
1. 브라우저 주소창 왼쪽의 자물쇠 아이콘 클릭
2. "알림" 설정 변경
3. 페이지 새로고침

---

## 🌐 브라우저 호환성

### Desktop

| 브라우저 | Wake Lock | Web Audio | Notification | 진동 |
|---------|-----------|-----------|--------------|------|
| Chrome 84+ | ✅ | ✅ | ✅ | ❌ |
| Edge 84+ | ✅ | ✅ | ✅ | ❌ |
| Safari 16.4+ | ✅ | ✅ | ⚠️ 제한적 | ❌ |
| Firefox | ❌ | ✅ | ✅ | ❌ |

### Mobile

| 브라우저 | Wake Lock | Web Audio | Notification | 진동 |
|---------|-----------|-----------|--------------|------|
| Chrome (Android) | ✅ | ✅ | ✅ | ✅ |
| Samsung Internet | ✅ | ✅ | ✅ | ✅ |
| Safari (iOS 16.4+) | ✅ | ⚠️ 제한적 | ⚠️ PWA 필요 | ❌ |

**범례:**
- ✅ 완벽 지원
- ⚠️ 제한적 지원 (일부 조건에서만 작동)
- ❌ 미지원

### iOS Safari 특수 사항

#### Web Audio API
- 사용자 제스처(터치) 후에만 재생 가능
- 첫 타이머 시작 시 자동으로 AudioContext 활성화

#### Notification API
- 일반 웹 페이지에서는 제한적
- **PWA로 설치**하면 완벽하게 작동

#### Wake Lock API
- iOS 16.4 이상에서만 지원
- 구버전에서는 화면 잠금 방지 불가

#### Vibration API
- 완전히 미지원
- 진동 아이콘이 표시되지 않음

### Firefox 대응

Firefox는 Wake Lock API를 아직 지원하지 않습니다. 대체 방안:

1. **화면 설정 변경**: 시스템 설정에서 화면 꺼짐 시간을 늘림
2. **브라우저 확장**: 화면 잠금 방지 확장 프로그램 사용
3. **다른 브라우저**: Chrome, Edge 사용 권장

---

## 🔧 문제 해결

### 1. 음향이 재생되지 않아요

**원인:**
- 브라우저의 자동 재생 정책으로 인해 사용자 제스처 없이는 소리 재생 불가

**해결 방법:**
- 타이머를 **직접 시작 버튼을 눌러** 시작하세요 (자동 시작 아님)
- 음향 아이콘이 🔊 상태인지 확인하세요

### 2. 화면이 여전히 꺼져요

**원인:**
- 브라우저가 Wake Lock API를 지원하지 않음
- 배터리 절약 모드가 활성화됨
- iOS 구버전 (16.4 미만)

**해결 방법:**
1. 브라우저 업데이트
2. 배터리 절약 모드 해제
3. 시스템 설정에서 화면 꺼짐 시간 늘리기
4. Chrome 또는 Edge 사용

### 3. 알림이 오지 않아요

**원인:**
- 알림 권한이 차단됨
- iOS Safari에서 PWA로 설치하지 않음

**해결 방법:**
1. 브라우저 설정에서 알림 권한 확인
2. iOS: 홈 화면에 추가 (PWA)
3. 앱 권한에서 알림 허용 확인

### 4. 진동이 작동하지 않아요

**원인:**
- iOS 기기 사용 중 (미지원)
- 무음 모드 또는 진동 설정 꺼짐

**해결 방법:**
1. Android 기기 사용 권장
2. 무음 모드 해제
3. 시스템 설정에서 진동 활성화

### 5. 라운드가 자동으로 전환되지 않아요

**원인:**
- 시간 제한 모드(`time_cap`)가 아님
- `time_cap_per_round` 값이 설정되지 않음

**해결 방법:**
- 시간 제한 모드에서만 자동 전환됩니다
- 라운드 제한 모드에서는 **"라운드 완료" 버튼**을 직접 눌러야 합니다

### 6. 타이머가 부정확해요

**원인:**
- Wake Lock이 작동하지 않음
- 백그라운드 앱이 너무 많음

**해결 방법:**
1. 불필요한 백그라운드 앱 종료
2. 브라우저 업데이트
3. 기기 재시작

### 7. 배터리가 빨리 소모돼요

**원인:**
- Wake Lock으로 인해 화면이 계속 켜져 있음

**해결 방법:**
- 정상적인 현상입니다
- 운동 완료 후 Wake Lock이 자동으로 해제됩니다
- 화면 밝기를 낮추세요

---

## 📱 PWA 변환 (권장)

모든 기능을 최대한 활용하려면 PWA로 설치하는 것을 권장합니다.

### Android Chrome

1. 웹사이트 접속
2. 메뉴 > "홈 화면에 추가"
3. 설치 완료

### iOS Safari (16.4+)

1. 웹사이트 접속
2. 공유 버튼 > "홈 화면에 추가"
3. 추가 완료

### PWA의 장점

- ✅ 완벽한 알림 지원 (iOS 포함)
- ✅ 오프라인 지원 (추후 구현)
- ✅ 앱과 유사한 경험
- ✅ 더 빠른 로딩 속도

---

## 🧪 테스트 체크리스트

새로운 타이머를 테스트할 때 다음 항목을 확인하세요:

### 기본 기능
- [ ] 타이머 시작/일시정지/재개/완료
- [ ] 시간이 정확하게 증가하는지
- [ ] 리셋 버튼이 작동하는지
- [ ] 취소 버튼이 작동하는지

### Wake Lock
- [ ] 타이머 시작 시 화면이 꺼지지 않는지
- [ ] 타이머 완료 시 Wake Lock이 해제되는지
- [ ] 일시정지 시 Wake Lock이 해제되는지 (선택적)

### 음향 효과
- [ ] 라운드 완료 소리가 재생되는지
- [ ] 시간 제한 모드에서 틱 소리가 재생되는지
- [ ] 운동 완료 멜로디가 재생되는지
- [ ] 음향 On/Off가 작동하는지

### 라운드 추적
- [ ] 현재 라운드가 정확하게 표시되는지
- [ ] 라운드 진행률이 정확한지
- [ ] 완료된 라운드 시간이 기록되는지
- [ ] 현재 라운드 운동 정보가 표시되는지

### 시간 제한 모드
- [ ] 라운드당 시간 제한이 표시되는지
- [ ] 시간 초과 시 자동으로 다음 라운드로 전환되는지
- [ ] 마지막 3초 카운트다운이 작동하는지

### 알림
- [ ] 알림 권한 요청이 표시되는지
- [ ] 라운드 완료 알림이 오는지
- [ ] 운동 완료 알림이 오는지
- [ ] 백그라운드에서 알림이 오는지

### 진동 (Android)
- [ ] 라운드 완료 시 진동하는지
- [ ] 틱 소리 시 진동하는지
- [ ] 운동 완료 시 진동하는지
- [ ] 진동 On/Off가 작동하는지

---

## 📞 지원 및 피드백

문제가 발생하거나 개선 사항이 있으면 다음을 통해 연락주세요:

- **이슈 등록**: GitHub Issues
- **이메일**: support@wodybody.com
- **문서**: [전체 개발 문서](./TIMER_IMPROVEMENT_REVIEW.md)

---

**작성일**: 2025-10-14  
**버전**: 1.0  
**마지막 업데이트**: 2025-10-14

