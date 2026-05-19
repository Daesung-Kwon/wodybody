import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';

interface ChallengeTabsProps {
  value: number;
  onChange: (value: number) => void;
}

/** Sprint 3 Phase B — ChallengePage 의 sticky 탭 바 (참가자/순위/주간 기록). */
export default function ChallengeTabs({ value, onChange }: ChallengeTabsProps) {
  return (
    <Tabs
      value={value}
      onChange={(_, v) => onChange(v)}
      sx={{
        px: 2,
        position: 'sticky',
        top: 0,
        zIndex: 10,
        bgcolor: 'background.default',
        borderBottom: 1,
        borderColor: 'divider',
        '& .MuiTab-root': { minHeight: 48 },
        '& .MuiTabs-flexContainer': { gap: 0 },
      }}
      variant="scrollable"
      scrollButtons="auto"
      allowScrollButtonsMobile
    >
      <Tab label="참가자 / 인증" />
      <Tab label="순위" />
      <Tab label="주간 기록" />
    </Tabs>
  );
}
