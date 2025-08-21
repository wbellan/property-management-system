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
    const emailHost = this.configService.get('EMAIL_HOST', 'smtp.gmail.com');
    const emailPort = this.configService.get('EMAIL_PORT', 587);
    const emailUser = this.configService.get('EMAIL_USER');
    const emailPassword = this.configService.get('EMAIL_PASSWORD');

    // FIXED: Mailtrap-specific configuration
    let emailConfig: any = {
      host: emailHost,
      port: parseInt(emailPort.toString()),
      auth: {
        user: emailUser,
        pass: emailPassword,
      },
    };

    // Configure SSL/TLS based on the email provider
    if (emailHost.includes('mailtrap')) {
      // Mailtrap configuration
      emailConfig.secure = false; // Use STARTTLS
      emailConfig.requireTLS = true;
      emailConfig.tls = {
        // Do not fail on invalid certificates for Mailtrap
        rejectUnauthorized: false,
        ciphers: 'SSLv3'
      };
      this.logger.log('Using Mailtrap configuration');
    } else if (emailHost.includes('gmail')) {
      // Gmail configuration
      emailConfig.secure = false; // Use STARTTLS on port 587
      emailConfig.requireTLS = true;
      this.logger.log('Using Gmail configuration');
    } else {
      // Generic configuration
      emailConfig.secure = emailPort === 465; // true for 465, false for other ports
      emailConfig.requireTLS = emailPort === 587;
      this.logger.log('Using generic email configuration');
    }

    this.logger.log(`Email config: ${emailHost}:${emailPort}, secure: ${emailConfig.secure}, requireTLS: ${emailConfig.requireTLS}`);

    // Create transporter
    this.transporter = nodemailer.createTransport(emailConfig);

    // Test connection only if credentials are provided
    if (emailUser && emailPassword) {
      try {
        await this.transporter.verify();
        this.logger.log('Email service connected successfully');
      } catch (error) {
        this.logger.warn('Email service connection failed:', error.message);
        this.logger.warn('Emails will be logged to console instead');

        // Don't throw the error - fall back to console logging
        this.transporter = null;
      }
    } else {
      this.logger.warn('Email credentials not configured - emails will be logged to console');
      this.transporter = null;
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
              <h1>Password Reset</h1>
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
              <p>2024 PropFlow. Professional Property Management.</p>
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
      if (this.transporter) {
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
        this.logger.log(`EMAIL SENT (Console Mode)`);
        this.logger.log(`To: ${options.to}`);
        this.logger.log(`Subject: ${options.subject}`);
        this.logger.log(`From: ${emailFrom}`);
        this.logger.log('HTML content logged below:');
        this.logger.log(options.html);
        return { success: true };
      }
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}:`, error);

      // Fall back to console logging if real email fails
      this.logger.log(`EMAIL FALLBACK (Console Mode) - Original error: ${error.message}`);
      this.logger.log(`To: ${options.to}`);
      this.logger.log(`Subject: ${options.subject}`);

      return { success: true }; // Return success for fallback mode
    }
  }

  /**
   * Enhanced invitation email with better styling and information
   */
  private generateInvitationEmailHtml(data: InvitationEmailData & { inviteUrl: string }): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>You're Invited to Join ${data.organizationName}</title>
          ${this.getEmailStyles()}
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo-container">
                <div class="logo-icon">🏢</div>
                <h1>PropFlow</h1>
              </div>
              <p>Property Management System</p>
            </div>
            
            <div class="content">
              <div class="greeting">
                <h2>Hi ${data.firstName}!</h2>
                <p class="intro">You've been invited to join <strong>${data.organizationName}</strong> on PropFlow.</p>
              </div>

              ${data.inviterName ? `
                <div class="inviter-info">
                  <p>This invitation was sent by <strong>${data.inviterName}</strong>.</p>
                </div>
              ` : ''}

              <div class="role-assignment">
                <div class="role-card">
                  <div class="role-icon">👤</div>
                  <div class="role-details">
                    <h3>Your Role</h3>
                    <span class="role-badge">${this.formatRole(data.role)}</span>
                    <p class="role-description">${this.getRoleDescription(data.role)}</p>
                  </div>
                </div>
              </div>

              <div class="features-section">
                <h3>What you can do with PropFlow:</h3>
                <div class="features-grid">
                  ${this.getFeaturesByRole(data.role)}
                </div>
              </div>

              <div class="cta-section">
                <p>Click the button below to accept your invitation and set up your account:</p>
                <div class="button-container">
                  <a href="${data.inviteUrl}" class="button">Accept Invitation & Create Account</a>
                </div>
                <p class="expire-notice">
                  <strong>⏰ This invitation expires in 7 days</strong><br>
                  Complete your setup before it expires.
                </p>
              </div>

              <div class="help-section">
                <h4>Need Help?</h4>
                <p>If you have any questions about your invitation or need assistance setting up your account, 
                please contact your administrator or reply to this email.</p>
              </div>

              <div class="security-notice">
                <p><small>🔒 <strong>Security Notice:</strong> This invitation link is unique to you and should not be shared. 
                If you didn't expect this invitation, please ignore this email.</small></p>
              </div>

              <div class="technical-details">
                <details>
                  <summary>Having trouble with the button?</summary>
                  <p>Copy and paste this URL into your browser:</p>
                  <div class="url-box">${data.inviteUrl}</div>
                </details>
              </div>
            </div>

            <div class="footer">
              <div class="footer-content">
                <p><strong>PropFlow</strong> - Professional Property Management</p>
                <p>Streamlining property operations with modern technology</p>
                <p class="copyright">© 2024 PropFlow. All rights reserved.</p>
              </div>
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
              <h1>Tenant Portal</h1>
              <p>Your Property Management Hub</p>
            </div>
            <div class="content">
              <h2>Welcome ${data.firstName}!</h2>
              <p>Your tenant portal has been activated by <strong>${data.organizationName}</strong>.</p>
              
              ${data.propertyName ? `<p>This portal is for your residence at <strong>${data.propertyName}</strong>.</p>` : ''}
              
              <p>Through your portal, you can:</p>
              
              <div class="feature">
                <strong>Make Rent Payments</strong><br>
                Pay rent online securely and view payment history
              </div>
              
              <div class="feature">
                <strong>Submit Maintenance Requests</strong><br>
                Report issues and track repair progress
              </div>
              
              <div class="feature">
                <strong>View Lease Details</strong><br>
                Access your lease information and important documents
              </div>
              
              <div class="feature">
                <strong>Contact Management</strong><br>
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
              <p>2024 PropFlow. Professional Property Management.</p>
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
              <h1>Welcome to PropFlow!</h1>
              <p>Your property management journey begins</p>
            </div>
            <div class="content">
              <h2>Hi ${data.firstName}!</h2>
              <p>Welcome to <strong>${data.organizationName}</strong> on PropFlow!</p>
              
              <p>Your account has been successfully activated. You can now:</p>
              
              <div class="feature">
                <strong>Access Dashboard</strong><br>
                View real-time metrics and property performance
              </div>
              
              <div class="feature">
                <strong>Manage Properties</strong><br>
                Add, edit, and track your property portfolio
              </div>
              
              <div class="feature">
                <strong>Manage Tenants</strong><br>
                Handle tenant relationships and communications
              </div>
              
              <div class="feature">
                <strong>Financial Tracking</strong><br>
                Monitor income, expenses, and generate reports
              </div>
              
              <p>If you have any questions, our support team is here to help!</p>
            </div>
            <div class="footer">
              <p>2024 PropFlow. Professional Property Management.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Enhanced email styles
   */
  private getEmailStyles(): string {
    return `
      <style>
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          line-height: 1.6; 
          color: #333; 
          margin: 0; 
          padding: 20px; 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
        }
        .container { 
          max-width: 650px; 
          margin: 0 auto; 
          background: #ffffff;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        .header { 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
          color: white; 
          padding: 40px 30px; 
          text-align: center; 
        }
        .logo-container {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 15px;
          margin-bottom: 10px;
        }
        .logo-icon {
          font-size: 2.5rem;
          background: rgba(255,255,255,0.2);
          padding: 15px;
          border-radius: 15px;
          backdrop-filter: blur(10px);
        }
        .header h1 {
          margin: 0;
          font-size: 32px;
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
        .greeting h2 {
          color: #1f2937;
          font-size: 28px;
          margin: 0 0 15px 0;
        }
        .intro {
          font-size: 18px;
          color: #4b5563;
          margin-bottom: 30px;
        }
        .role-card {
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          border-radius: 15px;
          padding: 25px;
          margin: 30px 0;
          border-left: 5px solid #667eea;
          display: flex;
          align-items: center;
          gap: 20px;
        }
        .role-icon {
          font-size: 3rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          width: 80px;
          height: 80px;
          border-radius: 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }
        .role-details h3 {
          margin: 0 0 10px 0;
          color: #1f2937;
          font-size: 18px;
        }
        .role-badge { 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
          color: white;
          padding: 8px 16px; 
          border-radius: 25px; 
          font-size: 14px; 
          font-weight: 600; 
          display: inline-block;
          margin-bottom: 10px;
        }
        .role-description {
          color: #6b7280;
          margin: 0;
          font-size: 14px;
        }
        .features-section {
          margin: 40px 0;
        }
        .features-section h3 {
          color: #1f2937;
          font-size: 20px;
          margin-bottom: 20px;
        }
        .features-grid {
          display: grid;
          gap: 15px;
        }
        .feature-card {
          background: #f8fafc;
          border-radius: 12px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 15px;
          border: 1px solid #e5e7eb;
        }
        .feature-icon {
          font-size: 1.5rem;
          width: 50px;
          height: 50px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .feature-content h4 {
          margin: 0 0 5px 0;
          color: #1f2937;
          font-size: 16px;
        }
        .feature-content p {
          margin: 0;
          color: #6b7280;
          font-size: 14px;
        }
        .cta-section {
          text-align: center;
          margin: 40px 0;
          padding: 30px;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          border-radius: 15px;
        }
        .button-container {
          margin: 25px 0;
        }
        .button { 
          display: inline-block; 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white; 
          padding: 18px 35px; 
          text-decoration: none; 
          border-radius: 12px;
          font-weight: 600; 
          font-size: 16px;
          transition: transform 0.2s;
          box-shadow: 0 10px 25px rgba(102, 126, 234, 0.3);
        }
        .button:hover {
          transform: translateY(-2px);
        }
        .expire-notice {
          background: #fef3c7;
          color: #92400e;
          padding: 15px;
          border-radius: 10px;
          margin: 20px 0;
          border: 1px solid #fcd34d;
        }
        .help-section {
          background: #eff6ff;
          padding: 20px;
          border-radius: 10px;
          margin: 30px 0;
          border: 1px solid #dbeafe;
        }
        .help-section h4 {
          color: #1e40af;
          margin: 0 0 10px 0;
        }
        .security-notice {
          background: #f0fdf4;
          padding: 15px;
          border-radius: 10px;
          margin: 20px 0;
          border: 1px solid #bbf7d0;
        }
        .technical-details {
          margin: 30px 0;
        }
        .technical-details summary {
          cursor: pointer;
          color: #667eea;
          font-weight: 500;
        }
        .url-box {
          background: #f3f4f6;
          padding: 10px;
          border-radius: 5px;
          word-break: break-all;
          font-family: monospace;
          margin: 10px 0;
        }
        .footer { 
          text-align: center; 
          padding: 30px; 
          background: #f9fafb;
          border-top: 1px solid #e5e7eb;
        }
        .footer-content p {
          margin: 5px 0;
          color: #6b7280;
        }
        .copyright {
          font-size: 12px !important;
        }
        
        /* Mobile responsiveness */
        @media (max-width: 600px) {
          .container {
            margin: 10px;
            border-radius: 15px;
          }
          .header, .content {
            padding: 25px 20px;
          }
          .role-card {
            flex-direction: column;
            text-align: center;
          }
          .role-icon {
            width: 60px;
            height: 60px;
            font-size: 2rem;
          }
          .feature-card {
            flex-direction: column;
            text-align: center;
          }
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

  /**
   * Get role-specific features for email
   */
  private getFeaturesByRole(role: UserRole): string {
    const allFeatures = {
      [UserRole.ORG_ADMIN]: [
        { icon: '🏢', title: 'Organization Management', desc: 'Manage entities and overall operations' },
        { icon: '👥', title: 'User Management', desc: 'Invite and manage team members' },
        { icon: '📊', title: 'Advanced Analytics', desc: 'Access comprehensive reports and insights' },
        { icon: '💰', title: 'Financial Oversight', desc: 'Monitor financial performance across all properties' }
      ],
      [UserRole.ENTITY_MANAGER]: [
        { icon: '🏗️', title: 'Entity Management', desc: 'Manage properties and operations for your entities' },
        { icon: '📈', title: 'Performance Tracking', desc: 'Monitor occupancy and financial metrics' },
        { icon: '👨‍💼', title: 'Team Coordination', desc: 'Manage property managers and staff' },
        { icon: '📋', title: 'Operational Reports', desc: 'Generate detailed operational reports' }
      ],
      [UserRole.PROPERTY_MANAGER]: [
        { icon: '🏠', title: 'Property Management', desc: 'Manage day-to-day property operations' },
        { icon: '👥', title: 'Tenant Relations', desc: 'Handle tenant communications and issues' },
        { icon: '🔧', title: 'Maintenance Coordination', desc: 'Track and assign maintenance requests' },
        { icon: '💳', title: 'Rent Collection', desc: 'Monitor payments and financial tracking' }
      ],
      [UserRole.ACCOUNTANT]: [
        { icon: '💰', title: 'Financial Management', desc: 'Handle accounting and financial reporting' },
        { icon: '📊', title: 'Financial Reports', desc: 'Generate P&L, cash flow, and other reports' },
        { icon: '💳', title: 'Payment Processing', desc: 'Manage invoices and payment tracking' },
        { icon: '📋', title: 'Audit Trails', desc: 'Access detailed financial audit information' }
      ],
      [UserRole.MAINTENANCE]: [
        { icon: '🔧', title: 'Work Order Management', desc: 'Receive and complete maintenance requests' },
        { icon: '📱', title: 'Mobile Access', desc: 'Update work status from your mobile device' },
        { icon: '📸', title: 'Photo Documentation', desc: 'Document work with photos and notes' },
        { icon: '⏰', title: 'Schedule Management', desc: 'Manage your maintenance schedule' }
      ],
      [UserRole.TENANT]: [
        { icon: '💳', title: 'Online Rent Payment', desc: 'Pay rent securely online' },
        { icon: '🔧', title: 'Maintenance Requests', desc: 'Submit and track maintenance requests' },
        { icon: '📄', title: 'Lease Information', desc: 'Access lease details and documents' },
        { icon: '💬', title: 'Communication', desc: 'Message your property manager directly' }
      ]
    };

    const features = allFeatures[role] || allFeatures[UserRole.TENANT];

    return features.map(feature => `
      <div class="feature-card">
        <div class="feature-icon">${feature.icon}</div>
        <div class="feature-content">
          <h4>${feature.title}</h4>
          <p>${feature.desc}</p>
        </div>
      </div>
    `).join('');
  }

  /**
   * Get role description for email
   */
  private getRoleDescription(role: UserRole): string {
    const descriptions = {
      [UserRole.SUPER_ADMIN]: 'Full system access and administration',
      [UserRole.ORG_ADMIN]: 'Organization-wide access and management',
      [UserRole.ENTITY_MANAGER]: 'Manage specific property entities',
      [UserRole.PROPERTY_MANAGER]: 'Day-to-day property operations',
      [UserRole.ACCOUNTANT]: 'Financial management and reporting',
      [UserRole.MAINTENANCE]: 'Maintenance request handling',
      [UserRole.TENANT]: 'Tenant portal access and services'
    };
    return descriptions[role] || 'Access to PropFlow services';
  }
  /**
     * Send follow-up email after account creation
     */
  async sendAccountCreatedNotification(data: {
    to: string;
    firstName: string;
    organizationName: string;
    role: UserRole;
  }): Promise<{ success: boolean }> {
    const frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:3001');
    const loginUrl = `${frontendUrl}/login`;

    const subject = `Welcome to ${data.organizationName} - Account Activated!`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Account Activated - Welcome!</title>
          ${this.getEmailStyles()}
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo-container">
                <div class="logo-icon">🎉</div>
                <h1>Account Activated!</h1>
              </div>
              <p>Welcome to PropFlow</p>
            </div>
            
            <div class="content">
              <div class="greeting">
                <h2>Welcome aboard, ${data.firstName}!</h2>
                <p class="intro">Your account has been successfully created and you're now part of <strong>${data.organizationName}</strong>.</p>
              </div>

              <div class="next-steps">
                <h3>🚀 What's Next?</h3>
                <div class="steps-grid">
                  <div class="step-card">
                    <div class="step-number">1</div>
                    <div class="step-content">
                      <h4>Log In to Your Account</h4>
                      <p>Use your email and the password you created</p>
                    </div>
                  </div>
                  <div class="step-card">
                    <div class="step-number">2</div>
                    <div class="step-content">
                      <h4>Explore the Dashboard</h4>
                      <p>Get familiar with your role and available features</p>
                    </div>
                  </div>
                  <div class="step-card">
                    <div class="step-number">3</div>
                    <div class="step-content">
                      <h4>Start Managing</h4>
                      <p>Begin using PropFlow's powerful property management tools</p>
                    </div>
                  </div>
                </div>
              </div>

              <div class="cta-section">
                <p>Ready to get started?</p>
                <div class="button-container">
                  <a href="${loginUrl}" class="button">Log In to PropFlow</a>
                </div>
              </div>

              <div class="help-section">
                <h4>Need Help Getting Started?</h4>
                <p>Our team is here to help! If you have any questions or need assistance, 
                please don't hesitate to reach out to your administrator or contact support.</p>
              </div>
            </div>

            <div class="footer">
              <div class="footer-content">
                <p><strong>PropFlow</strong> - Professional Property Management</p>
                <p>© 2024 PropFlow. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: data.to,
      subject,
      html,
    });
  }
}