import Chip from '@mui/material/Chip';
import EventIcon from '@mui/icons-material/Event';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import FlagIcon from '@mui/icons-material/Flag';
import type { DDayDisplay } from '../lib/challengeSchedule';

interface Props {
  dday: DDayDisplay;
}

/**
 * Sprint 1 — 헤더 D-Day 칩.
 * 색상은 보조 신호일 뿐이며, 라벨 텍스트 + 아이콘 + aria-label 로 의미를 병행 전달한다.
 */
export default function DDayChip({ dday }: Props) {
  const color: 'default' | 'info' | 'warning' =
    dday.tone === 'warning' ? 'warning' : dday.tone === 'info' ? 'info' : 'default';

  const icon =
    dday.tone === 'ended' ? (
      <FlagIcon />
    ) : dday.tone === 'warning' ? (
      <LocalFireDepartmentIcon />
    ) : (
      <EventIcon />
    );

  return (
    <Chip
      icon={icon}
      label={dday.label}
      color={color}
      size="small"
      variant={dday.tone === 'warning' ? 'filled' : 'outlined'}
      aria-label={dday.ariaLabel}
      sx={{ fontWeight: 600, height: 28 }}
    />
  );
}
