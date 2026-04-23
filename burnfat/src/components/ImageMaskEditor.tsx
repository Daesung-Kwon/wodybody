import { useState, useRef, useCallback, useEffect } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

interface Props {
  file: File | null;
  onMaskedBlob: (blob: Blob) => void;
  onReset: () => void;
}

export default function ImageMaskEditor({ file, onMaskedBlob, onReset }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [loaded, setLoaded] = useState(false);

  const getPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const target = e.currentTarget as HTMLCanvasElement;
    const rect = target.getBoundingClientRect();
    const scaleX = target.width / rect.width;
    const scaleY = target.height / rect.height;
    const clientX = 'touches' in e ? e.touches[0]?.clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0]?.clientY : (e as React.MouseEvent).clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, []);

  const draw = useCallback(
    (x: number, y: number) => {
      const mask = maskRef.current;
      if (!mask) return;
      const ctx = mask.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(x, y, 24, 0, Math.PI * 2);
      ctx.fill();
    },
    []
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setDrawing(true);
      const pos = getPos(e);
      draw(pos.x, pos.y);
    },
    [getPos, draw]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!drawing) return;
      const pos = getPos(e);
      draw(pos.x, pos.y);
    },
    [drawing, getPos, draw]
  );

  const handleMouseUp = useCallback(() => setDrawing(false), []);
  const handleMouseLeave = useCallback(() => setDrawing(false), []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      setDrawing(true);
      const pos = getPos(e);
      draw(pos.x, pos.y);
    },
    [getPos, draw]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      if (!drawing) return;
      const pos = getPos(e);
      draw(pos.x, pos.y);
    },
    [drawing, getPos, draw]
  );

  const handleTouchEnd = useCallback(() => setDrawing(false), []);

  useEffect(() => {
    if (!file) {
      setLoaded(false);
      imageRef.current = null;
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      imageRef.current = img;
      const maxW = 400;
      const maxH = 400;
      let w = img.width;
      let h = img.height;
      if (w > maxW || h > maxH) {
        const r = Math.min(maxW / w, maxH / h);
        w = Math.floor(w * r);
        h = Math.floor(h * r);
      }
      setImgSize({ w, h });
      const canvas = canvasRef.current;
      const mask = maskRef.current;
      if (canvas && mask) {
        canvas.width = w;
        canvas.height = h;
        mask.width = w;
        mask.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
        }
      }
      URL.revokeObjectURL(url);
      setLoaded(true);
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleApply = useCallback(() => {
    const canvas = canvasRef.current;
    const mask = maskRef.current;
    const img = imageRef.current;
    if (!canvas || !mask || !img) return;
    const maskCtx = mask.getContext('2d');
    if (!maskCtx) return;

    const origW = img.naturalWidth || img.width;
    const origH = img.naturalHeight || img.height;

    const out = document.createElement('canvas');
    out.width = origW;
    out.height = origH;
    const outCtx = out.getContext('2d');
    if (!outCtx) return;

    outCtx.drawImage(img, 0, 0, origW, origH);
    const outData = outCtx.getImageData(0, 0, origW, origH);

    const scaledMask = document.createElement('canvas');
    scaledMask.width = origW;
    scaledMask.height = origH;
    const scaledMaskCtx = scaledMask.getContext('2d');
    if (!scaledMaskCtx) return;
    scaledMaskCtx.drawImage(mask, 0, 0, mask.width, mask.height, 0, 0, origW, origH);
    const maskData = scaledMaskCtx.getImageData(0, 0, origW, origH);

    for (let i = 0; i < maskData.data.length; i += 4) {
      if (maskData.data[i + 3] > 10) {
        outData.data[i] = 0;
        outData.data[i + 1] = 0;
        outData.data[i + 2] = 0;
        outData.data[i + 3] = 255;
      }
    }
    outCtx.putImageData(outData, 0, 0);
    out.toBlob(
      (blob) => {
        if (blob) onMaskedBlob(blob);
      },
      'image/jpeg',
      0.95
    );
  }, [onMaskedBlob]);

  if (!file) return null;

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        <Box component="span" sx={{ color: 'error.main', fontWeight: 600 }}>개인정보(이름, 체중 등)</Box>
        가 보이는 영역을 <Box component="span" sx={{ color: 'primary.main', fontWeight: 600 }}>터치/드래그하여 검정으로 가립니다.</Box>{' '}
        <Box component="span" sx={{ color: 'success.main', fontWeight: 600 }}>체지방률만 보이도록 남겨두세요.</Box>
      </Typography>
      <Box
        sx={{
          position: 'relative',
          display: 'inline-block',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <Box sx={{ position: 'relative', width: imgSize.w, height: imgSize.h, maxWidth: '100%' }}>
          <canvas
            ref={canvasRef}
            style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}
          />
          <canvas
            ref={maskRef}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              cursor: 'crosshair',
              touchAction: 'none',
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
        </Box>
      </Box>
      {loaded && (
        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
          <Button size="small" variant="outlined" onClick={onReset}>
            다시 선택
          </Button>
          <Button size="small" variant="contained" onClick={handleApply}>
            마스킹 적용
          </Button>
        </Box>
      )}
    </Box>
  );
}
