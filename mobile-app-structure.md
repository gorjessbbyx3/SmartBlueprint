# SmartBlueprint Pro - React Native Mobile Application

## Complete Mobile App Structure

This React Native application provides comprehensive network monitoring and device discovery capabilities, integrating seamlessly with the SmartBlueprint Pro ML infrastructure for real-time anomaly detection and signal analysis.

```
MobilePingProbe/
├── App.tsx                        # Main app entry point with navigation
├── assets/                        # Static resources and media
│   ├── icons/                     # App icons and UI graphics
│   │   ├── device-types/          # Device category icons
│   │   ├── signal-strength/       # Signal indicator graphics
│   │   └── trust-levels/          # Security status icons
│   ├── floorplans/               # Sample floor plan templates
│   └── animations/               # Lottie animations for loading states
├── components/                    # Reusable UI components
│   ├── FloorplanView.tsx         # Interactive floor plan canvas
│   ├── HeatmapOverlay.tsx        # Signal strength visualization
│   ├── DeviceListCard.tsx        # Device information display
│   ├── SignalGauge.tsx           # Real-time signal strength meter
│   ├── TrustBadge.tsx            # Security trust level indicator
│   ├── PingChart.tsx             # Latency trend visualization
│   └── AnomalyAlert.tsx          # ML anomaly notifications
├── screens/                       # Main navigation screens
│   ├── Dashboard.tsx             # Overview with key metrics
│   ├── DeviceDetails.tsx         # Individual device analysis
│   ├── Scanner.tsx               # Network discovery interface
│   ├── SignalMap.tsx             # Floor plan with heatmap overlay
│   ├── Analytics.tsx             # Historical data and trends
│   └── Settings.tsx              # Configuration and preferences
├── hooks/                         # Custom React Native hooks
│   ├── usePing.ts                # RTT measurement and distance calculation
│   ├── useSignal.ts              # WiFi signal strength monitoring
│   ├── useWebSocket.ts           # Real-time ML service connection
│   ├── useDeviceDiscovery.ts     # Network scanning and device detection
│   └── useMLAnalytics.ts         # ML anomaly detection integration
├── services/                      # Backend integration services
│   ├── ApiService.ts             # REST API client for device database
│   ├── WebSocketService.ts       # Real-time ML inference connection
│   ├── DiscoveryService.ts       # mDNS/ARP/SSDP scanning engine
│   ├── LocationService.ts        # GPS and indoor positioning
│   └── SecurityService.ts        # Trust level management
├── utils/                         # Helper functions and utilities
│   ├── rssiToDistance.ts         # Signal strength to distance conversion
│   ├── floorplanUtils.ts         # Coordinate system transformations
│   ├── deviceClassification.ts   # Device type identification
│   ├── signalProcessing.ts       # Real-time signal smoothing
│   └── networkUtils.ts           # Network analysis utilities
├── config/
│   ├── index.ts                  # App configuration and constants
│   ├── mlConfig.ts               # ML service endpoints and parameters
│   └── networkConfig.ts          # Discovery and scanning settings
├── types/
│   ├── models.ts                 # Shared TypeScript interfaces
│   ├── mlTypes.ts                # ML service data structures
│   └── networkTypes.ts           # Network discovery types
├── theme/
│   ├── colors.ts                 # App color palette
│   ├── typography.ts             # Text styles and fonts
│   └── spacing.ts                # Layout constants
├── navigation/
│   ├── index.tsx                 # React Navigation setup
│   ├── TabNavigator.tsx          # Bottom tab navigation
│   └── StackNavigator.tsx        # Screen stack navigation
├── store/                         # State management
│   ├── index.ts                  # Redux/Zustand store configuration
│   ├── deviceSlice.ts            # Device state management
│   ├── signalSlice.ts            # Signal data state
│   └── settingsSlice.ts          # User preferences
└── __tests__/                     # Unit and integration tests
    ├── hooks/
    ├── services/
    └── components/
```

## Core Features Implementation

### 1. Real-time Signal Monitoring (usePing.ts)

