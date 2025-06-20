#!/usr/bin/env node
/**
 * SmartBlueprint Pro - Electron Build Script
 * Automated build and packaging for Windows, macOS, and Linux
 */

const { build } = require('electron-builder');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const buildConfig = {
  // Build configuration matching electron-builder.json
  productName: 'SmartBlueprint Pro',
  appId: 'com.smartblueprint.desktop',
  directories: {
    output: 'dist-desktop',
    buildResources: 'assets'
  },
  files: [
    'dist/**/*',
    'electron-main.js',
    'electron-preload.js',
    'server/**/*',
    '!server/**/*.ts',
    'node_modules/**/*',
    'package.json'
  ],
  extraResources: [
    {
      from: 'assets',
      to: 'assets',
      filter: ['**/*']
    }
  ],
  win: {
    target: [
      {
        target: 'nsis',
        arch: ['x64']
      }
    ],
    icon: 'assets/icon.ico',
    requestedExecutionLevel: 'asInvoker',
    artifactName: 'SmartBlueprint-Pro-${version}-Setup.${ext}'
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    installerIcon: 'assets/icon.ico',
    uninstallerIcon: 'assets/icon.ico',
    installerHeaderIcon: 'assets/icon.ico',
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'SmartBlueprint Pro',
    include: 'installer.nsh'
  },
  mac: {
    target: [
      {
        target: 'dmg',
        arch: ['x64', 'arm64']
      }
    ],
    icon: 'assets/icon.icns',
    category: 'public.app-category.productivity',
    artifactName: 'SmartBlueprint-Pro-${version}-${arch}.${ext}'
  },
  linux: {
    target: [
      {
        target: 'AppImage',
        arch: ['x64']
      }
    ],
    icon: 'assets/icon.png',
    category: 'Network',
    artifactName: 'SmartBlueprint-Pro-${version}-${arch}.${ext}'
  }
};

class ElectronBuilder {
  constructor() {
    this.platform = process.platform;
    this.targetPlatform = process.argv[2] || this.platform;
  }

  async prepareBuild() {
    console.log('🔧 Preparing SmartBlueprint Pro for Electron build...');
    
    // Ensure dist directory exists
    if (!fs.existsSync('dist')) {
      console.log('📦 Building frontend assets...');
      execSync('npm run build', { stdio: 'inherit' });
    }

    // Create assets directory if missing
    if (!fs.existsSync('assets')) {
      fs.mkdirSync('assets', { recursive: true });
      console.log('📁 Created assets directory');
    }

    // Generate icon if missing
    await this.ensureIcons();

    // Verify required files
    this.verifyRequiredFiles();
  }

  async ensureIcons() {
    const iconPaths = ['assets/icon.ico', 'assets/icon.png', 'assets/icon.icns'];
    const missingIcons = iconPaths.filter(iconPath => !fs.existsSync(iconPath));

    if (missingIcons.length > 0) {
      console.log('🎨 Generating application icons...');
      await this.generateIcons();
    }
  }

  async generateIcons() {
    // Create a simple SVG icon and convert to required formats
    const svgIcon = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4F46E5;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#06B6D4;stop-opacity:1" />
    </linearGradient>
  </defs>
  <circle cx="128" cy="128" r="120" fill="url(#grad1)" stroke="#1E293B" stroke-width="4"/>
  <path d="M80 128 L120 168 L176 88" stroke="white" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="128" y="200" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="24" font-weight="bold">SBP</text>
</svg>`;

    fs.writeFileSync('assets/icon.svg', svgIcon);
    
    // For now, copy the SVG as PNG (in production, use proper icon conversion)
    const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    fs.writeFileSync('assets/icon.png', Buffer.from(pngBase64, 'base64'));
    fs.writeFileSync('assets/icon.ico', Buffer.from(pngBase64, 'base64'));
    fs.writeFileSync('assets/icon.icns', Buffer.from(pngBase64, 'base64'));
    
    console.log('✓ Generated placeholder icons (replace with proper icons for production)');
  }

  verifyRequiredFiles() {
    const requiredFiles = [
      'electron-main.js',
      'electron-preload.js',
      'package.json'
    ];

    const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));
    
    if (missingFiles.length > 0) {
      console.error('❌ Missing required files:', missingFiles);
      process.exit(1);
    }

    console.log('✓ All required files present');
  }

  async buildForPlatform(platform) {
    console.log(`🚀 Building SmartBlueprint Pro for ${platform}...`);
    
    const platformConfig = {
      ...buildConfig,
      [platform]: buildConfig[platform === 'win' ? 'win' : platform === 'mac' ? 'mac' : 'linux']
    };

    try {
      const result = await build({
        targets: this.createTarget(platform),
        config: platformConfig,
        publish: 'never'
      });

      console.log(`✅ Build completed for ${platform}`);
      return result;
    } catch (error) {
      console.error(`❌ Build failed for ${platform}:`, error);
      throw error;
    }
  }

  createTarget(platform) {
    const { Platform, Arch } = require('electron-builder');
    
    switch (platform) {
      case 'win':
        return Platform.WINDOWS.createTarget(['nsis'], Arch.x64);
      case 'mac':
        return Platform.MAC.createTarget(['dmg'], Arch.x64, Arch.arm64);
      case 'linux':
        return Platform.LINUX.createTarget(['AppImage'], Arch.x64);
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  async buildAll() {
    const platforms = ['win', 'mac', 'linux'];
    
    for (const platform of platforms) {
      try {
        await this.buildForPlatform(platform);
      } catch (error) {
        console.error(`Failed to build for ${platform}:`, error.message);
        // Continue with other platforms
      }
    }
  }

  async run() {
    try {
      await this.prepareBuild();

      if (this.targetPlatform === 'all') {
        await this.buildAll();
      } else {
        await this.buildForPlatform(this.targetPlatform);
      }

      console.log('🎉 Electron build process completed!');
      console.log('📁 Output directory: dist-desktop/');
      
      // List generated files
      if (fs.existsSync('dist-desktop')) {
        const files = fs.readdirSync('dist-desktop');
        console.log('📦 Generated files:');
        files.forEach(file => {
          const stats = fs.statSync(path.join('dist-desktop', file));
          const size = (stats.size / 1024 / 1024).toFixed(2);
          console.log(`  - ${file} (${size} MB)`);
        });
      }

    } catch (error) {
      console.error('❌ Build process failed:', error);
      process.exit(1);
    }
  }
}

// CLI usage
if (require.main === module) {
  const builder = new ElectronBuilder();
  builder.run();
}

module.exports = ElectronBuilder;