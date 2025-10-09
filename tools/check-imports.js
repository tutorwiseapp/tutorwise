#!/usr/bin/env node
/**
 * Component Import Checker
 * 
 * Scans TypeScript/TSX files for imports and verifies they exist.
 * Run before committing: node tools/check-imports.js
 * 
 * Usage:
 *   node tools/check-imports.js                    # Check all files
 *   node tools/check-imports.js apps/web/src/      # Check specific directory
 *   node tools/check-imports.js --fix              # Auto-create missing components (TODO)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const PROJECT_ROOT = path.join(__dirname, '..');
const SRC_DIR = path.join(PROJECT_ROOT, 'apps/web/src');
const IGNORE_PATTERNS = [
  'node_modules',
  '.next',
  'dist',
  'build',
  '.git',
  'coverage'
];

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m'
};

// Statistics
let stats = {
  filesScanned: 0,
  importsChecked: 0,
  missingImports: [],
  externalPackages: new Set(),
  errors: []
};

/**
 * Get all TypeScript files recursively
 */
function getAllTsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip ignored directories
      if (!IGNORE_PATTERNS.some(pattern => file.includes(pattern))) {
        getAllTsFiles(filePath, fileList);
      }
    } else if (file.match(/\.(ts|tsx)$/)) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

/**
 * Extract imports from file content
 */
function extractImports(content) {
  const imports = [];
  
  // Match: import ... from '...'  or  import ... from "..."
  const importRegex = /import\s+(?:{[^}]*}|\w+|\*\s+as\s+\w+)\s+from\s+['"]([^'"]+)['"]/g;
  
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    imports.push({
      statement: match[0],
      path: match[1]
    });
  }
  
  return imports;
}

/**
 * Resolve import path to actual file path
 */
function resolveImportPath(importPath, fromFile) {
  // External package (doesn't start with . or @/)
  if (!importPath.startsWith('.') && !importPath.startsWith('@/')) {
    return { type: 'external', package: importPath.split('/')[0] };
  }
  
  // Absolute path with @/ alias
  if (importPath.startsWith('@/')) {
    const relativePath = importPath.replace('@/', '');
    const basePath = path.join(SRC_DIR, relativePath);
    return { type: 'local', path: basePath };
  }
  
  // Relative path
  const fromDir = path.dirname(fromFile);
  const resolvedPath = path.resolve(fromDir, importPath);
  return { type: 'local', path: resolvedPath };
}

/**
 * Check if a local import file exists
 */
function checkLocalImport(basePath) {
  const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx'];
  
  for (const ext of extensions) {
    const fullPath = basePath + ext;
    if (fs.existsSync(fullPath)) {
      return { exists: true, path: fullPath };
    }
  }
  
  return { exists: false, path: null };
}

/**
 * Check if external package is installed
 */
function checkExternalPackage(packageName) {
  const packageJsonPath = path.join(PROJECT_ROOT, 'apps/web/package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    return { installed: false, reason: 'package.json not found' };
  }
  
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  };
  
  if (allDeps[packageName]) {
    return { installed: true, version: allDeps[packageName] };
  }
  
  return { installed: false, reason: 'not in package.json' };
}

/**
 * Process a single file
 */
function processFile(filePath) {
  stats.filesScanned++;
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const imports = extractImports(content);
  const relativePath = path.relative(PROJECT_ROOT, filePath);
  
  imports.forEach(({ statement, path: importPath }) => {
    stats.importsChecked++;
    
    const resolved = resolveImportPath(importPath, filePath);
    
    if (resolved.type === 'external') {
      stats.externalPackages.add(resolved.package);
      
      const check = checkExternalPackage(resolved.package);
      if (!check.installed) {
        stats.missingImports.push({
          file: relativePath,
          import: statement,
          type: 'external',
          package: resolved.package,
          reason: check.reason
        });
      }
    } else if (resolved.type === 'local') {
      const check = checkLocalImport(resolved.path);
      
      if (!check.exists) {
        stats.missingImports.push({
          file: relativePath,
          import: statement,
          type: 'local',
          path: importPath,
          resolvedPath: resolved.path
        });
      }
    }
  });
}