```typescript
export const usePing = (targets: string[], interval: number = 30000) => {
  const [pingResults, setPingResults] = useState<PingResult[]>([]);
  const [isActive, setIsActive] = useState(false);

  const performPing = async (target: string): Promise<number> => {
    const start = performance.now();
    try {
      const response = await fetch(`http://${target}`, {
        method: 'HEAD',
        timeout: 5000
      });
      return performance.now() - start;
    } catch {
      return -1; // Indicate failure
    }
  };

  const calculateDistance = (rtt: number): number => {
    // RTT to distance: d ≈ ((RTT - processing_offset) / 2) * c
    const processingOffset = 5; // 5ms processing delay
    const speedOfLight = 299792458; // m/s
    return ((rtt - processingOffset) / 2) * (speedOfLight / 1000);
  };

  // Continuous ping monitoring with ML integration
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(async () => {
      const results = await Promise.all(
        targets.map(async (target) => ({
          target,
          latency: await performPing(target),
          distance: calculateDistance(await performPing(target)),
          timestamp: new Date().toISOString()
        }))
      );
      setPingResults(results);
      
      // Send to ML service for anomaly detection
      WebSocketService.sendTelemetry({
        type: 'ping_measurement',
        data: results
      });
    }, interval);

    return () => clearInterval(interval);
  }, [isActive, targets, interval]);

  return { pingResults, isActive, setIsActive };
};
```

### 2. WiFi Signal Strength Monitoring (useSignal.ts)

```typescript
import WifiManager from 'react-native-wifi-reborn';

