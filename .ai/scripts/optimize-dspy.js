#!/usr/bin/env node

/**
 * DSPy Context Optimization Runner
 * Runs Python DSPy optimization script from Node.js environment
 */

const { spawn } = require('child_process');
const path = require('path');

async function runDSPyOptimization() {
  try {
    console.log('🚀 Starting DSPy Context Optimization...');

    const pythonScript = path.join(__dirname, '..', 'integrations', 'dspy', 'context-optimizer.py');

    // Check if python3 is available
    const python = process.platform === 'win32' ? 'python' : 'python3';

    return new Promise((resolve, reject) => {
      const child = spawn(python, [pythonScript], {
        stdio: 'inherit',
        env: { ...process.env }
      });

      child.on('close', (code) => {
        if (code === 0) {
          console.log('✅ DSPy optimization completed successfully!');
          resolve(code);
        } else {
          console.error(`❌ DSPy optimization failed with exit code ${code}`);
          reject(new Error(`Process exited with code ${code}`));
        }
      });

      child.on('error', (error) => {
        console.error('❌ Failed to start DSPy optimization:', error.message);
        reject(error);
      });
    });

  } catch (error) {
    console.error('❌ DSPy optimization error:', error.message);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  runDSPyOptimization()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { runDSPyOptimization };