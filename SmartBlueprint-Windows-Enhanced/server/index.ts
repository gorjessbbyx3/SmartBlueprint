import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";
import fs from "fs";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Configuration for deployed webpage redirection
const DEPLOYED_WEBPAGE_URL = process.env.DEPLOYED_WEBPAGE_URL || process.env.REPL_URL;

// Frontend redirection middleware - redirects to deployed webpage
app.use((req: Request, res: Response, next: NextFunction) => {
  // Skip redirection for API routes, downloads, and static assets
  if (req.path.startsWith('/api/') || 
      req.path.startsWith('/download/') || 
      req.path.startsWith('/ws') ||
      req.path.startsWith('/assets/') ||
      req.path.includes('.')) {
    return next();
  }

  // Redirect frontend requests to deployed webpage
  if (DEPLOYED_WEBPAGE_URL && req.method === 'GET') {
    const redirectUrl = `${DEPLOYED_WEBPAGE_URL}${req.originalUrl}`;
    log(`Redirecting frontend request to deployed webpage: ${redirectUrl}`);
    return res.redirect(302, redirectUrl);
  }

  next();
});

// Priority API route handler to prevent Vite middleware interference
app.use('/api/*', (req: any, res: Response, next: NextFunction) => {
  // Mark this as an API request to prevent HTML responses
  req.isApiRequest = true;
  next();
});

