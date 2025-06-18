
const express = require('express');
const path = require('path');
const { spawn } = require('child_process');

const app = express();
const port = 5000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Redirect root to main app
app.get('/', (req, res) => {
    res.redirect('http://localhost:3000');
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'SmartBlueprint Pro Desktop Running', version: '1.0.0' });
});

app.listen(port, () => {
    console.log('SmartBlueprint Pro Desktop Server running on port', port);
    
    // Auto-open browser after slight delay
    setTimeout(() => {
        const start = (process.platform == 'darwin'? 'open': process.platform == 'win32'? 'start': 'xdg-open');
        require('child_process').exec(start + ' http://localhost:5000');
    }, 2000);
});
