const express = require('express');
const path = require('path');

const app = express();
const port = 3000;

// Serve static files from web directory
app.use(express.static(path.join(__dirname, '../web')));
app.use('/assets', express.static(path.join(__dirname, '../web/assets')));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'SmartBlueprint Pro Desktop Running', 
        version: '1.0.0',
        mode: 'desktop'
    });
});

// API endpoints for desktop mode
app.get('/api/desktop/info', (req, res) => {
    res.json({
        platform: 'windows',
        type: 'desktop-application',
        features: [
            'offline-mode',
            'local-storage',
            'device-monitoring',
            'ai-analytics'
        ]
    });
});

// Default route - serve index.html for all other requests
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../web/index.html'));
});

app.listen(port, 'localhost', () => {
    console.log(`SmartBlueprint Pro Desktop running on http://localhost:${port}`);
    
    // Auto-open browser after a short delay
    setTimeout(() => {
        const start = process.platform === 'win32' ? 'start' : 
                     process.platform === 'darwin' ? 'open' : 'xdg-open';
        require('child_process').exec(`${start} http://localhost:${port}`);
    }, 2000);
});
