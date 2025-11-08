#!/usr/bin/env node

/**
 * Deployment Configuration Validator
 * Validates that all necessary files and configurations are in place
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFile(filePath, description) {
  const exists = fs.existsSync(filePath);
  if (exists) {
    log(`✅ ${description}`, 'green');
    return true;
  } else {
    log(`❌ ${description} - Missing: ${filePath}`, 'red');
    return false;
  }
}

function checkPackageJson(filePath, requiredScripts) {
  try {
    const pkg = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let allPresent = true;
    
    for (const script of requiredScripts) {
      if (pkg.scripts && pkg.scripts[script]) {
        log(`  ✅ Script "${script}" found`, 'green');
      } else {
        log(`  ❌ Script "${script}" missing`, 'red');
        allPresent = false;
      }
    }
    
    return allPresent;
  } catch (error) {
    log(`  ❌ Error reading ${filePath}: ${error.message}`, 'red');
    return false;
  }
}

function validateDeployment() {
  log('\n🔍 AutoXShift Deployment Configuration Validator\n', 'cyan');
  
  let allValid = true;
  
  // Check root files
  log('📁 Root Configuration:', 'blue');
  allValid &= checkFile('package.json', 'Root package.json');
  allValid &= checkFile('vercel.json', 'Vercel configuration');
  allValid &= checkFile('render.yaml', 'Render configuration');
  allValid &= checkFile('.gitignore', 'Git ignore file');
  allValid &= checkFile('.vercelignore', 'Vercel ignore file');
  allValid &= checkFile('.renderignore', 'Render ignore file');
  
  // Check backend files
  log('\n📁 Backend Configuration:', 'blue');
  allValid &= checkFile('backend/package.json', 'Backend package.json');
  allValid &= checkFile('backend/tsconfig.json', 'Backend TypeScript config');
  allValid &= checkFile('backend/src/index.ts', 'Backend entry point');
  allValid &= checkFile('backend/src/database/schema.sql', 'Database schema');
  allValid &= checkFile('backend/.npmrc', 'Backend NPM config');
  allValid &= checkFile('backend/env.example', 'Backend env example');
  allValid &= checkFile('backend/.env.production.example', 'Backend production env example');
  
  log('\n  Checking backend scripts:', 'yellow');
  allValid &= checkPackageJson('backend/package.json', ['build', 'start', 'dev']);
  
  // Check frontend files
  log('\n📁 Frontend Configuration:', 'blue');
  allValid &= checkFile('frontend/package.json', 'Frontend package.json');
  allValid &= checkFile('frontend/tsconfig.json', 'Frontend TypeScript config');
  allValid &= checkFile('frontend/next.config.js', 'Next.js configuration');
  allValid &= checkFile('frontend/app/layout.tsx', 'Frontend layout');
  allValid &= checkFile('frontend/app/page.tsx', 'Frontend home page');
  allValid &= checkFile('frontend/.npmrc', 'Frontend NPM config');
  allValid &= checkFile('frontend/env.local.example', 'Frontend env example');
  allValid &= checkFile('frontend/.env.production.example', 'Frontend production env example');
  
  log('\n  Checking frontend scripts:', 'yellow');
  allValid &= checkPackageJson('frontend/package.json', ['build', 'start', 'dev']);
  
  // Check documentation
  log('\n📁 Documentation:', 'blue');
  allValid &= checkFile('README.md', 'README');
  allValid &= checkFile('DEPLOYMENT.md', 'Deployment guide');
  
  // Validate configurations
  log('\n🔧 Configuration Validation:', 'blue');
  
  try {
    const renderYaml = fs.readFileSync('render.yaml', 'utf8');
    if (renderYaml.includes('rootDir: backend')) {
      log('✅ Render rootDir correctly set to backend', 'green');
    } else {
      log('❌ Render rootDir not set to backend', 'red');
      allValid = false;
    }
  } catch (error) {
    log('❌ Error reading render.yaml', 'red');
    allValid = false;
  }
  
  try {
    const vercelJson = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
    if (vercelJson.framework === 'nextjs') {
      log('✅ Vercel framework correctly set to nextjs', 'green');
    } else {
      log('❌ Vercel framework not set correctly', 'red');
      allValid = false;
    }
  } catch (error) {
    log('❌ Error reading vercel.json', 'red');
    allValid = false;
  }
  
  // Final result
  log('\n' + '='.repeat(60), 'cyan');
  if (allValid) {
    log('✅ All deployment configurations are valid!', 'green');
    log('🚀 Ready to deploy to Vercel and Render', 'green');
    log('\nNext steps:', 'cyan');
    log('1. Push code to GitHub', 'yellow');
    log('2. Deploy backend to Render (set rootDir: backend)', 'yellow');
    log('3. Deploy frontend to Vercel (set rootDir: frontend)', 'yellow');
    log('4. Update environment variables on both platforms', 'yellow');
    log('\nSee DEPLOYMENT.md for detailed instructions', 'cyan');
  } else {
    log('❌ Some configurations are missing or invalid', 'red');
    log('Please fix the issues above before deploying', 'yellow');
  }
  log('='.repeat(60) + '\n', 'cyan');
  
  process.exit(allValid ? 0 : 1);
}

// Run validation
validateDeployment();