export const useSignal = () => {
  const [signalStrength, setSignalStrength] = useState<number>(0);
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);

  const getSignalStrength = async (): Promise<number> => {
    try {
      const level = await WifiManager.getCurrentSignalStrength();
      return level; // Returns dBm value
    } catch (error) {
      console.warn('Signal strength unavailable:', error);
      return 0;
    }
  };

  const getNetworkInfo = async (): Promise<NetworkInfo> => {
    try {
      const ssid = await WifiManager.getCurrentWifiSSID();
      const bssid = await WifiManager.getBSSID();
      const frequency = await WifiManager.getFrequency();
      
      return { ssid, bssid, frequency };
    } catch (error) {
      console.warn('Network info unavailable:', error);
      return { ssid: 'Unknown', bssid: '', frequency: 0 };
    }
  };

  // Real-time signal monitoring
  useEffect(() => {
    const interval = setInterval(async () => {
      const strength = await getSignalStrength();
      const info = await getNetworkInfo();
      
      setSignalStrength(strength);
      setNetworkInfo(info);
      
      // Send to ML analytics service
      WebSocketService.sendTelemetry({
        type: 'signal_measurement',
        data: { strength, networkInfo: info, timestamp: Date.now() }
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return { signalStrength, networkInfo };
};
```

### 3. ML-Powered Device Discovery (useDeviceDiscovery.ts)

```typescript
export const useDeviceDiscovery = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [anomalies, setAnomalies] = useState<MLAnomaly[]>([]);

  const performNetworkScan = async (): Promise<Device[]> => {
    try {
      setIsScanning(true);
      
      // Parallel scanning using multiple discovery methods
      const [arpDevices, mdnsDevices, ssdpDevices] = await Promise.all([
        DiscoveryService.scanARP(),
        DiscoveryService.scanMDNS(),
        DiscoveryService.scanSSDP()
      ]);

      // Merge and deduplicate results
      const allDevices = DiscoveryService.mergeDeviceResults([
        ...arpDevices,
        ...mdnsDevices,
        ...ssdpDevices
      ]);

      // Classify devices using ML
      const classifiedDevices = await Promise.all(
        allDevices.map(async (device) => ({
          ...device,
          type: await DiscoveryService.classifyDevice(device),
          trustLevel: await SecurityService.assessTrustLevel(device),
          anomalyScore: await MLService.calculateAnomalyScore(device)
        }))
      );

      setDevices(classifiedDevices);
      return classifiedDevices;
    } finally {
      setIsScanning(false);
    }
  };

  // Real-time anomaly detection
  const monitorAnomalies = useCallback(() => {
    WebSocketService.onMessage('anomaly_detected', (anomaly: MLAnomaly) => {
      setAnomalies(prev => [...prev, anomaly]);
      
      // Show user notification for high-priority anomalies
      if (anomaly.severity === 'high') {
        Alert.alert(
          'Security Alert',
          `Suspicious activity detected: ${anomaly.description}`,
          [{ text: 'OK' }]
        );
      }
    });
  }, []);

  useEffect(() => {
    monitorAnomalies();
  }, [monitorAnomalies]);

  return { devices, isScanning, performNetworkScan, anomalies };
};
```

### 4. Interactive Floor Plan with Heatmap (HeatmapOverlay.tsx)

```typescript
import Svg, { Circle, Rect, Defs, RadialGradient, Stop } from 'react-native-svg';

interface HeatmapOverlayProps {
  devices: Device[];
  floorplanBounds: Bounds;
  showTrustLevels: boolean;
}

export const HeatmapOverlay: React.FC<HeatmapOverlayProps> = ({
  devices,
  floorplanBounds,
  showTrustLevels
}) => {
  const generateHeatmapGradients = () => {
    return devices.map((device, index) => {
      const signalStrength = device.signalStrength || -70;
      const normalizedStrength = (signalStrength + 100) / 70; // Normalize -100 to -30 dBm
      
      const colors = showTrustLevels ? getTrustColors(device.trustLevel) : getSignalColors(normalizedStrength);
      
      return (
        <RadialGradient
          key={`gradient-${index}`}
          id={`signal-${device.id}`}
          cx="50%"
          cy="50%"
          r="50%"
        >
          <Stop offset="0%" stopColor={colors.center} stopOpacity="0.8" />
          <Stop offset="50%" stopColor={colors.middle} stopOpacity="0.4" />
          <Stop offset="100%" stopColor={colors.outer} stopOpacity="0.1" />
        </RadialGradient>
      );
    });
  };

  const renderDeviceNodes = () => {
    return devices.map((device) => {
      const x = (device.position.x / floorplanBounds.width) * 100;
      const y = (device.position.y / floorplanBounds.height) * 100;
      const radius = Math.max(10, (device.signalStrength + 100) / 5); // Scale with signal strength
      
      return (
        <g key={device.id}>
          {/* Signal coverage area */}
          <Circle
            cx={`${x}%`}
            cy={`${y}%`}
            r={radius * 3}
            fill={`url(#signal-${device.id})`}
          />
          
          {/* Device indicator */}
          <Circle
            cx={`${x}%`}
            cy={`${y}%`}
            r={radius}
            fill={getTrustColor(device.trustLevel)}
            stroke="#ffffff"
            strokeWidth="2"
          />
          
          {/* Anomaly indicator */}
          {device.anomalyScore > 0.5 && (
            <Circle
              cx={`${x + radius - 5}%`}
              cy={`${y - radius + 5}%`}
              r="4"
              fill="#ef4444"
              stroke="#ffffff"
              strokeWidth="1"
            />
          )}
        </g>
      );
    });
  };

  return (
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFillObject}>
      <Defs>
        {generateHeatmapGradients()}
      </Defs>
      {renderDeviceNodes()}
    </Svg>
  );
};
```

### 5. Real-time ML Analytics Integration (useMLAnalytics.ts)

```typescript
export const useMLAnalytics = () => {
  const [anomalies, setAnomalies] = useState<MLAnomaly[]>([]);
  const [predictions, setPredictions] = useState<MLPrediction[]>([]);
  const [deviceHealth, setDeviceHealth] = useState<DeviceHealth[]>([]);

  const connectToMLService = useCallback(() => {
    WebSocketService.connect(CONFIG.mlServiceUrl);
    
    // Subscribe to ML analysis results
    WebSocketService.onMessage('anomaly_detection', (data: MLAnomalyResult) => {
      setAnomalies(prev => [...prev, ...data.anomalies]);
    });
    
    WebSocketService.onMessage('predictive_analysis', (data: MLPredictionResult) => {
      setPredictions(data.predictions);
    });
    
    WebSocketService.onMessage('device_health', (data: DeviceHealthResult) => {
      setDeviceHealth(data.health_metrics);
    });
  }, []);

  const sendDeviceData = useCallback((deviceData: DeviceDataPacket) => {
    WebSocketService.sendMessage({
      type: 'device_telemetry',
      data: {
        ...deviceData,
        timestamp: new Date().toISOString(),
        source: 'mobile_app'
      }
    });
  }, []);

  const requestMLAnalysis = useCallback(async (analysisType: MLAnalysisType) => {
    try {
      const result = await ApiService.post('/api/ml/analysis', {
        type: analysisType,
        device_data: devices,
        signal_data: signalHistory
      });
      
      return result.data;
    } catch (error) {
      console.error('ML analysis request failed:', error);
      throw error;
    }
  }, []);

  useEffect(() => {
    connectToMLService();
    
    return () => {
      WebSocketService.disconnect();
    };
  }, [connectToMLService]);

  return {
    anomalies,
    predictions,
    deviceHealth,
    sendDeviceData,
    requestMLAnalysis
  };
};
```

## Configuration & Integration

### App Configuration (config/index.ts)

```typescript
export const CONFIG = {
  // Backend Integration
  apiBaseUrl: 'https://your-smartblueprint-server.com/api',
  websocketUrl: 'wss://your-smartblueprint-server.com/ws/mobile',
  mlServiceUrl: 'wss://your-smartblueprint-server.com/ws/ml',
  
  // Scanning Parameters
  scanInterval: 30000,           // 30 seconds
  pingTimeout: 5000,             // 5 seconds
  rssiThreshold: -70,            // dBm
  anomalyThreshold: 0.7,         // ML confidence threshold
  
  // Discovery Settings
  arpScanRange: '192.168.1.0/24',
  mdnsTimeout: 10000,
  ssdpTimeout: 15000,
  
  // UI Preferences
  autoAssignRooms: true,
  showTrustIndicators: true,
  enableRealTimeUpdates: true,
  heatmapResolution: 50,
  
  // Security
  defaultTrustLevel: 'unknown',
  trustLevelColors: {
    trusted: '#10b981',
    guest: '#3b82f6',
    suspicious: '#ef4444',
    unknown: '#6b7280'
  }
};
```

### Required Dependencies (package.json)

```json
{
  "dependencies": {
    "react-native": "^0.72.0",
    "react-native-wifi-reborn": "^4.12.0",
    "react-native-svg": "^13.4.0",
    "react-native-reanimated": "^3.4.0",
    "@react-navigation/native": "^6.1.0",
    "@react-navigation/bottom-tabs": "^6.5.0",
    "@react-navigation/stack": "^6.3.0",
    "react-native-device-info": "^10.9.0",
    "react-native-geolocation-service": "^5.3.0",
    "@react-native-async-storage/async-storage": "^1.19.0",
    "react-native-vector-icons": "^10.0.0",
    "react-native-canvas": "^0.1.38",
    "zustand": "^4.4.0"
  }
}
```

## Integration with SmartBlueprint Pro ML Infrastructure

This mobile application seamlessly integrates with your existing ML infrastructure:

1. **Real-time Data Flow** - Mobile telemetry feeds directly into the Python ML inference service
2. **Anomaly Detection** - IsolationForest models analyze mobile device behavior patterns
3. **Trust Management** - Network trust zones automatically classify mobile networks
4. **Signal Processing** - Kalman filtering and EWMA smoothing applied to mobile RSSI data
5. **Predictive Analytics** - Mobile device health monitoring with failure prediction
6. **Historical Analysis** - Complete mobile trajectory tracking for forensic analysis

The mobile app provides a comprehensive field monitoring tool that enhances your network analysis capabilities with real-time mobile device insights and ML-powered security analysis.