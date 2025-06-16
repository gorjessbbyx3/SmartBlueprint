// Enhanced Desktop Agent with Predictive Maintenance Integration
// Comprehensive device health monitoring and telemetry collection
// Integrates with SmartBlueprint Pro AI systems

const ping = require('ping');
const WebSocket = require('ws');
const os = require('os');

// Configuration
const WS_URL = process.env.WS_URL || 'ws://localhost:5000/ws';
const PING_TARGETS = [
  '192.168.1.1',     // Common gateway/router IP
  '192.168.1.254',   // Alternative gateway IP
  '192.168.0.1',     // Another common gateway
  '10.0.0.1'         // Alternative private network gateway
];
const PING_INTERVAL = 5000;        // 5 seconds between ping measurements
const HEALTH_INTERVAL = 30000;     // 30 seconds between health reports
const DISCOVERY_INTERVAL = 300000; // 5 minutes between device discovery scans
const TIMEOUT_MS = 2000;           // 2 second timeout per ping

class EnhancedDesktopAgent {
  constructor() {
    this.ws = null;
    this.isRunning = false;
    this.pingInterval = null;
    this.healthInterval = null;
    this.discoveryInterval = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    
    // Agent identification
    this.agentId = process.env.AGENT_ID || 'enhanced-agent-' + Math.random().toString(36).substring(7);
    this.startTime = Date.now();
    
    // Performance and health tracking
    this.performanceHistory = [];
    this.errorCounts = new Map();
    this.connectionDrops = 0;
    this.lastHealthMetrics = null;
    this.deviceRegistry = new Map();
    
    // Predictive maintenance data
    this.degradationTrend = [];
    this.anomalyScores = [];
    this.riskFactors = new Set();
    
    console.log('[Enhanced Desktop Agent] Initializing comprehensive monitoring system...');
    console.log(`[Enhanced Desktop Agent] Agent ID: ${this.agentId}`);
    console.log(`[Enhanced Desktop Agent] Ping targets: ${PING_TARGETS.join(', ')}`);
    console.log(`[Enhanced Desktop Agent] Health monitoring: ${HEALTH_INTERVAL}ms intervals`);
    console.log(`[Enhanced Desktop Agent] Device discovery: ${DISCOVERY_INTERVAL}ms intervals`);
  }

  /**
   * Start the enhanced monitoring agent
   */
  start() {
    console.log('[Enhanced Desktop Agent] Starting comprehensive monitoring...');
    this.connect();
  }

  /**
   * Stop the enhanced monitoring agent
   */
  stop() {
    console.log('[Enhanced Desktop Agent] Stopping monitoring...');
    this.isRunning = false;
    
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.healthInterval) clearInterval(this.healthInterval);
    if (this.discoveryInterval) clearInterval(this.discoveryInterval);
    
