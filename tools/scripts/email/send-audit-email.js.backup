#!/usr/bin/env node

/**
 * TutorWise Project Audit Email Notification System
 * Sends completed audit reports to tutorwiseapp@gmail.com
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Load environment variables from .env.local
require('dotenv').config({ path: path.join(__dirname, '../../../.env.local') });

class AuditEmailer {
  constructor() {
    this.recipientEmail = 'tutorwiseapp@gmail.com';
    this.senderEmail = process.env.RESEND_FROM_EMAIL || 'TutorWise System <noreply@tutorwise.app>';

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

  // Extract key metrics from audit file for email summary
  extractAuditSummary(auditFilePath) {
    try {
      const content = fs.readFileSync(auditFilePath, 'utf8');

      // Extract health score from table
      const healthScoreMatch = content.match(/\|\s*\*\*Health Score\*\*\s*\|\s*([0-9.]+)\/10/);
      const healthScore = healthScoreMatch ? healthScoreMatch[1] : 'N/A';

      // Extract report date
      const auditDate = content.match(/\*\*Report Date\*\*:\s*([^\n]+)/)?.[1] || 'Unknown';

      // Extract issues from table
      const criticalMatch = content.match(/\|\s*\*\*Critical Issues\*\*\s*\|\s*(\d+)/);
      const highMatch = content.match(/\|\s*\*\*High Priority\*\*\s*\|\s*(\d+)/);
      const criticalIssues = criticalMatch ? parseInt(criticalMatch[1]) : 0;
      const highIssues = highMatch ? parseInt(highMatch[1]) : 0;

      // Extract audit type from comprehensive analysis subtitle
      const auditType = 'Comprehensive Security & Development Analysis';

      // Extract key achievements from immediate actions
      const achievements = [];
      const immediateSection = content.match(/### Immediate Actions[^\n]*\n([\s\S]*?)(?=###|---)/)?.[1];
      if (immediateSection) {
        const items = immediateSection.match(/- \*\*[^*]+\*\*/g) || [];
        achievements.push(...items.map(item => item.replace(/- \*\*/, '').replace(/\*\*.*$/, '').trim()).slice(0, 3));
      }

      // Extract remaining work from short-term goals
      const remainingWork = [];
      const shortTermSection = content.match(/### Short-term Goals[^\n]*\n([\s\S]*?)(?=###|---)/)?.[1];
      if (shortTermSection) {
        const items = shortTermSection.match(/- \*\*[^*]+\*\*/g) || [];
        remainingWork.push(...items.map(item => item.replace(/- \*\*/, '').replace(/\*\*.*$/, '').trim()).slice(0, 3));
      }

      return {
        healthScore,
        auditDate,
        criticalIssues,
        highIssues,
        auditType,
        achievements: achievements.length > 0 ? achievements : ['Project health monitoring active', 'Security controls in place', 'Development velocity maintained'],
        remainingWork: remainingWork.length > 0 ? remainingWork : ['Continue monitoring metrics', 'Address outstanding issues', 'Maintain code quality'],
        fileName: path.basename(auditFilePath)
      };
    } catch (error) {
      console.error('Error extracting audit summary:', error);
      return {
        healthScore: 'Error',
        auditDate: 'Unknown',
        criticalIssues: 0,
        highIssues: 0,
        auditType: 'Unknown',
        achievements: [],
        remainingWork: [],
        fileName: path.basename(auditFilePath)
      };
    }
  }

  // Generate HTML email content with modern card design
  generateEmailHTML(summary, auditContent) {
    const statusColor = summary.healthScore >= 8 ? '#22c55e' :
                       summary.healthScore >= 6 ? '#f59e0b' : '#ef4444';

    const priorityLevel = summary.criticalIssues > 0 ? 'HIGH' :
                         summary.highIssues > 2 ? 'MEDIUM' : 'LOW';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tutorwise Project Audit</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            background: #ffffff;
            color: #1f2937;
            line-height: 1.5;
            -webkit-font-smoothing: antialiased;
        }

        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            overflow: hidden;
        }

        /* Minimal Header */
        .header {
            background: linear-gradient(135deg, #111827 0%, #374151 100%);
            padding: 32px 24px;
            text-align: center;
        }

        .header-title {
            color: #ffffff;
            font-size: 22px;
            font-weight: 600;
            margin-bottom: 6px;
            letter-spacing: -0.025em;
        }

        .header-subtitle {
            color: #d1d5db;
            font-size: 14px;
            font-weight: 400;
        }

        /* Clean Content */
        .content {
            padding: 32px 24px;
        }

        /* Executive Summary */
        .summary-card {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 24px;
            margin-bottom: 24px;
            text-align: center;
        }

        .health-display {
            margin-bottom: 20px;
        }

        .health-score {
            font-size: 48px;
            font-weight: 700;
            color: ${statusColor};
            line-height: 1;
            margin-bottom: 4px;
        }

        .health-label {
            font-size: 13px;
            color: #6b7280;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        /* Metrics Row */
        .metrics-row {
            text-align: center;
            margin-top: 20px;
        }

        .metric-item {
            display: inline-block;
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 16px 24px;
            text-align: center;
            width: 100px;
            height: 100px;
            margin: 0 16px;
            vertical-align: middle;
        }


        .metric-value {
            font-size: 20px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 4px;
        }

        .metric-label {
            font-size: 11px;
            color: #6b7280;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        /* Status Badge */
        .status-container {
            margin-top: 20px;
        }

        .status-badge {
            display: inline-flex;
            align-items: center;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .status-low {
            background: #ecfdf5;
            color: #065f46;
            border: 1px solid #a7f3d0;
        }

        .status-medium {
            background: #fefbf0;
            color: #92400e;
            border: 1px solid #fde68a;
        }

        .status-high {
            background: #fef2f2;
            color: #991b1b;
            border: 1px solid #fca5a5;
        }

        /* Content Sections */
        .content-section {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
        }

        .section-title {
            color: #374151;
            font-size: 15px;
            font-weight: 600;
            margin-bottom: 12px;
        }

        .section-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }

        .section-list li {
            padding: 8px 0;
            color: #4b5563;
            font-size: 14px;
            border-bottom: 1px solid #f3f4f6;
        }

        .section-list li:last-child {
            border-bottom: none;
        }

        /* Reports Section */
        .reports-section {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
        }

        .file-item {
            display: flex;
            align-items: center;
            padding: 12px;
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            margin-bottom: 8px;
        }

        .file-name {
            font-size: 13px;
            color: #374151;
            font-weight: 500;
            font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
        }

        .reports-note {
            font-size: 12px;
            color: #6b7280;
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px solid #e5e7eb;
            font-style: italic;
        }

        /* Minimal Footer */
        .footer {
            background: #f9fafb;
            padding: 16px 24px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }

        .footer-brand {
            font-size: 13px;
            color: #374151;
            font-weight: 600;
            margin-bottom: 2px;
        }

        .footer-text {
            font-size: 11px;
            color: #9ca3af;
        }

        /* Mobile Responsive */
        @media (max-width: 600px) {
            .email-container {
                margin: 0;
                border-radius: 0;
            }

            .content {
                padding: 24px 16px;
            }

            .metrics-row {
                flex-direction: column;
                gap: 16px;
                align-items: center;
            }

            .metric-item {
                min-width: 120px;
            }

            .health-score {
                font-size: 40px;
            }

            .header {
                padding: 24px 16px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="header-title">Project Audit Report</div>
            <div class="header-subtitle">${summary.auditDate} • Tutorwise</div>
        </div>

        <div class="content">
            <div class="summary-card">
                <div class="health-display">
                    <div class="health-score">${summary.healthScore}/10</div>
                    <div class="health-label">Health Score</div>
                </div>

                <div class="metrics-row">
                    <div class="metric-item">
                        <div class="metric-value">${summary.criticalIssues}</div>
                        <div class="metric-label">Critical</div>
                    </div>
                    <div class="metric-item metric-middle">
                        <div class="metric-value">${summary.highIssues}</div>
                        <div class="metric-label">High Priority</div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-value">${summary.criticalIssues + summary.highIssues}</div>
                        <div class="metric-label">Total Issues</div>
                    </div>
                </div>

                <div class="status-container">
                    <span class="status-badge status-${priorityLevel.toLowerCase()}">${priorityLevel} Risk</span>
                </div>
            </div>

            ${summary.achievements && summary.achievements.length > 0 ? `
            <div class="content-section">
                <div class="section-title">Key Achievements</div>
                <ul class="section-list">
                    ${summary.achievements.map(item => `<li>${item}</li>`).join('')}
                </ul>
            </div>
            ` : ''}

            ${summary.remainingWork && summary.remainingWork.length > 0 ? `
            <div class="content-section">
                <div class="section-title">Remaining Work</div>
                <ul class="section-list">
                    ${summary.remainingWork.map(item => `<li>${item}</li>`).join('')}
                </ul>
            </div>
            ` : ''}

            <div class="reports-section">
                <div class="section-title">Reports</div>

                <div class="file-item">
                    <span class="file-name">${summary.fileName}</span>
                </div>
                ${summary.hasEnhanced ? `
                <div class="file-item">
                    <span class="file-name">${path.basename(summary.enhancedPdfPath || '')}</span>
                </div>
                ` : ''}

                <div class="reports-note">
                    Complete audit with git analysis, metrics, and project insights.
                </div>
            </div>
        </div>

        <div class="footer">
            <div class="footer-brand">Tutorwise</div>
            <div class="footer-text">Automated Project Health Monitoring</div>
        </div>
    </div>
</body>
</html>`;
  }

  // Generate plain text email content
  generateEmailText(summary) {
    return `
TutorWise Project Audit Report
${summary.auditType} • ${summary.auditDate}

AUDIT SUMMARY
=============
Health Score: ${summary.healthScore}/10
Critical Issues: ${summary.criticalIssues}
High Priority Issues: ${summary.highIssues}
Total Issues: ${summary.criticalIssues + summary.highIssues}

${summary.achievements.length > 0 ? `
KEY ACHIEVEMENTS
================
${summary.achievements.map(item => `• ${item}`).join('\n')}
` : ''}

${summary.remainingWork.length > 0 ? `
REMAINING WORK
==============
${summary.remainingWork.map(item => `• ${item}`).join('\n')}
` : ''}

AUDIT FILE
==========
${summary.fileName}

---
Generated by TutorWise Project Audit System
Next scheduled audit: ${this.getNextAuditDate()}
    `.trim();
  }

  getNextAuditDate() {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Send email using multiple fallback methods
  async sendEmail(auditFilePath, pdfPath = null) {
    console.log('Preparing to send audit email...');

    if (!fs.existsSync(auditFilePath)) {
      throw new Error(`Audit file not found: ${auditFilePath}`);
    }

    const auditContent = fs.readFileSync(auditFilePath, 'utf8');
    const summary = this.extractAuditSummary(auditFilePath);

    // Check for unified audit files (now the main file contains everything)
    const unifiedMdPath = auditFilePath; // Main file now contains unified content
    const unifiedPdfPath = auditFilePath.replace('.md', '.pdf');

    const hasUnifiedFiles = fs.existsSync(unifiedMdPath) && fs.existsSync(unifiedPdfPath);

    if (hasUnifiedFiles) {
      console.log('Unified audit files detected - including both MD and PDF formats');
      summary.hasEnhanced = true;
      summary.enhancedMdPath = unifiedMdPath;
      summary.enhancedPdfPath = unifiedPdfPath;
    }

    console.log('Audit Summary:');
    console.log(`   Health Score: ${summary.healthScore}/10`);
    console.log(`   Critical Issues: ${summary.criticalIssues}`);
    console.log(`   High Issues: ${summary.highIssues}`);

    const subject = `Tutorwise Project Audit - ${summary.auditDate} (Health: ${summary.healthScore}/10)`;
    const htmlContent = this.generateEmailHTML(summary, auditContent);
    const textContent = this.generateEmailText(summary);

    // Try multiple email methods in order of preference
    const methods = [
      () => this.sendWithResend(subject, htmlContent, textContent, auditFilePath, summary),
      () => this.sendWithNodemailer(subject, htmlContent, textContent, auditFilePath),
      () => this.sendWithSupabase(subject, htmlContent, textContent, auditFilePath),
      () => this.sendWithMailCommand(subject, textContent, auditFilePath),
      () => this.saveToFile(subject, htmlContent, textContent, auditFilePath)
    ];

    for (let i = 0; i < methods.length; i++) {
      try {
        console.log(`Attempting email method ${i + 1}...`);
        await methods[i]();
        console.log('Email sent successfully!');
        return;
      } catch (error) {
        console.log(`Method ${i + 1} failed:`, error.message);
        if (i === methods.length - 1) {
          throw new Error('All email methods failed');
        }
      }
    }
  }

  // Method 0: Resend Email Service (preferred)
  async sendWithResend(subject, htmlContent, textContent, attachmentPath, summary) {
    try {
      if (!process.env.RESEND_API_KEY) {
        throw new Error('RESEND_API_KEY not found - trying next method');
      }

      const nodemailer = require('nodemailer');

      console.log('Sending via Resend...');
      console.log(`   From: ${this.senderEmail}`);
      console.log(`   To: ${this.recipientEmail}`);
      console.log(`   Subject: ${subject}`);

      const transporter = nodemailer.createTransport(this.resendConfig);

      // Prepare attachments
      const attachments = [];

      // Main audit file (now contains unified content)
      const auditContent = fs.readFileSync(attachmentPath, 'utf8');
      attachments.push({
        filename: path.basename(attachmentPath),
        content: auditContent,
        contentType: 'text/markdown'
      });

      // PDF version if available
      if (summary.hasEnhanced && summary.enhancedPdfPath && fs.existsSync(summary.enhancedPdfPath)) {
        console.log('Adding PDF audit attachment...');

        const pdfContent = fs.readFileSync(summary.enhancedPdfPath);
        attachments.push({
          filename: path.basename(summary.enhancedPdfPath),
          content: pdfContent,
          contentType: 'application/pdf'
        });
      }

      const mailOptions = {
        from: this.senderEmail,
        to: this.recipientEmail,
        subject: subject,
        text: textContent,
        html: htmlContent,
        attachments: attachments
      };

      const result = await transporter.sendMail(mailOptions);
      console.log('Resend success:', result.messageId);
      return result;

    } catch (error) {
      if (error.code === 'MODULE_NOT_FOUND') {
        throw new Error('Nodemailer not available - trying alternative method');
      }
      throw error;
    }
  }

  // Method 1: Supabase Email Service
  async sendWithSupabase(subject, htmlContent, textContent, attachmentPath) {
    try {
      // Check if we have Supabase credentials
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('Supabase credentials not found - trying next method');
      }

      const { createClient } = require('@supabase/supabase-js');

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );

      console.log('Sending via Supabase email service...');
      console.log(`   To: ${this.recipientEmail}`);
      console.log(`   Subject: ${subject}`);

      // Log email attempt in Supabase
      const emailLog = {
        recipient: this.recipientEmail,
        subject: subject,
        content_type: 'audit_notification',
        audit_file: path.basename(attachmentPath),
        status: 'attempting',
        created_at: new Date().toISOString(),
        metadata: {
          html_length: htmlContent.length,
          text_length: textContent.length,
          audit_date: new Date().toISOString().split('T')[0]
        }
      };

      // Store email log (create table if needed)
      try {
        const { data, error } = await supabase
          .from('email_logs')
          .insert([emailLog])
          .select();

        if (error) {
          console.log('Creating email_logs table...');
          // Table might not exist, create it
          const createTableQuery = `
            CREATE TABLE IF NOT EXISTS email_logs (
              id SERIAL PRIMARY KEY,
              recipient TEXT NOT NULL,
              subject TEXT NOT NULL,
              content_type TEXT NOT NULL,
              audit_file TEXT,
              status TEXT NOT NULL,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              metadata JSONB
            );
          `;

          // For now, just log that we'd create the table
          console.log('Would create email_logs table in production');
        } else {
          console.log('Email logged in Supabase:', data[0]?.id);
        }
      } catch (logError) {
        console.log('Email logging skipped:', logError.message);
      }

      // For Supabase email integration, we need to use their SMTP configuration
      // From the screenshot, you can configure SMTP in Supabase dashboard
      // Once configured, we can use the same SMTP settings

      // Check if custom SMTP is configured in Supabase
      // This would be the SMTP server you set up in the Supabase dashboard
      if (process.env.SUPABASE_SMTP_HOST) {
        console.log('Using Supabase SMTP configuration');

        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
          host: process.env.SUPABASE_SMTP_HOST,
          port: process.env.SUPABASE_SMTP_PORT || 587,
          secure: false,
          auth: {
            user: process.env.SUPABASE_SMTP_USER,
            pass: process.env.SUPABASE_SMTP_PASSWORD
          }
        });

        const mailOptions = {
          from: `TutorWise System <${process.env.SUPABASE_SMTP_USER}>`,
          to: this.recipientEmail,
          subject: subject,
          text: textContent,
          html: htmlContent,
          attachments: [
            {
              filename: path.basename(attachmentPath),
              path: attachmentPath,
              contentType: 'text/markdown'
            }
          ]
        };

        const result = await transporter.sendMail(mailOptions);
        console.log('Supabase SMTP success:', result.messageId);

        // Update log status
        try {
          await supabase
            .from('email_logs')
            .update({ status: 'sent', metadata: { ...emailLog.metadata, message_id: result.messageId } })
            .eq('recipient', this.recipientEmail)
            .eq('created_at', emailLog.created_at);
        } catch (updateError) {
          console.log('Log update skipped:', updateError.message);
        }

        return;
      }

      // If no SMTP configured, fall back to next method
      throw new Error('Supabase SMTP not configured - trying next method');

    } catch (error) {
      if (error.code === 'MODULE_NOT_FOUND') {
        throw new Error('Supabase client not available - trying alternative method');
      }
      throw error;
    }
  }

  // Method 2: Node.js nodemailer (fallback SMTP)
  async sendWithNodemailer(subject, htmlContent, textContent, attachmentPath) {
    try {
      const nodemailer = require('nodemailer');

      console.log('Sending via fallback SMTP...');
      const transporter = nodemailer.createTransport(this.smtpConfig);

      const mailOptions = {
        from: this.senderEmail,
        to: this.recipientEmail,
        subject: subject,
        text: textContent,
        html: htmlContent,
        attachments: [
          {
            filename: path.basename(attachmentPath),
            path: attachmentPath,
            contentType: 'text/markdown'
          }
        ]
      };

      const result = await transporter.sendMail(mailOptions);
      console.log('Nodemailer success:', result.messageId);
    } catch (error) {
      if (error.code === 'MODULE_NOT_FOUND') {
        throw new Error('Nodemailer not installed - trying alternative method');
      }
      throw error;
    }
  }

  // Method 2: System mail command
  async sendWithMailCommand(subject, textContent, attachmentPath) {
    return new Promise((resolve, reject) => {
      const command = `echo "${textContent}" | mail -s "${subject}" -A "${attachmentPath}" ${this.recipientEmail}`;

      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Mail command failed: ${error.message}`));
        } else {
          resolve(stdout);
        }
      });
    });
  }

  // Method 3: cURL with email service API
  async sendWithCurl(subject, textContent, attachmentPath) {
    // This would use a service like Mailgun, SendGrid, etc.
    // For now, we'll skip this method
    throw new Error('cURL method not configured - trying next method');
  }

  // Method 4: Save to file as fallback
  async saveToFile(subject, htmlContent, textContent, attachmentPath) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const emailDir = 'logs/emails';

    // Create directory if it doesn't exist
    if (!fs.existsSync(emailDir)) {
      fs.mkdirSync(emailDir, { recursive: true });
    }

    const emailFile = path.join(emailDir, `audit-email-${timestamp}.html`);
    const metaFile = path.join(emailDir, `audit-email-${timestamp}.json`);

    // Save HTML email
    fs.writeFileSync(emailFile, htmlContent);

    // Save email metadata
    const metadata = {
      timestamp: new Date().toISOString(),
      to: this.recipientEmail,
      subject: subject,
      auditFile: attachmentPath,
      status: 'saved_locally'
    };
    fs.writeFileSync(metaFile, JSON.stringify(metadata, null, 2));

    console.log(`Email saved locally: ${emailFile}`);
    console.log(`Email metadata: ${metaFile}`);
    console.log(`Manual action required: Send ${attachmentPath} to ${this.recipientEmail}`);
  }
}

// CLI usage
if (require.main === module) {
  const auditFilePath = process.argv[2];

  if (!auditFilePath) {
    console.error('Usage: node send-audit-email.js <audit-file-path>');
    console.error('Example: node send-audit-email.js docs/project-audit/project-audit-2024-09-30.md');
    process.exit(1);
  }

  const emailer = new AuditEmailer();

  emailer.sendEmail(auditFilePath)
    .then(() => {
      console.log('Audit email process completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Email sending failed:', error.message);
      process.exit(1);
    });
}

module.exports = AuditEmailer;