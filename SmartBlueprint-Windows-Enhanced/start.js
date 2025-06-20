#!/usr/bin/env node

/**
 * SmartBlueprint Pro - Desktop Application Launcher
 * Starts both Express.js backend and Electron frontend
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('SmartBlueprint Pro Desktop - Starting application...');

// Start Express.js backend server
console.log('Starting Express.js backend server...');
const serverProcess = spawn('node', ['server/index.js'], {
  stdio: 'pipe',
  cwd: process.cwd()
});

serverProcess.stdout.on('data', (data) => {
  console.log(`[Backend] ${data.toString().trim()}`);
});

serverProcess.stderr.on('data', (data) => {
  console.error(`[Backend Error] ${data.toString().trim()}`);
});

// Wait for server to start then launch Electron
setTimeout(() => {
  console.log('Launching Electron GUI...');
  
  const electronProcess = spawn('npx', ['electron', '.'], {
    stdio: 'inherit',
    cwd: process.cwd()
  });

  electronProcess.on('close', (code) => {
    console.log('Electron GUI closed, shutting down backend...');
    serverProcess.kill();
    process.exit(code);
  });

}, 3000); // Wait 3 seconds for server to initialize

// Handle shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down SmartBlueprint Pro...');
  serverProcess.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down SmartBlueprint Pro...');
  serverProcess.kill();
  process.exit(0);
});