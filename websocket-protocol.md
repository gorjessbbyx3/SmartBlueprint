# SmartBlueprint Pro WebSocket Protocol Documentation

## Overview

This document defines the WebSocket communication protocol between the desktop agent, web application, and cloud sync tunnel for real-time data exchange in SmartBlueprint Pro.

## Connection Details

- **Endpoint**: `wss://[domain]/ws`
- **Protocol**: WebSocket Secure (WSS)
- **Authentication**: Agent ID and token-based authentication
- **Heartbeat**: 30-second intervals

## Message Structure

All WebSocket messages follow this JSON structure:

```json
{
  "type": "message_type",
  "agentId": "agent_identifier",
  "timestamp": "ISO8601_timestamp",
  "data": {
    // Message-specific payload
  }
}
```

## Message Types

### 1. Agent Authentication & Management

#### `agent_register`
Desktop agent registers with cloud sync tunnel.

```json
{
  "type": "agent_register",
  "agentId": "desktop_agent_001",
  "timestamp": "2025-06-16T18:45:00.000Z",
  "data": {
    "version": "1.0.0",
    "capabilities": ["device_scan", "ping_probe", "signal_monitor"],
    "networkInterface": "192.168.1.100",
    "systemInfo": {
      "os": "Windows 11",
      "arch": "x64",
      "nodeVersion": "18.17.0"
    }
  }
}
```

#### `agent_heartbeat`
Regular heartbeat to maintain connection.

```json
{
  "type": "agent_heartbeat",
  "agentId": "desktop_agent_001",
  "timestamp": "2025-06-16T18:45:30.000Z",
  "data": {
    "status": "active",
    "uptime": 3600,
    "memoryUsage": 45.2,
    "cpuUsage": 12.8
  }
}
```

### 2. Device Discovery & Management

#### `deviceJoin`
New device discovered on network.

```json
{
  "type": "deviceJoin",
  "agentId": "desktop_agent_001",
  "timestamp": "2025-06-16T18:45:15.000Z",
  "data": {
    "deviceId": "aa:bb:cc:dd:ee:ff",
    "hostname": "SmartTV-Living",
    "ipAddress": "192.168.1.155",
    "macAddress": "aa:bb:cc:dd:ee:ff",
    "vendor": "Samsung Electronics",
    "deviceType": "smart_tv",
    "rssi": -45,
    "firstSeen": "2025-06-16T18:45:15.000Z",
    "protocols": ["mDNS", "SSDP"],
    "services": ["_airplay._tcp", "_googlecast._tcp"],
    "trustLevel": "unknown"
  }
}
```

#### `deviceLeave`
Device disconnected or went offline.

```json
{
  "type": "deviceLeave",
  "agentId": "desktop_agent_001",
  "timestamp": "2025-06-16T18:46:00.000Z",
  "data": {
    "deviceId": "aa:bb:cc:dd:ee:ff",
    "reason": "timeout",
    "lastSeen": "2025-06-16T18:44:30.000Z"
  }
}
```

#### `deviceUpdate`
Device status or signal strength update.

```json
{
  "type": "deviceUpdate",
  "agentId": "desktop_agent_001",
  "timestamp": "2025-06-16T18:45:45.000Z",
  "data": {
    "deviceId": "aa:bb:cc:dd:ee:ff",
    "rssi": -48,
    "location": {
      "x": 15.2,
      "y": 8.7,
      "confidence": 0.85
    },
    "performance": {
      "latency": 12,
      "packetLoss": 0.1,
      "bandwidth": 45.2
    }
  }
}
```

### 3. Ping & Network Probing

#### `pingResult`
RTT measurement result from active ping probing.

```json
{
  "type": "pingResult",
  "agentId": "desktop_agent_001",
  "timestamp": "2025-06-16T18:45:20.000Z",
  "data": {
    "targetIp": "192.168.1.1",
    "targetType": "gateway",
    "rtt": 8.5,
    "packetSize": 64,
    "ttl": 64,
    "sequenceNumber": 12345,
    "success": true,
    "estimatedDistance": 2.55,
    "processingOffset": 5.0,
    "qualityScore": 0.92
  }
}
```

#### `pingCalibration`
Calibration point data for ML training.

```json
{
  "type": "pingCalibration",
  "agentId": "desktop_agent_001",
  "timestamp": "2025-06-16T18:45:25.000Z",
  "data": {
    "calibrationId": "cal_001",
    "knownLocation": {
      "x": 10.0,
      "y": 5.0,
      "room": "living_room"
    },
    "measurements": [
      {
        "targetIp": "192.168.1.1",
        "rtt": 8.2,
        "rssi": -42
      },
      {
        "targetIp": "192.168.1.254",
        "rtt": 12.1,
        "rssi": -38
      }
    ],
    "confidence": 0.95
  }
}
```

### 4. Security & Trust Management

#### `trustAlert`
Security alert for suspicious device behavior.

```json
{
  "type": "trustAlert",
  "agentId": "desktop_agent_001",
  "timestamp": "2025-06-16T18:45:35.000Z",
  "data": {
    "alertId": "alert_12345",
    "deviceId": "unknown:device:mac",
    "severity": "high",
    "alertType": "suspicious_device",
    "description": "Unknown device with suspicious network scanning behavior",
    "evidence": {
      "portScans": 15,
      "connectionAttempts": 25,
      "dataVolume": 1024000,
      "blacklistMatch": true
    },
    "recommendedAction": "block_device",
    "autoBlocked": false
  }
}
```

