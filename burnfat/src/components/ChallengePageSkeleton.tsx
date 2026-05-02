import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';

interface ChallengePageSkeletonProps {
  disableAnimation?: boolean;
}

export default function ChallengePageSkeleton({ disableAnimation = false }: ChallengePageSkeletonProps) {
  const skeletonAnimation = disableAnimation ? false : 'wave';

  return (
    <Box sx={{ px: 2, pt: 2, pb: 1 }}>
      <Skeleton variant="rounded" width={72} height={32} animation={skeletonAnimation} sx={{ mb: 2 }} />

      <Stack spacing={1} sx={{ mb: 2 }}>
        <Skeleton variant="text" width="48%" height={40} animation={skeletonAnimation} />
        <Skeleton variant="text" width="62%" height={24} animation={skeletonAnimation} />
        <Skeleton variant="text" width="36%" height={22} animation={skeletonAnimation} />
      </Stack>

      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ p: 2 }}>
          <Skeleton variant="text" width={96} height={22} animation={skeletonAnimation} sx={{ mb: 1 }} />
          <Stack direction="row" spacing={1} alignItems="center">
            <Skeleton variant="rounded" height={40} sx={{ flex: 1 }} animation={skeletonAnimation} />
            <Skeleton variant="rounded" width={84} height={40} animation={skeletonAnimation} />
          </Stack>
        </CardContent>
      </Card>

      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Skeleton variant="rounded" width={112} height={38} animation={skeletonAnimation} />
        <Skeleton variant="rounded" width={96} height={38} animation={skeletonAnimation} />
        <Skeleton variant="rounded" width={108} height={38} animation={skeletonAnimation} />
      </Stack>

      <Stack spacing={2}>
        {[0, 1, 2].map((item) => (
          <Card key={item}>
            <CardContent sx={{ p: 2 }}>
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Skeleton variant="text" width={148} height={26} animation={skeletonAnimation} />
                  <Skeleton variant="rounded" width={120} height={36} animation={skeletonAnimation} />
                </Stack>
                <Skeleton variant="text" width="88%" height={22} animation={skeletonAnimation} />
                <Skeleton variant="text" width="66%" height={22} animation={skeletonAnimation} />
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Box>
  );
}
