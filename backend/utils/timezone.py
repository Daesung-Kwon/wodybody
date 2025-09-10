"""시간대 관련 유틸리티"""

from datetime import datetime, timezone, timedelta
import pytz

# 한국 시간대
KOREA_TZ = pytz.timezone('Asia/Seoul')

def get_korea_time():
    """한국 시간 반환"""
    return datetime.now(KOREA_TZ)

def utc_to_korea(utc_dt):
    """UTC 시간을 한국 시간으로 변환"""
    if utc_dt.tzinfo is None:
        utc_dt = pytz.utc.localize(utc_dt)
    return utc_dt.astimezone(KOREA_TZ)

def korea_to_utc(korea_dt):
    """한국 시간을 UTC로 변환"""
    if korea_dt.tzinfo is None:
        korea_dt = KOREA_TZ.localize(korea_dt)
    return korea_dt.astimezone(pytz.utc)

def format_korea_time(dt, format_str='%Y-%m-%d %H:%M'):
    """한국 시간으로 포맷팅"""
    if dt is None:
        return None
    
    # UTC 시간인 경우 한국 시간으로 변환
    if dt.tzinfo is None:
        dt = pytz.utc.localize(dt)
    
    korea_time = dt.astimezone(KOREA_TZ)
    return korea_time.strftime(format_str)
