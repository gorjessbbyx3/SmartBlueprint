# SmartBlueprint Pro - Deployment WebSocket Guide

## After Deployment Setup

When you deploy SmartBlueprint Pro, the desktop agent will automatically connect to your deployed application.

### Automatic WebSocket Detection

The standalone desktop agent automatically detects your deployment URL using:

1. **Replit Deployments**: Auto-detects from `REPLIT_DOMAINS` or `REPL_ID` environment variables
2. **Custom Deployments**: Uses `HOSTNAME` or `HOST` environment variables
3. **Manual Override**: Set `WS_URL` environment variable for custom WebSocket URLs

### Running Agent After Deployment

**Option 1: Automatic Detection (Recommended)**
```bash
node smartblueprint-desktop-agent.js
```

**Option 2: Manual WebSocket URL**
```bash
WS_URL=wss://smartplueprint.replit.app/ws node smartblueprint-desktop-agent.js
```

**Option 3: Using Deployment Domain**
```bash
SMARTBLUEPRINT_HOST=smartplueprint.replit.app node smartblueprint-desktop-agent.js
```

### Expected Connection Output

When successfully connected to your deployed app:
```
[Agent] Initializing Standalone Desktop Agent
[Agent] Agent ID: agent-abc123
[Agent] Server URL: wss://your-deployed-app.com/ws
[Agent] Connected to server
[Agent] Agent registration sent
[Agent] Monitoring services started
```

### WebSocket Endpoint

Your deployed application automatically provides the WebSocket server at:
```
wss://your-deployed-app.com/ws
```

This endpoint handles:
- Agent registration and authentication
- Real-time device discovery data
- Network performance metrics
- System health monitoring
- Live dashboard updates

### Troubleshooting

**If connection fails:**
- Verify your deployed app is running
- Check the WebSocket URL is correct
- Ensure firewall allows outbound WebSocket connections
- Agent will automatically retry every 5 seconds

**Manual URL Override:**
If auto-detection fails, manually specify your deployment URL:
```bash
WS_URL=wss://your-exact-deployment-url.com/ws node smartblueprint-desktop-agent.js
```

The agent is now fully configured for production deployment with automatic WebSocket URL detection.