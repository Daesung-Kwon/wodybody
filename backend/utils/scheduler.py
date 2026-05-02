"""APScheduler 인-프로세스 데일리 푸시 워커.

10분마다 깨어나 ``user_preferences.push_time`` (사용자 timezone 기준)이 현재 분(±10분)
구간에 들어오는 사용자에게 오늘의 추천을 생성하고 푸시를 발송한다.

APScheduler가 미설치이거나 ``PT_PUSH_WORKER_ENABLED=false``면 워커는 시작되지 않는다.
APNs/FCM 자격증명이 없는 경우 ``push_dispatch``가 no-op으로 동작하므로 안전하다.
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta

from config.database import db


logger = logging.getLogger(__name__)


def _within_window(now_dt: datetime, hhmm: str, window_minutes: int = 10) -> bool:
    try:
        hh, mm = hhmm.split(':')
        target = now_dt.replace(hour=int(hh), minute=int(mm), second=0, microsecond=0)
    except Exception:
        return False
    delta = abs((now_dt - target).total_seconds())
    return delta <= window_minutes * 60


def daily_push_tick(app):
    """현재 분(±10분) 구간 사용자에게 추천 생성 + 푸시 발송."""
    from models.preference import UserPreferences
    from models.push_token import PushTokens
    from models.daily_assignment import DailyAssignments
    from models.program import Programs
    from routes.recommendations import generate_recommendation, _today_for_user
    from utils.push_dispatch import send_to_tokens, is_configured

    push_disable = (os.environ.get('PT_PUSH_ENABLED') or 'true').lower() == 'false'
    if push_disable:
        return

    with app.app_context():
        try:
            try:
                import pytz  # type: ignore
            except Exception:
                pytz = None  # type: ignore

            prefs = UserPreferences.query.filter_by(push_enabled=True).all()
            sent_users = 0
            for pref in prefs:
                tz_name = pref.timezone or 'Asia/Seoul'
                try:
                    tz = pytz.timezone(tz_name) if pytz else None
                except Exception:
                    tz = None
                now = datetime.now(tz) if tz else datetime.utcnow()
                push_time = pref.push_time or '09:00'
                if not _within_window(now, push_time):
                    continue

                # 오늘 이미 발송했는지 확인 (alert_sent flag in feedback_json)
                today = _today_for_user(pref)
                existing = DailyAssignments.query.filter_by(
                    user_id=pref.user_id, assignment_date=today
                ).first()
                if existing is not None:
                    fb = existing.feedback_dict()
                    if fb.get('push_sent_at'):
                        continue

                try:
                    assignment = generate_recommendation(pref.user_id, today=today)
                except Exception as e:
                    logger.warning('generate_recommendation failed user=%s err=%s', pref.user_id, e)
                    continue

                title = '오늘의 WOD가 도착했어요'
                body = '오늘은 어떤 운동을 할지 확인해 보세요.'
                if assignment.program_id:
                    program = Programs.query.get(assignment.program_id)
                    if program is not None:
                        body = f'{program.title} · {assignment.duration_estimate_minutes or pref.available_minutes or 20}분'

                tokens = PushTokens.query.filter_by(user_id=pref.user_id, is_active=True).all()
                if not tokens:
                    # 토큰이 없으면 발송 시도 자체를 생략
                    fb = assignment.feedback_dict()
                    fb['push_sent_at'] = now.isoformat()
                    fb['push_skipped_reason'] = 'no_tokens'
                    assignment.set_feedback(fb)
                    db.session.commit()
                    continue

                config = is_configured()
                if not (config['apns'] or config['fcm']):
                    fb = assignment.feedback_dict()
                    fb['push_sent_at'] = now.isoformat()
                    fb['push_skipped_reason'] = 'creds_missing'
                    assignment.set_feedback(fb)
                    db.session.commit()
                    logger.info('push creds missing — assignment marked but no actual send (user=%s)', pref.user_id)
                    continue

                counts = send_to_tokens(
                    tokens, title, body,
                    deeplink='wodybody://today',
                    data_extra={
                        'type': 'daily_recommendation',
                        'assignment_id': str(assignment.id),
                        'program_id': str(assignment.program_id or ''),
                    },
                )
                fb = assignment.feedback_dict()
                fb['push_sent_at'] = now.isoformat()
                fb['push_counts'] = counts
                assignment.set_feedback(fb)
                db.session.commit()
                sent_users += 1
            if sent_users:
                logger.info('daily_push_tick: %s users notified', sent_users)
        except Exception as e:
            logger.exception('daily_push_tick error: %s', e)


_scheduler = None


def start_scheduler(app):
    """app.py에서 1회 호출. 이미 시작되어 있거나 의존성/플래그가 비활성이면 no-op."""
    global _scheduler
    if (os.environ.get('PT_PUSH_WORKER_ENABLED') or 'true').lower() == 'false':
        app.logger.info('PT push worker disabled (PT_PUSH_WORKER_ENABLED=false)')
        return None
    if _scheduler is not None:
        return _scheduler
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
    except Exception as e:
        app.logger.warning('APScheduler 미설치 — 일일 푸시 워커 비활성. %s', e)
        return None

    scheduler = BackgroundScheduler(daemon=True, timezone='UTC')
    scheduler.add_job(
        daily_push_tick,
        trigger='interval',
        minutes=10,
        kwargs={'app': app},
        id='wodybody_daily_push',
        replace_existing=True,
        next_run_time=datetime.utcnow() + timedelta(seconds=30),
    )
    scheduler.start()
    _scheduler = scheduler
    app.logger.info('APScheduler started: wodybody_daily_push every 10min')
    return scheduler
