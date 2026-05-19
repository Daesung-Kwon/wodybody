/**
 * Sprint 3 Phase B — ChallengePage 의 인라인 sx keyframes 를 styled() 로 추출.
 *
 * 기존에는 종료 인증 버튼·1위 행·메달 애니메이션을 sx 안에 `@keyframes` 로
 * 인라인 정의했다. 컴포넌트 분해 시 sx 중복을 막고, 한 곳에서
 * `prefers-reduced-motion` 분기를 적용하기 위해 styled 컴포넌트로 옮긴다.
 *
 * 시각/동작은 기존과 동일하다. 단, CLAUDE.md §6 (prefers-reduced-motion 적용)
 * 에 따라 reduce 설정 사용자에게는 데코 애니메이션을 정지시키는 분기를 추가했다.
 */
import { styled } from '@mui/material/styles';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';

const REDUCED_MOTION = '@media (prefers-reduced-motion: reduce)';

/**
 * 종료일 인증 버튼 — 은은한 글로우 + 스파클 스윕.
 * `glowMain` 은 참가자별 색, `glow`/`glowDim` 은 box-shadow 글로우 색.
 */
export const EndAuthButton = styled(Button, {
  shouldForwardProp: (prop) =>
    prop !== 'glowMain' && prop !== 'glow' && prop !== 'glowDim',
})<{ glowMain: string; glow: string; glowDim: string }>(
  ({ glowMain, glow, glowDim }) => ({
    minHeight: 44,
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 12,
    paddingRight: 12,
    fontSize: '0.8125rem',
    position: 'relative',
    overflow: 'hidden',
    color: glowMain,
    borderColor: glowMain,
    '--end-glow': glow,
    '--end-glow-dim': glowDim,
    '&:hover': { borderColor: glowMain, backgroundColor: `${glowMain}14` },
    animation: 'endBtnShimmer 2.5s ease-in-out infinite',
    '@keyframes endBtnShimmer': {
      '0%, 100%': { boxShadow: '0 0 0 0 var(--end-glow)' },
      '50%': { boxShadow: '0 0 16px 6px var(--end-glow-dim)' },
    },
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: '-100%',
      width: '60%',
      height: '100%',
      background:
        'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
      animation: 'endBtnSparkle 2s ease-in-out infinite',
      zIndex: 0,
    },
    '@keyframes endBtnSparkle': {
      '0%': { left: '-100%' },
      '100%': { left: '140%' },
    },
    [REDUCED_MOTION]: {
      animation: 'none',
      '&::before': { animation: 'none', display: 'none' },
    },
  })
);

/** 순위표 1위 행 — 골드 셔머 + 글로우 펄스. */
export const RankOneRow = styled(TableRow)({
  background: [
    'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.85) 20%, rgba(254,249,195,1) 50%, rgba(255,255,255,0.85) 80%, transparent 100%)',
    'linear-gradient(135deg, #fef9c3 0%, #fef3c7 50%, #fde68a 100%)',
  ].join(', '),
  backgroundSize: '200% 100%, 100% 100%',
  backgroundPosition: '200% 0, 0 0',
  borderTop: '2px solid #f59e0b',
  borderBottom: '2px solid #f59e0b',
  boxShadow: '0 0 20px rgba(245, 158, 11, 0.4)',
  animation: 'rank1Shimmer 2s ease-in-out infinite, rank1Glow 1.8s ease-in-out infinite',
  '@keyframes rank1Shimmer': {
    '0%': { backgroundPosition: '200% 0, 0 0' },
    '100%': { backgroundPosition: '-200% 0, 0 0' },
  },
  '@keyframes rank1Glow': {
    '0%, 100%': {
      boxShadow:
        '0 0 20px rgba(245, 158, 11, 0.4), inset 0 0 30px rgba(254, 240, 138, 0.3)',
      borderColor: '#f59e0b',
    },
    '50%': {
      boxShadow:
        '0 0 30px rgba(245, 158, 11, 0.7), inset 0 0 50px rgba(254, 240, 138, 0.6)',
      borderColor: '#fbbf24',
    },
  },
  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
});

/**
 * 순위표 메달(🥇/🥈/🥉) 컨테이너 — `<span>`.
 * `twinkle` 가 true 일 때(1위) 드롭섀도 반짝임 애니메이션을 건다.
 */
export const RankMedal = styled('span', {
  shouldForwardProp: (prop) => prop !== 'twinkle',
})<{ twinkle?: boolean }>(({ twinkle }) => ({
  fontSize: 32,
  lineHeight: 1,
  ...(twinkle
    ? {
        filter: 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.8))',
        animation: 'rank1MedalTwinkle 1.5s ease-in-out infinite',
        '@keyframes rank1MedalTwinkle': {
          '0%, 100%': { filter: 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.8))' },
          '50%': {
            filter:
              'drop-shadow(0 0 16px rgba(245, 158, 11, 1)) drop-shadow(0 0 8px rgba(254, 240, 138, 0.9))',
          },
        },
        [REDUCED_MOTION]: {
          animation: 'none',
          filter: 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.8))',
        },
      }
    : {}),
}));
