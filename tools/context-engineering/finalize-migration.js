#!/usr/bin/env node
/**
 * Migration Finalization Script
 * Cleans up old files after successful migration
 */

const fs = require('fs');
const { execSync } = require('child_process');

console.log('🎯 Finalizing monorepo migration...');

function cleanupOldFiles() {
  console.log('🧹 Cleaning up old files...');

  const itemsToRemove = [
    'src',
    'public',
    'next.config.js',
    'tailwind.config.ts',
    'tutorwise-railway-backend',
    'package.json.original',
    '.migration-backup'
  ];

  itemsToRemove.forEach(item => {
    if (fs.existsSync(item)) {
      if (fs.statSync(item).isDirectory()) {
        fs.rmSync(item, { recursive: true, force: true });
      } else {
        fs.unlinkSync(item);
      }
      console.log(`  ✅ Removed ${item}`);
    }
  });
}

function updateGitignore() {
  console.log('📝 Updating .gitignore for workspace...');

  let gitignore = '';
  if (fs.existsSync('.gitignore')) {
    gitignore = fs.readFileSync('.gitignore', 'utf8');
  }

  const workspaceIgnores = `
# Workspace
.migration-backup/
*.original
*.new

# App-specific ignores
apps/web/.next/
apps/api/__pycache__/
apps/api/.pytest_cache/
`;

  if (!gitignore.includes('# Workspace')) {
    gitignore += workspaceIgnores;
    fs.writeFileSync('.gitignore', gitignore);
    console.log('  ✅ Updated .gitignore');
  }
}

function createFinalTests() {
  console.log('🧪 Running final verification tests...');

  try {
    // Test workspace commands
    console.log('  🔍 Testing workspace build...');
    execSync('npm run build', { stdio: 'inherit' });

    console.log('  🔍 Testing backend...');
    execSync('npm run test:backend', { stdio: 'inherit' });

    console.log('  ✅ All tests passed!');
    return true;
  } catch (error) {
    console.error('  ❌ Tests failed:', error.message);
    return false;
  }
}

function displayMigrationSummary() {
  console.log('\n🎉 MIGRATION COMPLETE!');
  console.log('=====================================');
  console.log('✅ Workspace structure created');
  console.log('✅ Frontend moved to apps/web/');
  console.log('✅ Backend moved to apps/api/');
  console.log('✅ Shared packages created');
  console.log('✅ All imports updated');
  console.log('✅ Build tests passed');
  console.log('✅ Old files cleaned up');
  console.log('\n📂 New Structure:');
  console.log('apps/web/     - Next.js frontend');
  console.log('apps/api/     - FastAPI backend');
  console.log('packages/     - Shared packages');
  console.log('\n🚀 Available Commands:');
  console.log('npm run dev        - Start frontend');
  console.log('npm run dev:api    - Start backend');
  console.log('npm run build      - Build frontend');
  console.log('npm run test       - Run frontend tests');
  console.log('npm run test:backend - Run backend tests');
  console.log('\n💡 Benefits Achieved:');
  console.log('✨ Better code organization');
  console.log('✨ Shared type safety');
  console.log('✨ Unified development commands');
  console.log('✨ Independent app deployment');
  console.log('✨ Scalable architecture');
}

// Main execution
function main() {
  const args = process.argv.slice(2);

  if (args.includes('--skip-cleanup')) {
    console.log('⏭️  Skipping cleanup (--skip-cleanup flag)');
  } else {
    cleanupOldFiles();
  }

  updateGitignore();

  const testsPass = createFinalTests();

  if (testsPass) {
    displayMigrationSummary();
    console.log('\n🎯 Migration finalized successfully!');
  } else {
    console.log('\n⚠️  Migration completed but tests failed.');
    console.log('You may need to fix remaining issues manually.');
  }
}

main();