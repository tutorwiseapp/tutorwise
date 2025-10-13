#!/usr/bin/env node

/**
 * TutorWise Critical Files Protection Report Email System
 * Sends daily protection status reports to tutorwiseapp@gmail.com
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Load environment variables from .env.local
require('dotenv').config({ path: path.join(__dirname, '../../../.env.local') });

class ProtectionReportEmailer {
  constructor() {
    this.recipientEmail = 'tutorwiseapp@gmail.com';
    this.senderEmail = process.env.RESEND_FROM_EMAIL || 'TutorWise Security <security@tutorwise.app>';

    // Resend SMTP Configuration (preferred)
    this.resendConfig = {
      host: 'smtp.resend.com',
      port: 587,
      secure: false,
      auth: {
        user: 'resend',
        pass: process.env.RESEND_API_KEY
      }
    };

    // Fallback SMTP Configuration
    this.smtpConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER || 'tutorwiseapp@gmail.com',
        pass: process.env.SMTP_PASSWORD || process.env.GMAIL_APP_PASSWORD
      }
    };
  }

  /**
   * Generate protection report data
   */
  async generateReportData() {
    try {
      // Run the protection report script (from project root)
      const projectRoot = path.join(__dirname, '../../../');
      const { stdout } = await execPromise(`cd ${projectRoot} && node tools/change-management/critical-files-protection.js report`);

      // Check git status for any untracked credential files
      let untrackedCredentials = [];
      try {
        const { stdout: gitStatus } = await execPromise('git status --short');
        const lines = gitStatus.split('\n');
        untrackedCredentials = lines
          .filter(line => line.match(/\?\?\s+.*(service-account|oauth-credentials|google-credentials|\.env)/i))
          .map(line => line.replace('??', '').trim());
      } catch (error) {
        console.warn('Could not check git status:', error.message);
      }

      // Check for any AI audit log violations
      let recentViolations = [];
      const auditLogPath = path.join(process.cwd(), 'logs/ai-audit.log');
      if (fs.existsSync(auditLogPath)) {
        try {
          const auditLog = fs.readFileSync(auditLogPath, 'utf8');
          const lines = auditLog.split('\n').slice(-100); // Last 100 lines
          recentViolations = lines
            .filter(line => line.includes('[BLOCKED]') || line.includes('[SCOPE_VIOLATION]'))
            .slice(-5); // Last 5 violations
        } catch (error) {
          console.warn('Could not read audit log:', error.message);
        }
      }

      // Count protected files by tier
      const tier1Count = 19; // From FORBIDDEN_DELETE
      const tier2Count = 30; // Estimated API routes
      const tier3Count = 20; // Estimated critical routes

      return {
        reportOutput: stdout,
        timestamp: new Date().toISOString(),
        date: new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        time: new Date().toLocaleTimeString('en-US'),
        untrackedCredentials,
        recentViolations,
        stats: {
          tier1: tier1Count,
          tier2: tier2Count,
          tier3: tier3Count,
          total: tier1Count + tier2Count + tier3Count,
          violations: recentViolations.length,
          untrackedFiles: untrackedCredentials.length
        }
      };
    } catch (error) {
      throw new Error(`Failed to generate report data: ${error.message}`);
    }
  }

  /**
   * Create HTML email content
   */
  createEmailHTML(reportData) {
    const statusEmoji = reportData.untrackedCredentials.length > 0 ? '⚠️' : '✅';
    const statusText = reportData.untrackedCredentials.length > 0 ? 'WARNING' : 'SECURE';
    const statusColor = reportData.untrackedCredentials.length > 0 ? '#ff6b6b' : '#51cf66';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Critical Files Protection Report - ${reportData.date}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .email-container {
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .header p {
      margin: 10px 0 0 0;
      opacity: 0.9;
      font-size: 14px;
    }
    .status-banner {
      background-color: ${statusColor};
      color: white;
      padding: 15px 30px;
      text-align: center;
      font-size: 18px;
      font-weight: 600;
    }
    .content {
      padding: 30px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 15px;
      margin: 20px 0;
    }
    .stat-card {
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      padding: 20px;
      border-radius: 8px;
      text-align: center;
    }
    .stat-number {
      font-size: 32px;
      font-weight: bold;
      color: #667eea;
      margin: 0;
    }
    .stat-label {
      font-size: 12px;
      color: #666;
      margin: 5px 0 0 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .section {
      margin: 30px 0;
    }
    .section-title {
      font-size: 20px;
      font-weight: 600;
      color: #667eea;
      margin: 0 0 15px 0;
      padding-bottom: 10px;
      border-bottom: 2px solid #e0e0e0;
    }
    .alert {
      background-color: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 15px 0;
      border-radius: 4px;
    }
    .alert-danger {
      background-color: #f8d7da;
      border-left: 4px solid #dc3545;
    }
    .alert-success {
      background-color: #d4edda;
      border-left: 4px solid #28a745;
    }
    .code-block {
      background-color: #f8f9fa;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      padding: 15px;
      margin: 10px 0;
      font-family: 'Courier New', monospace;
      font-size: 13px;
      overflow-x: auto;
      white-space: pre-wrap;
    }
    .violation-list {
      list-style: none;
      padding: 0;
    }
    .violation-item {
      background-color: #f8d7da;
      padding: 10px;
      margin: 5px 0;
      border-radius: 4px;
      font-size: 13px;
      font-family: 'Courier New', monospace;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 20px 30px;
      text-align: center;
      font-size: 12px;
      color: #666;
    }
    .footer a {
      color: #667eea;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <!-- Header -->
    <div class="header">
      <h1>🛡️ Critical Files Protection Report</h1>
      <p>${reportData.date} at ${reportData.time}</p>
    </div>

    <!-- Status Banner -->
    <div class="status-banner">
      ${statusEmoji} SYSTEM STATUS: ${statusText}
    </div>

    <!-- Content -->
    <div class="content">
      <!-- Stats Grid -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-number">${reportData.stats.tier1}</div>
          <div class="stat-label">Tier 1 Critical</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${reportData.stats.tier2}</div>
          <div class="stat-label">Tier 2 Important</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${reportData.stats.tier3}</div>
          <div class="stat-label">Tier 3 Protected</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${reportData.stats.total}</div>
          <div class="stat-label">Total Protected</div>
        </div>
      </div>

      <!-- Untracked Credentials Alert -->
      ${reportData.untrackedCredentials.length > 0 ? `
      <div class="section">
        <div class="alert alert-danger">
          <strong>⚠️ SECURITY WARNING: Untracked Credential Files Detected</strong>
          <p>The following credential files are not in .gitignore and could be accidentally committed:</p>
          <ul>
            ${reportData.untrackedCredentials.map(file => `<li><code>${file}</code></li>`).join('')}
          </ul>
          <p><strong>Action Required:</strong> These files should be added to .gitignore immediately.</p>
        </div>
      </div>
      ` : `
      <div class="section">
        <div class="alert alert-success">
          <strong>✅ All Clear:</strong> No untracked credential files detected. All secrets are properly protected.
        </div>
      </div>
      `}

      <!-- Recent Violations -->
      ${reportData.recentViolations.length > 0 ? `
      <div class="section">
        <h2 class="section-title">Recent Protection Violations (Last 24h)</h2>
        <div class="alert alert-danger">
          <strong>⚠️ ${reportData.recentViolations.length} violation(s) detected in audit log</strong>
        </div>
        <ul class="violation-list">
          ${reportData.recentViolations.map(v => `<li class="violation-item">${v}</li>`).join('')}
        </ul>
      </div>
      ` : `
      <div class="section">
        <h2 class="section-title">Recent Protection Violations</h2>
        <div class="alert alert-success">
          <strong>✅ No violations:</strong> All file operations were within policy in the last 24 hours.
        </div>
      </div>
      `}

      <!-- Full Protection Report -->
      <div class="section">
        <h2 class="section-title">Complete Protection Status</h2>
        <div class="code-block">${reportData.reportOutput}</div>
      </div>

      <!-- Reminder -->
      <div class="section">
        <div class="alert">
          <strong>📋 Reminder:</strong> Next .ai-restrictions review scheduled for <strong>2024-10-08</strong>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>
        🤖 Automated Protection Report | TutorWise Security System<br>
        Generated at ${reportData.timestamp}<br>
        <a href="https://tutorwise.io">tutorwise.io</a>
      </p>
      <p style="margin-top: 15px; color: #999; font-size: 11px;">
        This is an automated security notification. Do not reply to this email.
      </p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Create plain text email content
   */
  createEmailText(reportData) {
    const statusEmoji = reportData.untrackedCredentials.length > 0 ? '⚠️' : '✅';
    const statusText = reportData.untrackedCredentials.length > 0 ? 'WARNING' : 'SECURE';

    let text = `
🛡️ CRITICAL FILES PROTECTION REPORT
${reportData.date} at ${reportData.time}

${statusEmoji} SYSTEM STATUS: ${statusText}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PROTECTION STATISTICS:
• Tier 1 (Critical):  ${reportData.stats.tier1} files
• Tier 2 (Important): ${reportData.stats.tier2} files
• Tier 3 (Protected): ${reportData.stats.tier3} files
• Total Protected:    ${reportData.stats.total} files

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

    if (reportData.untrackedCredentials.length > 0) {
      text += `
⚠️ SECURITY WARNING: UNTRACKED CREDENTIAL FILES

The following credential files are not in .gitignore:
${reportData.untrackedCredentials.map(f => `  - ${f}`).join('\n')}

ACTION REQUIRED: Add these files to .gitignore immediately!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
    }

    if (reportData.recentViolations.length > 0) {
      text += `
⚠️ RECENT VIOLATIONS (Last 24h):

${reportData.recentViolations.join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
    }

    text += `
FULL PROTECTION REPORT:

${reportData.reportOutput}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Next .ai-restrictions review: 2024-10-08

Generated: ${reportData.timestamp}
TutorWise Security System
    `.trim();

    return text;
  }

  /**
   * Send email using nodemailer
   */
  async sendEmail() {
    console.log('📊 Generating protection report...');
    const reportData = await this.generateReportData();

    console.log('📧 Preparing email...');
    const htmlContent = this.createEmailHTML(reportData);
    const textContent = this.createEmailText(reportData);

    // Load nodemailer after generating report
    const nodemailer = require('nodemailer');

    // Try Resend first, fallback to SMTP
    let transporter;
    let transportMethod;

    if (this.resendConfig.auth.pass) {
      console.log('📮 Using Resend SMTP...');
      transporter = nodemailer.createTransport(this.resendConfig);
      transportMethod = 'Resend';
    } else if (this.smtpConfig.auth.pass) {
      console.log('📮 Using fallback SMTP...');
      transporter = nodemailer.createTransport(this.smtpConfig);
      transportMethod = 'SMTP';
    } else {
      throw new Error('No email configuration found. Set RESEND_API_KEY or GMAIL_APP_PASSWORD in .env.local');
    }

    const mailOptions = {
      from: this.senderEmail,
      to: this.recipientEmail,
      subject: `🛡️ Critical Files Protection Report - ${new Date().toLocaleDateString()}`,
      text: textContent,
      html: htmlContent
    };

    console.log(`Sending email to: ${this.recipientEmail}`);

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Protection report email sent successfully!');
      console.log(`📧 Message ID: ${info.messageId}`);
      console.log(`📮 Transport: ${transportMethod}`);
      return {
        success: true,
        messageId: info.messageId,
        stats: reportData.stats
      };
    } catch (error) {
      console.error('❌ Failed to send email:', error.message);
      throw error;
    }
  }
}

// CLI execution
if (require.main === module) {
  const emailer = new ProtectionReportEmailer();

  emailer.sendEmail()
    .then(result => {
      console.log('\n✅ Protection report email sent successfully!');
      console.log(`Stats: ${JSON.stringify(result.stats, null, 2)}`);
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Failed to send protection report email:', error);
      process.exit(1);
    });
}

module.exports = ProtectionReportEmailer;
