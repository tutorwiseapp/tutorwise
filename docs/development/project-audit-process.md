# TutorWise Project Audit Process

## Overview

The TutorWise project audit system provides automated baseline comparison and comprehensive project health monitoring. The system automatically checks previous audit files before running new audits to ensure continuity and trend tracking.

## Audit Scripts and Configuration

### Core Components

```
tools/
├── scripts/project-audit.sh        # Main audit script
└── configs/audit-config.json       # Audit configuration

docs/project-audit/
├── project-audit-2024-09-28.md     # Baseline audit
├── project-audit-2024-09-30.md     # Security-focused audit
└── [future-audit-files]
```

## Automated Baseline Checking

### How It Works

1. **Previous Audit Detection**: Script automatically finds the most recent audit file
2. **Metrics Extraction**: Extracts health score, critical issues, and other metrics
3. **Baseline Comparison**: Compares current audit with previous baseline
4. **Trend Analysis**: Identifies improvements, regressions, and changes
5. **Configuration Update**: Updates audit config with latest metrics

### Key Features

✅ **Automatic Previous Audit Discovery**
✅ **Health Score Trend Tracking**
✅ **Critical Issue Regression Detection**
✅ **Structured Comparison Output**
✅ **Configuration-Driven Thresholds**

## Usage

### NPM Scripts (Recommended)

```bash
# Run ad-hoc project audit
npm run audit:project

# Run daily audit (with baseline comparison)
npm run audit:daily

# Run weekly comprehensive audit
npm run audit:weekly

# Validate current audit structure
npm run audit:validate

# Compare current audit with previous
npm run audit:compare
```

### Direct Script Usage

```bash
# Ad-hoc audit
./tools/scripts/project-audit.sh adhoc

# Daily audit with comparison
./tools/scripts/project-audit.sh daily

# Weekly comprehensive audit
./tools/scripts/project-audit.sh weekly

# Validate audit structure
./tools/scripts/project-audit.sh validate

# Compare audits
./tools/scripts/project-audit.sh compare
```

## Script Output Example

```
[INFO] Starting TutorWise project audit (daily)
[INFO] Date: 2024-09-30
[INFO] Previous audit found: project-audit-2024-09-28.md
[INFO] Previous audit date: 2024-09-28

[INFO] === Previous Audit Summary ===
[INFO] Extracting metrics from: project-audit-2024-09-28.md
HEALTH_SCORE=8.5
AUDIT_DATE=September 28, 2024
CRITICAL_ISSUES=0
HIGH_ISSUES=0

[INFO] Comparing with previous audit: project-audit-2024-09-28.md
[WARNING] Health score decreased: 8.5 → 7.2 (-1.3)

[SUCCESS] === Audit Completed ===
[INFO] Audit file: docs/project-audit/project-audit-2024-09-30.md
[INFO] Previous baseline: docs/project-audit/project-audit-2024-09-28.md
[INFO] Next scheduled audit: 2024-10-07
```

## Audit Configuration

### Configuration File: `tools/configs/audit-config.json`

```json
{
  "auditSettings": {
    "frequency": "weekly",
    "autoComparison": true,
    "baselineTracking": true,
    "structureValidation": true,
    "metricsTracking": [
      "healthScore",
      "criticalIssues",
      "highPriorityIssues",
      "securityIncidents",
      "deploymentStatus"
    ]
  },
  "alertThresholds": {
    "healthScoreDecrease": 1.0,
    "criticalIssuesIncrease": 1,
    "highIssuesIncrease": 3,
    "deploymentFailures": 2
  }
}
```

## Automatic Baseline Comparison

### What Gets Compared

1. **Health Score Changes**: Tracks improvements/regressions
2. **Critical Issues Count**: Alerts on new critical issues
3. **High Priority Issues**: Monitors issue trend
4. **Security Incidents**: Tracks security event count
5. **Deployment Status**: Monitors deployment health

### Comparison Output Format

The script automatically adds a comparison section to audit files:

```markdown
## Baseline Comparison with Previous Audit

### Previous Audit: project-audit-2024-09-28.md
- **Health Score**: 8.5/10
- **Critical Issues**: 0
- **High Priority Issues**: 0

### Current Audit: project-audit-2024-09-30.md
- **Health Score**: 7.2/10
- **Critical Issues**: 2
- **High Priority Issues**: 3

### Change Analysis:
- **Health Score Change**: -1.3
- **Critical Issues Change**: +2
- **High Issues Change**: +3
```

## Audit Schedule and Triggers

### Automatic Triggers

1. **Weekly Scheduled**: Every Monday morning
2. **Security Incidents**: Immediate audit after security events
3. **Major Deployments**: Post-deployment validation
4. **Architecture Changes**: After significant changes

### Manual Triggers

1. **Ad-hoc Analysis**: When investigating issues
2. **Pre-release Reviews**: Before major releases
3. **Quarterly Reviews**: Comprehensive project assessment

## Best Practices

### Before Running Audit

1. ✅ **Ensure previous audit exists** for baseline comparison
2. ✅ **Review last audit findings** to understand context
3. ✅ **Check audit configuration** for current thresholds
4. ✅ **Verify script permissions** (`chmod +x` if needed)

### After Running Audit

1. ✅ **Review comparison results** for trends
2. ✅ **Address critical issues** immediately
3. ✅ **Update audit schedule** if needed
4. ✅ **Share findings** with team if significant changes

### Audit Quality Guidelines

1. **Required Sections**: All audits must include standard sections
2. **Metrics Consistency**: Use consistent health scoring
3. **Issue Classification**: Properly categorize issues (Critical/High/Medium)
4. **Baseline References**: Always reference previous audit
5. **Action Items**: Include clear next steps

## Troubleshooting

### Common Issues

#### No Previous Audit Found
```bash
[WARNING] No previous audit found - this will be the baseline audit
```
**Solution**: This is normal for first audit - it becomes the baseline.

#### Audit File Missing
```bash
[ERROR] Current audit file not found: docs/project-audit/project-audit-YYYY-MM-DD.md
```
**Solution**: Create the audit file first, then run the script.

#### Permission Denied
```bash
bash: ./tools/scripts/project-audit.sh: Permission denied
```
**Solution**: Make script executable: `chmod +x tools/scripts/project-audit.sh`

#### Invalid Metrics Extraction
```bash
HEALTH_SCORE=
AUDIT_DATE=
```
**Solution**: Ensure audit file follows standard format with required sections.

## Integration with CI/CD

### GitHub Actions Integration

```yaml
# .github/workflows/weekly-audit.yml
name: Weekly Project Audit
on:
  schedule:
    - cron: '0 9 * * 1'  # Every Monday at 9 AM
  workflow_dispatch:

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Project Audit
        run: npm run audit:weekly
```

### Pre-commit Hook Integration

```bash
# .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Run audit validation before major commits
if git diff --cached --name-only | grep -q "docs/project-audit/"; then
  npm run audit:validate
fi
```

## Future Enhancements

### Planned Features

1. **Automated Report Generation**: AI-generated audit reports
2. **Dashboard Integration**: Web-based audit dashboard
3. **Slack Notifications**: Automatic team notifications
4. **Trend Visualization**: Graphical health score trends
5. **Custom Metrics**: Project-specific tracking metrics

### Configuration Expansion

1. **Team-specific Thresholds**: Different thresholds per team
2. **Environment-specific Audits**: Separate dev/staging/prod audits
3. **Integration Hooks**: Custom webhook integrations
4. **Automated Remediation**: Auto-fix for common issues

---

**Last Updated**: September 30, 2024
**Next Review**: October 7, 2024
**Audit Frequency**: Weekly