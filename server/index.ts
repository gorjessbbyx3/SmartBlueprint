import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";
import fs from "fs";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Priority API route handler to prevent Vite middleware interference
app.use('/api/*', (req: any, res: Response, next: NextFunction) => {
  // Mark this as an API request to prevent HTML responses
  req.isApiRequest = true;
  next();
});

// Desktop application installer download - MUST be before Vite middleware
app.get('/download/SmartBlueprint-Pro-Setup.exe', async (req: Request, res: Response) => {
  console.log('[Download] Windows executable requested');
  
  try {
    const fs = await import('fs');
    const path = await import('path');
    
    // Check if compiled Windows executable exists
    const exePath64 = path.join(process.cwd(), 'SmartBlueprint-x64.exe');
    const exePath86 = path.join(process.cwd(), 'SmartBlueprint-x86.exe');
    const sourceCode = path.join(process.cwd(), 'SmartBlueprint-Windows.cpp');
    
    // Serve existing compiled executable if available
    if (fs.existsSync(exePath64)) {
      console.log('[Download] Serving 64-bit Windows executable');
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', 'attachment; filename="SmartBlueprint-Pro.exe"');
      res.setHeader('Content-Length', fs.statSync(exePath64).size);
      
      const stream = fs.createReadStream(exePath64);
      stream.pipe(res);
      return;
    }
    
    if (fs.existsSync(exePath86)) {
      console.log('[Download] Serving 32-bit Windows executable');
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', 'attachment; filename="SmartBlueprint-Pro.exe"');
      res.setHeader('Content-Length', fs.statSync(exePath86).size);
      
      const stream = fs.createReadStream(exePath86);
      stream.pipe(res);
      return;
    }
    
    // Serve source code with compilation instructions if no executable exists
    if (fs.existsSync(sourceCode)) {
      console.log('[Download] Serving Windows source code with build instructions');
      
      const buildInstructions = `// SmartBlueprint Pro - Windows Source Code Package
// To compile: Use Visual Studio Developer Command Prompt and run compile-windows.bat
// Requirements: Visual Studio with C++ compiler

${fs.readFileSync(sourceCode, 'utf8')}`;
      
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', 'attachment; filename="SmartBlueprint-Windows-Source.cpp"');
      res.setHeader('Content-Length', Buffer.byteLength(buildInstructions));
      res.send(buildInstructions);
      return;
    }
    
    // Fallback: Create installer package
    console.log('[Download] Creating installer package with source code');
    const installerPackage = await createWindowsInstaller();
    
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="SmartBlueprint-Pro-Windows.zip"');
    res.setHeader('Content-Length', Buffer.byteLength(installerPackage));
    res.send(installerPackage);
    
  } catch (error) {
    console.error('[Download] Windows executable generation failed:', error);
    res.status(500).json({ 
      success: false, 
      message: "Executable generation failed" 
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
        res.status(404).send('Agent files not found');
      }
    }
  } catch (error) {
    console.error('[Download] Failed to serve enhanced desktop agent');
  }
});

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