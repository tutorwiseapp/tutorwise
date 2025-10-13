#!/usr/bin/env node
/**
 * MADS Adaptation Automation Engine
 * Applies platform-specific transformation rules to extracted features
 * Usage: node mads-apply-adaptations.js <package-dir> <rules-file> <target-platform>
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

// Colors for terminal output
const colors = {
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m'
};

function log(color: keyof typeof colors, symbol: string, message: string): void {
  console.log(`${colors[color]}${symbol}${colors.reset} ${message}`);
}

interface AdaptationRule {
  type: string;
  description?: string;
  files: string | string[];
  pattern?: string;
  replacement?: string;
  from?: string;
  to?: string;
  mappings?: { [key: string]: string | null };
  exclude?: string | string[];
  import_statement?: string;
  start_marker?: string;
  end_marker?: string;
  flags?: string;
}

interface AdaptationRules {
  rules: AdaptationRule[];
}

import { getPostgresClient, getNeo4jDriver } from './db-connector';

/**
 * Discovers the architecture of the application and stores it in the databases.
 */
export async function discoverAndStoreArchitecture(projectRoot: string): Promise<void> {
  log('blue', '🔎', 'Starting architecture discovery...');

  const files = await glob('**/*.{ts,tsx,js,jsx}', {
    cwd: projectRoot,
    ignore: ['**/node_modules/**', '**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', '**/tests/**'],
    absolute: true,
  });

  log('green', '✓', `Found ${files.length} relevant source files.`);

  const pgClient = getPostgresClient();
  const neo4jDriver = getNeo4jDriver();
  const session = neo4jDriver.session();

  try {
    // In a real implementation, we would do more sophisticated analysis here.
    // For now, we will just log the files and simulate the DB operations.

    for (const file of files) {
      const relativePath = path.relative(projectRoot, file);
      console.log(`  -> Storing: ${relativePath}`);

      // Simulate storing in Postgres
      // await pgClient.query('INSERT INTO files (path) VALUES ($1) ON CONFLICT (path) DO NOTHING', [relativePath]);

      // Simulate storing in Neo4j
      // await session.run('MERGE (f:File {path: $path})', { path: relativePath });
    }

    log('green', '✅', 'Successfully stored architecture in Supabase and Neo4j (simulation).');

  } catch (error: any) {
    log('red', '✗', `Error during architecture discovery: ${error.message}`);
  } finally {
    await pgClient.end();
    await session.close();
    await neo4jDriver.close();
  }
}

/**
 * Main adaptation function
 */
async function applyAdaptations(packageDir: string, rulesFile: string, targetPlatform: string): Promise<number> {
  log('blue', '🤖', `Loading adaptation rules: ${path.basename(rulesFile)}`);

  const rules: AdaptationRules = JSON.parse(fs.readFileSync(rulesFile, 'utf8'));

  log('green', '✓', `Found ${rules.rules.length} adaptation rules`);
  console.log('');

  let totalChanges = 0;

  for (let i = 0; i < rules.rules.length; i++) {
    const rule = rules.rules[i];
    log('blue', `[${i + 1}/${rules.rules.length}]`, `${rule.type}: ${rule.description || 'Applying transformation'}`);

    try {
      const changes = await applyRule(packageDir, rule, targetPlatform);
      totalChanges += changes;

      if (changes > 0) {
        log('green', '  ✓', `${changes} change(s) applied`);
      } else {
        log('yellow', '  ⚬', 'No changes needed');
      }
    } catch (error: any) {
      log('red', '  ✗', `Error: ${error.message}`);
    }
  }

  console.log('');
  log('green', '✅', `Total changes applied: ${totalChanges}`);

  return totalChanges;
}

/**
 * Apply a single adaptation rule
 */
