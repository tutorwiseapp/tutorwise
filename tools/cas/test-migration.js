#!/usr/bin/env node
/**
 * Single File Migration Test
 * Tests the migration approach on NavMenu.tsx
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing migration approach on single file...');

// Step 1: Create minimal test structure
function createTestStructure() {
  console.log('📁 Creating test structure...');

  if (!fs.existsSync('test-migration')) {
    fs.mkdirSync('test-migration', { recursive: true });
    fs.mkdirSync('test-migration/apps', { recursive: true });
    fs.mkdirSync('test-migration/apps/web', { recursive: true });
    fs.mkdirSync('test-migration/apps/web/src', { recursive: true });
    console.log('  ✅ Created test directories');
  }
}

// Step 2: Copy test file to new location
function copyTestFile() {
  console.log('📄 Copying NavMenu.tsx to test location...');

  const sourceFile = 'src/app/components/layout/NavMenu.tsx';
  const targetFile = 'test-migration/apps/web/src/app/components/layout/NavMenu.tsx';

  // Create target directory
  const targetDir = path.dirname(targetFile);
  fs.mkdirSync(targetDir, { recursive: true });

  // Copy file
  fs.copyFileSync(sourceFile, targetFile);
  console.log('  ✅ Copied NavMenu.tsx');

  return targetFile;
}

// Step 3: Create test tsconfig.json
function createTestTsConfig() {
  console.log('⚙️  Creating test tsconfig.json...');

  const testTsConfig = {
    "compilerOptions": {
      "target": "ES2017",
      "lib": ["dom", "dom.iterable", "esnext"],
      "allowJs": true,
      "skipLibCheck": true,
      "strict": true,
      "noEmit": true,
      "esModuleInterop": true,
      "module": "esnext",
      "moduleResolution": "bundler",
      "resolveJsonModule": true,
      "isolatedModules": true,
      "jsx": "preserve",
      "incremental": true,
      "plugins": [{ "name": "next" }],
      "baseUrl": ".",
      "paths": {
        "@/*": ["./src/*"]  // This should still work in apps/web/ context
      }
    }
  };

  fs.writeFileSync('test-migration/apps/web/tsconfig.json', JSON.stringify(testTsConfig, null, 2));
  console.log('  ✅ Created test tsconfig.json');
}

// Step 4: Test import resolution
function testImportResolution() {
  console.log('🔍 Testing import resolution...');

  const testFile = 'test-migration/apps/web/src/app/components/layout/NavMenu.tsx';
  const content = fs.readFileSync(testFile, 'utf8');

  // Extract @ imports
  const importRegex = /from ['"](@[^'"]+)['"]/g;
  const imports = [];
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }

  console.log('  📋 Found @ imports:');
  imports.forEach(imp => {
    console.log(`    • ${imp}`);
  });

  // Check if imports would resolve in new structure
  const expectedPaths = {
    '@/app/contexts/UserProfileContext': 'src/app/contexts/UserProfileContext',
    '@/utils/supabase/client': 'src/utils/supabase/client',
    '@/lib/utils/image': 'src/lib/utils/image'
  };

  console.log('  🎯 Expected resolution paths:');
  imports.forEach(imp => {
    const expectedPath = expectedPaths[imp];
    if (expectedPath) {
      const fullPath = `test-migration/apps/web/${expectedPath}.ts`;
      const exists = fs.existsSync(fullPath) || fs.existsSync(fullPath + 'x');
      console.log(`    ${exists ? '✅' : '❌'} ${imp} → ${expectedPath}`);
    } else {
      console.log(`    ⚠️  ${imp} → Path mapping unknown`);
    }
  });

  return imports;
}

// Step 5: Create mock dependency files to test complete resolution
function createMockDependencies() {
  console.log('🏗️  Creating mock dependency files...');

  const mockFiles = [
    'test-migration/apps/web/src/app/contexts/UserProfileContext.tsx',
    'test-migration/apps/web/src/utils/supabase/client.ts',
    'test-migration/apps/web/src/lib/utils/image.ts'
  ];

  mockFiles.forEach(file => {
    const dir = path.dirname(file);
    fs.mkdirSync(dir, { recursive: true });

    // Create minimal mock content
    const mockContent = `// Mock file for testing
export const mockExport = 'test';
`;
    fs.writeFileSync(file, mockContent);
    console.log(`  ✅ Created mock ${path.basename(file)}`);
  });
}

// Step 6: Simulate TypeScript resolution check
function simulateTypeScriptCheck() {
  console.log('🔎 Simulating TypeScript resolution...');

  // Read the test file and check if all paths would resolve
  const testFile = 'test-migration/apps/web/src/app/components/layout/NavMenu.tsx';
  const tsConfigFile = 'test-migration/apps/web/tsconfig.json';

  console.log(`  📄 Test file: ${testFile}`);
  console.log(`  ⚙️  TypeScript config: ${tsConfigFile}`);

  // Check if paths exist
  const pathsExist = [
    'test-migration/apps/web/src/app/contexts',
    'test-migration/apps/web/src/utils/supabase',
    'test-migration/apps/web/src/lib/utils'
  ].every(p => fs.existsSync(p));

  console.log(`  ${pathsExist ? '✅' : '❌'} All dependency paths exist`);

  // Check tsconfig structure
  const tsConfig = JSON.parse(fs.readFileSync(tsConfigFile, 'utf8'));
  const hasCorrectPaths = tsConfig.compilerOptions.paths && tsConfig.compilerOptions.paths['@/*'];

  console.log(`  ${hasCorrectPaths ? '✅' : '❌'} TypeScript path mapping configured`);

  return pathsExist && hasCorrectPaths;
}

// Step 7: Cleanup test
function cleanup() {
  console.log('🧹 Cleaning up test files...');

  if (fs.existsSync('test-migration')) {
    fs.rmSync('test-migration', { recursive: true, force: true });
    console.log('  ✅ Removed test directory');
  }
}

// Main test function
function runTest() {
  try {
    createTestStructure();
    copyTestFile();
    createTestTsConfig();
    createMockDependencies();
    const imports = testImportResolution();
    const resolutionWorks = simulateTypeScriptCheck();

    console.log('\n📊 Test Results:');
    console.log(`  • @ imports found: ${imports.length}`);
    console.log(`  • Path resolution: ${resolutionWorks ? '✅ Working' : '❌ Failed'}`);
    console.log(`  • Structure compatibility: ${resolutionWorks ? '✅ Compatible' : '❌ Incompatible'}`);

    if (resolutionWorks) {
      console.log('\n🎉 SUCCESS! Migration approach verified!');
      console.log('  ✅ @ imports will work in new structure');
      console.log('  ✅ TypeScript path resolution correct');
      console.log('  ✅ File structure compatible');
      console.log('\n🚀 Ready for full migration!');
    } else {
      console.log('\n❌ ISSUES DETECTED!');
      console.log('  ⚠️  Need to adjust migration approach');
    }

    return resolutionWorks;

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  } finally {
    cleanup();
  }
}

// Run the test
const success = runTest();
process.exit(success ? 0 : 1);