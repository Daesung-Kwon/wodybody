"""아이콘/스플래시 PNG 자동 생성 스크립트.

사용법:
    pip install Pillow
    python mobile/resources/generate_assets.py

생성되는 파일:
    - mobile/resources/icon.png    1024x1024
    - mobile/resources/splash.png  2732x2732

이 두 원본을 만들면 ``@capacitor/assets`` 또는 Cordova-res 등의 도구로
모든 사이즈의 아이콘/스플래시를 자동 생성할 수 있다.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


HERE = Path(__file__).resolve().parent

# WODYBODY 브랜드 컬러 (frontend 테마와 동일 톤)
PRIMARY = (25, 118, 210)
PRIMARY_DARK = (13, 71, 161)
ACCENT = (255, 255, 255)


def _try_load_font(size: int) -> ImageFont.ImageFont:
    candidates = [
        '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
        '/System/Library/Fonts/Helvetica.ttc',
        '/System/Library/Fonts/SFNSDisplay.ttf',
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    ]
    for c in candidates:
        if Path(c).exists():
            try:
                return ImageFont.truetype(c, size)
            except Exception:
                continue
    return ImageFont.load_default()


def _radial_gradient(size: int, inner: tuple[int, int, int], outer: tuple[int, int, int]) -> Image.Image:
    img = Image.new('RGB', (size, size), outer)
    pixels = img.load()
    cx = cy = size // 2
    max_d = (cx ** 2 + cy ** 2) ** 0.5
    for y in range(size):
        for x in range(size):
            d = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5 / max_d
            t = d
            r = int(inner[0] * (1 - t) + outer[0] * t)
            g = int(inner[1] * (1 - t) + outer[1] * t)
            b = int(inner[2] * (1 - t) + outer[2] * t)
            pixels[x, y] = (r, g, b)
    return img


def make_icon(size: int = 1024) -> None:
    img = _radial_gradient(size, PRIMARY, PRIMARY_DARK)
    draw = ImageDraw.Draw(img)
    # 굵은 둥근 모서리 사각형 외곽
    pad = size // 8
    draw.rounded_rectangle(
        [pad, pad, size - pad, size - pad],
        radius=size // 8,
        outline=ACCENT,
        width=size // 80,
    )
    # 'W' 로고
    font = _try_load_font(size // 2)
    text = 'W'
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    draw.text(
        ((size - tw) // 2 - bbox[0], (size - th) // 2 - bbox[1] - size // 30),
        text,
        font=font,
        fill=ACCENT,
    )
    out = HERE / 'icon.png'
    img.save(out, 'PNG')
    print(f'  -> {out}  ({size}x{size})')


def make_splash(size: int = 2732) -> None:
    img = _radial_gradient(size, PRIMARY, PRIMARY_DARK)
    draw = ImageDraw.Draw(img)

    # 중앙에 'WODYBODY' 텍스트
    font_main = _try_load_font(size // 12)
    text = 'WODYBODY'
    bbox = draw.textbbox((0, 0), text, font=font_main)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    draw.text(
        ((size - tw) // 2 - bbox[0], (size - th) // 2 - bbox[1] - size // 40),
        text,
        font=font_main,
        fill=ACCENT,
    )

    # 서브 텍스트
    font_sub = _try_load_font(size // 36)
    sub = 'AI Personal Training'
    bbox2 = draw.textbbox((0, 0), sub, font=font_sub)
    sw = bbox2[2] - bbox2[0]
    draw.text(
        ((size - sw) // 2 - bbox2[0], (size + th) // 2 + size // 80),
        sub,
        font=font_sub,
        fill=(220, 230, 255),
    )

    out = HERE / 'splash.png'
    img.save(out, 'PNG')
    print(f'  -> {out}  ({size}x{size})')


if __name__ == '__main__':
    print('Generating mobile assets...')
    make_icon()
    make_splash()
    print('Done. 다음 단계로 `npx @capacitor/assets generate` 또는 cordova-res로 모든 사이즈를 생성하세요.')