async function applyRule(packageDir: string, rule: AdaptationRule, targetPlatform: string): Promise<number> {
  switch (rule.type) {
    case 'string_replace':
      return await applyStringReplace(packageDir, rule);

    case 'import_rewrite':
      return await applyImportRewrite(packageDir, rule);

    case 'type_mapping':
      return await applyTypeMapping(packageDir, rule);

    case 'file_exclusion':
      return await applyFileExclusion(packageDir, rule);

    case 'regex_replace':
      return await applyRegexReplace(packageDir, rule);

    case 'add_import':
      return await applyAddImport(packageDir, rule);

    case 'remove_code_block':
      return await applyRemoveCodeBlock(packageDir, rule);

    default:
      log('yellow', '  ⚠️', `Unknown rule type: ${rule.type}`);
      return 0;
  }
}

/**
 * Rule: String replacement
 */
async function applyStringReplace(packageDir: string, rule: AdaptationRule): Promise<number> {
  const filePatterns = Array.isArray(rule.files) ? rule.files : [rule.files];
  let changeCount = 0;

  for (const pattern of filePatterns) {
    const files = await glob(path.join(packageDir, '**', pattern), {
      ignore: ['**/node_modules/**', '**/.git/**', '**/mads-*.json']
    });

    for (const file of files) {
      let content = fs.readFileSync(file, 'utf8');
      const originalContent = content;

      content = content.replace(
        new RegExp(escapeRegExp(rule.pattern!), 'g'),
        rule.replacement!
      );

      if (content !== originalContent) {
        fs.writeFileSync(file, content, 'utf8');
        changeCount++;
      }
    }
  }

  return changeCount;
}

/**
 * Rule: Regex replacement
 */
async function applyRegexReplace(packageDir: string, rule: AdaptationRule): Promise<number> {
  const filePatterns = Array.isArray(rule.files) ? rule.files : [rule.files];
  let changeCount = 0;

  for (const pattern of filePatterns) {
    const files = await glob(path.join(packageDir, '**', pattern), {
      ignore: ['**/node_modules/**', '**/.git/**', '**/mads-*.json']
    });

    for (const file of files) {
      let content = fs.readFileSync(file, 'utf8');
      const originalContent = content;

      const flags = rule.flags || 'g';
      content = content.replace(new RegExp(rule.pattern!, flags), rule.replacement!);

      if (content !== originalContent) {
        fs.writeFileSync(file, content, 'utf8');
        changeCount++;
      }
    }
  }

  return changeCount;
}

/**
 * Rule: Import path rewriting
 */
async function applyImportRewrite(packageDir: string, rule: AdaptationRule): Promise<number> {
  const files = await glob(path.join(packageDir, '**', '*.{ts,tsx,js,jsx}'), {
    ignore: ['**/node_modules/**', '**/.git/**', '**/mads-*.json']
  });

  let changeCount = 0;

  for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    const originalContent = content;

    // Match import statements
    const importRegex = new RegExp(
      `(import.*from\\s+['"\`])${escapeRegExp(rule.from!)}(['"\`])`,
      'g'
    );

    content = content.replace(importRegex, `$1${rule.to}$2`);

    if (content !== originalContent) {
      fs.writeFileSync(file, content, 'utf8');
      changeCount++;
    }
  }

  return changeCount;
}

/**
 * Rule: Type/interface name mapping
 */
async function applyTypeMapping(packageDir: string, rule: AdaptationRule): Promise<number> {
  const files = await glob(path.join(packageDir, '**', '*.{ts,tsx}'), {
    ignore: ['**/node_modules/**', '**/.git/**', '**/mads-*.json']
  });

  let changeCount = 0;

  for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    const originalContent = content;

    Object.entries(rule.mappings!).forEach(([from, to]) => {
      if (to === null) {
        // Remove import statements for this type
        const importRegex = new RegExp(`import.*\\b${from}\\b.*from.*;\\n?`, 'g');
        content = content.replace(importRegex, '');
      } else {
        // Replace type name (word boundaries to avoid partial matches)
        content = content.replace(new RegExp(`\\b${from}\\b`, 'g'), to);
      }
    });

    if (content !== originalContent) {
      fs.writeFileSync(file, content, 'utf8');
      changeCount++;
    }
  }

  return changeCount;
}

