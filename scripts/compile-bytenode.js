#!/usr/bin/env node

/**
 * Bytenode Compilation Script
 *
 * Compiles JavaScript files to V8 bytecode for protection.
 * This script should run after TypeScript/Vite compilation.
 */

const fs = require('fs');
const path = require('path');
const bytenode = require('bytenode');

// Configuration
const CONFIG = {
  // Directories containing JS files to compile
  targetDirs: ['dist-electron'],
  // File patterns to compile
  patterns: ['main.js', 'preload.js', '*.js'],
  // Directories to exclude
  excludeDirs: ['node_modules'],
  // Extensions
  sourceExt: '.js',
  bytecodeExt: '.jsc',
  // Whether to delete source files after compilation
  deleteSource: true,
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function findFiles(dir, pattern) {
  const files = [];

  if (!fs.existsSync(dir)) {
    return files;
  }

  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Skip excluded directories
      if (CONFIG.excludeDirs.includes(item)) {
        continue;
      }
      // Recurse into subdirectories
      files.push(...findFiles(fullPath, pattern));
    } else if (stat.isFile()) {
      // Check if file matches pattern
      const regex = new RegExp(pattern.replace('*', '.*'));
      if (regex.test(item) && item.endsWith(CONFIG.sourceExt)) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

async function compileFile(filePath) {
  const dir = path.dirname(filePath);
  const basename = path.basename(filePath, CONFIG.sourceExt);
  const bytecodePath = path.join(dir, basename + CONFIG.bytecodeExt);

  try {
    // Check if file is already bytecode
    const content = fs.readFileSync(filePath);
    if (content.toString().startsWith('')) {
      // Skip if already processed
    }

    // Compile to bytecode
    await bytenode.compileFile({
      filename: filePath,
      output: bytecodePath,
    });

    log(`✓ Compiled: ${path.relative(process.cwd(), filePath)}`, 'green');

    // Delete source file if configured
    if (CONFIG.deleteSource) {
      fs.unlinkSync(filePath);
      log(`  Deleted source: ${path.basename(filePath)}`, 'yellow');
    }

    return true;
  } catch (error) {
    log(`✗ Failed to compile: ${filePath}`, 'red');
    log(`  Error: ${error.message}`, 'red');
    return false;
  }
}

async function createLoaderFile(targetDir) {
  const loaderPath = path.join(targetDir, 'loader.js');

  const loaderContent = `/**
 * Bytenode Loader
 * Automatically loads bytecode files instead of JS files
 */

const bytenode = require('bytenode');
const path = require('path');
const fs = require('fs');

// Enable bytenode
bytenode.init();

// Determine which file to load
function loadBytecode(moduleName) {
  const bytecodePath = path.join(__dirname, moduleName + '.jsc');
  const sourcePath = path.join(__dirname, moduleName + '.js');
  
  if (fs.existsSync(bytecodePath)) {
    // Load bytecode version
    module.exports = require(bytecodePath);
  } else if (fs.existsSync(sourcePath)) {
    // Fallback to source (for development)
    module.exports = require(sourcePath);
  } else {
    throw new Error(\`Cannot find module: \${moduleName}\`);
  }
}

// Export loader function
module.exports = { loadBytecode };
`;

  fs.writeFileSync(loaderPath, loaderContent);
  log(`✓ Created loader: ${loaderPath}`, 'green');
}

async function copyEntryFile() {
  const sourceEntry = path.join('electron', 'entry.js');
  const targetEntry = path.join('dist-electron', 'entry.js');

  if (fs.existsSync(sourceEntry)) {
    fs.copyFileSync(sourceEntry, targetEntry);
    log(`✓ Copied entry.js to dist-electron/`, 'green');
  } else {
    log(`⚠ entry.js not found in electron/ directory`, 'yellow');
  }
}

async function main() {
  log('🔐 Starting Bytenode Compilation...', 'blue');
  log('');

  // First, copy entry.js
  await copyEntryFile();

  let compiled = 0;
  let failed = 0;

  for (const targetDir of CONFIG.targetDirs) {
    if (!fs.existsSync(targetDir)) {
      log(`⚠ Directory not found: ${targetDir}`, 'yellow');
      continue;
    }

    log(`📁 Processing directory: ${targetDir}`, 'blue');

    for (const pattern of CONFIG.patterns) {
      const files = findFiles(targetDir, pattern);

      for (const file of files) {
        // Skip already compiled files
        if (file.endsWith(CONFIG.bytecodeExt)) {
          continue;
        }

        // Skip entry.js and loader files (they need to remain as JS)
        if (file.endsWith('entry.js') || file.endsWith('loader.js')) {
          continue;
        }

        const success = await compileFile(file);
        if (success) {
          compiled++;
        } else {
          failed++;
        }
      }
    }

    // Create loader file
    await createLoaderFile(targetDir);
  }

  log('');
  log('📊 Compilation Summary:', 'blue');
  log(`  Compiled: ${compiled}`, 'green');
  log(`  Failed: ${failed}`, failed > 0 ? 'red' : 'green');

  if (failed > 0) {
    process.exit(1);
  }

  log('');
  log('✅ Bytenode compilation complete!', 'green');
  log('');
  log('📝 Note: entry.js remains as JavaScript to bootstrap the bytecode.', 'blue');
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    log(`Fatal error: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { main, compileFile };