// Windows GUI Application download - Primary download route (NEW)
app.get('/download/SmartBlueprint-Pro-Windows-GUI.tar.gz', (req: Request, res: Response) => {
  console.log('[Download] Windows GUI application package requested');
  
  try {
    const guiPackagePath = path.join(process.cwd(), 'SmartBlueprint-Pro-Windows-GUI.tar.gz');
    
    if (fs.existsSync(guiPackagePath)) {
      res.download(guiPackagePath, 'SmartBlueprint-Pro-Windows-GUI.tar.gz', (err) => {
        if (err) {
          console.error('[Download] GUI package download error:', err);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Download failed' });
          }
        } else {
          console.log('[Download] Windows GUI package downloaded successfully');
        }
      });
    } else {
      res.status(404).json({ 
        error: 'Windows GUI package not found',
        message: 'Please build the GUI package first'
      });
    }
  } catch (error) {
    console.error('[Download] Windows GUI package download failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Electron Desktop Application download - Primary download route
app.get('/download/SmartBlueprint-Pro-Setup.exe', (req: Request, res: Response) => {
  console.log('[Download] Complete Electron desktop application requested');
  
  try {
    const desktopApps = [
      'SmartBlueprint-Pro-Setup.exe',
      'SmartBlueprint-Desktop.exe', 
      'dist/SmartBlueprint-Pro.exe',
      'SmartBlueprint-Pro.exe'
    ];
    
    let foundApp = null;
    for (const appPath of desktopApps) {
      const fullPath = path.join(process.cwd(), appPath);
      if (fs.existsSync(fullPath)) {
        foundApp = fullPath;
        break;
      }
    }
    
    if (foundApp) {
      console.log('[Download] Serving Electron desktop application');
      res.download(foundApp, 'SmartBlueprint-Pro-Setup.exe', (err) => {
        if (err) {
          console.error('[Download] Desktop app download failed:', err);
          if (!res.headersSent) {
            res.status(500).send('Download failed');
          }
        } else {
          console.log('[Download] Complete desktop application downloaded successfully');
        }
      });
    } else {
      console.log('[Download] Redirecting to deployed webpage for download');
      if (DEPLOYED_WEBPAGE_URL) {
        const downloadUrl = `${DEPLOYED_WEBPAGE_URL}/download/SmartBlueprint-Pro-Setup.exe`;
        return res.redirect(302, downloadUrl);
      }
      
      res.status(404).json({ 
        message: 'Desktop application not available on this server. Please visit the main website.',
        status: 'not_found',
        note: 'Download available on deployed webpage'
      });
    }
  } catch (error) {
    console.error('[Download] Desktop application download failed:', error);
    res.status(500).json({ 
      success: false, 
      message: "Desktop application download failed" 
    });
  }
});

async function createWindowsInstaller() {
  const fs = await import('fs');
  const path = await import('path');
  
  // Read the Windows source code
  const sourceCode = fs.readFileSync(path.join(process.cwd(), 'SmartBlueprint-Windows.cpp'), 'utf8');
  const buildScript = fs.readFileSync(path.join(process.cwd(), 'compile-windows.bat'), 'utf8');
  
  // Create a package with source code and build instructions
  const packageContent = `SmartBlueprint Pro - Windows Package

CONTENTS:
1. SmartBlueprint-Windows.cpp - Complete C++ source code
2. compile-windows.bat - Build script for Windows
3. README.txt - Installation instructions

TO BUILD:
1. Install Visual Studio with C++ compiler
2. Open "Developer Command Prompt for Visual Studio"
3. Run: compile-windows.bat
4. Executable will be created as SmartBlueprint-x64.exe or SmartBlueprint-x86.exe

SOURCE CODE:
${sourceCode}

BUILD SCRIPT:
${buildScript}`;
  
  return Buffer.from(packageContent, 'utf8');
}

// Serve enhanced desktop agent installer with proper binary distribution
app.get('/download/desktop-agent-enhanced.js', (req: Request, res: Response) => {
  console.log('[Download] Enhanced installer download requested');
  
  try {
    const installerPath = path.join(process.cwd(), 'enhanced-agent-installer.js');
    
    if (fs.existsSync(installerPath)) {
      res.download(installerPath, 'smartblueprint-installer.js', (err) => {
        if (err) {
          console.error('[Download] Installer download failed:', err);
          if (!res.headersSent) {
            res.status(500).send('Download failed');
          }
        } else {
          console.log('[Download] Enhanced installer downloaded successfully');
        }
      });
    } else {
      console.log('[Download] Enhanced installer not found, serving direct agent');
      const agentPath = path.join(process.cwd(), 'desktop-agent-enhanced.js');
      
      if (fs.existsSync(agentPath)) {
        res.download(agentPath, 'smartblueprint-agent-enhanced.js', (err) => {
          if (err) {
            console.error('[Download] Agent download failed:', err);
            if (!res.headersSent) {
              res.status(500).send('Download failed');
            }
          } else {
            console.log('[Download] Enhanced agent downloaded successfully');
          }
        });
      } else {
        console.log('[Download] Redirecting agent download to deployed webpage');
        if (DEPLOYED_WEBPAGE_URL) {
          const downloadUrl = `${DEPLOYED_WEBPAGE_URL}/download/desktop-agent-enhanced.js`;
          return res.redirect(302, downloadUrl);
        }
        res.status(404).json({
          message: 'Agent files not available on this server. Please visit the main website.',
          status: 'not_found',
          note: 'Download available on deployed webpage'
        });
      }
    }
  } catch (error) {
    console.error('[Download] Failed to serve enhanced desktop agent');
    if (DEPLOYED_WEBPAGE_URL) {
      const downloadUrl = `${DEPLOYED_WEBPAGE_URL}/download/desktop-agent-enhanced.js`;
      return res.redirect(302, downloadUrl);
    }
    res.status(500).send('Download service error');
  }
});

// Serve complete Electron desktop application
app.get('/download/SmartBlueprint-Pro-Setup.exe', (req: Request, res: Response) => {
  console.log('[Download] Complete desktop application download requested');
  
  try {
    const desktopApps = [
      'SmartBlueprint-Pro-Setup.exe',
      'SmartBlueprint-Desktop.exe', 
      'dist/SmartBlueprint-Pro.exe',
      'SmartBlueprint-Pro.exe'
    ];
    
    let foundApp = null;
    for (const appPath of desktopApps) {
      const fullPath = path.join(process.cwd(), appPath);
      if (fs.existsSync(fullPath)) {
        foundApp = fullPath;
        break;
      }
    }
    
    if (foundApp) {
      res.download(foundApp, 'SmartBlueprint-Pro-Setup.exe', (err) => {
        if (err) {
          console.error('[Download] Desktop app download failed:', err);
          if (!res.headersSent) {
            res.status(500).send('Download failed');
          }
        } else {
          console.log('[Download] Complete desktop application downloaded successfully');
        }
      });
    } else {
      console.log('[Download] Desktop application not found, building on demand...');
      res.status(202).json({ 
        message: 'Desktop application is being built. Please try again in a few minutes.',
        status: 'building'
      });
    }
  } catch (error) {
    console.error('[Download] Failed to serve desktop application:', error);
    res.status(500).send('Download failed');
  }
});

// Serve attached assets including professional icon
app.use('/assets', express.static(path.join(process.cwd(), 'attached_assets')));

// Register API routes and start server
registerRoutes(app);

const PORT = parseInt(process.env.PORT || "5000", 10);

const httpServer = app.listen(PORT, "0.0.0.0", () => {
  log(`Server running on port ${PORT}`);
});

if (process.env.NODE_ENV === "development") {
  setupVite(app, httpServer);
} else {
  serveStatic(app);
}

export default httpServer;