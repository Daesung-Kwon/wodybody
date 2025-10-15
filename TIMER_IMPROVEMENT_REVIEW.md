# 운동 타이머 기능 개선 검토 보고서

## 📋 개요
본 문서는 CrossFit 시스템의 운동 타이머 기능 개선을 위한 기술적 검토 및 구현 방안을 제시합니다.

---

## 🎯 개선 요구사항

### 1. 화면 잠금 시 타이머 지속 및 음향 효과
**문제점:**
- 스마트폰 화면이 잠금 상태로 전환되면 타이머가 멈추거나 정확도가 떨어짐
- 현재 구현은 `setInterval`만 사용하여 브라우저가 백그라운드로 전환 시 성능 저하

**해결 방안:**
- Wake Lock API 적용 (화면 잠금 방지)
- Web Audio API를 활용한 라운드 완료 알림음
- Notification API를 통한 백그라운드 알림

### 2. 라운드별 자동 알림 설정
**문제점:**
- 현재 시스템에는 라운드 정보가 있지만 자동 알림 기능이 없음
- 사용자가 수동으로 라운드 완료 여부를 확인해야 함

**해결 방안:**
- 라운드별 타이머 자동 계산 및 알림
- 시각적/청각적 라운드 완료 알림
- 프로그램 패턴에 따른 자동 알림 스케줄링

---

## 🔧 기술적 구현 방안

### 1. Wake Lock API 적용

#### 목적
- 운동 중 화면이 자동으로 꺼지는 것을 방지
- 타이머의 정확성 유지

#### 구현 방법
```typescript
// Wake Lock API 지원 여부 확인 및 적용
const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null);

const requestWakeLock = async () => {
    try {
        if ('wakeLock' in navigator) {
            const lock = await navigator.wakeLock.request('screen');
            setWakeLock(lock);
            console.log('Wake Lock 활성화');
        }
    } catch (err) {
        console.error('Wake Lock 실패:', err);
    }
};

const releaseWakeLock = async () => {
    if (wakeLock) {
        await wakeLock.release();
        setWakeLock(null);
        console.log('Wake Lock 해제');
    }
};
```

#### 적용 시점
- 타이머 시작 시: `requestWakeLock()` 호출
- 타이머 완료/취소 시: `releaseWakeLock()` 호출
- 일시정지 시: 선택적으로 `releaseWakeLock()` 호출 가능

#### 브라우저 호환성
- ✅ Chrome 84+
- ✅ Edge 84+
- ✅ Safari 16.4+ (iOS 및 macOS)
- ❌ Firefox (아직 미지원, 대체 방안 필요)

---

### 2. 음향 효과 추가

#### 목적
- 라운드 완료 시 청각적 피드백 제공
- 화면을 보지 않아도 진행 상황 파악 가능

#### 구현 방법 A: Web Audio API (권장)
```typescript
const useWorkoutSounds = () => {
    const audioContextRef = useRef<AudioContext | null>(null);
    
    // AudioContext 초기화
    useEffect(() => {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        return () => {
            audioContextRef.current?.close();
        };
    }, []);
    
    // 비프음 생성 (라운드 완료)
    const playRoundCompleteSound = () => {
        const ctx = audioContextRef.current;
        if (!ctx) return;
        
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.frequency.value = 800; // 800Hz (높은 소리)
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.5);
    };
    
    // 카운트다운 틱 소리 (마지막 3초)
    const playTickSound = () => {
        const ctx = audioContextRef.current;
        if (!ctx) return;
        
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.frequency.value = 400; // 400Hz (중간 높이)
        oscillator.type = 'square';
        
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.1);
    };
    
    // 운동 완료 소리 (축하)
    const playWorkoutCompleteSound = () => {
        const ctx = audioContextRef.current;
        if (!ctx) return;
        
        // 3음 멜로디 (도-미-솔)
        const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5
        
        frequencies.forEach((freq, index) => {
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            oscillator.frequency.value = freq;
            oscillator.type = 'sine';
            
            const startTime = ctx.currentTime + index * 0.2;
            gainNode.gain.setValueAtTime(0.2, startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
            
            oscillator.start(startTime);
            oscillator.stop(startTime + 0.3);
        });
    };
    
    return {
        playRoundCompleteSound,
        playTickSound,
        playWorkoutCompleteSound
    };
};
```

