"""이메일 전송 유틸리티"""
from flask_mail import Mail, Message
from flask import current_app
import os
import requests

# Flask-Mail 인스턴스 (app.py에서 초기화)
mail = Mail()

def init_mail(app):
    """Flask-Mail 초기화"""
    # 이메일 설정 (환경변수에서 가져옴)
    app.config['MAIL_SERVER'] = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
    app.config['MAIL_PORT'] = int(os.environ.get('MAIL_PORT', '587'))
    app.config['MAIL_USE_TLS'] = os.environ.get('MAIL_USE_TLS', 'True').lower() == 'true'
    app.config['MAIL_USE_SSL'] = os.environ.get('MAIL_USE_SSL', 'False').lower() == 'true'
    app.config['MAIL_USERNAME'] = os.environ.get('MAIL_USERNAME')
    app.config['MAIL_PASSWORD'] = os.environ.get('MAIL_PASSWORD')
    app.config['MAIL_DEFAULT_SENDER'] = os.environ.get('MAIL_DEFAULT_SENDER', os.environ.get('MAIL_USERNAME'))
    
    # Resend API 설정
    app.config['RESEND_API_KEY'] = os.environ.get('RESEND_API_KEY') or os.environ.get('MAIL_PASSWORD')
    
    mail.init_app(app)
    return mail

def send_email_resend(to_email, subject, html_body, text_body):
    """Resend HTTP API를 사용한 이메일 전송 (Railway 호환)"""
    try:
        api_key = current_app.config.get('RESEND_API_KEY')
        if not api_key:
            raise ValueError("RESEND_API_KEY가 설정되지 않았습니다")
        
        from_email = current_app.config.get('MAIL_DEFAULT_SENDER', 'onboarding@resend.dev')
        
        response = requests.post(
            'https://api.resend.com/emails',
            headers={
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json'
            },
            json={
                'from': from_email,
                'to': [to_email],
                'subject': subject,
                'html': html_body,
                'text': text_body
            },
            timeout=10
        )
        
        if response.status_code == 200:
            current_app.logger.info(f'Resend API 이메일 전송 성공: {to_email}')
            return True, "이메일이 성공적으로 전송되었습니다."
        else:
            error_msg = response.json().get('message', 'Unknown error')
            current_app.logger.error(f'Resend API 이메일 전송 실패: {error_msg}')
            return False, f"이메일 전송 실패: {error_msg}"
            
    except Exception as e:
        current_app.logger.error(f'Resend API 이메일 전송 중 예외: {str(e)}')
        return False, f"이메일 전송 중 오류가 발생했습니다: {str(e)}"

