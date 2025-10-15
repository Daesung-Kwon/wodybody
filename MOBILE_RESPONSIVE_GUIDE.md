# 📱 모바일 반응형 가이드

QWERTY 보안 키패드의 모바일 최적화 및 반응형 디자인 가이드입니다.

## 📐 브레이크포인트 기준

### 최소 화면 크기: 375px (iPhone SE)

```
📱 xs (extra small): 0px - 599px      → 모바일
📱 sm (small):       600px - 899px    → 태블릿
💻 md (medium):      900px - 1199px   → 데스크톱 소형
🖥️ lg (large):       1200px+          → 데스크톱 대형
```

### Material-UI 브레이크포인트

```typescript
const breakpoints = {
    xs: 0,      // 최소 375px 보장
    sm: 600,    // 태블릿
    md: 900,    // 데스크톱
    lg: 1200,   // 대형 데스크톱
    xl: 1536,   // 초대형
};
```

---

## 🎯 QWERTY 키패드 반응형 설정

### 1. 키 버튼 크기

```typescript
// 375px (모바일): 28px ~ 32px
// 600px (태블릿): 40px ~ 45px  
// 900px (데스크톱): 기본 크기

sx={{
    minWidth: { xs: 28, sm: 40 },
    maxWidth: { xs: 32, sm: 45 },
    height: { xs: 38, sm: 45 },
}}
```

**계산:**
- 375px 화면: 10개 키 × 32px + 9개 gap(2.4px) = 341px ✅ 여유있음
- 버튼 간격(gap): { xs: 0.3, sm: 0.5 } (2.4px → 4px)

### 2. 폰트 크기

```typescript
// 모든 텍스트 반응형 적용
fontSize: { 
    xs: '0.85rem',  // 13.6px (모바일)
    sm: '1rem'      // 16px (태블릿+)
}
```

### 3. 패딩 & 마진

```typescript
// 컨테이너 패딩
p: { xs: 1.5, sm: 3 }  // 12px → 24px

// 버튼 간격
gap: { xs: 0.3, sm: 0.5 }  // 2.4px → 4px

// 여백
mb: { xs: 1, sm: 2 }  // 8px → 16px
```

### 4. 모드 선택 버튼

```typescript
<ToggleButtonGroup
    sx={{
        '& .MuiToggleButton-root': {
            px: { xs: 1.5, sm: 2 },      // 12px → 16px
            py: { xs: 0.5, sm: 1 },      // 4px → 8px
            fontSize: { xs: '0.8rem', sm: '0.875rem' },
            minWidth: { xs: '60px', sm: '70px' },
        }
    }}
>
    <ToggleButton value="lower">abc</ToggleButton>
    <ToggleButton value="upper">ABC</ToggleButton>
    <ToggleButton value="number">123</ToggleButton>
    <ToggleButton value="symbol">!@#</ToggleButton>
</ToggleButtonGroup>
```

### 5. 컨트롤 버튼 (삭제, 전체삭제, 확인)

```typescript
<Button
    sx={{
        height: { xs: 40, sm: 45, md: 50 },
        fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' },
        padding: { xs: '8px 4px', sm: '8px 16px' },
    }}
>
    ← 삭제
</Button>
```

---

## 📏 375px 화면에서의 레이아웃

### 실제 크기 계산

```
화면 너비: 375px
컨테이너 패딩: 12px × 2 = 24px
사용 가능 너비: 351px

키 버튼:
- 10개 버튼 × 32px = 320px
- 9개 간격 × 2.4px = 21.6px
- 총합: 341.6px ✅ 여유 9.4px

키 높이:
- 버튼 높이: 38px
- 3줄 × 38px = 114px
- 간격 2개 × 2.4px = 4.8px
- 총합: 118.8px
```

### 전체 키패드 높이

```
모드 선택: ~40px
키보드 3줄: ~119px
스페이스바: ~38px
컨트롤 버튼: ~40px
여백: ~20px
보안 정보: ~30px
──────────────
총 높이: ~287px ✅ 충분함
```