#### 구현 방법 B: HTML5 Audio (대체 방안)
```typescript
// 미리 녹음된 오디오 파일 사용
const roundCompleteAudio = new Audio('/sounds/round-complete.mp3');
const workoutCompleteAudio = new Audio('/sounds/workout-complete.mp3');
const tickAudio = new Audio('/sounds/tick.mp3');

const playRoundCompleteSound = () => {
    roundCompleteAudio.currentTime = 0;
    roundCompleteAudio.play().catch(err => console.error('오디오 재생 실패:', err));
};
```

#### 장단점 비교
| 방식 | 장점 | 단점 |
|------|------|------|
| **Web Audio API** | - 별도 파일 불필요<br>- 동적 사운드 생성<br>- 저지연<br>- 용량 절약 | - 구현 복잡도 높음<br>- 브라우저별 차이 존재 |
| **HTML5 Audio** | - 구현 간단<br>- 다양한 소리 사용 가능<br>- 브라우저 호환성 우수 | - 오디오 파일 필요<br>- 추가 용량<br>- 로딩 시간 |

**권장사항:** Web Audio API를 우선 사용하고, HTML5 Audio를 폴백으로 활용

---

### 3. 라운드별 자동 알림 시스템

#### 현재 시스템 분석
```typescript
// 현재 WorkoutPattern 타입 (types/index.ts)
interface WorkoutPattern {
    type: WorkoutType;                    // 'round_based' | 'time_cap'
    total_rounds: number;                 // 총 라운드 수
    time_cap_per_round?: number;          // 라운드당 시간 제한 (분)
    exercises: ExerciseSet[];             // 운동 목록
    description: string;
}

interface ExerciseSet {
    exercise_id: number;
    exercise_name: string;
    base_reps: number;                    // 기본 횟수
    progression_type: 'fixed' | 'increase' | 'decrease' | 'mixed';
    progression_value?: number;           // 증가/감소 값
    order: number;
}
```

#### 구현 전략

##### A. 라운드 추적 시스템
```typescript
interface RoundTrackerState {
    currentRound: number;              // 현재 라운드 (1부터 시작)
    totalRounds: number;               // 총 라운드 수
    roundStartTime: number;            // 현재 라운드 시작 시간 (초)
    completedRounds: number[];         // 완료된 라운드의 시간들
    timeCapPerRound?: number;          // 라운드당 시간 제한 (분)
}

const [roundTracker, setRoundTracker] = useState<RoundTrackerState>({
    currentRound: 1,
    totalRounds: workoutPattern?.total_rounds || 1,
    roundStartTime: 0,
    completedRounds: [],
    timeCapPerRound: workoutPattern?.time_cap_per_round
});
```

##### B. 라운드 완료 체크 및 알림
```typescript
const handleRoundComplete = () => {
    const currentTime = time;
    const roundTime = currentTime - roundTracker.roundStartTime;
    
    // 라운드 완료 처리
    setRoundTracker(prev => ({
        ...prev,
        currentRound: prev.currentRound + 1,
        roundStartTime: currentTime,
        completedRounds: [...prev.completedRounds, roundTime]
    }));
    
    // 음향 효과
    playRoundCompleteSound();
    
    // 시각적 피드백 (스낵바/토스트)
    showRoundCompleteNotification(roundTracker.currentRound);
    
    // 브라우저 알림 (백그라운드 대응)
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('라운드 완료!', {
            body: `${roundTracker.currentRound}/${roundTracker.totalRounds} 라운드 완료`,
            icon: '/logo192.png',
            badge: '/logo192.png',
            vibrate: [200, 100, 200]
        });
    }
    
    // 마지막 라운드 체크
    if (roundTracker.currentRound >= roundTracker.totalRounds) {
        playWorkoutCompleteSound();
        showWorkoutCompleteDialog();
    }
};
```

