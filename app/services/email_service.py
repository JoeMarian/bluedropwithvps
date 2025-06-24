import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings
from typing import Optional
import logging
import os

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USER
        self.smtp_password = settings.SMTP_PASSWORD
        self.email_from = settings.EMAIL_FROM
        self.email_from_name = settings.EMAIL_FROM_NAME
        self.smtp_tls = settings.SMTP_TLS

    def send_email(self, to_email: str, subject: str, html_content: str) -> bool:
        """Send email using SMTP"""
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{self.email_from_name} <{self.email_from}>"
            msg['To'] = to_email

            # Attach HTML content
            html_part = MIMEText(html_content, 'html')
            msg.attach(html_part)

            # Connect to SMTP server
            if self.smtp_tls:
                server = smtplib.SMTP(self.smtp_host, self.smtp_port)
                server.starttls()
            else:
                server = smtplib.SMTP_SSL(self.smtp_host, self.smtp_port)

            # Login
            server.login(self.smtp_user, self.smtp_password)

            # Send email
            server.send_message(msg)
            server.quit()

            logger.info(f"Email sent successfully to {to_email}")
            return True

        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return False

    def send_verification_email(self, user_email: str, username: str, verification_token: str) -> bool:
        """Send email verification email"""
        frontend_url = getattr(settings, 'FRONTEND_URL', None) or os.getenv('FRONTEND_URL', 'http://localhost:5174')
        verification_url = f"{frontend_url}/verify-email/{verification_token}"
        subject = "Verify Your Email - TankManage by TeamSKRN"
        html_content = f"""
        <html>
        <head>
            <title>Email Verification</title>
            <style>
                .button {{ background-color: #2196f3; color: white; padding: 10px 20px; border: none; border-radius: 4px; text-decoration: none; font-size: 16px; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <h2>Verify Your Email</h2>
                <p>Thank you for registering with TankManage. Please verify your email address by clicking the button below:</p>
                <a href="{verification_url}" class="button">Verify Email</a>
                <p style="word-break: break-all; color: #666;">{verification_url}</p>
                <p>This verification link will expire in 24 hours.</p>
                <p>If you didn't create an account, please ignore this email.</p>
            </div>
        </body>
        </html>
        """
        return self.send_email(user_email, subject, html_content)

    def send_dashboard_assignment_email(self, user_email: str, username: str, dashboard_name: str, api_key: str) -> bool:
        """Send dashboard assignment notification email"""
        subject = f"New Dashboard Assigned - {dashboard_name}"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Dashboard Assignment</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #4caf50; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; background-color: #f9f9f9; }}
                .api-key-container {{ background-color: #e3f2fd; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #2196f3; }}
                .api-key-label {{ font-weight: bold; color: #1976d2; margin-bottom: 8px; }}
                .api-key {{ background-color: #f5f5f5; padding: 10px; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 14px; color: #333; border: 1px solid #ddd; word-break: break-all; }}
                .copy-instruction {{ font-size: 12px; color: #666; margin-top: 8px; }}
                .button {{ display: inline-block; padding: 12px 24px; background-color: #4caf50; color: white; text-decoration: none; border-radius: 4px; }}
                .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
                .highlight {{ background-color: #fff3cd; padding: 10px; border-radius: 4px; border-left: 4px solid #ffc107; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Dashboard Assignment</h1>
                </div>
                <div class="content">
                    <h2>Hello {username}!</h2>
                    <p>A new dashboard has been assigned to you by an administrator.</p>
                    
                    <h3>Dashboard Details:</h3>
                    <ul>
                        <li><strong>Name:</strong> {dashboard_name}</li>
                    </ul>
                    
                    <div class="api-key-container">
                        <div class="api-key-label">🔑 API Key (Copy this for data uploads):</div>
                        <div class="api-key">{api_key}</div>
                        <div class="copy-instruction">💡 Tip: Select and copy the API key above. You'll need it for data uploads and integrations.</div>
                    </div>
                    
                    <div class="highlight">
                        <strong>Important:</strong> Keep your API key secure and don't share it with others. This key is required for uploading data to your dashboard.
                    </div>
                    
                    <p>You can now access this dashboard from your user dashboard.</p>
                    <p style="text-align: center;">
                        <a href="https://tankmanage.teamskrn.xyz/dashboard" class="button">View Dashboard</a>
                    </p>
                    
                    <p><strong>What you can do:</strong></p>
                    <ul>
                        <li>View real-time data on your dashboard</li>
                        <li>Use the API key to upload data from sensors or devices</li>
                        <li>Monitor your assigned fields and widgets</li>
                    </ul>
                </div>
                <div class="footer">
                    <p>This is an automated notification from TankManage by TeamSKRN.</p>
                    <p>If you have any questions, please contact your administrator.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return self.send_email(user_email, subject, html_content)

    def send_approval_notification_email(self, user_email: str, username: str, approved: bool) -> bool:
        """Send user approval/rejection notification email"""
        if approved:
            subject = "Account Approved - TankManage by TeamSKRN"
            status_text = "approved"
            color = "#4caf50"
        else:
            subject = "Account Status - TankManage by TeamSKRN"
            status_text = "not approved"
            color = "#f44336"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Account Status</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: {color}; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; background-color: #f9f9f9; }}
                .button {{ display: inline-block; padding: 12px 24px; background-color: {color}; color: white; text-decoration: none; border-radius: 4px; }}
                .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Account Status Update</h1>
                </div>
                <div class="content">
                    <h2>Hello {username}!</h2>
                    <p>Your account has been {status_text} by an administrator.</p>
                    
                    {f'<p style="text-align: center;"><a href="https://tankmanage.teamskrn.xyz/login" class="button">Login Now</a></p>' if approved else ''}
                    
                    <p>If you have any questions, please contact the administrator.</p>
                </div>
                <div class="footer">
                    <p>This is an automated notification from TankManage by TeamSKRN.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return self.send_email(user_email, subject, html_content)

# Create a global instance
email_service = EmailService() 