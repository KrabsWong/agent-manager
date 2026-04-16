/**
 * Bytenode Entry Point
 *
 * This file acts as a bridge to load the compiled bytecode.
 * It must be a CommonJS file that can run without compilation.
 */

const bytenode = require('bytenode');
const path = require('path');
const fs = require('fs');

// Initialize bytenode to handle .jsc files
bytenode.init();

const __dirname = path.dirname(__filename);

// Determine which file to load
const bytecodePath = path.join(__dirname, 'main.jsc');
const sourcePath = path.join(__dirname, 'main.js');

let mainModule;

if (fs.existsSync(bytecodePath)) {
  // Production: Load bytecode
  try {
    mainModule = require(bytecodePath);
  } catch (error) {
    console.error('Failed to load bytecode:', error);
    process.exit(1);
  }
} else if (fs.existsSync(sourcePath)) {
  // Development: Load source
  mainModule = require(sourcePath);
} else {
  console.error('Cannot find main module (neither .jsc nor .js)');
  process.exit(1);
}

// Export for Electron
module.exports = mainModule;