##### C. 시간 제한 모드 자동 알림
```typescript
useEffect(() => {
    if (!isRunning || isPaused || !roundTracker.timeCapPerRound) return;
    
    const timeCapSeconds = roundTracker.timeCapPerRound * 60;
    const elapsedInRound = time - roundTracker.roundStartTime;
    const remainingTime = timeCapSeconds - elapsedInRound;
    
    // 마지막 3초 카운트다운
    if (remainingTime > 0 && remainingTime <= 3 && remainingTime % 1 < 0.1) {
        playTickSound();
    }
    
    // 시간 초과 체크
    if (remainingTime <= 0) {
        handleRoundComplete();
    }
}, [time, isRunning, isPaused, roundTracker]);
```

##### D. UI 개선 - 라운드 진행 표시
```tsx
<Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
    <Stack spacing={2}>
        {/* 현재 라운드 표시 */}
        <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
                라운드 {roundTracker.currentRound} / {roundTracker.totalRounds}
            </Typography>
            {roundTracker.timeCapPerRound && (
                <Typography variant="body2" color="text.secondary">
                    제한시간: {roundTracker.timeCapPerRound}분
                </Typography>
            )}
        </Box>
        
        {/* 라운드별 진행률 */}
        <LinearProgress 
            variant="determinate" 
            value={(roundTracker.currentRound / roundTracker.totalRounds) * 100}
            sx={{ height: 8, borderRadius: 4 }}
        />
        
        {/* 시간 제한 모드: 현재 라운드 진행률 */}
        {roundTracker.timeCapPerRound && (
            <Box>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                    <Typography variant="caption">현재 라운드</Typography>
                    <Typography variant="caption">
                        {formatTime(time - roundTracker.roundStartTime)} / 
                        {formatTime(roundTracker.timeCapPerRound * 60)}
                    </Typography>
                </Stack>
                <LinearProgress 
                    variant="determinate" 
                    value={((time - roundTracker.roundStartTime) / (roundTracker.timeCapPerRound * 60)) * 100}
                    sx={{ height: 6, borderRadius: 3 }}
                />
            </Box>
        )}
        
        {/* 완료된 라운드 기록 */}
        {roundTracker.completedRounds.length > 0 && (
            <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    완료된 라운드
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                    {roundTracker.completedRounds.map((roundTime, index) => (
                        <Chip 
                            key={index}
                            label={`R${index + 1}: ${formatTime(roundTime)}`}
                            size="small"
                            color="success"
                            variant="outlined"
                        />
                    ))}
                </Stack>
            </Box>
        )}
    </Stack>
</Paper>

{/* 라운드별 운동 정보 표시 */}
{workoutPattern && (
    <Paper sx={{ p: 2, borderRadius: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            현재 라운드 운동
        </Typography>
        <Stack spacing={1}>
            {workoutPattern.exercises.map((exercise, index) => {
                const reps = calculateRepsForRound(
                    exercise,
                    roundTracker.currentRound
                );
                return (
                    <Box 
                        key={index}
                        sx={{ 
                            display: 'flex', 
                            justifyContent: 'space-between',
                            p: 1,
                            borderRadius: 1,
                            bgcolor: 'background.default'
                        }}
                    >
                        <Typography variant="body2">
                            {exercise.exercise_name}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {reps}회
                        </Typography>
                    </Box>
                );
            })}
        </Stack>
    </Paper>
)}
```

##### E. 라운드별 횟수 계산 함수
```typescript
const calculateRepsForRound = (
    exercise: ExerciseSet,
    round: number
): number => {
    const baseReps = exercise.base_reps || 1;
    const progressionValue = exercise.progression_value || 0;
    
    switch (exercise.progression_type) {
        case 'increase':
            return baseReps + (progressionValue * (round - 1));
        
        case 'decrease':
            return Math.max(1, baseReps - (progressionValue * (round - 1)));
        
        case 'mixed':
            // 홀수 라운드: 증가, 짝수 라운드: 감소
            if (round % 2 === 1) {
                return baseReps + (progressionValue * Math.floor((round - 1) / 2));
            } else {
                return Math.max(1, baseReps - (progressionValue * Math.floor(round / 2)));
            }
        
        case 'fixed':
        default:
            return baseReps;
    }
};
```

---

### 4. 브라우저 알림 (Notification API)

#### 목적
- 백그라운드 상태에서도 알림 제공
- 운동 완료, 라운드 완료 알림