/**
 * Print summary report
 */
function printReport() {
  console.log('\n' + '='.repeat(60));
  console.log('Component Import Check Report');
  console.log('='.repeat(60) + '\n');
  
  console.log(`${colors.blue}Files scanned:${colors.reset} ${stats.filesScanned}`);
  console.log(`${colors.blue}Imports checked:${colors.reset} ${stats.importsChecked}`);
  console.log(`${colors.blue}External packages found:${colors.reset} ${stats.externalPackages.size}\n`);
  
  if (stats.missingImports.length === 0) {
    console.log(`${colors.green}✅ All imports resolved successfully!${colors.reset}\n`);
    return true;
  }
  
  console.log(`${colors.red}❌ Found ${stats.missingImports.length} missing imports:${colors.reset}\n`);
  
  // Group by type
  const localMissing = stats.missingImports.filter(m => m.type === 'local');
  const externalMissing = stats.missingImports.filter(m => m.type === 'external');
  
  if (localMissing.length > 0) {
    console.log(`${colors.yellow}Missing Local Files (${localMissing.length}):${colors.reset}`);
    localMissing.forEach(missing => {
      console.log(`  ${colors.red}✗${colors.reset} ${missing.file}`);
      console.log(`    ${colors.gray}${missing.import}${colors.reset}`);
      console.log(`    Expected: ${missing.path}\n`);
    });
  }
  
  if (externalMissing.length > 0) {
    console.log(`${colors.yellow}Missing External Packages (${externalMissing.length}):${colors.reset}`);
    
    const packageGroups = {};
    externalMissing.forEach(missing => {
      if (!packageGroups[missing.package]) {
        packageGroups[missing.package] = [];
      }
      packageGroups[missing.package].push(missing);
    });
    
    Object.entries(packageGroups).forEach(([pkg, instances]) => {
      console.log(`  ${colors.red}✗${colors.reset} ${pkg} (${instances.length} usage${instances.length > 1 ? 's' : ''})`);
      console.log(`    ${colors.gray}Install with: npm install ${pkg}${colors.reset}`);
      instances.slice(0, 2).forEach(inst => {
        console.log(`    Used in: ${inst.file}`);
      });
      if (instances.length > 2) {
        console.log(`    ... and ${instances.length - 2} more files`);
      }
      console.log('');
    });
  }
  
  console.log(`${colors.yellow}Suggested Actions:${colors.reset}`);
  if (localMissing.length > 0) {
    console.log(`  1. Create missing components or fix import paths`);
  }
  if (externalMissing.length > 0) {
    console.log(`  2. Install missing packages:`);
    const uniquePackages = [...new Set(externalMissing.map(m => m.package))];
    console.log(`     npm install ${uniquePackages.join(' ')}\n`);
  }
  
  return false;
}

/**
 * Main function
 */
function main() {
  console.log('🔍 Scanning for import issues...\n');
  
  const targetDir = process.argv[2] || SRC_DIR;
  
  if (!fs.existsSync(targetDir)) {
    console.error(`${colors.red}Error: Directory not found: ${targetDir}${colors.reset}`);
    process.exit(1);
  }
  
  try {
    const files = getAllTsFiles(targetDir);
    
    files.forEach(file => {
      try {
        processFile(file);
      } catch (error) {
        stats.errors.push({ file, error: error.message });
      }
    });
    
    const success = printReport();
    
    if (stats.errors.length > 0) {
      console.log(`${colors.yellow}⚠️  Errors processing ${stats.errors.length} files${colors.reset}`);
    }
    
    process.exit(success ? 0 : 1);
    
  } catch (error) {
    console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { checkLocalImport, checkExternalPackage, extractImports };