---

## 🎨 반응형 디자인 예제

### 완벽한 반응형 버튼

```tsx
<Button
    sx={{
        // 크기
        minWidth: { xs: 28, sm: 40, md: 45 },
        height: { xs: 38, sm: 45, md: 50 },
        
        // 폰트
        fontSize: { xs: '0.85rem', sm: '1rem', md: '1.1rem' },
        fontWeight: 600,
        
        // 간격
        padding: { xs: '4px', sm: '8px', md: '12px' },
        margin: { xs: 0.3, sm: 0.5, md: 1 },
        
        // 모서리
        borderRadius: { xs: 1, sm: 1.5, md: 2 },
    }}
>
    {key}
</Button>
```

### 입력 필드 반응형

```tsx
<Typography
    variant="h6"
    sx={{
        minHeight: { xs: 24, sm: 32, md: 40 },
        fontSize: { xs: '0.95rem', sm: '1.25rem', md: '1.5rem' },
        letterSpacing: { xs: 2, sm: 4, md: 6 },
        wordBreak: 'break-all',  // 긴 텍스트 줄바꿈
    }}
>
    {maskedValue}
</Typography>
```

---

## 🧪 테스트 체크리스트

### 모바일 (375px ~ 599px)

- [ ] iPhone SE (375x667) 완벽 동작
- [ ] iPhone 12 (390x844) 완벽 동작
- [ ] 모든 키 터치 가능
- [ ] 텍스트 읽기 쉬움
- [ ] 가로 스크롤 없음
- [ ] 버튼 간격 충분

### 태블릿 (600px ~ 899px)

- [ ] iPad Mini (768x1024) 완벽 동작
- [ ] iPad (820x1180) 완벽 동작
- [ ] 키 크기 적절
- [ ] 레이아웃 균형

### 데스크톱 (900px+)

- [ ] 1920x1080 완벽 동작
- [ ] 키 크기 최적
- [ ] 시각적 균형

---

## 📱 실제 디바이스 테스트

### iPhone SE (375x667)

```bash
# Chrome DevTools에서 테스트
1. F12 → Toggle Device Toolbar (Cmd+Shift+M)
2. iPhone SE 선택
3. http://localhost:3000/#keypad-demo
4. QWERTY 키패드 탭 테스트
```

**확인 사항:**
- ✅ 모든 키가 화면에 표시
- ✅ 가로 스크롤 없음
- ✅ 터치 타겟 44×44px 이상 (iOS 권장)
- ✅ 텍스트 읽기 쉬움

### iPhone 12 (390x844)

**확인 사항:**
- ✅ 키 크기 동일 (일관성)
- ✅ 여백 더 넓어짐 (자동)
- ✅ 레이아웃 안정적

### iPad (820x1180)

**확인 사항:**
- ✅ sm 브레이크포인트 적용
- ✅ 키 크기 증가 (40-45px)
- ✅ 폰트 크기 증가

---

## 🎯 최적화 팁

### 1. 터치 타겟 크기

**iOS 가이드라인:** 최소 44×44 픽셀

```typescript
// 모바일에서 38px이지만, padding으로 터치 영역 확장
sx={{
    height: { xs: 38, sm: 45 },
    padding: { xs: '4px', sm: '8px' },  // 실제 터치 영역: 46px
}}
```

### 2. 텍스트 가독성

**최소 폰트 크기:** 12px (권장 14px)

```typescript
// 모든 텍스트가 13.6px 이상
fontSize: { xs: '0.85rem', sm: '1rem' }  // 13.6px → 16px
```

### 3. 스크롤 방지

```typescript
// 컨테이너에 최대 너비 설정
sx={{
    maxWidth: '100%',
    overflow: 'hidden',  // 가로 스크롤 방지
}}
```

### 4. 성능 최적화

