import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { UserRole } from '@prisma/client';

export interface InvitationEmailData {
  to: string;
  firstName: string;
  inviterName?: string;
  organizationName: string;
  inviteToken: string;
  role: UserRole;
}

export interface TenantPortalInvitationData {
  to: string;
  firstName: string;
  organizationName: string;
  inviteToken: string;
  propertyName?: string;
}

export interface WelcomeEmailData {
  to: string;
  firstName: string;
  organizationName: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
  }

  private async initializeTransporter() {
    const emailConfig = {
      host: this.configService.get('EMAIL_HOST', 'smtp.gmail.com'),
      port: this.configService.get('EMAIL_PORT', 587),
      secure: this.configService.get('EMAIL_SECURE', false),
      auth: {
        user: this.configService.get('EMAIL_USER'),
        pass: this.configService.get('EMAIL_PASSWORD'),
      },
    };

    // Create transporter
    this.transporter = nodemailer.createTransport(emailConfig);

    // Test connection only if credentials are provided
    if (emailConfig.auth.user && emailConfig.auth.pass) {
      try {
        await this.transporter.verify();
        this.logger.log('Email service connected successfully');
      } catch (error) {
        this.logger.warn('Email service connection failed:', error.message);
        this.logger.warn('Emails will be logged to console instead');
      }
    } else {
      this.logger.warn('Email credentials not configured - emails will be logged to console');
    }
  }

  async sendInvitation(data: InvitationEmailData): Promise<{ success: boolean }> {
    const frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:3001');
    const inviteUrl = `${frontendUrl}/accept-invitation?token=${data.inviteToken}`;

    const subject = `You're invited to join ${data.organizationName} on PropFlow`;

    const html = this.generateInvitationEmailHtml({
      ...data,
      inviteUrl,
    });

    return this.sendEmail({
      to: data.to,
      subject,
      html,
    });
  }

  async sendTenantPortalInvitation(data: TenantPortalInvitationData): Promise<{ success: boolean }> {
    const frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:3001');
    const inviteUrl = `${frontendUrl}/tenant-portal/setup?token=${data.inviteToken}`;

    const subject = `Welcome to your tenant portal - ${data.organizationName}`;

    const html = this.generateTenantPortalEmailHtml({
      ...data,
      inviteUrl,
    });

    return this.sendEmail({
      to: data.to,
      subject,
      html,
    });
  }

  async sendWelcomeEmail(data: WelcomeEmailData): Promise<{ success: boolean }> {
    const subject = `Welcome to ${data.organizationName}!`;

    const html = this.generateWelcomeEmailHtml(data);

    return this.sendEmail({
      to: data.to,
      subject,
      html,
    });
  }

  async sendPasswordResetEmail(to: string, firstName: string, resetToken: string): Promise<{ success: boolean }> {
    const frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:3001');
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    const subject = 'Reset your PropFlow password';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
          ${this.getEmailStyles()}
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Password Reset</h1>
              <p>Reset your PropFlow password</p>
            </div>
            <div class="content">
              <h2>Hi ${firstName}!</h2>
              <p>We received a request to reset your password for your PropFlow account.</p>
              
              <p>Click the button below to reset your password:</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" class="button" style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%);">
                  Reset Password
                </a>
              </div>
              
              <p><small>This link will expire in 1 hour. If you didn't request this reset, please ignore this email.</small></p>
              
              <p><small>If you can't click the button, copy and paste this URL into your browser: ${resetUrl}</small></p>
            </div>
            <div class="footer">
              <p>© 2024 PropFlow. Professional Property Management.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject,
      html,
    });
  }

  private async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
  }): Promise<{ success: boolean }> {
    const emailFrom = this.configService.get('EMAIL_FROM', 'noreply@propflow.com');

    try {
      if (this.transporter && this.configService.get('EMAIL_USER')) {
        // Send actual email
        const result = await this.transporter.sendMail({
          from: emailFrom,
          to: options.to,
          subject: options.subject,
          html: options.html,
        });

        this.logger.log(`Email sent successfully to ${options.to}: ${result.messageId}`);
        return { success: true };
      } else {
        // Log email to console for development/testing
        this.logger.log(`📧 EMAIL SENT (Console Mode)`);
        this.logger.log(`To: ${options.to}`);
        this.logger.log(`Subject: ${options.subject}`);
        this.logger.log(`From: ${emailFrom}`);
        this.logger.log('HTML content logged below:');
        this.logger.log(options.html);
        return { success: true };
      }
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}:`, error);
      return { success: false };
    }
  }

  private generateInvitationEmailHtml(data: InvitationEmailData & { inviteUrl: string }): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invitation to PropFlow</title>
          ${this.getEmailStyles()}
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏢 PropFlow</h1>
              <p>Property Management System</p>
            </div>
            <div class="content">
              <h2>Hi ${data.firstName}!</h2>
              <p>You've been invited to join <strong>${data.organizationName}</strong> on PropFlow.</p>
              
              ${data.inviterName ? `<p>This invitation was sent by ${data.inviterName}.</p>` : ''}
              
              <p>You've been assigned the role: <span class="role-badge">${this.formatRole(data.role)}</span></p>
              
              <p>Click the button below to accept your invitation and set up your account:</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.inviteUrl}" class="button">Accept Invitation</a>
              </div>
              
              <p><small>This invitation will expire in 7 days. If you can't click the button, 
              copy and paste this URL into your browser: ${data.inviteUrl}</small></p>
              
              <p>Welcome to the team!</p>
            </div>
            <div class="footer">
              <p>© 2024 PropFlow. Professional Property Management.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private generateTenantPortalEmailHtml(data: TenantPortalInvitationData & { inviteUrl: string }): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Tenant Portal Access</title>
          ${this.getEmailStyles()}
        </head>
        <body>
          <div class="container">
            <div class="header" style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);">
              <h1>🏠 Tenant Portal</h1>
              <p>Your Property Management Hub</p>
            </div>
            <div class="content">
              <h2>Welcome ${data.firstName}!</h2>
              <p>Your tenant portal has been activated by <strong>${data.organizationName}</strong>.</p>
              
              ${data.propertyName ? `<p>This portal is for your residence at <strong>${data.propertyName}</strong>.</p>` : ''}
              
              <p>Through your portal, you can:</p>
              
              <div class="feature">
                <strong>💰 Make Rent Payments</strong><br>
                Pay rent online securely and view payment history
              </div>
              
              <div class="feature">
                <strong>🔧 Submit Maintenance Requests</strong><br>
                Report issues and track repair progress
              </div>
              
              <div class="feature">
                <strong>📋 View Lease Details</strong><br>
                Access your lease information and important documents
              </div>
              
              <div class="feature">
                <strong>📞 Contact Management</strong><br>
                Communicate directly with your property manager
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.inviteUrl}" class="button" style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);">
                  Access Your Portal
                </a>
              </div>
              
              <p><small>If you can't click the button, copy and paste this URL: ${data.inviteUrl}</small></p>
            </div>
            <div class="footer">
              <p>© 2024 PropFlow. Professional Property Management.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private generateWelcomeEmailHtml(data: WelcomeEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to PropFlow</title>
          ${this.getEmailStyles()}
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Welcome to PropFlow!</h1>
              <p>Your property management journey begins</p>
            </div>
            <div class="content">
              <h2>Hi ${data.firstName}!</h2>
              <p>Welcome to <strong>${data.organizationName}</strong> on PropFlow!</p>
              
              <p>Your account has been successfully activated. You can now:</p>
              
              <div class="feature">
                <strong>📊 Access Dashboard</strong><br>
                View real-time metrics and property performance
              </div>
              
              <div class="feature">
                <strong>🏢 Manage Properties</strong><br>
                Add, edit, and track your property portfolio
              </div>
              
              <div class="feature">
                <strong>👥 Manage Tenants</strong><br>
                Handle tenant relationships and communications
              </div>
              
              <div class="feature">
                <strong>💼 Financial Tracking</strong><br>
                Monitor income, expenses, and generate reports
              </div>
              
              <p>If you have any questions, our support team is here to help!</p>
            </div>
            <div class="footer">
              <p>© 2024 PropFlow. Professional Property Management.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private getEmailStyles(): string {
    return `
      <style>
        body { 
          font-family: 'Inter', Arial, sans-serif; 
          line-height: 1.6; 
          color: #333; 
          margin: 0; 
          padding: 0; 
          background-color: #f8fafc;
        }
        .container { 
          max-width: 600px; 
          margin: 20px auto; 
          background: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        }
        .header { 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
          color: white; 
          padding: 40px 30px; 
          text-align: center; 
        }
        .header h1 {
          margin: 0 0 10px 0;
          font-size: 28px;
          font-weight: 700;
        }
        .header p {
          margin: 0;
          font-size: 16px;
          opacity: 0.9;
        }
        .content { 
          padding: 40px 30px; 
        }
        .content h2 {
          color: #1f2937;
          font-size: 24px;
          margin: 0 0 20px 0;
        }
        .content p {
          margin: 16px 0;
          color: #4b5563;
          font-size: 16px;
        }
        .button { 
          display: inline-block; 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white; 
          padding: 16px 32px; 
          text-decoration: none; 
          border-radius: 12px;
          font-weight: 600; 
          font-size: 16px;
          transition: transform 0.2s;
        }
        .button:hover {
          transform: translateY(-2px);
        }
        .footer { 
          text-align: center; 
          padding: 30px; 
          color: #6b7280; 
          font-size: 14px;
          background-color: #f9fafb;
          border-top: 1px solid #e5e7eb;
        }
        .role-badge { 
          background: #e0e7ff; 
          padding: 4px 12px; 
          border-radius: 20px; 
          font-size: 14px; 
          font-weight: 600; 
          color: #3730a3;
          display: inline-block; 
        }
        .feature { 
          background: #f8fafc; 
          padding: 16px; 
          margin: 12px 0; 
          border-radius: 12px; 
          border-left: 4px solid #667eea;
        }
        .feature strong {
          color: #1f2937;
          display: block;
          margin-bottom: 4px;
        }
        small {
          color: #6b7280;
          font-size: 14px;
        }
      </style>
    `;
  }

  private formatRole(role: UserRole): string {
    const roleNames = {
      [UserRole.SUPER_ADMIN]: 'Super Administrator',
      [UserRole.ORG_ADMIN]: 'Organization Admin',
      [UserRole.ENTITY_MANAGER]: 'Entity Manager',
      [UserRole.PROPERTY_MANAGER]: 'Property Manager',
      [UserRole.TENANT]: 'Tenant',
      [UserRole.MAINTENANCE]: 'Maintenance Staff',
      [UserRole.ACCOUNTANT]: 'Accountant',
    };
    return roleNames[role] || role;
  }
}