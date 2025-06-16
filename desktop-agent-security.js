#!/usr/bin/env node

/**
 * SmartBlueprint Pro - Hardened Desktop Agent Security Module
 * Implements hash verification, origin locking, and local data encryption
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');

class AgentSecurity {
  constructor() {
    this.expectedHashes = {
      'desktop-agent-enhanced.js': 'sha256:a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
      'desktop-agent-ping.js': 'sha256:b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567a',
      'desktop-agent-installer.js': 'sha256:c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567ab2'
    };
    
    this.trustedOrigins = [
      'smartblueprint.replit.app',
      'smartblueprint-pro.replit.dev',
      'localhost:5000',
      '127.0.0.1:5000'
    ];
    
    this.encryptionKey = this.deriveEncryptionKey();
    this.agentId = this.generateSecureAgentId();
    this.sessionToken = null;
    this.lastAuthTime = null;
  }

  /**
   * Verify script integrity using SHA-256 hash check
   */
  verifyScriptIntegrity(scriptPath) {
    try {
      const scriptName = path.basename(scriptPath);
      const expectedHash = this.expectedHashes[scriptName];
      
      if (!expectedHash) {
        console.error(`[Security] No expected hash found for script: ${scriptName}`);
        return false;
      }

      const scriptContent = fs.readFileSync(scriptPath);
      const actualHash = crypto.createHash('sha256').update(scriptContent).digest('hex');
      const actualHashWithPrefix = `sha256:${actualHash}`;

      if (actualHashWithPrefix !== expectedHash) {
        console.error(`[Security] Hash mismatch for ${scriptName}`);
        console.error(`Expected: ${expectedHash}`);
        console.error(`Actual:   ${actualHashWithPrefix}`);
        return false;
      }

      console.log(`[Security] Script integrity verified: ${scriptName}`);
      return true;
    } catch (error) {
      console.error(`[Security] Failed to verify script integrity: ${error.message}`);
      return false;
    }
  }

  /**
   * Validate WebSocket origin against trusted origins list
   */
  validateOrigin(originUrl) {
    try {
      const url = new URL(originUrl);
      const hostWithPort = url.port ? `${url.hostname}:${url.port}` : url.hostname;
      
      const isTrusted = this.trustedOrigins.some(trustedOrigin => {
        return hostWithPort === trustedOrigin || url.hostname === trustedOrigin;
      });

      if (!isTrusted) {
        console.error(`[Security] Untrusted origin blocked: ${originUrl}`);
        return false;
      }

      console.log(`[Security] Origin validated: ${originUrl}`);
      return true;
    } catch (error) {
      console.error(`[Security] Invalid origin URL: ${originUrl}`);
      return false;
    }
  }

  /**
   * Generate secure agent ID based on system characteristics
   */
  generateSecureAgentId() {
    const systemInfo = {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      networkInterfaces: JSON.stringify(os.networkInterfaces()),
      cpus: os.cpus().length
    };

    const hash = crypto.createHash('sha256')
      .update(JSON.stringify(systemInfo))
      .update(Date.now().toString())
      .digest('hex');

    return `agent_${hash.substring(0, 16)}`;
  }

  /**
   * Derive encryption key from system characteristics
   */
  deriveEncryptionKey() {
    const systemSeed = [
      os.hostname(),
      os.platform(),
      os.arch(),
      process.env.USER || process.env.USERNAME || 'unknown'
    ].join('|');

    return crypto.pbkdf2Sync(systemSeed, 'smartblueprint_salt', 10000, 32, 'sha256');
  }

  /**
   * Encrypt sensitive local data
   */
  encryptData(data) {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipherGCM('aes-256-gcm', this.encryptionKey);
      cipher.setAAD(Buffer.from(this.agentId));

      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();

      return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        agentId: this.agentId
      };
    } catch (error) {
      console.error(`[Security] Encryption failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Decrypt sensitive local data
   */
  decryptData(encryptedData) {
    try {
      if (!encryptedData || encryptedData.agentId !== this.agentId) {
        console.error('[Security] Invalid encrypted data or agent ID mismatch');
        return null;
      }

      const decipher = crypto.createDecipherGCM('aes-256-gcm', this.encryptionKey);
      decipher.setAAD(Buffer.from(this.agentId));
      decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return JSON.parse(decrypted);
    } catch (error) {
      console.error(`[Security] Decryption failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Secure local storage for sensitive data
   */
  secureStore(key, data) {
    try {
      const storageDir = path.join(os.homedir(), '.smartblueprint');
      if (!fs.existsSync(storageDir)) {
        fs.mkdirSync(storageDir, { mode: 0o700 });
      }

      const encryptedData = this.encryptData(data);
      if (!encryptedData) {
        return false;
      }

      const filePath = path.join(storageDir, `${key}.enc`);
      fs.writeFileSync(filePath, JSON.stringify(encryptedData), { mode: 0o600 });
      
      console.log(`[Security] Data securely stored: ${key}`);
      return true;
    } catch (error) {
      console.error(`[Security] Secure store failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Secure local retrieval of sensitive data
   */
  secureRetrieve(key) {
    try {
      const storageDir = path.join(os.homedir(), '.smartblueprint');
      const filePath = path.join(storageDir, `${key}.enc`);

      if (!fs.existsSync(filePath)) {
        return null;
      }

      const encryptedData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const decryptedData = this.decryptData(encryptedData);
      
      if (decryptedData) {
        console.log(`[Security] Data securely retrieved: ${key}`);
      }
      
      return decryptedData;
    } catch (error) {
      console.error(`[Security] Secure retrieve failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Generate session token for WebSocket authentication
   */
  generateSessionToken() {
    const timestamp = Date.now();
    const randomBytes = crypto.randomBytes(16).toString('hex');
    const tokenData = {
      agentId: this.agentId,
      timestamp,
      random: randomBytes
    };

    const token = crypto.createHmac('sha256', this.encryptionKey)
      .update(JSON.stringify(tokenData))
      .digest('hex');

    this.sessionToken = `${timestamp}.${randomBytes}.${token}`;
    this.lastAuthTime = timestamp;

    return this.sessionToken;
  }

  /**
   * Validate session token
   */
  validateSessionToken(token) {
    try {
      if (!token || token !== this.sessionToken) {
        return false;
      }

      const [timestamp, randomBytes, receivedToken] = token.split('.');
      const tokenData = {
        agentId: this.agentId,
        timestamp: parseInt(timestamp),
        random: randomBytes
      };

      const expectedToken = crypto.createHmac('sha256', this.encryptionKey)
        .update(JSON.stringify(tokenData))
        .digest('hex');

      // Check token validity and age (24 hours max)
      const tokenAge = Date.now() - parseInt(timestamp);
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      if (expectedToken !== receivedToken || tokenAge > maxAge) {
        console.error('[Security] Invalid or expired session token');
        return false;
      }

      return true;
    } catch (error) {
      console.error(`[Security] Token validation failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Rate limiting for API calls
   */
  createRateLimiter(maxRequests = 100, windowMs = 60000) {
    const requests = new Map();

    return (identifier) => {
      const now = Date.now();
      const windowStart = now - windowMs;

      // Clean old entries
      for (const [key, timestamps] of requests.entries()) {
        const validTimestamps = timestamps.filter(ts => ts > windowStart);
        if (validTimestamps.length === 0) {
          requests.delete(key);
        } else {
          requests.set(key, validTimestamps);
        }
      }

      // Check current requests
      const userRequests = requests.get(identifier) || [];
      const recentRequests = userRequests.filter(ts => ts > windowStart);

      if (recentRequests.length >= maxRequests) {
        console.warn(`[Security] Rate limit exceeded for: ${identifier}`);
        return false;
      }

      // Add current request
      recentRequests.push(now);
      requests.set(identifier, recentRequests);
      return true;
    };
  }

  /**
   * Sanitize data before transmission
   */
  sanitizeData(data) {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      // Remove sensitive fields
      if (key.toLowerCase().includes('password') || 
          key.toLowerCase().includes('secret') ||
          key.toLowerCase().includes('token') ||
          key.toLowerCase().includes('key')) {
        continue;
      }

      // Recursively sanitize objects
      if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeData(value);
      } else if (typeof value === 'string') {
        // Basic XSS prevention
        sanitized[key] = value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Secure WebSocket connection setup
   */
  createSecureWebSocket(url, options = {}) {
    // Validate origin
    if (!this.validateOrigin(url)) {
      throw new Error('Untrusted WebSocket origin');
    }

    // Generate session token
    const token = this.generateSessionToken();
    
    // Add security headers
    const secureOptions = {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'X-Agent-ID': this.agentId,
        'X-Agent-Version': '1.0.0',
        'User-Agent': `SmartBlueprint-Agent/${this.agentId}`
      }
    };

    return secureOptions;
  }

  /**
   * Log security events
   */
  logSecurityEvent(eventType, details) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      agentId: this.agentId,
      eventType,
      details: this.sanitizeData(details),
      severity: this.getEventSeverity(eventType)
    };

    console.log(`[Security] ${logEntry.severity.toUpperCase()}: ${eventType}`, logEntry.details);
    
    // Store security logs securely
    this.appendSecurityLog(logEntry);
  }

  /**
   * Get event severity level
   */
  getEventSeverity(eventType) {
    const severityMap = {
      'script_verification_failed': 'critical',
      'origin_validation_failed': 'high',
      'rate_limit_exceeded': 'medium',
      'token_validation_failed': 'high',
      'encryption_failed': 'high',
      'script_verification_success': 'info',
      'origin_validation_success': 'info',
      'token_generated': 'info'
    };

    return severityMap[eventType] || 'medium';
  }

  /**
   * Append to security log file
   */
  appendSecurityLog(logEntry) {
    try {
      const logDir = path.join(os.homedir(), '.smartblueprint', 'logs');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true, mode: 0o700 });
      }

      const logFile = path.join(logDir, 'security.log');
      const logLine = JSON.stringify(logEntry) + '\n';
      
      fs.appendFileSync(logFile, logLine, { mode: 0o600 });
    } catch (error) {
      console.error(`[Security] Failed to write security log: ${error.message}`);
    }
  }

  /**
   * Initialize security module
   */
  initialize() {
    console.log(`[Security] Initializing hardened security module`);
    console.log(`[Security] Agent ID: ${this.agentId}`);
    console.log(`[Security] Trusted origins: ${this.trustedOrigins.length}`);
    console.log(`[Security] Expected script hashes: ${Object.keys(this.expectedHashes).length}`);
    
    // Create rate limiter
    this.rateLimiter = this.createRateLimiter(100, 60000);
    
    this.logSecurityEvent('security_module_initialized', {
      agentId: this.agentId,
      trustedOrigins: this.trustedOrigins.length,
      expectedHashes: Object.keys(this.expectedHashes).length
    });

    return true;
  }

  /**
   * Get security status
   */
  getSecurityStatus() {
    return {
      agentId: this.agentId,
      sessionActive: !!this.sessionToken,
      lastAuthTime: this.lastAuthTime,
      trustedOrigins: this.trustedOrigins.length,
      encryptionEnabled: !!this.encryptionKey,
      rateLimitingEnabled: !!this.rateLimiter
    };
  }
}

module.exports = AgentSecurity;

// Example usage for testing
if (require.main === module) {
  const security = new AgentSecurity();
  security.initialize();
  
  // Test script verification
  console.log('\n--- Testing Script Verification ---');
  const testScriptPath = path.join(__dirname, 'desktop-agent-enhanced.js');
  if (fs.existsSync(testScriptPath)) {
    security.verifyScriptIntegrity(testScriptPath);
  }
  
  // Test origin validation
  console.log('\n--- Testing Origin Validation ---');
  console.log('Valid origin:', security.validateOrigin('https://smartblueprint.replit.app'));
  console.log('Invalid origin:', security.validateOrigin('https://malicious-site.com'));
  
  // Test encryption
  console.log('\n--- Testing Encryption ---');
  const testData = { deviceList: ['device1', 'device2'], lastScan: Date.now() };
  security.secureStore('test_data', testData);
  const retrieved = security.secureRetrieve('test_data');
  console.log('Encryption test:', JSON.stringify(retrieved) === JSON.stringify(testData));
  
  // Test token generation
  console.log('\n--- Testing Token Generation ---');
  const token = security.generateSessionToken();
  console.log('Token generated:', !!token);
  console.log('Token valid:', security.validateSessionToken(token));
  
  console.log('\n--- Security Status ---');
  console.log(JSON.stringify(security.getSecurityStatus(), null, 2));
}