def send_verification_code(email, verification_code, user_name=''):
    """비밀번호 재설정 인증번호 이메일 전송 (Resend HTTP API 사용)"""
    subject = '[WodyBody] 비밀번호 재설정 인증번호'
    
    # HTML 이메일 본문
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
            }}
            .container {{
                background-color: #f9f9f9;
                border-radius: 10px;
                padding: 30px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }}
            .header {{
                text-align: center;
                margin-bottom: 30px;
            }}
            .logo {{
                font-size: 28px;
                font-weight: bold;
                color: #1976d2;
                margin-bottom: 10px;
            }}
            .code-box {{
                background: linear-gradient(135deg, #1976d2 0%, #42a5f5 100%);
                color: white;
                font-size: 32px;
                font-weight: bold;
                letter-spacing: 8px;
                text-align: center;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
            }}
            .info {{
                background-color: #fff3cd;
                border-left: 4px solid #ffc107;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
            }}
            .footer {{
                text-align: center;
                margin-top: 30px;
                color: #666;
                font-size: 14px;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🏋️ WodyBody</div>
                <h2>비밀번호 재설정</h2>
            </div>
            
            <p>안녕하세요{', ' + user_name + '님' if user_name else ''}!</p>
            <p>비밀번호 재설정을 위한 인증번호를 발송해 드립니다.</p>
            
            <div class="code-box">
                {verification_code}
            </div>
            
            <div class="info">
                <strong>⏰ 주의사항</strong><br>
                • 이 인증번호는 <strong>10분간</strong> 유효합니다.<br>
                • 인증번호를 요청하지 않으셨다면, 이 메일을 무시하셔도 됩니다.<br>
                • 보안을 위해 인증번호를 타인과 공유하지 마세요.
            </div>
            
            <p>감사합니다.</p>
            <p><strong>WodyBody 팀</strong></p>
            
            <div class="footer">
                <p>이 메일은 자동으로 발송되었습니다. 회신하지 마세요.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    # 텍스트 버전 (HTML을 지원하지 않는 이메일 클라이언트용)
    text_body = f"""
    WodyBody 비밀번호 재설정
    
    안녕하세요{', ' + user_name + '님' if user_name else ''}!
    
    비밀번호 재설정을 위한 인증번호를 발송해 드립니다.
    
    인증번호: {verification_code}
    
    주의사항:
    - 이 인증번호는 10분간 유효합니다.
    - 인증번호를 요청하지 않으셨다면, 이 메일을 무시하셔도 됩니다.
    - 보안을 위해 인증번호를 타인과 공유하지 마세요.
    
    감사합니다.
    WodyBody 팀
    """
    
    # Resend HTTP API 사용 (Railway 호환)
    return send_email_resend(email, subject, html_body, text_body)

def send_password_changed_notification(email, user_name=''):
    """비밀번호 변경 완료 알림 이메일 (Resend HTTP API 사용)"""
    subject = '[WodyBody] 비밀번호가 변경되었습니다'
    
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
            }}
            .container {{
                background-color: #f9f9f9;
                border-radius: 10px;
                padding: 30px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }}
            .header {{
                text-align: center;
                margin-bottom: 30px;
            }}
            .logo {{
                font-size: 28px;
                font-weight: bold;
                color: #1976d2;
                margin-bottom: 10px;
            }}
            .success-box {{
                background-color: #d4edda;
                border-left: 4px solid #28a745;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
            }}
            .warning {{
                background-color: #fff3cd;
                border-left: 4px solid #ffc107;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
            }}
            .footer {{
                text-align: center;
                margin-top: 30px;
                color: #666;
                font-size: 14px;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🏋️ WodyBody</div>
                <h2>비밀번호 변경 완료</h2>
            </div>
            
            <p>안녕하세요{', ' + user_name + '님' if user_name else ''}!</p>
            
            <div class="success-box">
                <strong>✅ 비밀번호가 성공적으로 변경되었습니다.</strong>
            </div>
            
            <p>계정의 비밀번호가 변경되었습니다. 이제 새로운 비밀번호로 로그인하실 수 있습니다.</p>
            
            <div class="warning">
                <strong>⚠️ 본인이 변경한 것이 아니라면</strong><br>
                계정 보안이 위협받고 있을 수 있습니다. 즉시 고객센터로 문의해 주세요.
            </div>
            
            <p>감사합니다.</p>
            <p><strong>WodyBody 팀</strong></p>
            
            <div class="footer">
                <p>이 메일은 자동으로 발송되었습니다. 회신하지 마세요.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    text_body = f"""
    WodyBody 비밀번호 변경 완료
    
    안녕하세요{', ' + user_name + '님' if user_name else ''}!
    
    계정의 비밀번호가 성공적으로 변경되었습니다.
    이제 새로운 비밀번호로 로그인하실 수 있습니다.
    
    본인이 변경한 것이 아니라면, 계정 보안이 위협받고 있을 수 있습니다.
    즉시 고객센터로 문의해 주세요.
    
    감사합니다.
    WodyBody 팀
    """
    
    # Resend HTTP API 사용 (Railway 호환)
    success, message = send_email_resend(email, subject, html_body, text_body)
    return success