#### 구현 방법
```typescript
const useNotificationPermission = () => {
    const [permission, setPermission] = useState<NotificationPermission>('default');
    
    useEffect(() => {
        if ('Notification' in window) {
            setPermission(Notification.permission);
        }
    }, []);
    
    const requestPermission = async () => {
        if ('Notification' in window) {
            const result = await Notification.requestPermission();
            setPermission(result);
            return result;
        }
        return 'denied';
    };
    
    const showNotification = (title: string, options?: NotificationOptions) => {
        if (permission === 'granted') {
            new Notification(title, {
                icon: '/logo192.png',
                badge: '/logo192.png',
                vibrate: [200, 100, 200],
                ...options
            });
        }
    };
    
    return { permission, requestPermission, showNotification };
};
```

#### 적용 시점
```typescript
// 운동 시작 시 권한 요청
const handleStartWorkout = async () => {
    const permission = await requestPermission();
    if (permission === 'granted') {
        console.log('알림 권한 승인됨');
    }
    // ... 타이머 시작
};

// 라운드 완료 시
showNotification('라운드 완료!', {
    body: `${currentRound}/${totalRounds} 라운드를 완료했습니다.`,
    tag: 'round-complete',
    requireInteraction: false
});

// 운동 완료 시
showNotification('운동 완료! 🎉', {
    body: `총 ${formatTime(totalTime)}에 완료했습니다.`,
    tag: 'workout-complete',
    requireInteraction: true
});
```

---

### 5. 진동 피드백 (Vibration API)

#### 목적
- 모바일 기기에서 촉각 피드백 제공
- 시각/청각이 제한된 상황에서도 알림

#### 구현 방법
```typescript
const useVibration = () => {
    const vibrate = (pattern: number | number[]) => {
        if ('vibrate' in navigator) {
            navigator.vibrate(pattern);
        }
    };
    
    const vibrateRoundComplete = () => {
        // 200ms 진동 - 100ms 쉼 - 200ms 진동
        vibrate([200, 100, 200]);
    };
    
    const vibrateWorkoutComplete = () => {
        // 축하 패턴: 짧게-짧게-길게
        vibrate([100, 50, 100, 50, 300]);
    };
    
    const vibrateTickSound = () => {
        // 짧은 틱
        vibrate(50);
    };
    
    return {
        vibrateRoundComplete,
        vibrateWorkoutComplete,
        vibrateTickSound
    };
};
```

---

## 📱 모바일 최적화 고려사항

### iOS Safari 특수 사항
1. **Wake Lock API**: iOS 16.4+부터 지원
2. **Web Audio API**: 사용자 제스처(터치) 후에만 재생 가능
3. **Notification API**: 제한적 지원 (PWA로 설치해야 완전한 지원)
4. **Vibration API**: 미지원

### Android Chrome 특수 사항
1. **Wake Lock API**: 완벽 지원
2. **Web Audio API**: 완벽 지원
3. **Notification API**: 완벽 지원
4. **Vibration API**: 완벽 지원

### PWA 변환 권장
모든 기능을 최대한 활용하려면 PWA(Progressive Web App)로 변환하는 것을 권장:
```json
// manifest.json에 추가
{
  "name": "WodyBody CrossFit",
  "short_name": "WodyBody",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#1976d2",
  "icons": [
    {
      "src": "/logo192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/logo512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ],
  "permissions": [
    "notifications",
    "vibrate",
    "wake-lock"
  ]
}
```

---

## 🚀 구현 우선순위

### Phase 1: 기본 개선 (필수)
1. ✅ Wake Lock API 적용
2. ✅ 라운드 추적 시스템 구현
3. ✅ 라운드별 진행 UI 개선
4. ✅ 기본 음향 효과 (Web Audio API)

### Phase 2: 고급 기능 (권장)
1. ✅ 브라우저 알림 (Notification API)
2. ✅ 진동 피드백 (모바일)
3. ✅ 라운드별 운동 정보 표시
4. ✅ 시간 제한 모드 카운트다운

### Phase 3: 추가 기능 (선택)
1. ⬜ 음성 안내 (Web Speech API)
2. ⬜ 사용자 설정 (음량, 진동 강도 등)
3. ⬜ 운동 기록 상세 분석 (라운드별 시간)
4. ⬜ PWA 변환 및 오프라인 지원

---

## 📊 예상 효과

