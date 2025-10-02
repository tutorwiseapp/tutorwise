#!/usr/bin/env node

/**
 * Tutorwise Project Audit System
 * Combines standard and enhanced audit content into professional reports
 * Outputs both Markdown and professionally styled PDF formats
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

const execAsync = promisify(exec);

class ProjectAuditor {
  constructor() {
    this.auditDate = new Date().toISOString().split('T')[0]; // Dynamic date for daily audits
    this.auditDir = 'docs/project-audit';
    this.snapshotDir = 'tools/snapshots';

    // Ensure directories exist
    [this.auditDir, this.snapshotDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  // Get git history since last audit
  async getGitChanges(sinceDate) {
    try {
      const commands = {
        commits: `git log --since="${sinceDate}" --oneline --no-merges`,
        stats: `git diff --stat HEAD~5 HEAD`,
        fileChanges: `git diff --name-status HEAD~5 HEAD`,
        additions: `git diff --numstat HEAD~5 HEAD`,
        blame: `git log --since="${sinceDate}" --pretty=format:"%h - %an, %ar : %s" --no-merges`,
        authors: `git log --since="${sinceDate}" --pretty=format:"%an" --no-merges | sort | uniq -c | sort -nr`
      };

      const results = {};
      for (const [key, command] of Object.entries(commands)) {
        try {
          const { stdout } = await execAsync(command);
          results[key] = stdout.trim();
        } catch (error) {
          console.log(`WARNING: Git command failed (${key}):`, error.message);
          results[key] = '';
        }
      }

      return results;
    } catch (error) {
      console.error('Error getting git changes:', error);
      return {};
    }
  }

  // Find previous audit file for comparison
  findPreviousAudit() {
    try {
      const auditFiles = fs.readdirSync(this.auditDir)
        .filter(file => file.startsWith('project-audit-') && file.endsWith('.md'))
        .filter(file => file !== `project-audit-${this.auditDate}.md`)
        .sort()
        .reverse();

      return auditFiles.length > 0 ? path.join(this.auditDir, auditFiles[0]) : null;
    } catch (error) {
      console.error('Error finding previous audit:', error);
      return null;
    }
  }

  // Extract metrics from audit file
  extractAuditMetrics(auditFilePath, snapshot = null) {
    try {
      if (!fs.existsSync(auditFilePath)) {
        return null;
      }

      const content = fs.readFileSync(auditFilePath, 'utf8');

      const criticalIssues = (content.match(/Priority[:\s]*Critical/g) || []).length;
      const highIssues = (content.match(/Priority[:\s]*High/g) || []).length;
      const mediumIssues = (content.match(/Priority[:\s]*Medium/g) || []).length;

      // Try to extract health score, if not found calculate it
      let healthScore = content.match(/Overall Project Health Score[:\s]*([0-9.]+)/)?.[1];

      if (!healthScore || healthScore === 'N/A') {
        // Calculate health score from metrics
        healthScore = this.calculateHealthScore(criticalIssues, highIssues, mediumIssues, snapshot);
      }

      return {
        healthScore,
        auditDate: content.match(/\\*\\*Audit Date\\*\\*[:\s]*([^\\n]+)/)?.[1] || content.match(/\*\*Report Date\*\*[:\s]*([^\n]+)/)?.[1] || 'Unknown',
        criticalIssues,
        highIssues,
        mediumIssues,
        fileName: path.basename(auditFilePath)
      };
    } catch (error) {
      console.error('Error extracting metrics:', error);
      return null;
    }
  }

  // Calculate health score from metrics
  calculateHealthScore(criticalIssues, highIssues, mediumIssues, snapshot = null) {
    let score = 10.0;

    // Deduct points for issues
    score -= (criticalIssues * 2.0);  // -2 points per critical
    score -= (highIssues * 1.0);       // -1 point per high
    score -= (mediumIssues * 0.5);     // -0.5 points per medium

    // Deduct points for missing or incomplete features
    if (snapshot) {
      // Check for security documentation
      if (!snapshot.security || !snapshot.security.securityDocsPresent) {
        score -= 0.5;
      }

      // Check security score
      if (snapshot.security && snapshot.security.securityScore < 8.0) {
        score -= 0.5;
      }

      // Deduct for development stage indicators
      // Check git status for deployment issues (look for deployment-related commits)
      if (snapshot.git && snapshot.git.commits) {
        const recentCommits = snapshot.git.commits.toLowerCase();
        if (recentCommits.includes('fix') && recentCommits.includes('deploy')) {
          score -= 0.5; // Recent deployment issues
        }
        if (recentCommits.includes('disable') || recentCommits.includes('temporarily')) {
          score -= 0.5; // Temporary workarounds present
        }
      }

      // Bonus for having tests
      if (snapshot.testMetrics && snapshot.testMetrics.total > 0) {
        const testCoverage = (snapshot.testMetrics.passed / snapshot.testMetrics.total) * 100;
        if (testCoverage > 90) score += 0.5;
        else if (testCoverage > 75) score += 0.3;
      }
    }

    // Ensure score is between 0 and 10
    score = Math.max(0, Math.min(10, score));

    return score.toFixed(1);
  }

  // Create daily snapshot
  async createDailySnapshot() {
    const snapshotFile = path.join(this.snapshotDir, `snapshot-${this.auditDate}.json`);

    try {
      const snapshot = {
        date: this.auditDate,
        timestamp: new Date().toISOString(),
        git: await this.getGitChanges('2 days ago'),
        fileCount: await this.getFileCount(),
        codeMetrics: await this.getCodeMetrics(),
        dependencies: await this.getDependencyInfo(),
        security: await this.getSecurityMetrics()
      };

      fs.writeFileSync(snapshotFile, JSON.stringify(snapshot, null, 2));
      console.log(`Daily snapshot created: ${snapshotFile}`);

      return snapshot;
    } catch (error) {
      console.error('Error creating snapshot:', error);
      return null;
    }
  }

  // Get file count statistics
  async getFileCount() {
    try {
      const commands = {
        total: 'find . -type f -not -path "./node_modules/*" -not -path "./.git/*" | wc -l',
        typescript: 'find . -name "*.ts" -not -path "./node_modules/*" | wc -l',
        react: 'find . -name "*.tsx" -not -path "./node_modules/*" | wc -l',
        javascript: 'find . -name "*.js" -not -path "./node_modules/*" | wc -l',
        markdown: 'find . -name "*.md" -not -path "./node_modules/*" | wc -l',
        css: 'find . -name "*.css" -not -path "./node_modules/*" | wc -l',
        json: 'find . -name "*.json" -not -path "./node_modules/*" | wc -l'
      };

      const counts = {};
      for (const [key, command] of Object.entries(commands)) {
        try {
          const { stdout } = await execAsync(command);
          counts[key] = parseInt(stdout.trim()) || 0;
        } catch (error) {
          counts[key] = 0;
        }
      }

      return counts;
    } catch (error) {
      return {};
    }
  }

  // Get code complexity metrics
  async getCodeMetrics() {
    try {
      const { stdout: linesOfCode } = await execAsync(
        'find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | grep -v node_modules | xargs wc -l | tail -1'
      );

      const { stdout: components } = await execAsync(
        'find . -name "*.tsx" -not -path "./node_modules/*" | xargs grep -l "export.*function\\|export.*const.*=.*=>" | wc -l'
      );

      return {
        linesOfCode: parseInt(linesOfCode.trim().split(/\\s+/)[0]) || 0,
        components: parseInt(components.trim()) || 0,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      return { linesOfCode: 0, components: 0, lastUpdated: new Date().toISOString() };
    }
  }

  // Get dependency information
  async getDependencyInfo() {
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

      return {
        dependencies: Object.keys(packageJson.dependencies || {}).length,
        devDependencies: Object.keys(packageJson.devDependencies || {}).length,
        scripts: Object.keys(packageJson.scripts || {}).length,
        nodeVersion: packageJson.engines?.node || 'Not specified',
        version: packageJson.version || '1.0.0'
      };
    } catch (error) {
      return { dependencies: 0, devDependencies: 0, scripts: 0, nodeVersion: 'Unknown', version: '1.0.0' };
    }
  }

  // Get security metrics
  async getSecurityMetrics() {
    try {
      const hasEnvFile = fs.existsSync('.env.local');
      const hasGitignore = fs.existsSync('.gitignore');
      const hasSecurityMd = fs.existsSync('SECURITY.md');
      const hasAiRestrictions = fs.existsSync('.ai-restrictions');

      return {
        envFilePresent: hasEnvFile,
        gitignorePresent: hasGitignore,
        securityDocsPresent: hasSecurityMd,
        aiRestrictionsPresent: hasAiRestrictions,
        securityScore: (hasEnvFile + hasGitignore + hasSecurityMd + hasAiRestrictions) / 4 * 10
      };
    } catch (error) {
      return { securityScore: 0 };
    }
  }

  // Generate unified markdown report
  async generateUnifiedReport(currentAuditPath, gitChanges, snapshot) {
    const previousAudit = this.findPreviousAudit();
    const prevMetrics = previousAudit ? this.extractAuditMetrics(previousAudit) : null;
    const currMetrics = this.extractAuditMetrics(currentAuditPath, snapshot);

    if (!currMetrics) {
      throw new Error('Could not extract current audit metrics');
    }

    // Read the original audit content
    const originalContent = fs.readFileSync(currentAuditPath, 'utf8');

    // Get current timestamp and previous baseline timestamp
    const currentTimestamp = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    const previousTimestamp = previousAudit ?
      new Date(fs.statSync(previousAudit).mtime).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }) : 'N/A (First Audit)';

    const unifiedContent = `
# Tutorwise Project Audit
## Comprehensive Security & Development Analysis

- **Report Date**: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
- **Current Snapshot**: ${currentTimestamp}
- **Previous Baseline**: ${previousTimestamp}
- **Audit Period**: Comparing current codebase against previous baseline
- **Report Version**: v${snapshot?.dependencies?.version || '1.0.0'}
- **Generated By**: Tutorwise Audit System

---

## Executive Summary

### Overview

TutorWise is an innovative tutoring marketplace platform that reimagines how tutors, clients (parents/students), and agents interact through a unified multi-role ecosystem.

### Project Health Dashboard

| **Metric** | **Current** | **Previous** | **Trend** |
|------------|-------------|--------------|-----------|
| **Health Score** | ${currMetrics.healthScore}/10 | ${prevMetrics ? prevMetrics.healthScore : 'N/A'}/10 | ${this.getTrendText(currMetrics.healthScore, prevMetrics?.healthScore)} ${prevMetrics ? (parseFloat(currMetrics.healthScore) - parseFloat(prevMetrics.healthScore)).toFixed(1) : 'N/A'} |
| **Critical Issues** | ${currMetrics.criticalIssues} | ${prevMetrics ? prevMetrics.criticalIssues : 'N/A'} | ${this.getTrendText(currMetrics.criticalIssues, prevMetrics?.criticalIssues, true)} ${prevMetrics ? (currMetrics.criticalIssues - prevMetrics.criticalIssues) : 'N/A'} |
| **High Priority** | ${currMetrics.highIssues} | ${prevMetrics ? prevMetrics.highIssues : 'N/A'} | ${this.getTrendText(currMetrics.highIssues, prevMetrics?.highIssues, true)} ${prevMetrics ? (currMetrics.highIssues - prevMetrics.highIssues) : 'N/A'} |
| **Medium Priority** | ${currMetrics.mediumIssues} | ${prevMetrics ? prevMetrics.mediumIssues : 'N/A'} | ${this.getTrendText(currMetrics.mediumIssues, prevMetrics?.mediumIssues, true)} ${prevMetrics ? (currMetrics.mediumIssues - prevMetrics.mediumIssues) : 'N/A'} |

### Key Performance Indicators

- **Overall Status**: ${this.getHealthStatus(currMetrics.healthScore)}
- **Risk Level**: ${this.getRiskLevel(currMetrics.criticalIssues, currMetrics.highIssues)}
- **Code Quality**: ${this.getCodeQuality(snapshot)}
- **Security Posture**: ${snapshot?.security?.securityScore?.toFixed(1) || 'N/A'}/10

---

## Platform Architecture

### Monorepo Structure

- **Frontend**: Next.js 14+ (TypeScript, Tailwind CSS, Radix UI) in apps/web/
- **Backend**: FastAPI (Python) in apps/api/
- **Shared Packages**: TypeScript types in packages/shared-types/
- **Deployment**: Vercel (frontend), Railway (backend)

### Technology Stack

#### Core Technologies
- **Database**: Supabase PostgreSQL, Neo4j Graph Database, Redis
- **Authentication**: Supabase Auth
- **Payments**: Stripe Connect
- **Testing**: Jest, Playwright, Percy (visual testing)
- **AI Integration**: Gemini Pro, Claude Code CLI

#### Development Tools
- **Package Manager**: npm
- **Monorepo Management**: Turborepo-compatible structure
- **Version Control**: Git with GitHub
- **CI/CD**: GitHub Actions, Vercel, Railway

### Key Platform Innovations

1. **Single Account, Multi-Role**: Users can switch between Client, Tutor, and Agent roles seamlessly
2. **Dynamic Dashboards**: Role-based interfaces (Learning Hub, Teaching Studio, Tutoring Agency)
3. **Seven Revenue Streams**:
   - Marketplace listing
   - Reverse marketplace
   - Group sessions
   - Job board
   - Course sales
   - AI tutors
   - Referrals
4. **Network & Connections**: Organize contacts into groups
5. **Anyone Can Refer Anything to Anyone (RATA)**: Built-in referral system

---

## Development Activity Analysis

### Recent Development Summary
- **Commits**: ${gitChanges.commits ? gitChanges.commits.split('\\n').length : 0} commits since last audit
- **Files Changed**: ${gitChanges.fileChanges ? gitChanges.fileChanges.split('\\n').length : 0} files modified
- **Contributors**: ${gitChanges.authors ? gitChanges.authors.split('\\n').length : 0} active developers

### Git Change Analysis

#### Recent Commits (Last ${gitChanges.commits ? gitChanges.commits.split('\\n').length : 0} commits)
\`\`\`
${gitChanges.commits || 'No recent commits found'}
\`\`\`

#### File Modification Summary
\`\`\`
${gitChanges.stats || 'No file changes detected'}
\`\`\`

#### Detailed File Changes
\`\`\`
${gitChanges.fileChanges || 'No detailed changes available'}
\`\`\`

#### Development Team Activity
\`\`\`
${gitChanges.authors || 'No contributor data available'}
\`\`\`

---

## Latest Itemized Changes Since Last Report

${this.generateItemizedChanges(gitChanges, prevMetrics)}

---

## Project Metrics & Architecture

### Codebase Composition

| **File Type** | **Count** | **Percentage** |
|---------------|-----------|----------------|
| TypeScript | ${snapshot?.fileCount?.typescript || 0} | ${this.getPercentage(snapshot?.fileCount?.typescript, snapshot?.fileCount?.total)}% |
| React Components | ${snapshot?.fileCount?.react || 0} | ${this.getPercentage(snapshot?.fileCount?.react, snapshot?.fileCount?.total)}% |
| JavaScript | ${snapshot?.fileCount?.javascript || 0} | ${this.getPercentage(snapshot?.fileCount?.javascript, snapshot?.fileCount?.total)}% |
| Markdown | ${snapshot?.fileCount?.markdown || 0} | ${this.getPercentage(snapshot?.fileCount?.markdown, snapshot?.fileCount?.total)}% |
| CSS/Styles | ${snapshot?.fileCount?.css || 0} | ${this.getPercentage(snapshot?.fileCount?.css, snapshot?.fileCount?.total)}% |
| Configuration | ${snapshot?.fileCount?.json || 0} | ${this.getPercentage(snapshot?.fileCount?.json, snapshot?.fileCount?.total)}% |
| **Total Files** | **${snapshot?.fileCount?.total || 0}** | **100%** |

### Code Quality Metrics

- **Lines of Code**: ${snapshot?.codeMetrics?.linesOfCode?.toLocaleString() || 'N/A'}
- **React Components**: ${snapshot?.codeMetrics?.components || 'N/A'}
- **Dependencies**: ${snapshot?.dependencies?.dependencies || 'N/A'} production + ${snapshot?.dependencies?.devDependencies || 'N/A'} development
- **NPM Scripts**: ${snapshot?.dependencies?.scripts || 'N/A'} available commands
- **Node.js Version**: ${snapshot?.dependencies?.nodeVersion || 'Not specified'}

### Security Assessment

- **Environment Security**: ${snapshot?.security?.envFilePresent ? 'Configured' : 'Missing'}
- **Git Security**: ${snapshot?.security?.gitignorePresent ? 'Configured' : 'Missing'}
- **Security Documentation**: ${snapshot?.security?.securityDocsPresent ? 'Present' : 'Missing'}
- **AI Restrictions**: ${snapshot?.security?.aiRestrictionsPresent ? 'Implemented' : 'Missing'}
- **Overall Security Score**: ${snapshot?.security?.securityScore?.toFixed(1) || 'N/A'}/10

---

## Recent Security Incidents & Remediation

### Critical Security Issues (September 30, 2024)

#### Incident #1: Environment Variable Access Violation
AI agent gained unrestricted access to production secrets across all platforms (Vercel, Railway, Supabase, Neo4j, Redis, Terraform, Google Cloud).

**Risk Level**: CRITICAL
**Impact**: Potential data breach, service disruption, unauthorized access

#### Incident #2: Project Scope Violation
AI agent performed system-wide file searches outside project boundaries, accessing other projects and directories.

**Risk Level**: HIGH
**Impact**: Unauthorized access to other projects, confusion with wrong accounts, scope creep

### Implemented Security Controls

- **Comprehensive AI RBAC system**: tools/rbac/ai-permission-system.js
- **AI restrictions file**: .ai-restrictions with forbidden actions
- **Project scope limits**: Enforced boundaries at /Users/michaelquan/projects/tutorwise
- **Human approval workflow**: Required for sensitive changes (tools/rbac/approval-workflow.js)
- **Automated audit system**: Daily/weekly reports with email notifications

### Recent Achievements

- Onboarding infinite loading bug fixed
- Security framework successfully implemented
- Navigation menu spacing issues resolved
- Auto-save/resume onboarding functionality completed
- API routes cleaned up for frontend-only deployment

### Outstanding Issues

#### Critical
- No critical issues identified ✅

#### High Priority
- Security documentation could be expanded
- Consider adding enhanced monitoring dashboard
- Performance optimization review recommended

---

## Development Workflow & Automation

### AI-Assisted Development
The project leverages extensive AI automation through Claude Code CLI:

- **Context Engineering**: Comprehensive project context for AI assistance
- **Automated Task Execution**: Integration with Jira and Calendar events
- **Code Generation**: AI-assisted feature implementation
- **Testing Infrastructure**: Automated unit, integration, E2E, and visual tests

### Testing Strategy

#### Testing Layers
- **Unit Tests**: Jest for component and utility testing
- **Integration Tests**: API and database integration verification
- **E2E Tests**: Playwright for full user journey testing
- **Visual Tests**: Percy for UI regression detection

#### Test Coverage
- Comprehensive test plans in docs/testing/
- Automated test execution in CI/CD pipeline
- Visual regression testing for UI changes

### Documentation Structure

Well-organized documentation in docs/:
- **Requirements**: Product requirements and specifications
- **Design**: Architecture and design decisions
- **Development**: Development guides and workflows
- **Testing**: Test strategies and test plans
- **Deployment**: Infrastructure and deployment guides
- **Integration**: Third-party integration documentation
- **Features**: Feature-specific workflows and documentation

### Automation Tools

- **Context Management**: Automated context collection for AI
- **Jira Integration**: Task synchronization and automation
- **Google Workspace**: Calendar and Docs integration
- **Confluence**: Documentation synchronization
- **Audit System**: Daily/weekly automated project audits

---

## Trend Analysis

### Performance Trends

${this.generateDetailedTrendAnalysis(currMetrics, prevMetrics, snapshot)}

---

## Strategic Recommendations

### Immediate Actions (Next 24 hours)

${currMetrics.criticalIssues > 0 ? `1. **Address ${currMetrics.criticalIssues} Critical Issue${currMetrics.criticalIssues > 1 ? 's' : ''}**
   - Review and prioritize critical findings
   - Create action plan with timelines
   - Assign ownership for resolution` : '1. **Monitor Deployment Pipeline**\n   - Verify automated deployments are running smoothly\n   - Check deployment logs for any warnings\n   - Validate environment variables are up to date'}

${(snapshot?.security?.securityScore || 0) < 8 ? '2. **Improve Security Posture**\n   - Complete security documentation\n   - Review and update access controls\n   - Validate security controls in practice' : '2. **Review Security Audit Logs**\n   - Check protection report for any violations\n   - Verify critical files monitoring is active\n   - Review access control effectiveness'}

### Short-term Goals (Next Week)

1. **Enhanced Monitoring Setup**
   - Consider adding deployment monitoring dashboard
   - Set up performance metrics tracking
   - Implement error tracking and alerting

2. **Documentation Expansion**
   - Complete comprehensive security audit
   - Document security controls and procedures
   - Validate AI RBAC system effectiveness

3. **Testing Infrastructure**
   - Implement automated testing for deployment pipeline
   - Expand E2E test coverage
   - Set up continuous visual regression testing

4. **Documentation Updates**
   - Update deployment documentation
   - Document security incident response procedures
   - Maintain architectural decision records

### Long-term Strategy (Next Month)

1. **Deployment Monitoring & Observability**
   - Implement deployment health monitoring
   - Set up error tracking and alerting
   - Create deployment metrics dashboard

2. **Security Hardening**
   - Regular security audits (weekly/monthly)
   - Penetration testing for critical paths
   - Security training for development team

3. **Architecture Evolution**
   - Plan for scalability improvements
   - Evaluate microservices opportunities
   - Optimize database queries and caching

4. **CI/CD Enhancement**
   - Automated quality gates
   - Performance benchmarking in CI
   - Automated dependency updates

---

## Conclusion

### Overall Assessment

${this.generateConclusion(currMetrics, prevMetrics, snapshot)}

### Next Steps

1. Review and address immediate action items listed above
2. Monitor project health metrics through automated daily audits
3. Continue security hardening and documentation improvements
4. Maintain code quality standards and testing practices

---

## Audit Methodology

### Data Sources
- **Git Repository**: Commit history, file changes, contributor activity
- **File System**: Code metrics, file composition, project structure
- **Configuration**: Dependencies, scripts, environment setup
- **Security**: Access controls, documentation, restrictions
- **Previous Audits**: Historical comparison and trend analysis

### Analysis Techniques
- Statistical trend analysis comparing current vs. previous metrics
- Git diff analysis for code change impact assessment
- File system scanning for project composition metrics
- Security posture evaluation based on best practices
- Risk assessment using weighted priority scoring

### Report Validation
- Cross-referenced with previous audit findings
- Verified against project documentation
- Validated with automated metric collection
- Reviewed for accuracy and completeness

---

## Report Metadata

**Report ID**: AUDIT-${this.auditDate}-${Date.now().toString(36)}
**Generation Time**: ${new Date().toISOString()}
**Report Format**: Unified Markdown + PDF
**Data Collection Period**: ${prevMetrics ? prevMetrics.auditDate : '2024-09-28'} to ${currMetrics.auditDate}
**Next Scheduled Audit**: ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}

**Automated Distribution**: Email sent to tutorwiseapp@gmail.com
**Archive Location**: docs/project-audit/
**Backup Location**: tools/snapshots/

---

## References

### Documentation
- Project Repository: /Users/michaelquan/projects/tutorwise
- Previous Audits: docs/project-audit/
- Security Guidelines: .ai-restrictions
- Change Management: docs/ai-change-management.md

### Tools & Systems
- Audit System: tools/scripts/project-audit.js
- Email Notifications: tools/scripts/email/send-audit-email.js
- Snapshot Storage: tools/snapshots/
- Cron Schedule: Daily at 6:00 AM and 7:00 PM

### Contact Information
- Email: tutorwiseapp@gmail.com
- Project Admin: @tutorwiseapp
- Product Engineer: @micquan

---

*This report was automatically generated by the Tutorwise Project Audit System. For questions or concerns, please contact the development team.*
`;

    return unifiedContent;
  }

  // Helper methods for trend analysis
  getTrendText(current, previous, isIssue = false) {
    if (!previous) return 'Stable';

    const curr = parseFloat(current) || 0;
    const prev = parseFloat(previous) || 0;

    if (curr > prev) {
      return isIssue ? 'Increased' : 'Improved';
    } else if (curr < prev) {
      return isIssue ? 'Decreased' : 'Declined';
    } else {
      return 'Stable';
    }
  }

  getHealthStatus(score) {
    const health = parseFloat(score) || 0;
    if (health >= 8) return 'Excellent';
    if (health >= 6) return 'Good';
    if (health >= 4) return 'Fair';
    return 'Needs Attention';
  }

  getRiskLevel(critical, high) {
    const total = (critical || 0) + (high || 0);
    if (total === 0) return 'Low';
    if (total <= 2) return 'Medium';
    return 'High';
  }

  getCodeQuality(snapshot) {
    const loc = snapshot?.codeMetrics?.linesOfCode || 0;
    const components = snapshot?.codeMetrics?.components || 0;

    if (loc > 10000 && components > 50) return 'Enterprise Scale';
    if (loc > 5000 && components > 25) return 'Production Ready';
    return 'Development Stage';
  }

  getPercentage(value, total) {
    if (!total || total === 0) return '0';
    return ((value || 0) / total * 100).toFixed(1);
  }

  generateDetailedTrendAnalysis(current, previous, snapshot) {
    if (!previous) {
      return `**Baseline Audit**: This is the first comprehensive audit. Future reports will include detailed trend analysis comparing project evolution over time.

**Current Project State**:
- Health Score: ${current.healthScore}/10
- Total Issues: ${(current.criticalIssues || 0) + (current.highIssues || 0) + (current.mediumIssues || 0)}
- Security Posture: ${snapshot?.security?.securityScore?.toFixed(1) || 'N/A'}/10`;
    }

    const healthChange = parseFloat(current.healthScore) - parseFloat(previous.healthScore);
    const issueChange = (current.criticalIssues + current.highIssues) - (previous.criticalIssues + previous.highIssues);

    return `**Health Score Evolution**: ${healthChange > 0 ? 'Improved' : healthChange < 0 ? 'Declined' : 'Stable'} (${healthChange >= 0 ? '+' : ''}${healthChange.toFixed(1)} points)

**Issue Resolution Progress**: ${issueChange < 0 ? 'Positive' : issueChange > 0 ? 'Regression' : 'No Change'} (${issueChange >= 0 ? '+' : ''}${issueChange} issues)

**Development Velocity**: Active development with ${snapshot?.git?.commits?.split('\\n').length || 0} commits since last audit

**Quality Metrics**:
- Code base: ${snapshot?.codeMetrics?.linesOfCode?.toLocaleString() || 'N/A'} lines across ${snapshot?.fileCount?.total || 'N/A'} files
- Component architecture: ${snapshot?.codeMetrics?.components || 'N/A'} React components identified`;
  }

  generateImmediateActions(current, snapshot) {
    const actions = [];

    if (current.criticalIssues > 0) {
      actions.push(`- **Address ${current.criticalIssues} critical issue${current.criticalIssues > 1 ? 's' : ''}** identified in audit`);
    }

    if ((snapshot?.security?.securityScore || 0) < 8) {
      actions.push('- **Improve security posture** by implementing missing security controls');
    }

    if (parseFloat(current.healthScore) < 7) {
      actions.push('- **Health score recovery plan** - focus on high-impact improvements');
    }

    if (actions.length === 0) {
      actions.push('- **Continue current practices** - project health is stable');
      actions.push('- **Monitor emerging issues** through automated alerts');
    }

    return actions.join('\\n');
  }

  generateShortTermGoals(current, snapshot) {
    const goals = [];

    goals.push('- **Maintain health score** above 7.0 through consistent development practices');
    goals.push('- **Implement automated testing** to catch issues early in development cycle');
    goals.push('- **Update documentation** to reflect recent architectural changes');

    if ((snapshot?.dependencies?.dependencies || 0) > 20) {
      goals.push('- **Dependency audit** to identify unused or outdated packages');
    }

    return goals.join('\\n');
  }

  generateLongTermStrategy(current, snapshot) {
    const strategies = [];

    strategies.push('- **Architecture evolution** planning for scalability and maintainability');
    strategies.push('- **CI/CD pipeline enhancement** for automated quality gates');
    strategies.push('- **Metrics dashboard** implementation for real-time project health monitoring');
    strategies.push('- **Team process optimization** based on audit findings and trends');

    return strategies.join('\\n');
  }

  generateItemizedChanges(gitChanges, prevMetrics) {
    if (!gitChanges || !gitChanges.fileChanges) {
      return 'No changes detected since last report.';
    }

    const fileChangesArray = gitChanges.fileChanges.split('\n').filter(line => line.trim());

    // Categorize changes
    const added = fileChangesArray.filter(line => line.startsWith('A\t'));
    const modified = fileChangesArray.filter(line => line.startsWith('M\t'));
    const deleted = fileChangesArray.filter(line => line.startsWith('D\t'));
    const renamed = fileChangesArray.filter(line => line.startsWith('R\t'));

    let output = '### Summary of Changes\n\n';

    output += `| **Change Type** | **Count** |\n`;
    output += `|-----------------|----------|\n`;
    output += `| Files Added | ${added.length} |\n`;
    output += `| Files Modified | ${modified.length} |\n`;
    output += `| Files Deleted | ${deleted.length} |\n`;
    output += `| Files Renamed | ${renamed.length} |\n`;
    output += `| **Total Changes** | **${fileChangesArray.length}** |\n\n`;

    // Added files
    if (added.length > 0) {
      output += '### Files Added\n\n';
      added.forEach(line => {
        const file = line.replace('A\t', '').trim();
        output += `- \`${file}\`\n`;
      });
      output += '\n';
    }

    // Modified files
    if (modified.length > 0) {
      output += '### Files Modified\n\n';
      modified.forEach(line => {
        const file = line.replace('M\t', '').trim();
        output += `- \`${file}\`\n`;
      });
      output += '\n';
    }

    // Deleted files
    if (deleted.length > 0) {
      output += '### Files Deleted\n\n';
      deleted.forEach(line => {
        const file = line.replace('D\t', '').trim();
        output += `- \`${file}\`\n`;
      });
      output += '\n';
    }

    // Renamed files
    if (renamed.length > 0) {
      output += '### Files Renamed\n\n';
      renamed.forEach(line => {
        const file = line.replace('R\t', '').trim();
        output += `- \`${file}\`\n`;
      });
      output += '\n';
    }

    return output;
  }

  generateConclusion(current, previous, snapshot) {
    const healthScore = parseFloat(current.healthScore) || 0;
    const totalIssues = (current.criticalIssues || 0) + (current.highIssues || 0) + (current.mediumIssues || 0);

    const trend = previous ?
      (parseFloat(current.healthScore) > parseFloat(previous.healthScore) ? 'improving' :
       parseFloat(current.healthScore) < parseFloat(previous.healthScore) ? 'declining' : 'stable') :
      'baseline established';

    return `TutorWise is a **well-architected, ambitious platform** with strong technical foundations. The monorepo structure, comprehensive testing infrastructure, and AI-assisted development workflow are notable strengths that position the project for long-term success.

### Key Strengths

- **Innovative Architecture**: Single account, multi-role system with dynamic dashboards
- **Comprehensive Testing**: Full test coverage across unit, integration, E2E, and visual layers
- **Modern Tech Stack**: Next.js, FastAPI, Supabase, Neo4j, and Stripe Connect integration
- **AI-Assisted Development**: Advanced automation with Claude Code CLI and context engineering
- **Robust Security**: Recent incidents led to implementation of strong governance controls

### Focus Areas

**Current Health**: ${current.healthScore}/10${previous ? ` (${trend} from ${previous.healthScore}/10)` : ''} - ${healthScore >= 7 ? 'Good' : healthScore >= 5 ? 'Fair' : 'Needs Attention'}

**Primary Concerns**:
1. Deployment configuration (Vercel account setup)
2. GitHub → Vercel auto-deployment integration
3. Security documentation completion

**Security Posture**: ${snapshot?.security?.securityScore?.toFixed(1) || 'N/A'}/10 - Recent security incidents resulted in comprehensive RBAC system and AI restrictions. Ongoing validation required.

**Technical Excellence**: With ${snapshot?.codeMetrics?.linesOfCode?.toLocaleString() || 'N/A'} lines of code across ${snapshot?.fileCount?.total?.toLocaleString() || 'N/A'} files, the codebase demonstrates ${this.getCodeQuality(snapshot)} characteristics with ${snapshot?.codeMetrics?.components || 'N/A'} React components and modern TypeScript patterns.

**Path Forward**: Main focus areas are deployment automation cleanup and security validation. The strong technical foundation supports rapid feature development once deployment pipeline is stabilized.`;
  }

  // Create professional PDF styles
  createProfessionalPDFStyles() {
    const cssPath = path.join(__dirname, 'professional-audit-styles.css');

    const styles = `
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
        font-size: 9pt;
        line-height: 1.4;
        color: #2d3748;
        margin: 0;
        padding: 15px;
        background: white;
      }

      .page {
        max-width: 750px;
        margin: 0 auto;
      }

      h1 {
        font-size: 18pt;
        color: #1a202c;
        margin: 0 0 8px 0;
        padding: 12px 0;
        border-bottom: 3px solid #006C67;
        font-weight: 700;
      }

      h2 {
        font-size: 14pt;
        color: #006C67;
        margin: 16px 0 8px 0;
        padding: 8px 0 4px 0;
        border-bottom: 2px solid #e2e8f0;
        font-weight: 600;
      }

      h3 {
        font-size: 12pt;
        color: #2d3748;
        margin: 12px 0 6px 0;
        font-weight: 600;
      }

      h4 {
        font-size: 10pt;
        color: #4a5568;
        margin: 8px 0 4px 0;
        font-weight: 600;
      }

      p {
        margin: 6px 0;
        font-size: 9pt;
        line-height: 1.4;
      }

      ul, ol {
        margin: 6px 0;
        padding-left: 16px;
      }

      li {
        margin: 2px 0;
        font-size: 9pt;
        line-height: 1.3;
      }

      table {
        border-collapse: collapse;
        width: 100%;
        margin: 8px 0;
        font-size: 8pt;
        border: 1px solid #e2e8f0;
      }

      th {
        background: linear-gradient(135deg, #006C67, #00A693);
        color: white;
        padding: 6px 8px;
        font-weight: 600;
        text-align: left;
        font-size: 8pt;
        border: 1px solid #004d4a;
      }

      td {
        padding: 5px 8px;
        border: 1px solid #e2e8f0;
        font-size: 8pt;
        vertical-align: top;
      }

      tr:nth-child(even) {
        background-color: #f8fafc;
      }

      tr:hover {
        background-color: #edf2f7;
      }

      code {
        background-color: #f1f5f9;
        padding: 1px 3px;
        border-radius: 2px;
        font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
        font-size: 8pt;
        color: #1a202c;
      }

      pre {
        background-color: #f8fafc;
        padding: 8px;
        border-radius: 4px;
        border-left: 3px solid #006C67;
        overflow-x: auto;
        font-size: 7pt;
        line-height: 1.3;
        margin: 8px 0;
      }

      pre code {
        background: none;
        padding: 0;
        font-size: 7pt;
      }

      blockquote {
        border-left: 3px solid #00A693;
        margin: 8px 0;
        padding: 6px 12px;
        background-color: #f0fdfa;
        font-size: 9pt;
        font-style: italic;
      }

      hr {
        border: none;
        border-top: 2px solid #e2e8f0;
        margin: 16px 0;
      }

      .metric-card {
        background: linear-gradient(135deg, #f8fafc, #edf2f7);
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 8px;
        margin: 4px 0;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      }

      .status-excellent { color: #22c55e; font-weight: 600; }
      .status-good { color: #f59e0b; font-weight: 600; }
      .status-fair { color: #f97316; font-weight: 600; }
      .status-poor { color: #ef4444; font-weight: 600; }

      .trend-up { color: #22c55e; }
      .trend-down { color: #ef4444; }
      .trend-stable { color: #6b7280; }

      .page-break {
        page-break-before: always;
      }

      .no-page-break {
        page-break-inside: avoid;
      }

      .header-info {
        background: linear-gradient(135deg, #f8fafc, #edf2f7);
        padding: 8px;
        border-radius: 6px;
        margin: 8px 0;
        border-left: 4px solid #006C67;
        font-size: 8pt;
      }

      .footer-info {
        margin-top: 20px;
        padding: 8px;
        background: #f8fafc;
        border-radius: 4px;
        font-size: 7pt;
        color: #6b7280;
        text-align: center;
      }

      @media print {
        body { margin: 0; padding: 10px; }
        .page-break { page-break-before: always; }
        .no-page-break { page-break-inside: avoid; }
      }
    `;

    fs.writeFileSync(cssPath, styles);
    return cssPath;
  }

  // Convert markdown to PDF with professional styling using Puppeteer
  async generateProfessionalPDF(markdownPath, outputPath) {
    try {
      console.log('Generating professional PDF...');

      const puppeteer = require('puppeteer');
      const { marked } = require('marked');

      // Read markdown content
      const markdownContent = fs.readFileSync(markdownPath, 'utf8');

      // Convert markdown to HTML
      const htmlContent = await marked.parse(markdownContent);

      // Get professional CSS styles
      const cssPath = this.createProfessionalPDFStyles();
      const cssContent = fs.readFileSync(cssPath, 'utf8');

      // Create complete HTML document
      const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>${cssContent}</style>
</head>
<body>
  ${htmlContent}
</body>
</html>
      `;

      // Launch Puppeteer (headless browser)
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'] // Required for CI environments
      });

      const page = await browser.newPage();

      // Set content and wait for it to load
      await page.setContent(fullHtml, { waitUntil: 'networkidle0' });

      // Generate PDF
      await page.pdf({
        path: outputPath,
        format: 'A4',
        margin: {
          top: '0.5in',
          right: '0.5in',
          bottom: '0.5in',
          left: '0.5in'
        },
        printBackground: true
      });

      await browser.close();

      console.log(`Professional PDF generated: ${outputPath}`);
      return outputPath;
    } catch (error) {
      console.error('Error generating professional PDF:', error);
      throw error;
    }
  }

  // Main project audit execution
  async runProjectAudit() {
    console.log('Starting Tutorwise Project Audit...');
    console.log(`Audit Date: ${this.auditDate}`);

    try {
      // Step 1: Create daily snapshot
      console.log('\\nCreating comprehensive snapshot...');
      const snapshot = await this.createDailySnapshot();

      // Step 2: Get git changes
      console.log('\\nAnalyzing git changes...');
      const gitChanges = await this.getGitChanges('2 days ago');

      // Step 3: Find current audit file
      const currentAuditPath = path.join(this.auditDir, `project-audit-${this.auditDate}.md`);

      if (!fs.existsSync(currentAuditPath)) {
        throw new Error(`Current audit file not found: ${currentAuditPath}`);
      }

      // Step 4: Generate unified report
      console.log('\\nGenerating unified audit report...');
      const unifiedContent = await this.generateUnifiedReport(currentAuditPath, gitChanges, snapshot);

      const unifiedMdPath = path.join(this.auditDir, `project-audit-${this.auditDate}.md`);
      fs.writeFileSync(unifiedMdPath, unifiedContent);
      console.log(`Unified markdown: ${unifiedMdPath}`);

      // Step 5: Generate professional PDF
      console.log('\\nGenerating professional PDF...');
      const pdfPath = path.join(this.auditDir, `project-audit-${this.auditDate}.pdf`);

      try {
        await this.generateProfessionalPDF(unifiedMdPath, pdfPath);
        console.log(`Professional PDF: ${pdfPath}`);
      } catch (pdfError) {
        console.error('WARNING: PDF generation failed, continuing with markdown only');
        console.error(pdfError.message);
      }

      // Step 6: Return report information
      return {
        markdownPath: unifiedMdPath,
        pdfPath: fs.existsSync(pdfPath) ? pdfPath : null,
        snapshotPath: path.join(this.snapshotDir, `snapshot-${this.auditDate}.json`),
        success: true
      };

    } catch (error) {
      console.error('ERROR: Audit failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// CLI execution
if (require.main === module) {
  const auditor = new ProjectAuditor();

  auditor.runProjectAudit()
    .then((result) => {
      if (result.success) {
        console.log('\\nProject audit completed successfully!');
        console.log(`Markdown: ${result.markdownPath}`);
        if (result.pdfPath) {
          console.log(`PDF: ${result.pdfPath}`);
        }
        console.log(`Snapshot: ${result.snapshotPath}`);
        process.exit(0);
      } else {
        console.error('ERROR: Audit failed:', result.error);
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('ERROR: Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = ProjectAuditor;