/**
 * Rule: File/directory exclusion
 */
async function applyFileExclusion(packageDir: string, rule: AdaptationRule): Promise<number> {
  const excludePatterns = Array.isArray(rule.exclude) ? rule.exclude : [rule.exclude!];
  let deleteCount = 0;

  for (const pattern of excludePatterns) {
    const files = await glob(path.join(packageDir, pattern), {
      ignore: ['**/mads-*.json', '**/README.md', '**/ADAPTATION-NOTES.md']
    });

    for (const file of files) {
      const stats = fs.statSync(file);

      if (stats.isDirectory()) {
        fs.rmSync(file, { recursive: true, force: true });
      } else {
        fs.unlinkSync(file);
      }

      deleteCount++;
    }
  }

  return deleteCount;
}

/**
 * Rule: Add import statement
 */
async function applyAddImport(packageDir: string, rule: AdaptationRule): Promise<number> {
  const filePatterns = Array.isArray(rule.files) ? rule.files : [rule.files];
  let changeCount = 0;

  for (const pattern of filePatterns) {
    const files = await glob(path.join(packageDir, '**', pattern), {
      ignore: ['**/node_modules/**', '**/.git/**', '**/mads-*.json']
    });

    for (const file of files) {
      let content = fs.readFileSync(file, 'utf8');
      const originalContent = content;

      // Check if import already exists
      const importExists = content.includes(rule.import_statement!);

      if (!importExists) {
        // Add after existing imports or at the top
        const lastImportIndex = content.lastIndexOf('\nimport ');

        if (lastImportIndex !== -1) {
          const insertPosition = content.indexOf('\n', lastImportIndex + 1);
          content = content.slice(0, insertPosition + 1) +
                   rule.import_statement + '\n' +
                   content.slice(insertPosition + 1);
        } else {
          // No imports found, add at top
          content = rule.import_statement + '\n\n' + content;
        }
      }

      if (content !== originalContent) {
        fs.writeFileSync(file, content, 'utf8');
        changeCount++;
      }
    }
  }

  return changeCount;
}

/**
 * Rule: Remove code blocks matching a pattern
 */
async function applyRemoveCodeBlock(packageDir: string, rule: AdaptationRule): Promise<number> {
  const filePatterns = Array.isArray(rule.files) ? rule.files : [rule.files];
  let changeCount = 0;

  for (const pattern of filePatterns) {
    const files = await glob(path.join(packageDir, '**', pattern), {
      ignore: ['**/node_modules/**', '**/.git/**', '**/mads-*.json']
    });

    for (const file of files) {
      let content = fs.readFileSync(file, 'utf8');
      const originalContent = content;

      // Remove code blocks between start and end markers
      const regex = new RegExp(
        `${escapeRegExp(rule.start_marker!)}[\\s\\S]*?${escapeRegExp(rule.end_marker!)}`,
        'g'
      );

      content = content.replace(regex, '');

      if (content !== originalContent) {
        fs.writeFileSync(file, content, 'utf8');
        changeCount++;
      }
    }
  }

  return changeCount;
}

/**
 * Utility: Escape special regex characters
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// CLI execution
if (require.main === module) {
  const [packageDir, rulesFile, targetPlatform] = process.argv.slice(2);

  if (!packageDir || !rulesFile) {
    console.error('Usage: node mads-apply-adaptations.js <package-dir> <rules-file> <target-platform>');
    process.exit(1);
  }

  applyAdaptations(packageDir, rulesFile, targetPlatform || 'unknown')
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      log('red', '❌', `Fatal error: ${error.message}`);
      console.error(error.stack);
      process.exit(1);
    });
}

export { applyAdaptations };