### 사용자 경험 개선
- ✅ 화면을 계속 확인할 필요 없이 운동에 집중 가능
- ✅ 라운드 완료 시 자동 알림으로 운동 흐름 유지
- ✅ 다양한 피드백(시각/청각/촉각)으로 접근성 향상

### 기술적 이점
- ✅ 타이머 정확도 향상 (Wake Lock)
- ✅ 배터리 효율성 (Web Audio vs 비디오 재생)
- ✅ 오프라인 동작 가능 (로컬 사운드 생성)

### 비즈니스 가치
- ✅ 사용자 만족도 증가
- ✅ 운동 완료율 향상
- ✅ 앱 재사용률 증가
- ✅ 경쟁 앱 대비 차별화

---

## ⚠️ 주의사항 및 제약

### 브라우저 권한
- 알림, Wake Lock 등은 사용자 승인 필요
- 첫 사용 시 권한 요청 UX 최적화 필요

### 배터리 소모
- Wake Lock 활성화 시 배터리 소모 증가
- 운동 완료 후 반드시 해제 필요

### 브라우저 호환성
- 구형 브라우저에서는 일부 기능 미지원
- Feature Detection 및 Graceful Degradation 필요

### 음량 제어
- 시스템 음량에 의존
- 사용자가 음량을 직접 조절해야 함
- 사용자 설정 기능 추가 권장

---

## 🧪 테스트 계획

### 단위 테스트
- [ ] Wake Lock 활성화/해제 테스트
- [ ] 라운드 추적 로직 테스트
- [ ] 음향 효과 재생 테스트
- [ ] 알림 권한 처리 테스트

### 통합 테스트
- [ ] 타이머와 라운드 추적 통합 테스트
- [ ] 음향과 진동 동시 재생 테스트
- [ ] 백그라운드 전환 시나리오 테스트

### 크로스 브라우저 테스트
- [ ] iOS Safari (최신 버전)
- [ ] iOS Safari (구버전)
- [ ] Android Chrome
- [ ] Android Samsung Internet
- [ ] Desktop Chrome
- [ ] Desktop Safari

### 실사용 테스트
- [ ] 실제 운동 환경에서 테스트
- [ ] 다양한 화면 잠금 시간 설정 테스트
- [ ] 배터리 소모 측정
- [ ] 네트워크 불안정 환경 테스트

---

## 📝 개발 일정 (예상)

### Week 1-2: Phase 1 구현
- Wake Lock API 통합
- 라운드 추적 시스템 구현
- 기본 UI 개선
- Web Audio API 음향 효과

### Week 3: Phase 2 구현
- Notification API 통합
- Vibration API 통합
- 시간 제한 모드 고도화
- 권한 요청 UX 개선

### Week 4: 테스트 및 최적화
- 크로스 브라우저 테스트
- 성능 최적화
- 버그 수정
- 문서화

### Week 5 (선택): Phase 3 구현
- 추가 기능 개발
- PWA 변환
- 고급 설정 UI

---

## 🎓 참고 자료

### 공식 문서
- [Wake Lock API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API)
- [Web Audio API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [Notifications API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)
- [Vibration API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API)

### 예제 및 튜토리얼
- [Wake Lock API Examples](https://web.dev/wake-lock/)
- [Web Audio API Tutorial](https://web.dev/webaudio-intro/)
- [Push Notifications Guide](https://web.dev/push-notifications/)

### 브라우저 호환성
- [Can I Use - Wake Lock](https://caniuse.com/wake-lock)
- [Can I Use - Web Audio](https://caniuse.com/audio-api)
- [Can I Use - Notifications](https://caniuse.com/notifications)

---

## 💡 결론

제시된 개선 방안을 통해:

1. **화면 잠금 문제 해결**: Wake Lock API로 타이머 정확도 보장
2. **다양한 피드백 제공**: 음향, 진동, 알림으로 사용자 경험 극대화
3. **라운드별 자동 관리**: 사용자가 운동에만 집중할 수 있는 환경 제공
4. **크로스 플랫폼 지원**: iOS, Android, Desktop 모두 지원

**다음 단계**: Phase 1부터 순차적으로 구현하면서 사용자 피드백을 수집하고, 점진적으로 기능을 확장하는 것을 권장합니다.

---

**작성일**: 2025-10-14  
**작성자**: AI Assistant  
**버전**: 1.0

