#!/usr/bin/env python3
"""
SmartBlueprint Pro - Mobile Ping Service
WebSocket-based mobile device telemetry collection and processing
"""

import json
import logging
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from dataclasses import dataclass

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class MobilePingData:
    device_id: str
    device_type: str
    timestamp: str
    location: Dict[str, float]
    network_info: Dict[str, Any]
    ping_results: Dict[str, float]
    signal_strength: float
    connection_type: str
    battery_level: Optional[float]
    app_version: str

class MobilePingService:
    def __init__(self):
        self.app = FastAPI(title="SmartBlueprint Pro Mobile Ping Service", version="2.0.0")
        self.setup_cors()
        self.setup_routes()
        
        # Database configuration
        self.db_config = {
            'host': os.getenv('PGHOST', 'localhost'),
            'database': os.getenv('PGDATABASE', 'postgres'),
            'user': os.getenv('PGUSER', 'postgres'),
            'password': os.getenv('PGPASSWORD', ''),
            'port': os.getenv('PGPORT', '5432')
        }
        
        # Mobile device tracking
        self.active_devices = {}
        self.device_sessions = {}
        self.mobile_telemetry_buffer = []
        self.websocket_connections = set()
        
        # Trust zone management
        self.trusted_networks = set()
        self.device_trust_levels = {}
        
        # Initialize database
        self.init_database()
        
        logger.info("Mobile Ping Service initialized")

    def setup_cors(self):
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    def setup_routes(self):
        @self.app.post("/api/mobile/register")
        async def register_device(device_info: dict):
            return await self.register_mobile_device(device_info)
        
        @self.app.post("/api/mobile/ping")
        async def submit_ping_data(ping_data: dict):
            return await self.process_mobile_ping(ping_data)
        
        @self.app.get("/api/mobile/devices")
        async def get_mobile_devices():
            return await self.get_mobile_devices()
        
        @self.app.get("/api/mobile/analytics/{device_id}")
        async def get_device_analytics(device_id: str, hours: int = 24):
            return await self.get_device_analytics(device_id, hours)
        
        @self.app.post("/api/mobile/trust")
        async def set_device_trust(device_id: str, trust_level: str, network_ssid: str = ""):
            return await self.set_mobile_device_trust(device_id, trust_level, network_ssid)
        
        @self.app.get("/api/mobile/network-zones")
        async def get_network_zones():
            return await self.get_network_trust_zones()
        
        @self.app.post("/api/mobile/configure")
        async def configure_device(device_id: str, config: dict):
            return await self.configure_mobile_device(device_id, config)
        
        @self.app.websocket("/ws/mobile")
        async def mobile_websocket(websocket: WebSocket):
            await self.handle_mobile_websocket(websocket)

    def init_database(self):
        """Initialize database tables for mobile device tracking"""
        try:
            conn = psycopg2.connect(**self.db_config)
            cursor = conn.cursor()
            
            # Create mobile devices table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS mobile_devices (
                    id SERIAL PRIMARY KEY,
                    device_id VARCHAR(255) UNIQUE,
                    device_type VARCHAR(50),
                    device_model VARCHAR(100),
                    os_version VARCHAR(50),
                    app_version VARCHAR(20),
                    registration_time TIMESTAMP,
                    last_seen TIMESTAMP,
                    trust_level VARCHAR(20) DEFAULT 'unknown',
                    total_sessions INTEGER DEFAULT 0,
                    total_ping_count INTEGER DEFAULT 0,
                    avg_signal_strength FLOAT,
                    metadata JSONB,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create mobile ping data table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS mobile_ping_data (
                    id SERIAL PRIMARY KEY,
                    device_id VARCHAR(255),
                    session_id VARCHAR(255),
                    timestamp TIMESTAMP,
                    location_lat FLOAT,
                    location_lng FLOAT,
                    location_accuracy FLOAT,
                    network_ssid VARCHAR(255),
                    network_bssid VARCHAR(17),
                    signal_strength FLOAT,
                    connection_type VARCHAR(50),
                    ping_targets JSONB,
                    ping_results JSONB,
                    battery_level FLOAT,
                    network_metadata JSONB,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create mobile sessions table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS mobile_sessions (
                    id SERIAL PRIMARY KEY,
                    session_id VARCHAR(255) UNIQUE,
                    device_id VARCHAR(255),
                    start_time TIMESTAMP,
                    end_time TIMESTAMP,
                    session_duration INTEGER,
                    ping_count INTEGER DEFAULT 0,
                    locations_count INTEGER DEFAULT 0,
                    networks_visited TEXT[],
                    avg_signal_strength FLOAT,
                    session_metadata JSONB,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create network trust zones table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS network_trust_zones (
                    id SERIAL PRIMARY KEY,
                    network_ssid VARCHAR(255),
                    network_bssid VARCHAR(17),
                    trust_level VARCHAR(20),
                    location_lat FLOAT,
                    location_lng FLOAT,
                    first_seen TIMESTAMP,
                    last_seen TIMESTAMP,
                    device_count INTEGER DEFAULT 0,
                    security_type VARCHAR(50),
                    signal_range JSONB,
                    metadata JSONB,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create indexes
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_mobile_ping_device_time ON mobile_ping_data(device_id, timestamp)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_mobile_sessions_device ON mobile_sessions(device_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_trust_zones_ssid ON network_trust_zones(network_ssid)")
            
            conn.commit()
            cursor.close()
            conn.close()
            
            logger.info("Mobile ping database tables initialized")
            
        except Exception as e:
            logger.error(f"Mobile ping database initialization failed: {e}")

    async def register_mobile_device(self, device_info: dict) -> dict:
        """Register a new mobile device"""
        try:
            device_id = device_info.get('device_id')
            if not device_id:
                return {"error": "device_id is required"}
            
            device_record = {
                'device_id': device_id,
                'device_type': device_info.get('device_type', 'mobile'),
                'device_model': device_info.get('device_model', 'unknown'),
                'os_version': device_info.get('os_version', 'unknown'),
                'app_version': device_info.get('app_version', '1.0.0'),
                'registration_time': datetime.now(),
                'metadata': device_info.get('metadata', {})
            }
            
            # Store in database
            conn = psycopg2.connect(**self.db_config)
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO mobile_devices 
                (device_id, device_type, device_model, os_version, app_version, 
                 registration_time, last_seen, metadata)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (device_id) DO UPDATE SET
                    device_model = EXCLUDED.device_model,
                    os_version = EXCLUDED.os_version,
                    app_version = EXCLUDED.app_version,
                    last_seen = EXCLUDED.last_seen,
                    metadata = EXCLUDED.metadata,
                    updated_at = CURRENT_TIMESTAMP
            """, (
                device_record['device_id'],
                device_record['device_type'],
                device_record['device_model'],
                device_record['os_version'],
                device_record['app_version'],
                device_record['registration_time'],
                device_record['registration_time'],
                json.dumps(device_record['metadata'])
            ))
            
            conn.commit()
            cursor.close()
            conn.close()
            
            # Store in memory
            self.active_devices[device_id] = device_record
            
            logger.info(f"Mobile device registered: {device_id}")
            
            return {
                "status": "success",
                "device_id": device_id,
                "message": "Device registered successfully",
                "config": {
                    "ping_interval": 30000,
                    "ping_targets": ["8.8.8.8", "1.1.1.1", "192.168.1.1"],
                    "collect_location": True,
                    "collect_network_info": True,
                    "websocket_url": f"wss://{os.getenv('REPLIT_DOMAINS', 'localhost:8002').split(',')[0]}/ws/mobile"
                }
            }
            
        except Exception as e:
            logger.error(f"Mobile device registration failed: {e}")
            return {"error": str(e)}

    async def process_mobile_ping(self, ping_data: dict) -> dict:
        """Process ping data from mobile device"""
        try:
            device_id = ping_data.get('device_id')
            if not device_id:
                return {"error": "device_id is required"}
            
            # Validate and parse ping data
            mobile_ping = MobilePingData(
                device_id=device_id,
                device_type=ping_data.get('device_type', 'mobile'),
                timestamp=ping_data.get('timestamp', datetime.now().isoformat()),
                location=ping_data.get('location', {}),
                network_info=ping_data.get('network_info', {}),
                ping_results=ping_data.get('ping_results', {}),
                signal_strength=ping_data.get('signal_strength', 0),
                connection_type=ping_data.get('connection_type', 'unknown'),
                battery_level=ping_data.get('battery_level'),
                app_version=ping_data.get('app_version', '1.0.0')
            )
            
            # Store telemetry data
            await self.store_mobile_ping_data(mobile_ping)
            
            # Analyze for anomalies
            anomaly_result = await self.analyze_mobile_anomalies(mobile_ping)
            
            # Update device session
            await self.update_device_session(mobile_ping)
            
            # Check trust zones
            trust_info = await self.check_network_trust_zone(mobile_ping)
            
            # Stream to WebSocket clients
            await self.stream_mobile_data({
                "type": "mobile_ping",
                "device_id": device_id,
                "ping_data": ping_data,
                "anomaly_result": anomaly_result,
                "trust_info": trust_info,
                "timestamp": datetime.now().isoformat()
            })
            
            return {
                "status": "success",
                "processed_at": datetime.now().isoformat(),
                "anomaly_detected": anomaly_result.get('is_anomaly', False),
                "trust_level": trust_info.get('trust_level', 'unknown'),
                "recommendations": self.generate_mobile_recommendations(mobile_ping, anomaly_result)
            }
            
        except Exception as e:
            logger.error(f"Mobile ping processing failed: {e}")
            return {"error": str(e)}

    async def store_mobile_ping_data(self, mobile_ping: MobilePingData):
        """Store mobile ping data in database"""
        try:
            conn = psycopg2.connect(**self.db_config)
            cursor = conn.cursor()
            
            location = mobile_ping.location
            network_info = mobile_ping.network_info
            
            cursor.execute("""
                INSERT INTO mobile_ping_data 
                (device_id, timestamp, location_lat, location_lng, location_accuracy,
                 network_ssid, network_bssid, signal_strength, connection_type,
                 ping_targets, ping_results, battery_level, network_metadata)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                mobile_ping.device_id,
                mobile_ping.timestamp,
                location.get('latitude'),
                location.get('longitude'),
                location.get('accuracy'),
                network_info.get('ssid'),
                network_info.get('bssid'),
                mobile_ping.signal_strength,
                mobile_ping.connection_type,
                json.dumps(list(mobile_ping.ping_results.keys())),
                json.dumps(mobile_ping.ping_results),
                mobile_ping.battery_level,
                json.dumps(network_info)
            ))
            
            # Update device last seen
            cursor.execute("""
                UPDATE mobile_devices 
                SET last_seen = %s, total_ping_count = total_ping_count + 1
                WHERE device_id = %s
            """, (mobile_ping.timestamp, mobile_ping.device_id))
            
            conn.commit()
            cursor.close()
            conn.close()
            
        except Exception as e:
            logger.error(f"Failed to store mobile ping data: {e}")

    async def analyze_mobile_anomalies(self, mobile_ping: MobilePingData) -> dict:
        """Analyze mobile ping data for anomalies"""
        anomalies = {}
        
        # Signal strength anomaly
        if mobile_ping.signal_strength < -80:
            anomalies['weak_signal'] = {
                'detected': True,
                'severity': 'high' if mobile_ping.signal_strength < -90 else 'medium',
                'value': mobile_ping.signal_strength,
                'description': f'Weak signal strength: {mobile_ping.signal_strength} dBm'
            }
        
        # High latency detection
        ping_results = mobile_ping.ping_results
        for target, latency in ping_results.items():
            if latency > 500:
                anomalies['high_latency'] = {
                    'detected': True,
                    'severity': 'high' if latency > 1000 else 'medium',
                    'target': target,
                    'value': latency,
                    'description': f'High latency to {target}: {latency}ms'
                }
        
        # Battery drain detection
        if mobile_ping.battery_level and mobile_ping.battery_level < 20:
            anomalies['low_battery'] = {
                'detected': True,
                'severity': 'medium',
                'value': mobile_ping.battery_level,
                'description': f'Low battery level: {mobile_ping.battery_level}%'
            }
        
        # Location accuracy issues
        location_accuracy = mobile_ping.location.get('accuracy', 0)
        if location_accuracy > 100:
            anomalies['poor_location_accuracy'] = {
                'detected': True,
                'severity': 'low',
                'value': location_accuracy,
                'description': f'Poor location accuracy: {location_accuracy}m'
            }
        
        return {
            'is_anomaly': len(anomalies) > 0,
            'anomaly_count': len(anomalies),
            'anomalies': anomalies,
            'confidence': 0.8 if len(anomalies) > 0 else 0.1
        }

    async def update_device_session(self, mobile_ping: MobilePingData):
        """Update or create device session"""
        try:
            device_id = mobile_ping.device_id
            session_id = f"{device_id}_{datetime.now().strftime('%Y%m%d')}"
            
            if device_id not in self.device_sessions:
                self.device_sessions[device_id] = {
                    'session_id': session_id,
                    'start_time': datetime.now(),
                    'ping_count': 0,
                    'locations': [],
                    'networks': set()
                }
            
            session = self.device_sessions[device_id]
            session['ping_count'] += 1
            
            # Add location if available
            if mobile_ping.location.get('latitude'):
                session['locations'].append(mobile_ping.location)
            
            # Add network if available
            if mobile_ping.network_info.get('ssid'):
                session['networks'].add(mobile_ping.network_info['ssid'])
            
        except Exception as e:
            logger.error(f"Failed to update device session: {e}")

    async def check_network_trust_zone(self, mobile_ping: MobilePingData) -> dict:
        """Check network trust zone for the device"""
        try:
            network_info = mobile_ping.network_info
            ssid = network_info.get('ssid')
            bssid = network_info.get('bssid')
            
            if not ssid:
                return {'trust_level': 'unknown', 'reason': 'No network SSID available'}
            
            # Check database for known networks
            conn = psycopg2.connect(**self.db_config)
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            cursor.execute("""
                SELECT trust_level, security_type, device_count
                FROM network_trust_zones 
                WHERE network_ssid = %s
                ORDER BY last_seen DESC
                LIMIT 1
            """, (ssid,))
            
            network_record = cursor.fetchone()
            
            if network_record:
                trust_level = network_record['trust_level']
                cursor.close()
                conn.close()
                
                return {
                    'trust_level': trust_level,
                    'network_ssid': ssid,
                    'security_type': network_record['security_type'],
                    'device_count': network_record['device_count'],
                    'reason': f'Known network with trust level: {trust_level}'
                }
            else:
                # New network - classify based on characteristics
                trust_level = self.classify_new_network(network_info)
                
                # Store new network
                cursor.execute("""
                    INSERT INTO network_trust_zones 
                    (network_ssid, network_bssid, trust_level, location_lat, location_lng,
                     first_seen, last_seen, device_count, security_type, metadata)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    ssid,
                    bssid,
                    trust_level,
                    mobile_ping.location.get('latitude'),
                    mobile_ping.location.get('longitude'),
                    mobile_ping.timestamp,
                    mobile_ping.timestamp,
                    1,
                    network_info.get('security_type', 'unknown'),
                    json.dumps(network_info)
                ))
                
                conn.commit()
                cursor.close()
                conn.close()
                
                return {
                    'trust_level': trust_level,
                    'network_ssid': ssid,
                    'reason': 'New network classified automatically'
                }
                
        except Exception as e:
            logger.error(f"Failed to check network trust zone: {e}")
            return {'trust_level': 'unknown', 'reason': 'Error checking trust zone'}

    def classify_new_network(self, network_info: dict) -> str:
        """Classify trust level for new network"""
        ssid = network_info.get('ssid', '').lower()
        security_type = network_info.get('security_type', '').lower()
        
        # Open networks are generally suspicious
        if 'open' in security_type or not security_type:
            return 'suspicious'
        
        # Home networks patterns
        home_patterns = ['home', 'house', 'family', 'residence']
        if any(pattern in ssid for pattern in home_patterns):
            return 'trusted'
        
        # Public/business networks
        public_patterns = ['guest', 'public', 'free', 'wifi', 'hotspot']
        if any(pattern in ssid for pattern in public_patterns):
            return 'guest'
        
        # Enterprise networks
        enterprise_patterns = ['corp', 'office', 'work', 'enterprise']
        if any(pattern in ssid for pattern in enterprise_patterns):
            return 'trusted'
        
        # Default to unknown for new networks
        return 'unknown'

    def generate_mobile_recommendations(self, mobile_ping: MobilePingData, anomaly_result: dict) -> List[str]:
        """Generate recommendations based on mobile ping analysis"""
        recommendations = []
        
        if anomaly_result.get('is_anomaly'):
            anomalies = anomaly_result.get('anomalies', {})
            
            if 'weak_signal' in anomalies:
                recommendations.append("Consider moving closer to the router or switching to a different network")
            
            if 'high_latency' in anomalies:
                recommendations.append("Network latency is high - check for network congestion or try different DNS servers")
            
            if 'low_battery' in anomalies:
                recommendations.append("Low battery detected - consider reducing ping frequency to conserve power")
            
            if 'poor_location_accuracy' in anomalies:
                recommendations.append("Location accuracy is poor - ensure GPS is enabled and you're not indoors")
        
        # General recommendations
        if mobile_ping.signal_strength > -50:
            recommendations.append("Excellent signal strength - optimal for high-bandwidth activities")
        elif mobile_ping.signal_strength > -70:
            recommendations.append("Good signal strength - suitable for most activities")
        
        return recommendations

    async def get_mobile_devices(self) -> dict:
        """Get list of registered mobile devices"""
        try:
            conn = psycopg2.connect(**self.db_config)
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            cursor.execute("""
                SELECT device_id, device_type, device_model, os_version, app_version,
                       registration_time, last_seen, trust_level, total_sessions,
                       total_ping_count, avg_signal_strength
                FROM mobile_devices
                ORDER BY last_seen DESC
            """)
            
            devices = [dict(record) for record in cursor.fetchall()]
            
            cursor.close()
            conn.close()
            
            return {
                "devices": devices,
                "total_devices": len(devices),
                "active_devices": len([d for d in devices if self.is_device_active(d['last_seen'])]),
                "last_updated": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to get mobile devices: {e}")
            return {"error": str(e)}

    def is_device_active(self, last_seen) -> bool:
        """Check if device is considered active based on last seen time"""
        if not last_seen:
            return False
        
        cutoff_time = datetime.now() - timedelta(hours=1)
        return last_seen > cutoff_time

    async def get_device_analytics(self, device_id: str, hours: int) -> dict:
        """Get analytics for specific mobile device"""
        try:
            conn = psycopg2.connect(**self.db_config)
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            cutoff_time = datetime.now() - timedelta(hours=hours)
            
            # Get ping statistics
            cursor.execute("""
                SELECT COUNT(*) as ping_count,
                       AVG(signal_strength) as avg_signal_strength,
                       MIN(signal_strength) as min_signal_strength,
                       MAX(signal_strength) as max_signal_strength,
                       COUNT(DISTINCT network_ssid) as networks_visited
                FROM mobile_ping_data
                WHERE device_id = %s AND timestamp > %s
            """, (device_id, cutoff_time))
            
            ping_stats = dict(cursor.fetchone() or {})
            
            # Get location data
            cursor.execute("""
                SELECT location_lat, location_lng, timestamp, signal_strength
                FROM mobile_ping_data
                WHERE device_id = %s AND timestamp > %s 
                AND location_lat IS NOT NULL AND location_lng IS NOT NULL
                ORDER BY timestamp
            """, (device_id, cutoff_time))
            
            location_data = [dict(record) for record in cursor.fetchall()]
            
            # Get network usage
            cursor.execute("""
                SELECT network_ssid, COUNT(*) as usage_count,
                       AVG(signal_strength) as avg_signal
                FROM mobile_ping_data
                WHERE device_id = %s AND timestamp > %s
                AND network_ssid IS NOT NULL
                GROUP BY network_ssid
                ORDER BY usage_count DESC
            """, (device_id, cutoff_time))
            
            network_usage = [dict(record) for record in cursor.fetchall()]
            
            cursor.close()
            conn.close()
            
            return {
                "device_id": device_id,
                "time_window_hours": hours,
                "ping_statistics": ping_stats,
                "location_data": location_data,
                "network_usage": network_usage,
                "generated_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to get device analytics: {e}")
            return {"error": str(e)}

    async def set_mobile_device_trust(self, device_id: str, trust_level: str, network_ssid: str = "") -> dict:
        """Set trust level for mobile device or network"""
        try:
            valid_levels = ['trusted', 'guest', 'suspicious', 'unknown']
            if trust_level not in valid_levels:
                return {"error": f"Invalid trust level. Must be one of: {valid_levels}"}
            
            conn = psycopg2.connect(**self.db_config)
            cursor = conn.cursor()
            
            if network_ssid:
                # Set trust level for network
                cursor.execute("""
                    UPDATE network_trust_zones 
                    SET trust_level = %s, updated_at = CURRENT_TIMESTAMP
                    WHERE network_ssid = %s
                """, (trust_level, network_ssid))
                
                message = f"Trust level set for network {network_ssid}: {trust_level}"
            else:
                # Set trust level for device
                cursor.execute("""
                    UPDATE mobile_devices 
                    SET trust_level = %s, updated_at = CURRENT_TIMESTAMP
                    WHERE device_id = %s
                """, (trust_level, device_id))
                
                message = f"Trust level set for device {device_id}: {trust_level}"
            
            conn.commit()
            cursor.close()
            conn.close()
            
            return {
                "status": "success",
                "device_id": device_id,
                "network_ssid": network_ssid,
                "trust_level": trust_level,
                "message": message
            }
            
        except Exception as e:
            logger.error(f"Failed to set mobile device trust: {e}")
            return {"error": str(e)}

    async def get_network_trust_zones(self) -> dict:
        """Get network trust zones"""
        try:
            conn = psycopg2.connect(**self.db_config)
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            cursor.execute("""
                SELECT network_ssid, trust_level, device_count, security_type,
                       first_seen, last_seen, location_lat, location_lng
                FROM network_trust_zones
                ORDER BY last_seen DESC
            """)
            
            trust_zones = [dict(record) for record in cursor.fetchall()]
            
            # Calculate summary
            trust_summary = {}
            for zone in trust_zones:
                trust_level = zone['trust_level']
                trust_summary[trust_level] = trust_summary.get(trust_level, 0) + 1
            
            cursor.close()
            conn.close()
            
            return {
                "trust_zones": trust_zones,
                "total_networks": len(trust_zones),
                "trust_summary": trust_summary,
                "last_updated": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to get network trust zones: {e}")
            return {"error": str(e)}

    async def configure_mobile_device(self, device_id: str, config: dict) -> dict:
        """Configure mobile device settings"""
        try:
            # Store device configuration
            conn = psycopg2.connect(**self.db_config)
            cursor = conn.cursor()
            
            cursor.execute("""
                UPDATE mobile_devices 
                SET metadata = metadata || %s, updated_at = CURRENT_TIMESTAMP
                WHERE device_id = %s
            """, (json.dumps({"config": config}), device_id))
            
            conn.commit()
            cursor.close()
            conn.close()
            
            # Send configuration to device via WebSocket if connected
            await self.send_device_config(device_id, config)
            
            return {
                "status": "success",
                "device_id": device_id,
                "config": config,
                "message": "Device configuration updated"
            }
            
        except Exception as e:
            logger.error(f"Failed to configure mobile device: {e}")
            return {"error": str(e)}

    async def send_device_config(self, device_id: str, config: dict):
        """Send configuration to specific device via WebSocket"""
        config_message = {
            "type": "device_config",
            "device_id": device_id,
            "config": config,
            "timestamp": datetime.now().isoformat()
        }
        
        await self.stream_mobile_data(config_message)

    async def stream_mobile_data(self, data: dict):
        """Stream data to all connected WebSocket clients"""
        if not self.websocket_connections:
            return
        
        message = json.dumps(data)
        disconnected = set()
        
        for ws in self.websocket_connections:
            try:
                await ws.send_text(message)
            except:
                disconnected.add(ws)
        
        # Remove disconnected clients
        self.websocket_connections -= disconnected

    async def handle_mobile_websocket(self, websocket: WebSocket):
        """Handle WebSocket connections from mobile devices"""
        try:
            await websocket.accept()
            self.websocket_connections.add(websocket)
            
            logger.info("Mobile WebSocket connection established")
            
            # Send welcome message
            await websocket.send_text(json.dumps({
                "type": "welcome",
                "message": "Connected to SmartBlueprint Pro Mobile Service",
                "timestamp": datetime.now().isoformat()
            }))
            
            # Handle incoming messages
            while True:
                data = await websocket.receive_text()
                message = json.loads(data)
                
                if message.get('type') == 'ping_data':
                    await self.process_mobile_ping(message.get('data', {}))
                elif message.get('type') == 'heartbeat':
                    await websocket.send_text(json.dumps({
                        "type": "heartbeat_ack",
                        "timestamp": datetime.now().isoformat()
                    }))
                
        except WebSocketDisconnect:
            logger.info("Mobile WebSocket connection closed")
        except Exception as e:
            logger.error(f"Mobile WebSocket error: {e}")
        finally:
            self.websocket_connections.discard(websocket)

# Create global mobile ping service instance
mobile_ping_service = MobilePingService()
app = mobile_ping_service.app

if __name__ == "__main__":
    uvicorn.run(
        "mobile_ping_service:app",
        host="0.0.0.0",
        port=8002,
        reload=True,
        log_level="info"
    )