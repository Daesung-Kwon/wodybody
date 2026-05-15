import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import Typography from '@mui/material/Typography';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { CHALLENGE_TEMPLATES, type ChallengeTemplate } from '../lib/challengeTemplates';

interface Props {
  /** 선택된 템플릿 id. 사용자가 값을 직접 수정하면 null(=직접 설정). */
  selectedId: string | null;
  onSelect: (template: ChallengeTemplate) => void;
}

/**
 * Sprint 2 — 챌린지 생성 템플릿 선택.
 * 4/8/12주 프리셋 카드. 선택 시 종료일·참가비를 자동 채운다.
 */
export default function ChallengeTemplatePicker({ selectedId, onSelect }: Props) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        템플릿으로 빠르게 시작
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {CHALLENGE_TEMPLATES.map((t) => {
          const selected = t.id === selectedId;
          return (
            <Card
              key={t.id}
              variant="outlined"
              sx={{
                borderColor: selected ? 'primary.main' : 'grey.300',
                borderWidth: selected ? 2 : 1,
                bgcolor: selected ? 'primary.50' : 'background.paper',
              }}
            >
              <CardActionArea
                onClick={() => onSelect(t)}
                aria-pressed={selected}
                aria-label={`${t.label} — 참가비 ${t.stakeAmount.toLocaleString('ko-KR')}원`}
                sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    {t.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {t.description}
                  </Typography>
                  <Typography variant="caption" color="primary.dark" fontWeight={600}>
                    {t.weeks}주 · 참가비 {t.stakeAmount.toLocaleString('ko-KR')}원
                  </Typography>
                </Box>
                {selected && <CheckCircleIcon color="primary" sx={{ fontSize: 22 }} aria-hidden />}
              </CardActionArea>
            </Card>
          );
        })}
      </Box>
      <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.75 }}>
        선택 후 아래에서 자유롭게 수정할 수 있어요.
      </Typography>
    </Box>
  );
}
