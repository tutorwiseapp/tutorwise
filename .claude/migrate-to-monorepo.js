#!/usr/bin/env node
/**
 * Automated Monorepo Migration Script
 * Converts Tutorwise to workspace structure with high success rate
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const ROOT_DIR = process.cwd();
const BACKUP_DIR = path.join(ROOT_DIR, '.migration-backup');

console.log('🚀 Starting Tutorwise Monorepo Migration...');

// Phase 1: Safety & Backup
function createBackup() {
  console.log('📦 Creating safety backup...');
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR);
  }

  // Backup critical files
  const criticalFiles = [
    'package.json',
    'tsconfig.json',
    'next.config.js',
    'tailwind.config.ts'
  ];

  criticalFiles.forEach(file => {
    if (fs.existsSync(file)) {
      fs.copyFileSync(file, path.join(BACKUP_DIR, file));
      console.log(`  ✅ Backed up ${file}`);
    }
  });
}

// Phase 2: Create Workspace Structure
function createWorkspaceStructure() {
  console.log('🏗️  Creating workspace structure...');

  const dirs = [
    'apps',
    'apps/web',
    'apps/api',
    'packages',
    'packages/shared-types',
    'packages/ui'
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`  ✅ Created ${dir}/`);
    }
  });
}

// Phase 3: Create Workspace Package.json
function createWorkspacePackageJson() {
  console.log('📄 Creating workspace package.json...');

  const workspaceConfig = {
    "name": "tutorwise-workspace",
    "version": "1.0.0",
    "private": true,
    "workspaces": [
      "apps/*",
      "packages/*"
    ],
    "scripts": {
      "dev": "npm run dev --workspace=web",
      "dev:web": "npm run dev --workspace=web",
      "dev:api": "cd apps/api && python3 -m uvicorn app.main:app --reload",
      "build": "npm run build --workspace=web",
      "test": "npm run test --workspace=web",
      "test:backend": "cd apps/api && python3 -m pytest tests/ -v",
      "lint": "npm run lint --workspace=web",
      "lint:backend": "cd apps/api && python3 -m ruff check app/"
    },
    "devDependencies": {},
    "dependencies": {}
  };

  fs.writeFileSync('package.json.new', JSON.stringify(workspaceConfig, null, 2));
  console.log('  ✅ Created workspace package.json.new');
}

// Phase 4: Create Web App Package.json
function createWebAppPackageJson() {
  console.log('📱 Creating web app package.json...');

  // Read current package.json
  const currentPkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

  const webPkg = {
    ...currentPkg,
    "name": "@tutorwise/web",
    "private": true
  };

  // Remove workspace-level scripts
  delete webPkg.scripts["test:backend"];
  delete webPkg.scripts["lint:backend"];

  fs.writeFileSync('apps/web/package.json', JSON.stringify(webPkg, null, 2));
  console.log('  ✅ Created apps/web/package.json');
}

// Phase 5: Update TypeScript Config for Workspace
function createWebTsConfig() {
  console.log('🔧 Creating web app tsconfig.json...');

  // Use clean JSON without comments
  let tsConfigContent;
  if (fs.existsSync('tsconfig.clean.json')) {
    tsConfigContent = fs.readFileSync('tsconfig.clean.json', 'utf8');
  } else {
    // Strip comments manually
    tsConfigContent = fs.readFileSync('tsconfig.json', 'utf8')
      .replace(/\/\/.*$/gm, '')
      .replace(/,(\s*[}\]])/g, '$1');
  }

  const currentTsConfig = JSON.parse(tsConfigContent);

  // Update paths for workspace structure
  currentTsConfig.compilerOptions.paths = {
    "@/*": ["./src/*"],
    "@tutorwise/shared-types": ["../../packages/shared-types/src"],
    "@tutorwise/ui": ["../../packages/ui/src"]
  };

  fs.writeFileSync('apps/web/tsconfig.json', JSON.stringify(currentTsConfig, null, 2));
  console.log('  ✅ Created apps/web/tsconfig.json');
}

// Phase 6: Copy Next.js Config
function copyNextConfig() {
  console.log('⚙️  Copying Next.js config...');

  if (fs.existsSync('next.config.js')) {
    fs.copyFileSync('next.config.js', 'apps/web/next.config.js');
    console.log('  ✅ Copied next.config.js');
  }

  if (fs.existsSync('tailwind.config.ts')) {
    fs.copyFileSync('tailwind.config.ts', 'apps/web/tailwind.config.ts');
    console.log('  ✅ Copied tailwind.config.ts');
  }
}

// Phase 7: Create Shared Packages
function createSharedPackages() {
  console.log('📦 Creating shared packages...');

  // Shared Types Package
  const sharedTypesPkg = {
    "name": "@tutorwise/shared-types",
    "version": "1.0.0",
    "private": true,
    "main": "src/index.ts",
    "types": "src/index.ts",
    "dependencies": {},
    "devDependencies": {
      "typescript": "^5"
    }
  };

  fs.writeFileSync('packages/shared-types/package.json', JSON.stringify(sharedTypesPkg, null, 2));

  // Create basic shared types
  if (!fs.existsSync('packages/shared-types/src')) {
    fs.mkdirSync('packages/shared-types/src', { recursive: true });
  }

  const basicTypes = `// Shared types across Tutorwise applications
export interface User {
  id: string;
  email: string;
  display_name?: string;
}

export interface ApiResponse<T> {
  data: T;
  error?: string;
}

export type UserRole = 'agent' | 'provider' | 'seeker';
`;

  fs.writeFileSync('packages/shared-types/src/index.ts', basicTypes);
  console.log('  ✅ Created shared types package');
}

// Phase 8: Move Backend
function moveBackend() {
  console.log('🐍 Moving backend to apps/api...');

  if (fs.existsSync('tutorwise-railway-backend') && !fs.existsSync('apps/api/app')) {
    // Copy backend files
    execSync('cp -r tutorwise-railway-backend/* apps/api/', { stdio: 'inherit' });
    console.log('  ✅ Copied backend to apps/api');
  }
}

// Rollback Function
function rollback() {
  console.log('🔄 Rolling back changes...');

  // Restore from backup
  if (fs.existsSync(BACKUP_DIR)) {
    const backupFiles = fs.readdirSync(BACKUP_DIR);
    backupFiles.forEach(file => {
      fs.copyFileSync(path.join(BACKUP_DIR, file), file);
      console.log(`  ✅ Restored ${file}`);
    });
  }

  // Remove created directories
  const dirsToRemove = ['apps', 'packages'];
  dirsToRemove.forEach(dir => {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
      console.log(`  ✅ Removed ${dir}/`);
    }
  });

  console.log('🎯 Rollback complete!');
}

// Main Migration Function
function migrate() {
  try {
    createBackup();
    createWorkspaceStructure();
    createWorkspacePackageJson();
    createWebAppPackageJson();
    createWebTsConfig();
    copyNextConfig();
    createSharedPackages();
    moveBackend();

    console.log('✨ Migration structure created successfully!');
    console.log('📋 Next steps:');
    console.log('  1. Review generated files');
    console.log('  2. Run: node .claude/copy-files.js');
    console.log('  3. Run: node .claude/update-imports.js');
    console.log('  4. Test build: npm run build --workspace=web');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('🔄 Run: node .claude/migrate-to-monorepo.js --rollback');
  }
}

// CLI Handler
const args = process.argv.slice(2);
if (args.includes('--rollback')) {
  rollback();
} else {
  migrate();
}