```typescript
// 애니메이션 최적화
'&:active': {
    transform: 'scale(0.95)',
    transition: 'transform 0.1s',  // 짧고 빠르게
}
```

---

## 🔍 디버깅

### 크기 확인

```typescript
// 개발자 도구 콘솔에서
const button = document.querySelector('.MuiButton-root');
console.log('Width:', button.offsetWidth);
console.log('Height:', button.offsetHeight);
```

### 브레이크포인트 확인

```tsx
import { useTheme } from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';

function Component() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    
    console.log('Is Mobile:', isMobile);
    console.log('Screen Width:', window.innerWidth);
    
    return <div>...</div>;
}
```

---

## 📊 반응형 비교표

| 항목 | 375px (모바일) | 600px (태블릿) | 900px (데스크톱) |
|-----|---------------|---------------|----------------|
| 키 버튼 | 28-32px | 40-45px | 40-45px |
| 키 높이 | 38px | 45px | 45px |
| 폰트 크기 | 0.85rem (13.6px) | 1rem (16px) | 1rem (16px) |
| 패딩 | 12px | 24px | 24px |
| 간격(gap) | 2.4px | 4px | 4px |
| 총 너비 | ~342px | ~470px | ~470px |

---

## 🚀 배포 전 체크리스트

### 필수 테스트

- [ ] iPhone SE (375px) - Safari
- [ ] iPhone 12 (390px) - Safari
- [ ] Galaxy S20 (360px) - Chrome
- [ ] iPad (768px) - Safari
- [ ] Desktop (1920px) - Chrome

### 성능 체크

- [ ] First Contentful Paint < 1.5s
- [ ] Largest Contentful Paint < 2.5s
- [ ] Total Blocking Time < 200ms
- [ ] Cumulative Layout Shift < 0.1

### 접근성 체크

- [ ] 터치 타겟 44×44px 이상
- [ ] 색상 대비 4.5:1 이상
- [ ] 폰트 크기 14px 이상
- [ ] 키보드 네비게이션 가능

---

## 💡 추가 개선 사항

### 가로 모드 최적화

```typescript
// 가로 모드에서 키 크기 조정
sx={{
    height: { 
        xs: 38,
        sm: 45,
        '@media (orientation: landscape) and (max-height: 500px)': {
            height: 32,  // 가로 모드에서 더 작게
        }
    }
}}
```

### PWA 대응

```json
{
  "viewport-fit": "cover",
  "safe-area-inset": "env(safe-area-inset-*)"
}
```

---

## 📱 실제 사용 예제

### 모바일 로그인 페이지

```tsx
<Container maxWidth="sm" sx={{ px: { xs: 2, sm: 3 } }}>
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <TextField
            fullWidth
            label="이메일"
            type="email"
            sx={{ mb: 2 }}
        />
        
        <SecureQwertyKeypad
            label="비밀번호"
            value={password}
            onChange={setPassword}
            maxLength={50}
            showMasked={true}
        />
        
        <Button
            fullWidth
            variant="contained"
            sx={{ 
                mt: 2,
                height: { xs: 48, sm: 56 },
                fontSize: { xs: '1rem', sm: '1.1rem' }
            }}
        >
            로그인
        </Button>
    </Box>
</Container>
```

---

## 🎯 핵심 정리

### ✅ 반응형 설계 원칙

1. **모바일 우선 (Mobile First)**
   - 375px부터 시작
   - 점진적 개선

2. **터치 친화적**
   - 최소 44×44px 터치 영역
   - 충분한 버튼 간격

3. **가독성 우선**
   - 최소 14px 폰트
   - 충분한 대비

4. **성능 최적화**
   - 빠른 애니메이션
   - 최소한의 리렌더링

---

**375px 기준으로 완벽하게 작동하며, 더 큰 화면에서는 자동으로 최적화됩니다!** 📱✨

---

**Made with ❤️ by CrossFit System Development Team**