    if (this.ws) {
      this.ws.close();
    }
  }

  /**
   * Connect to WebSocket server
   */
  connect() {
    console.log(`[Enhanced Desktop Agent] Connecting to ${WS_URL}...`);
    
    try {
      this.ws = new WebSocket(WS_URL);
      
      this.ws.on('open', () => {
        console.log('[Enhanced Desktop Agent] Connected to SmartBlueprint Pro server');
        this.reconnectAttempts = 0;
        this.startMonitoring();
        this.registerAgent();
      });

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          this.handleServerMessage(message);
        } catch (error) {
          console.error('[Enhanced Desktop Agent] Failed to parse server message:', error);
          this.incrementErrorCount('message_parsing');
        }
      });

      this.ws.on('close', () => {
        console.log('[Enhanced Desktop Agent] Connection lost');
        this.connectionDrops++;
        this.stopMonitoring();
        this.scheduleReconnect();
      });

      this.ws.on('error', (error) => {
        console.error('[Enhanced Desktop Agent] WebSocket error:', error.message);
        this.incrementErrorCount('websocket_error');
      });

    } catch (error) {
      console.error('[Enhanced Desktop Agent] Connection failed:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Register agent with server and send capabilities
   */
  registerAgent() {
    const registration = {
      type: 'agent_register',
      timestamp: new Date().toISOString(),
      agentId: this.agentId,
      capabilities: [
        'ping_measurement',
        'health_monitoring', 
        'device_discovery',
        'predictive_maintenance',
        'performance_tracking',
        'anomaly_detection'
      ],
      systemInfo: {
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        nodeVersion: process.version,
        totalMemory: os.totalmem(),
        cpuCount: os.cpus().length,
        uptime: os.uptime()
      },
      version: '2.0.0-enhanced'
    };

    this.sendMessage(registration);
    console.log('[Enhanced Desktop Agent] Registered with server');
  }

  /**
   * Start all monitoring intervals
   */
  startMonitoring() {
    this.isRunning = true;
    
    // Start ping measurements
    this.pingInterval = setInterval(() => {
      this.performPingMeasurements();
    }, PING_INTERVAL);

    // Start health monitoring
    this.healthInterval = setInterval(() => {
      this.performHealthAnalysis();
    }, HEALTH_INTERVAL);

    // Start device discovery
    this.discoveryInterval = setInterval(() => {
      this.performDeviceDiscovery();
    }, DISCOVERY_INTERVAL);

    // Perform initial scans
    setTimeout(() => this.performPingMeasurements(), 1000);
    setTimeout(() => this.performHealthAnalysis(), 2000);
    setTimeout(() => this.performDeviceDiscovery(), 3000);

    console.log('[Enhanced Desktop Agent] All monitoring systems active');
  }

  /**
   * Stop all monitoring intervals
   */
  stopMonitoring() {
    this.isRunning = false;
    
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    if (this.healthInterval) {
      clearInterval(this.healthInterval);
      this.healthInterval = null;
    }
    
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = null;
    }
  }

  /**
   * Perform comprehensive ping measurements with RTT analysis
   */
  async performPingMeasurements() {
    if (!this.isRunning) return;

    try {
      const results = await this.measureAllTargets();
      const analysis = this.analyzePingResults(results);
      
      const message = {
        type: 'ping_measurement',
        timestamp: new Date().toISOString(),
        agentId: this.agentId,
        measurements: results,
        analysis: analysis,
        location: { x: 0, y: 0 },
        metadata: {
          targets: PING_TARGETS.length,
          interval: PING_INTERVAL,
          timeout: TIMEOUT_MS,
          agentUptime: Date.now() - this.startTime
        }
      };

      this.sendMessage(message);
      this.updatePerformanceHistory('ping', analysis);
      
    } catch (error) {
      console.error('[Enhanced Desktop Agent] Ping measurement failed:', error);
      this.incrementErrorCount('ping_measurement');
    }
  }

  /**
   * Measure ping to all configured targets
   */
  async measureAllTargets() {
    const promises = PING_TARGETS.map(async (host) => {
      try {
        const result = await ping.promise.probe(host, {
          timeout: TIMEOUT_MS / 1000,
          min_reply: 1,
          extra: ['-c', '1']
        });

        const rtt = result.alive ? result.time : null;
        const distance = rtt ? this.convertRTTToDistance(rtt) : null;

        return {
          host,
          alive: result.alive,
          rtt: rtt,
          distance: distance,
          packetLoss: result.alive ? 0 : 100,
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        return {
          host,
          alive: false,
          rtt: null,
          distance: null,
          packetLoss: 100,
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }
    });

    return Promise.all(promises);
  }

  /**
   * Convert RTT to estimated distance using speed of light
   */
  convertRTTToDistance(rttMs, processingOffsetMs = 5) {
    const speedOfLight = 3e8; // meters per second
    const adjustedRTT = Math.max(0, rttMs - processingOffsetMs);
    const distanceMeters = (adjustedRTT / 1000 / 2) * speedOfLight;
    return Math.round(distanceMeters * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Analyze ping results for patterns and anomalies
   */
  analyzePingResults(results) {
    const validResults = results.filter(r => r.alive && r.rtt !== null);
    
    if (validResults.length === 0) {
      return {
        avgLatency: 0,
        minLatency: 0,
        maxLatency: 0,
        packetLossRate: 100,
        jitter: 0,
        connectivity: 'disconnected',
        signalQuality: 'poor'
      };
    }

    const rtts = validResults.map(r => r.rtt);
    const avgLatency = rtts.reduce((sum, rtt) => sum + rtt, 0) / rtts.length;
    const minLatency = Math.min(...rtts);
    const maxLatency = Math.max(...rtts);
    const packetLossRate = ((results.length - validResults.length) / results.length) * 100;
    
    // Calculate jitter (variation in latency)
    const jitter = rtts.length > 1 
      ? Math.sqrt(rtts.reduce((sum, rtt) => sum + Math.pow(rtt - avgLatency, 2), 0) / rtts.length)
      : 0;

    // Determine connectivity and signal quality
    const connectivity = packetLossRate === 0 ? 'excellent' : 
                        packetLossRate < 5 ? 'good' : 
                        packetLossRate < 20 ? 'fair' : 'poor';

    const signalQuality = avgLatency < 20 ? 'excellent' :
                         avgLatency < 50 ? 'good' :
                         avgLatency < 100 ? 'fair' : 'poor';

    return {
      avgLatency: Math.round(avgLatency * 100) / 100,
      minLatency: Math.round(minLatency * 100) / 100,
      maxLatency: Math.round(maxLatency * 100) / 100,
      packetLossRate: Math.round(packetLossRate * 100) / 100,
      jitter: Math.round(jitter * 100) / 100,
      connectivity,
      signalQuality
    };
  }

  /**
   * Perform comprehensive health analysis for predictive maintenance
   */
  async performHealthAnalysis() {
    if (!this.isRunning) return;

    try {
      const systemMetrics = await this.collectSystemMetrics();
      const networkMetrics = this.getNetworkMetrics();
      const performanceScore = this.calculatePerformanceScore(systemMetrics, networkMetrics);
      const healthMetrics = this.calculateHealthMetrics(systemMetrics, networkMetrics, performanceScore);
      
      // Store current metrics
      this.lastHealthMetrics = healthMetrics;
      
      // Send to predictive maintenance system
      const message = {
        type: 'health_analysis',
        timestamp: new Date().toISOString(),
        agentId: this.agentId,
        deviceId: `agent_${this.agentId}`,
        telemetryData: healthMetrics,
        systemMetrics: systemMetrics,
        networkMetrics: networkMetrics,
        predictiveData: {
          degradationTrend: this.calculateDegradationTrend(),
          anomalyScore: this.calculateAnomalyScore(),
          riskFactors: Array.from(this.riskFactors),
          failurePrediction: this.assessFailureRisk(healthMetrics)
        }
      };

      this.sendMessage(message);
      this.updatePerformanceHistory('health', healthMetrics);
      
      console.log(`[Enhanced Desktop Agent] Health analysis: Performance ${performanceScore}%, Risks: ${this.riskFactors.size}`);
      
    } catch (error) {
      console.error('[Enhanced Desktop Agent] Health analysis failed:', error);
      this.incrementErrorCount('health_analysis');
    }
  }

  /**
   * Collect comprehensive system metrics
   */
  async collectSystemMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = await this.getCPUUsage();
    const systemLoad = os.loadavg();
    const uptime = process.uptime();
    
    return {
      memory: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss,
        usage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
      },
      cpu: {
        usage: cpuUsage,
        loadAverage: systemLoad[0],
        coreCount: os.cpus().length
      },
      system: {
        uptime: uptime,
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        freeMemory: os.freemem(),
        totalMemory: os.totalmem()
      }
    };
  }

  /**
   * Get CPU usage percentage
   */
  async getCPUUsage() {
    return new Promise((resolve) => {
      const startTime = process.hrtime();
      const startCPU = process.cpuUsage();
      
      setTimeout(() => {
        const elapTime = process.hrtime(startTime);
        const elapCPU = process.cpuUsage(startCPU);
        const elapTimeMS = elapTime[0] * 1000 + elapTime[1] / 1000000;
        const cpuPercent = Math.round(100 * (elapCPU.user + elapCPU.system) / 1000 / elapTimeMS);
        resolve(Math.min(100, cpuPercent));
      }, 100);
    });
  }

  /**
   * Get network performance metrics
   */
  getNetworkMetrics() {
    const recentPing = this.performanceHistory
      .filter(h => h.type === 'ping')
      .slice(-10);
    
    if (recentPing.length === 0) {
      return {
        latency: 0,
        packetLoss: 100,
        jitter: 0,
        connectivity: 'unknown'
      };
    }

    const latest = recentPing[recentPing.length - 1];
    return latest.data;
  }

  /**
   * Calculate overall performance score
   */
  calculatePerformanceScore(systemMetrics, networkMetrics) {
    let score = 100;
    
    // Memory usage impact
    if (systemMetrics.memory.usage > 90) score -= 25;
    else if (systemMetrics.memory.usage > 75) score -= 15;
    else if (systemMetrics.memory.usage > 50) score -= 5;
    
    // CPU usage impact
    if (systemMetrics.cpu.usage > 90) score -= 25;
    else if (systemMetrics.cpu.usage > 75) score -= 15;
    else if (systemMetrics.cpu.usage > 50) score -= 5;
    
    // Network performance impact
    if (networkMetrics.packetLoss > 10) score -= 30;
    else if (networkMetrics.packetLoss > 5) score -= 15;
    else if (networkMetrics.packetLoss > 1) score -= 5;
    
    if (networkMetrics.latency > 200) score -= 20;
    else if (networkMetrics.latency > 100) score -= 10;
    else if (networkMetrics.latency > 50) score -= 5;
    
    // Error count impact
    const totalErrors = Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0);
    if (totalErrors > 20) score -= 20;
    else if (totalErrors > 10) score -= 10;
    else if (totalErrors > 5) score -= 5;
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Calculate comprehensive health metrics for predictive maintenance
   */
  calculateHealthMetrics(systemMetrics, networkMetrics, performanceScore) {
    const uptimeHours = systemMetrics.system.uptime / 3600;
    
    return {
      // Performance metrics
      responseTime: networkMetrics.latency || 0,
      errorRate: this.calculateErrorRate(),
      uptime: Math.min(100, (uptimeHours / 24) * 100),
      cpuUsage: systemMetrics.cpu.usage,
      memoryUsage: systemMetrics.memory.usage,
      
      // Network metrics  
      rssi: this.estimateSignalStrength(networkMetrics.latency),
      packetLoss: networkMetrics.packetLoss || 0,
      latency: networkMetrics.latency || 0,
      connectionDrops: this.connectionDrops,
      
      // System metrics
      batteryLevel: this.getBatteryLevel(),
      temperature: this.estimateTemperature(systemMetrics.cpu.usage),
      operatingHours: uptimeHours,
      errorCount: Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0),
      restartCount: this.connectionDrops, // Approximate
      
      // Calculated health scores
      currentHealth: performanceScore / 100,
      performanceScore: performanceScore / 100,
      signalStability: this.calculateSignalStability(),
      connectionQuality: this.calculateConnectionQuality(),
      degradationRate: this.calculateDegradationRate()
    };
  }

  /**
   * Calculate error rate as percentage
   */
  calculateErrorRate() {
    const totalOps = this.performanceHistory.length || 1;
    const totalErrors = Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0);
    return Math.min(100, (totalErrors / totalOps) * 100);
  }

  /**
   * Estimate signal strength from latency
   */
  estimateSignalStrength(latency) {
    if (!latency || latency === 0) return -100;
    
    if (latency < 10) return -30;   // Excellent
    if (latency < 30) return -50;   // Good  
    if (latency < 60) return -70;   // Fair
    if (latency < 100) return -85;  // Poor
    return -95; // Very poor
  }

  /**
   * Get battery level (platform-specific implementation needed)
   */
  getBatteryLevel() {
    // This would require platform-specific battery APIs
    // For now, return null to indicate no battery info
    return null;
  }

  /**
   * Estimate system temperature based on CPU usage
   */
  estimateTemperature(cpuUsage) {
    // Rough estimation: 30°C base + CPU usage factor
    return Math.round(30 + (cpuUsage / 100) * 40);
  }

  /**
   * Calculate signal stability based on recent measurements
   */
  calculateSignalStability() {
    const recentPing = this.performanceHistory
      .filter(h => h.type === 'ping')
      .slice(-10);
    
    if (recentPing.length < 2) return 0.5;
    
    const latencies = recentPing.map(p => p.data.avgLatency).filter(l => l > 0);
    if (latencies.length < 2) return 0.5;
    
    const mean = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
    const variance = latencies.reduce((sum, l) => sum + Math.pow(l - mean, 2), 0) / latencies.length;
    const stability = Math.max(0, 1 - (Math.sqrt(variance) / mean));
    
    return Math.min(1, stability);
  }

  /**
   * Calculate connection quality based on reliability metrics
   */
  calculateConnectionQuality() {
    const recentNetwork = this.getNetworkMetrics();
    let quality = 1.0;
    
    // Packet loss impact
    quality -= (recentNetwork.packetLoss / 100) * 0.5;
    
    // Connection drops impact
    const dropRate = this.connectionDrops / Math.max(1, (Date.now() - this.startTime) / 3600000); // drops per hour
    quality -= Math.min(0.3, dropRate * 0.1);
    
    // Latency impact
    if (recentNetwork.latency > 100) quality -= 0.2;
    else if (recentNetwork.latency > 50) quality -= 0.1;
    
    return Math.max(0, Math.min(1, quality));
  }

  /**
   * Calculate performance degradation rate
   */
  calculateDegradationRate() {
    const healthHistory = this.performanceHistory
      .filter(h => h.type === 'health')
      .slice(-20);
    
    if (healthHistory.length < 5) return 0;
    
    const scores = healthHistory.map(h => h.data.currentHealth * 100);
    const timeDiff = (Date.now() - healthHistory[0].timestamp) / (1000 * 60 * 60 * 24); // days
    
    if (timeDiff === 0) return 0;
    
    const scoreDiff = scores[0] - scores[scores.length - 1];
    return Math.max(0, scoreDiff / timeDiff / 100); // Rate per day as decimal
  }

  /**
   * Calculate degradation trend for predictive analysis
   */
  calculateDegradationTrend() {
    const recent = this.performanceHistory.slice(-10);
    if (recent.length < 3) return 'insufficient_data';
    
    const healthScores = recent
      .filter(h => h.type === 'health')
      .map(h => h.data.currentHealth * 100);
    
    if (healthScores.length < 3) return 'insufficient_data';
    
    const trend = healthScores[healthScores.length - 1] - healthScores[0];
    
    if (trend > 5) return 'improving';
    if (trend < -5) return 'degrading';
    return 'stable';
  }

  /**
   * Calculate anomaly score based on recent behavior
   */
  calculateAnomalyScore() {
    const recent = this.performanceHistory.slice(-20);
    if (recent.length < 10) return 0;
    
    const metrics = recent.map(h => h.data.currentHealth || h.data.avgLatency || 0);
    const mean = metrics.reduce((sum, m) => sum + m, 0) / metrics.length;
    const variance = metrics.reduce((sum, m) => sum + Math.pow(m - mean, 2), 0) / metrics.length;
    
    // Normalize variance to 0-1 scale
    return Math.min(1, variance / 1000);
  }

  /**
   * Assess failure risk based on current metrics
   */
  assessFailureRisk(metrics) {
    let riskScore = 0;
    const risks = [];
    
    // Clear previous risk factors
    this.riskFactors.clear();
    
    // Performance-based risks
    if (metrics.performanceScore < 0.6) {
      riskScore += 0.3;
      risks.push('poor_performance');
      this.riskFactors.add('poor_performance');
    }
    
    // Resource usage risks
    if (metrics.cpuUsage > 85) {
      riskScore += 0.2;
      risks.push('high_cpu_usage');
      this.riskFactors.add('high_cpu_usage');
    }
    
    if (metrics.memoryUsage > 90) {
      riskScore += 0.2;
      risks.push('high_memory_usage');
      this.riskFactors.add('high_memory_usage');
    }
    
    // Network risks
    if (metrics.packetLoss > 10) {
      riskScore += 0.25;
      risks.push('high_packet_loss');
      this.riskFactors.add('high_packet_loss');
    }
    
    if (metrics.connectionDrops > 5) {
      riskScore += 0.15;
      risks.push('frequent_disconnections');
      this.riskFactors.add('frequent_disconnections');
    }
    
    // Error rate risks
    if (metrics.errorRate > 10) {
      riskScore += 0.2;
      risks.push('high_error_rate');
      this.riskFactors.add('high_error_rate');
    }
    
    // Degradation risks
    if (metrics.degradationRate > 0.01) {
      riskScore += 0.3;
      risks.push('rapid_degradation');
      this.riskFactors.add('rapid_degradation');
    }
    
    const riskLevel = riskScore > 0.7 ? 'critical' :
                     riskScore > 0.5 ? 'high' :
                     riskScore > 0.3 ? 'medium' : 'low';
    
    return {
      riskScore: Math.min(1, riskScore),
      riskLevel,
      riskFactors: risks,
      timeToFailure: this.estimateTimeToFailure(riskScore, metrics.degradationRate)
    };
  }

  /**
   * Estimate time to failure based on risk and degradation
   */
  estimateTimeToFailure(riskScore, degradationRate) {
    if (degradationRate === 0 || riskScore < 0.3) return 365; // More than a year
    
    // Simple model: time until health drops to critical threshold
    const currentHealth = this.lastHealthMetrics?.currentHealth || 0.8;
    const criticalThreshold = 0.2;
    const healthToLose = currentHealth - criticalThreshold;
    
    if (healthToLose <= 0) return 1; // Already critical
    
    const daysToFailure = healthToLose / degradationRate;
    return Math.max(1, Math.min(365, Math.round(daysToFailure)));
  }

  /**
   * Perform device discovery on local network
   */
  async performDeviceDiscovery() {
    if (!this.isRunning) return;

    try {
      console.log('[Enhanced Desktop Agent] Performing device discovery...');
      
      // This would integrate with the existing device discovery system
      // For now, we'll send a discovery request to the server
      const message = {
        type: 'device_discovery_request',
        timestamp: new Date().toISOString(),
        agentId: this.agentId,
        discoveryType: 'network_scan',
        capabilities: ['arp', 'ping', 'mdns', 'ssdp']
      };

      this.sendMessage(message);
      
    } catch (error) {
      console.error('[Enhanced Desktop Agent] Device discovery failed:', error);
      this.incrementErrorCount('device_discovery');
    }
  }

  /**
   * Handle messages from server
   */
  handleServerMessage(message) {
    switch (message.type) {
      case 'ping_command':
        this.performPingMeasurements();
        break;
        
      case 'health_check':
        this.performHealthAnalysis();
        break;
        
      case 'discovery_command':
        this.performDeviceDiscovery();
        break;
        
      case 'maintenance_alert':
        console.log(`[Enhanced Desktop Agent] Maintenance alert: ${message.description}`);
        break;
        
      case 'configuration_update':
        this.updateConfiguration(message.config);
        break;
        
      default:
        console.log(`[Enhanced Desktop Agent] Unknown message type: ${message.type}`);
    }
  }

  /**
   * Update agent configuration
   */
  updateConfiguration(config) {
    if (config.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = setInterval(() => this.performPingMeasurements(), config.pingInterval);
      console.log(`[Enhanced Desktop Agent] Updated ping interval to ${config.pingInterval}ms`);
    }
    
    if (config.healthInterval) {
      clearInterval(this.healthInterval);
      this.healthInterval = setInterval(() => this.performHealthAnalysis(), config.healthInterval);
      console.log(`[Enhanced Desktop Agent] Updated health interval to ${config.healthInterval}ms`);
    }
  }

  /**
   * Send message to server
   */
  sendMessage(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('[Enhanced Desktop Agent] Cannot send message - WebSocket not connected');
    }
  }

  /**
   * Update performance history
   */
  updatePerformanceHistory(type, data) {
    this.performanceHistory.push({
      type,
      timestamp: Date.now(),
      data
    });
    
    // Keep only last 100 entries
    if (this.performanceHistory.length > 100) {
      this.performanceHistory = this.performanceHistory.slice(-100);
    }
  }

  /**
   * Increment error count for specific error type
   */
  incrementErrorCount(errorType) {
    const current = this.errorCounts.get(errorType) || 0;
    this.errorCounts.set(errorType, current + 1);
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[Enhanced Desktop Agent] Max reconnection attempts reached. Stopping.');
      return;
    }

    const delay = Math.min(30000, 1000 * Math.pow(2, this.reconnectAttempts));
    this.reconnectAttempts++;

    console.log(`[Enhanced Desktop Agent] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      this.connect();
    }, delay);
  }
}

// Start the enhanced desktop agent
const agent = new EnhancedDesktopAgent();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Enhanced Desktop Agent] Shutting down gracefully...');
  agent.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[Enhanced Desktop Agent] Received termination signal...');
  agent.stop();
  process.exit(0);
});

// Start the agent
agent.start();

console.log('[Enhanced Desktop Agent] Enhanced monitoring agent started');
console.log('[Enhanced Desktop Agent] Press Ctrl+C to stop');