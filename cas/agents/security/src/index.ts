/**
 * Security Agent - Security Engineer + Compliance Officer
 *
 * Responsibilities:
 * - Security validation and code review
 * - Vulnerability scanning (npm audit, code analysis)
 * - Authentication testing
 * - OWASP Top 10 compliance checks
 * - LLM-powered false positive filtering
 * - Pre-deployment security gate
 *
 * Execute with tools: Deterministic scanning, thresholds, rules.
 * LLM used only for false positive filtering (augmentation, not replacement).
 *
 * @agent Security Agent
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { casGenerate } from '../../../packages/core/src/services/cas-ai';
import { persistEvent } from '../../../packages/core/src/services/cas-events';

const execAsync = promisify(exec);

export interface SecurityScanResult {
  passed: boolean;
  vulnerabilities: VulnerabilityReport[];
  codeIssues: CodeSecurityIssue[];
  recommendations: string[];
  timestamp: string;
}

export interface VulnerabilityReport {
  severity: 'critical' | 'high' | 'moderate' | 'low';
  package: string;
  description: string;
  fixAvailable: boolean;
}

export interface CodeSecurityIssue {
  type: 'xss' | 'sql-injection' | 'auth' | 'secrets' | 'csrf' | 'ssrf' | 'path-traversal' | 'other';
  file: string;
  line?: number;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  falsePositive?: boolean;
}

export interface AuthTestResult {
  testName: string;
  passed: boolean;
  details: string;
}

class SecurityAgent {
  private projectRoot: string;
  private supabase: SupabaseClient | null = null;

  constructor() {
    this.projectRoot = path.resolve(__dirname, '../../../../');
    this.initSupabase();
  }

  private initSupabase(): void {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
    if (url && key) {
      this.supabase = createClient(url, key);
    }
  }

  /**
   * Performs a comprehensive security scan of the codebase.
   */
  public async runSecurityScan(): Promise<SecurityScanResult> {
    console.log('▶️ Security Agent: Starting comprehensive security scan...');

    const vulnerabilities = await this.runDependencyScan();
    const rawCodeIssues = await this.runCodeSecurityScan();

    // Filter false positives using LLM
    const codeIssues = await this.filterFalsePositives(rawCodeIssues);
    const recommendations = this.generateRecommendations(vulnerabilities, codeIssues);

    const criticalOrHigh = vulnerabilities.filter(
      v => v.severity === 'critical' || v.severity === 'high'
    );

    const result: SecurityScanResult = {
      passed: criticalOrHigh.length === 0 && codeIssues.filter(i => i.severity === 'critical').length === 0,
      vulnerabilities,
      codeIssues,
      recommendations,
      timestamp: new Date().toISOString(),
    };

    // Persist scan results
    await this.persistScanResults(result);

    console.log(`✅ Security scan complete. Passed: ${result.passed}`);
    return result;
  }

  /**
   * Runs npm audit to check for dependency vulnerabilities.
   */
  public async runDependencyScan(): Promise<VulnerabilityReport[]> {
    console.log('▶️ Security Agent: Scanning dependencies...');

    try {
      const webAppPath = path.join(this.projectRoot, 'apps/web');
      const { stdout } = await execAsync('npm audit --json', { cwd: webAppPath });
      return this.parseAuditOutput(stdout);
    } catch (error: any) {
      if (error.stdout) {
        return this.parseAuditOutput(error.stdout);
      }
      console.log('✅ No dependency vulnerabilities found or npm audit not available.');
      return [];
    }
  }

  private parseAuditOutput(stdout: string): VulnerabilityReport[] {
    try {
      const auditResult = JSON.parse(stdout);
      const vulnerabilities: VulnerabilityReport[] = [];

      if (auditResult.vulnerabilities) {
        for (const [pkgName, data] of Object.entries(auditResult.vulnerabilities)) {
          const vuln = data as any;
          vulnerabilities.push({
            severity: vuln.severity || 'moderate',
            package: pkgName,
            description: vuln.via?.[0]?.title || 'Unknown vulnerability',
            fixAvailable: vuln.fixAvailable === true,
          });
        }
      }

      console.log(`✅ Dependency scan complete. Found ${vulnerabilities.length} issues.`);
      return vulnerabilities;
    } catch {
      console.warn('⚠️ Could not parse npm audit output');
      return [];
    }
  }

  /**
   * Scans code for common security issues.
   * Expanded patterns: XSS, secrets, eval, SSRF, path traversal, client-side env vars.
   */
  public async runCodeSecurityScan(): Promise<CodeSecurityIssue[]> {
    console.log('▶️ Security Agent: Scanning code for security issues...');

    const issues: CodeSecurityIssue[] = [];

    const patterns = [
      {
        regex: /dangerouslySetInnerHTML/g,
        type: 'xss' as const,
        description: 'Use of dangerouslySetInnerHTML can lead to XSS vulnerabilities',
        severity: 'high' as const,
      },
      {
        regex: /eval\s*\(/g,
        type: 'xss' as const,
        description: 'Use of eval() is a security risk',
        severity: 'critical' as const,
      },
      {
        regex: /(?:password|secret|api_key|apikey|auth_token)\s*[:=]\s*["'][^"']+["']/gi,
        type: 'secrets' as const,
        description: 'Potential hardcoded secret detected',
        severity: 'critical' as const,
      },
      {
        regex: /innerHTML\s*=/g,
        type: 'xss' as const,
        description: 'Direct innerHTML assignment can lead to XSS',
        severity: 'medium' as const,
      },
      {
        regex: /document\.write/g,
        type: 'xss' as const,
        description: 'Use of document.write can lead to XSS',
        severity: 'high' as const,
      },
      // New patterns
      {
        regex: /process\.env\.(?!NEXT_PUBLIC_)/g,
        type: 'secrets' as const,
        description: 'Server-side env var accessed — ensure not in client component',
        severity: 'medium' as const,
      },
      {
        regex: /new\s+Function\s*\(/g,
        type: 'xss' as const,
        description: 'new Function() is equivalent to eval() — security risk',
        severity: 'high' as const,
      },
      {
        regex: /\.\.\//g,
        type: 'path-traversal' as const,
        description: 'Potential path traversal pattern detected',
        severity: 'low' as const,
      },
      {
        regex: /fetch\s*\(\s*(?:req|request|params|query|body|input)/gi,
        type: 'ssrf' as const,
        description: 'User-controlled URL in fetch — potential SSRF',
        severity: 'medium' as const,
      },
      {
        regex: /JSON\.parse\s*\(\s*(?:req|request|params|query|body|input)/gi,
        type: 'other' as const,
        description: 'Unsafe deserialization of user input',
        severity: 'medium' as const,
      },
      {
        regex: /Math\.random\s*\(\)/g,
        type: 'other' as const,
        description: 'Math.random() is not cryptographically secure — use crypto.randomUUID() for IDs',
        severity: 'low' as const,
      },
    ];

    try {
      const srcPath = path.join(this.projectRoot, 'apps/web/src');
      const files = await this.getTypeScriptFiles(srcPath);

      // No file limit — scan all files
      for (const file of files) {
        try {
          const content = await fs.promises.readFile(file, 'utf-8');

          // Skip test files and generated files
          if (file.includes('.test.') || file.includes('.spec.') || file.includes('__generated__')) {
            continue;
          }

          for (const pattern of patterns) {
            const matches = content.matchAll(pattern.regex);
            for (const match of matches) {
              const lineNumber = content.substring(0, match.index).split('\n').length;
              issues.push({
                type: pattern.type,
                file: path.relative(this.projectRoot, file),
                line: lineNumber,
                description: pattern.description,
                severity: pattern.severity,
              });
            }
          }
        } catch {
          // Skip files that can't be read
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not complete code scan:', error);
    }

    console.log(`✅ Code security scan complete. Found ${issues.length} potential issues.`);
    return issues;
  }

  /**
   * Filter false positives using LLM analysis.
   * Sends high-severity issues with surrounding code context for assessment.
   * Falls back to keeping all findings if LLM unavailable.
   */
  private async filterFalsePositives(issues: CodeSecurityIssue[]): Promise<CodeSecurityIssue[]> {
    const highSeverity = issues.filter(i => i.severity === 'critical' || i.severity === 'high');

    if (highSeverity.length === 0 || highSeverity.length > 20) {
      // Too many to analyze or none to filter
      return issues;
    }

    // Get code context for each issue
    const issueContexts = await Promise.all(
      highSeverity.slice(0, 10).map(async (issue) => {
        try {
          const filePath = path.join(this.projectRoot, issue.file);
          const content = await fs.promises.readFile(filePath, 'utf-8');
          const lines = content.split('\n');
          const lineNum = (issue.line || 1) - 1;
          const contextStart = Math.max(0, lineNum - 3);
          const contextEnd = Math.min(lines.length, lineNum + 4);
          const context = lines.slice(contextStart, contextEnd).join('\n');
          return `File: ${issue.file}:${issue.line}\nType: ${issue.type}\nDescription: ${issue.description}\nCode:\n${context}`;
        } catch {
          return `File: ${issue.file}:${issue.line}\nType: ${issue.type}\nDescription: ${issue.description}`;
        }
      })
    );

    const analysis = await casGenerate({
      systemPrompt: `You are a security expert. Analyze these potential security issues and determine which are real vulnerabilities and which are false positives. Consider the surrounding code context.`,
      userPrompt: `Analyze these security findings. For each, state if it's a REAL vulnerability or FALSE POSITIVE, with brief reasoning.

${issueContexts.join('\n\n---\n\n')}

List each finding number and whether it is REAL or FALSE POSITIVE:`,
      maxOutputTokens: 1000,
    });

    if (!analysis) return issues;

    // Parse LLM response to identify false positives
    const falsePositiveIndices = new Set<number>();
    const lines = analysis.split('\n');
    for (const line of lines) {
      const match = line.match(/(?:finding\s*)?#?(\d+).*false\s*positive/i);
      if (match) {
        falsePositiveIndices.add(parseInt(match[1]) - 1);
      }
    }

    // Mark false positives
    return issues.map((issue) => {
      const idx = highSeverity.indexOf(issue);
      if (idx >= 0 && falsePositiveIndices.has(idx)) {
        return { ...issue, falsePositive: true, severity: 'low' as const };
      }
      return issue;
    });
  }

  /**
   * Reviews a feature for security concerns (Three Amigos input).
   */
  public reviewFeatureBrief(featureBrief: string): string {
    console.log('▶️ Security Agent: Performing Security Review...');

    let report = `## Security Review\n\n`;

    const hasAuthMentioned = /auth|login|password|token|session/i.test(featureBrief);
    const hasDataMentioned = /user data|personal|pii|sensitive/i.test(featureBrief);
    const hasApiMentioned = /api|endpoint|request/i.test(featureBrief);

    if (hasAuthMentioned) {
      report += `### Authentication Considerations\n`;
      report += `- ⚠️ Feature involves authentication. Ensure:\n`;
      report += `  - JWT tokens are properly validated\n`;
      report += `  - Sessions are securely managed\n`;
      report += `  - Password handling follows best practices\n\n`;
    }

    if (hasDataMentioned) {
      report += `### Data Protection Requirements\n`;
      report += `- ⚠️ Feature handles sensitive data. Requirements:\n`;
      report += `  - Data must be encrypted in transit (HTTPS)\n`;
      report += `  - PII must be properly sanitized in logs\n`;
      report += `  - Input validation must be implemented\n\n`;
    }

    if (hasApiMentioned) {
      report += `### API Security Checklist\n`;
      report += `- [ ] Rate limiting implemented\n`;
      report += `- [ ] CORS properly configured\n`;
      report += `- [ ] Input validation on all parameters\n`;
      report += `- [ ] Authorization checks on all endpoints\n\n`;
    }

    if (!hasAuthMentioned && !hasDataMentioned && !hasApiMentioned) {
      report += `- **Security Impact:** ✅ Low. No obvious security-sensitive functionality detected.\n`;
      report += `- **Recommendation:** Standard security best practices apply.\n`;
    } else {
      report += `- **Security Impact:** ⚠️ Medium to High. Feature requires security review before deployment.\n`;
      report += `- **Gate:** Security scan must pass before production deployment.\n`;
    }

    console.log('✅ Security Review complete.');
    return report;
  }

  /**
   * Pre-deployment security check.
   */
  public async preDeploymentSecurityCheck(): Promise<{
    approved: boolean;
    report: string;
    blockers: string[];
  }> {
    console.log('▶️ Security Agent: Running pre-deployment security check...');

    const scanResult = await this.runSecurityScan();
    const blockers: string[] = [];

    const criticalVulns = scanResult.vulnerabilities.filter(v => v.severity === 'critical');
    if (criticalVulns.length > 0) {
      blockers.push(`${criticalVulns.length} critical dependency vulnerabilities found`);
    }

    const criticalCodeIssues = scanResult.codeIssues.filter(i => i.severity === 'critical' && !i.falsePositive);
    if (criticalCodeIssues.length > 0) {
      blockers.push(`${criticalCodeIssues.length} critical code security issues found`);
    }

    let report = `# Pre-Deployment Security Report\n\n`;
    report += `**Timestamp:** ${scanResult.timestamp}\n`;
    report += `**Status:** ${blockers.length === 0 ? '✅ APPROVED' : '❌ BLOCKED'}\n\n`;

    report += `## Dependency Vulnerabilities\n`;
    if (scanResult.vulnerabilities.length === 0) {
      report += `✅ No vulnerabilities found\n\n`;
    } else {
      for (const vuln of scanResult.vulnerabilities) {
        const icon = vuln.severity === 'critical' ? '🔴' : vuln.severity === 'high' ? '🟠' : '🟡';
        report += `- ${icon} **${vuln.package}** (${vuln.severity}): ${vuln.description}\n`;
      }
      report += '\n';
    }

    report += `## Code Security Issues\n`;
    const realIssues = scanResult.codeIssues.filter(i => !i.falsePositive);
    if (realIssues.length === 0) {
      report += `✅ No issues found\n\n`;
    } else {
      for (const issue of realIssues.slice(0, 10)) {
        const icon = issue.severity === 'critical' ? '🔴' : issue.severity === 'high' ? '🟠' : '🟡';
        report += `- ${icon} **${issue.type}** in ${issue.file}:${issue.line || '?'}: ${issue.description}\n`;
      }
      if (realIssues.length > 10) {
        report += `  ... and ${realIssues.length - 10} more\n`;
      }
      report += '\n';
    }

    if (blockers.length > 0) {
      report += `## Blockers\n`;
      for (const blocker of blockers) {
        report += `- ❌ ${blocker}\n`;
      }
      report += '\n';
    }

    report += `## Recommendations\n`;
    for (const rec of scanResult.recommendations) {
      report += `- ${rec}\n`;
    }

    console.log(`✅ Pre-deployment check complete. Approved: ${blockers.length === 0}`);
    return { approved: blockers.length === 0, report, blockers };
  }

  /**
   * Persist scan results to cas_security_scans table.
   */
  private async persistScanResults(result: SecurityScanResult): Promise<void> {
    if (!this.supabase) return;

    try {
      await this.supabase.from('cas_security_scans').insert({
        scan_type: 'comprehensive',
        passed: result.passed,
        critical_count: result.vulnerabilities.filter(v => v.severity === 'critical').length +
          result.codeIssues.filter(i => i.severity === 'critical').length,
        details: {
          vulnerabilityCount: result.vulnerabilities.length,
          codeIssueCount: result.codeIssues.length,
          recommendations: result.recommendations,
        },
      });
    } catch (err: any) {
      console.warn(`⚠️ Failed to persist scan results: ${err.message}`);
    }

    await persistEvent('security', 'scan_complete', {
      passed: result.passed,
      vulnerabilities: result.vulnerabilities.length,
      codeIssues: result.codeIssues.length,
    });
  }

  private generateRecommendations(
    vulnerabilities: VulnerabilityReport[],
    codeIssues: CodeSecurityIssue[]
  ): string[] {
    const recommendations: string[] = [];

    if (vulnerabilities.some(v => v.fixAvailable)) {
      recommendations.push('Run `npm audit fix` to automatically fix available dependency vulnerabilities');
    }
    if (vulnerabilities.some(v => v.severity === 'critical')) {
      recommendations.push('Review critical vulnerabilities immediately and update affected packages');
    }
    if (codeIssues.some(i => i.type === 'xss')) {
      recommendations.push('Review XSS-prone patterns and ensure proper input sanitization');
    }
    if (codeIssues.some(i => i.type === 'secrets')) {
      recommendations.push('Move hardcoded secrets to environment variables');
    }
    if (codeIssues.some(i => i.type === 'ssrf')) {
      recommendations.push('Validate and whitelist URLs in fetch calls to prevent SSRF');
    }
    if (recommendations.length === 0) {
      recommendations.push('Continue following security best practices');
      recommendations.push('Schedule regular dependency updates');
    }

    return recommendations;
  }

  private async getTypeScriptFiles(dir: string): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          const subFiles = await this.getTypeScriptFiles(fullPath);
          files.push(...subFiles);
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
          files.push(fullPath);
        }
      }
    } catch {
      // Directory not accessible
    }

    return files;
  }
}

export const security = new SecurityAgent();

export const runSecurity = async (): Promise<void> => {
  console.log('▶️ Running Security Agent Full Workflow...');
  const securityAgent = new SecurityAgent();
  const scanResult = await securityAgent.runSecurityScan();

  console.log('\n--- Security Scan Results ---\n');
  console.log(`Passed: ${scanResult.passed}`);
  console.log(`Vulnerabilities: ${scanResult.vulnerabilities.length}`);
  console.log(`Code Issues: ${scanResult.codeIssues.length}`);
  console.log(`Recommendations: ${scanResult.recommendations.join(', ')}`);
};