#### `trustUpdate`
Trust level change for a device.

```json
{
  "type": "trustUpdate",
  "agentId": "desktop_agent_001",
  "timestamp": "2025-06-16T18:45:40.000Z",
  "data": {
    "deviceId": "aa:bb:cc:dd:ee:ff",
    "previousTrust": "unknown",
    "newTrust": "trusted",
    "reason": "user_approved",
    "confidence": 0.98,
    "behaviorScore": 85.2
  }
}
```

### 5. ML Analytics & Anomaly Detection

#### `anomalyDetected`
ML model detected anomalous behavior.

```json
{
  "type": "anomalyDetected",
  "agentId": "desktop_agent_001",
  "timestamp": "2025-06-16T18:45:50.000Z",
  "data": {
    "anomalyId": "anom_67890",
    "deviceId": "aa:bb:cc:dd:ee:ff",
    "anomalyType": "signal_drop",
    "severity": "medium",
    "confidence": 0.87,
    "mlModel": "isolation_forest",
    "features": {
      "rssi_variance": 15.2,
      "connection_stability": 0.65,
      "bandwidth_anomaly": true
    },
    "recommendedAction": "investigate_interference"
  }
}
```

#### `mlScoreUpdate`
Updated ML confidence scores and predictions.

```json
{
  "type": "mlScoreUpdate",
  "agentId": "desktop_agent_001",
  "timestamp": "2025-06-16T18:45:55.000Z",
  "data": {
    "deviceId": "aa:bb:cc:dd:ee:ff",
    "scores": {
      "anomalyScore": 0.12,
      "trustScore": 0.89,
      "performanceScore": 0.76,
      "locationConfidence": 0.92
    },
    "predictions": {
      "failureRisk": 0.15,
      "maintenanceNeeded": false,
      "expectedLifetime": 2.3
    }
  }
}
```

### 6. System Health & Monitoring

#### `systemHealth`
Agent system health report.

```json
{
  "type": "systemHealth",
  "agentId": "desktop_agent_001",
  "timestamp": "2025-06-16T18:46:00.000Z",
  "data": {
    "status": "healthy",
    "metrics": {
      "cpuUsage": 12.8,
      "memoryUsage": 45.2,
      "diskUsage": 67.1,
      "networkLatency": 8.5
    },
    "services": {
      "deviceScanner": "running",
      "pingProber": "running",
      "mlAnalytics": "running",
      "dataIntegrity": "running"
    },
    "errors": [],
    "warnings": ["High memory usage detected"]
  }
}
```

#### `dataIntegrityReport`
Data integrity monitoring results.

```json
{
  "type": "dataIntegrityReport",
  "agentId": "desktop_agent_001",
  "timestamp": "2025-06-16T18:46:05.000Z",
  "data": {
    "status": "clean",
    "scannedItems": 1250,
    "suspiciousItems": 0,
    "violationsFound": [],
    "authenticDataSources": ["network_scan", "ping_probe", "signal_monitor"],
    "lastCleanScan": "2025-06-16T18:46:05.000Z"
  }
}
```

## Error Handling

### Error Message Format

```json
{
  "type": "error",
  "agentId": "desktop_agent_001",
  "timestamp": "2025-06-16T18:46:10.000Z",
  "data": {
    "errorCode": "CONN_FAILED",
    "errorMessage": "Failed to connect to target device",
    "context": {
      "targetDevice": "192.168.1.155",
      "operation": "ping_probe",
      "attemptNumber": 3
    },
    "severity": "medium",
    "recoverable": true
  }
}
```

### Error Codes

- `AUTH_FAILED`: Authentication failure
- `CONN_TIMEOUT`: Connection timeout
- `INVALID_DATA`: Invalid message format
- `SCAN_FAILED`: Device scan failure
- `PING_FAILED`: Ping probe failure
- `ML_ERROR`: ML model error
- `INTEGRITY_VIOLATION`: Data integrity violation

## Connection Management

### Reconnection Strategy

1. **Exponential Backoff**: 1s, 2s, 4s, 8s, 16s (max 30s)
2. **Maximum Retries**: 10 attempts before manual intervention
3. **Heartbeat Timeout**: 90 seconds (3 missed heartbeats)
4. **Queue Management**: Buffer up to 1000 messages during disconnection

### Security Considerations

1. **TLS Encryption**: All WebSocket connections use WSS
2. **Agent Authentication**: Token-based authentication for each agent
3. **Message Validation**: All messages validated against schema
4. **Rate Limiting**: 100 messages per minute per agent
5. **Data Sanitization**: All user data sanitized before transmission

## Implementation Notes

- All timestamps use ISO 8601 format in UTC
- Message size limit: 1MB per message
- Binary data should be base64 encoded
- Agent IDs must be unique and persistent
- Device IDs use MAC address format when available

## Version History

- **v1.0.0** (2025-06-16): Initial protocol definition
- Supports agent registration, device discovery, ping probing, trust management, and ML analytics