import { useRef, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import DownloadIcon from '@mui/icons-material/Download';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { toPng } from 'html-to-image';
import type { Challenge, RankingRow } from '../types';
import { computePrizeDistribution, formatKrw, PRIZE_RULE_LABEL } from '../lib/prizeDistribution';

interface Props {
  open: boolean;
  challenge: Challenge;
  ranking: RankingRow[];
  participantCount: number;
  shareUrl: string;
  onClose: () => void;
  onToast: (message: string) => void;
}

function medalText(rank: number): string {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `${rank}위`;
}

/**
 * Sprint 1 — 랭킹 공유.
 * 공유용 카드(PNG) + 텍스트 복사. 카드에는 Top 3 + 예상 상금 분배를 포함한다.
 */
export default function RankingShareDialog({
  open,
  challenge,
  ranking,
  participantCount,
  shareUrl,
  onClose,
  onToast,
}: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const prize = computePrizeDistribution(challenge.stake_amount, participantCount);
  const top3 = ranking.slice(0, 3);

  const buildShareText = (): string => {
    const lines = [
      '🔥 BurnFat 대결 결과',
      `📌 ${challenge.title}`,
      `📅 ${challenge.start_date} ~ ${challenge.end_date}`,
      '',
      ...ranking.map((r) => `${medalText(r.rank)} ${r.nickname}  -${r.reductionRate.toFixed(2)}%`),
    ];
    if (prize.hasPrize) {
      lines.push(
        '',
        `💰 예상 정산 (${PRIZE_RULE_LABEL})`,
        `· 1등 +${formatKrw(prize.winnerNet)} / 그 외 ${formatKrw(prize.loserNet)}`
      );
    }
    lines.push('', `🔗 ${shareUrl}`);
    return lines.join('\n');
  };

  const handleCopyText = () => {
    navigator.clipboard
      .writeText(buildShareText())
      .then(() => onToast('결과 텍스트가 클립보드에 복사되었습니다'))
      .catch(() => onToast('복사에 실패했습니다. 다시 시도해주세요.'));
  };

  const handleSaveImage = async () => {
    if (!cardRef.current) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        cacheBust: true,
      });
      // Web Share API 로 파일 공유가 가능하면 우선 사용 (모바일).
      const fileName = `burnfat-${challenge.code}.png`;
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], fileName, { type: 'image/png' });
      const nav = navigator as Navigator & {
        canShare?: (data: { files: File[] }) => boolean;
        share?: (data: { files: File[]; title?: string }) => Promise<void>;
      };
      if (nav.canShare && nav.share && nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], title: `${challenge.title} 대결 결과` });
        onToast('공유 시트를 열었습니다');
      } else {
        const link = document.createElement('a');
        link.download = fileName;
        link.href = dataUrl;
        link.click();
        onToast('결과 이미지를 저장했습니다');
      }
    } catch {
      onToast('이미지 생성에 실패했습니다. 텍스트 복사를 이용해주세요.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3, mx: 2 } }}>
      <DialogTitle sx={{ pb: 1 }}>결과 공유</DialogTitle>
      <DialogContent sx={{ px: 2, py: 1 }}>
        {/* 캡처 대상 카드 */}
        <Box
          ref={cardRef}
          sx={{
            bgcolor: '#ffffff',
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'grey.200',
            p: 2.5,
            display: 'flex',
            flexDirection: 'column',
            gap: 1.25,
          }}
        >
          <Box>
            <Typography variant="subtitle2" sx={{ color: '#ea580c', fontWeight: 700 }}>
              🔥 BurnFat 대결 결과
            </Typography>
            <Typography variant="h6" fontWeight={800} lineHeight={1.25}>
              {challenge.title}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {challenge.start_date} ~ {challenge.end_date}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            {top3.map((r) => {
              const isFirst = r.rank === 1;
              return (
                <Box
                  key={r.nickname}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 1.25,
                    py: 1,
                    borderRadius: 2,
                    bgcolor: isFirst ? '#fef3c7' : '#f8fafc',
                    border: '1px solid',
                    borderColor: isFirst ? '#fcd34d' : '#e2e8f0',
                  }}
                >
                  <Box component="span" sx={{ fontSize: 22, lineHeight: 1, minWidth: 30, textAlign: 'center' }}>
                    {medalText(r.rank)}
                  </Box>
                  <Typography
                    sx={{
                      flex: '1 1 auto',
                      minWidth: 0,
                      fontWeight: isFirst ? 800 : 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {r.nickname}
                  </Typography>
                  <Typography sx={{ fontWeight: 700, color: isFirst ? '#b45309' : '#16a34a' }}>
                    -{r.reductionRate.toFixed(2)}%
                  </Typography>
                </Box>
              );
            })}
            {ranking.length > 3 && (
              <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: 'center' }}>
                외 {ranking.length - 3}명
              </Typography>
            )}
          </Box>

          {prize.hasPrize && (
            <Box sx={{ bgcolor: '#f0fdf4', borderRadius: 2, p: 1.25, border: '1px solid', borderColor: '#bbf7d0' }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#15803d', display: 'block' }}>
                💰 예상 정산 · {PRIZE_RULE_LABEL}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                상금 풀 {formatKrw(prize.pot)} · 1등 +{formatKrw(prize.winnerNet)} · 그 외 {formatKrw(prize.loserNet)}
              </Typography>
            </Box>
          )}

          <Typography variant="caption" sx={{ color: 'text.disabled', textAlign: 'center' }}>
            대결 코드 {challenge.code} · burnfat.wodybody.com
          </Typography>
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
          정산 금액은 승자독식 가정의 예상치입니다. 실제 분배는 대결방에서 합의하세요.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 2, pb: 2, gap: 1, flexWrap: 'wrap' }}>
        <Button onClick={onClose} color="inherit">
          닫기
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button
          variant="outlined"
          startIcon={<ContentCopyIcon />}
          onClick={handleCopyText}
        >
          텍스트 복사
        </Button>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={handleSaveImage}
          disabled={exporting}
        >
          {exporting ? '생성 중...' : '이미지 저장'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
