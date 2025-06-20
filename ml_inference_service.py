#!/usr/bin/env python3
"""
SmartBlueprint Pro - ML Inference Service
Production-ready FastAPI service for real-time anomaly detection and device analysis
"""

import json
import logging
import os
from datetime import datetime, timedelta
from typing import List
import joblib
import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import psycopg2
from psycopg2.extras import RealDictCursor

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('ml_inference.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class MLInferenceService:
    def __init__(self):
        self.app = FastAPI(title="SmartBlueprint Pro ML Inference Service", version="2.0.0")
        self.setup_cors()
        self.setup_routes()
        
        # ML Models
        self.isolation_forest = None
        self.scaler = StandardScaler()
        self.device_fingerprints = {}
        self.anomaly_threshold = 0.1
        
        # Database connection
        self.db_config = {
            'host': os.getenv('PGHOST', 'localhost'),
            'database': os.getenv('PGDATABASE', 'postgres'),
            'user': os.getenv('PGUSER', 'postgres'),
            'password': os.getenv('PGPASSWORD', ''),
            'port': os.getenv('PGPORT', '5432')
        }
        
        # WebSocket connections
        self.websocket_connections = set()
        
        # Live telemetry storage
        self.telemetry_buffer = []
        self.max_buffer_size = 10000
        
        # Device trust levels
        self.device_trust_levels = {}  # MAC -> trust_level
        
        # Initialize models
        self.initialize_models()
        
        logger.info("ML Inference Service initialized")

    def setup_cors(self):
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    def setup_routes(self):
        @self.app.post("/api/ml/predict-anomaly")
        async def predict_anomaly(telemetry_data: dict):
            return await self.predict_anomaly(telemetry_data)
        
        @self.app.post("/api/ml/train-model")
        async def train_model(background_tasks: BackgroundTasks):
            background_tasks.add_task(self.train_isolation_forest)
            return {"status": "training_started", "message": "Model training initiated in background"}
        
        @self.app.get("/api/ml/model-status")
        async def get_model_status():
            return await self.get_model_status()
        
        @self.app.post("/api/ml/device-fingerprint")
        async def update_device_fingerprint(device_data: dict):
            return await self.update_device_fingerprint(device_data)
        
        @self.app.get("/api/ml/anomalies/{device_id}")
        async def get_device_anomalies(device_id: str, hours: int = 24):
            return await self.get_device_anomalies(device_id, hours)
        
        @self.app.post("/api/ml/device-trust")
        async def set_device_trust(device_id: str, trust_level: str):
            return await self.set_device_trust(device_id, trust_level)
        
        @self.app.get("/api/ml/network-topology")
        async def get_network_topology():
            return await self.get_network_topology()
        
        @self.app.websocket("/ws/telemetry")
        async def websocket_telemetry(websocket: WebSocket):
            await self.handle_websocket_telemetry(websocket)

    def initialize_models(self):
        """Initialize ML models with default parameters"""
        try:
            # Load pre-trained model if exists
            if os.path.exists('models/isolation_forest.joblib'):
                self.isolation_forest = joblib.load('models/isolation_forest.joblib')
                self.scaler = joblib.load('models/scaler.joblib')
                logger.info("Loaded pre-trained IsolationForest model")
            else:
                # Initialize with default parameters
                self.isolation_forest = IsolationForest(
                    contamination=0.1,
                    random_state=42,
                    n_estimators=100
                )
                logger.info("Initialized new IsolationForest model")
                
                # Create models directory
                os.makedirs('models', exist_ok=True)
                
        except Exception as e:
            logger.error(f"Model initialization failed: {e}")
            self.isolation_forest = IsolationForest(contamination=0.1, random_state=42)

    async def predict_anomaly(self, telemetry_data: dict) -> dict:
        """Predict if telemetry data represents an anomaly"""
        try:
            # Extract features for ML model
            features = self.extract_features(telemetry_data)
            
            if self.isolation_forest is None:
                return {
                    "anomaly_score": 0.0,
                    "is_anomaly": False,
                    "confidence": 0.0,
                    "status": "model_not_trained"
                }
            
            # Predict anomaly
            features_scaled = self.scaler.transform([features])
            anomaly_score = self.isolation_forest.decision_function(features_scaled)[0]
            is_anomaly = self.isolation_forest.predict(features_scaled)[0] == -1
            
            # Calculate confidence based on distance from decision boundary
            confidence = abs(anomaly_score)
            
            # Store telemetry for training
            await self.store_telemetry(telemetry_data, anomaly_score, is_anomaly)
            
            # Check for specific anomaly patterns
            anomaly_details = self.analyze_anomaly_patterns(telemetry_data)
            
            result = {
                "anomaly_score": float(anomaly_score),
                "is_anomaly": bool(is_anomaly),
                "confidence": float(confidence),
                "anomaly_details": anomaly_details,
                "timestamp": datetime.now().isoformat(),
                "device_id": telemetry_data.get('deviceId', 'unknown')
            }
            
            # Send real-time alerts if anomaly detected
            if is_anomaly:
                await self.send_anomaly_alert(result)
            
            return result
            
        except Exception as e:
            logger.error(f"Anomaly prediction failed: {e}")
            return {
                "error": str(e),
                "anomaly_score": 0.0,
                "is_anomaly": False,
                "confidence": 0.0
            }

    def extract_features(self, telemetry_data: dict) -> List[float]:
        """Extract numerical features from telemetry data for ML model"""
        telemetry = telemetry_data.get('telemetryData', {})
        
        features = [
            telemetry.get('responseTime', 0),
            telemetry.get('errorRate', 0),
            telemetry.get('uptime', 0),
            telemetry.get('cpuUsage', 0),
            telemetry.get('memoryUsage', 0),
            telemetry.get('rssi', -50),  # Signal strength
            telemetry.get('packetLoss', 0),
            telemetry.get('latency', 0),
            telemetry.get('connectionDrops', 0),
            telemetry.get('temperature', 25),
            telemetry.get('operatingHours', 0),
            telemetry.get('errorCount', 0),
            telemetry.get('performanceScore', 1.0),
            telemetry.get('signalStability', 1.0),
            telemetry.get('connectionQuality', 1.0),
            telemetry.get('degradationRate', 0)
        ]
        
        return features

    def analyze_anomaly_patterns(self, telemetry_data: dict) -> dict:
        """Analyze specific anomaly patterns in telemetry data"""
        telemetry = telemetry_data.get('telemetryData', {})
        patterns = {}
        
        # Flapping device detection
        connection_drops = telemetry.get('connectionDrops', 0)
        if connection_drops > 5:
            patterns['flapping_device'] = {
                'detected': True,
                'severity': 'high' if connection_drops > 10 else 'medium',
                'description': f'Device experiencing frequent disconnections: {connection_drops} drops'
            }
        
        # High latency detection
        latency = telemetry.get('latency', 0)
        if latency > 100:
            patterns['high_latency'] = {
                'detected': True,
                'severity': 'high' if latency > 500 else 'medium',
                'description': f'Abnormally high latency detected: {latency}ms'
            }
        
        # Signal degradation
        rssi = telemetry.get('rssi', -50)
        if rssi < -80:
            patterns['weak_signal'] = {
                'detected': True,
                'severity': 'high' if rssi < -90 else 'medium',
                'description': f'Weak signal strength: {rssi}dBm'
            }
        
        # Performance degradation
        performance_score = telemetry.get('performanceScore', 1.0)
        if performance_score < 0.7:
            patterns['performance_degradation'] = {
                'detected': True,
                'severity': 'high' if performance_score < 0.5 else 'medium',
                'description': f'Performance degradation: {performance_score:.2f}'
            }
        
        # Resource exhaustion
        cpu_usage = telemetry.get('cpuUsage', 0)
        memory_usage = telemetry.get('memoryUsage', 0)
        if cpu_usage > 90 or memory_usage > 90:
            patterns['resource_exhaustion'] = {
                'detected': True,
                'severity': 'high',
                'description': f'High resource usage - CPU: {cpu_usage}%, Memory: {memory_usage}%'
            }
        
        return patterns

    async def store_telemetry(self, telemetry_data: dict, anomaly_score: float, is_anomaly: bool):
        """Store telemetry data in buffer and database"""
        try:
            # Add to buffer
            record = {
                'timestamp': datetime.now().isoformat(),
                'device_id': telemetry_data.get('deviceId', 'unknown'),
                'agent_id': telemetry_data.get('agentId', 'unknown'),
                'telemetry': telemetry_data.get('telemetryData', {}),
                'anomaly_score': anomaly_score,
                'is_anomaly': is_anomaly
            }
            
            self.telemetry_buffer.append(record)
            
            # Trim buffer if too large
            if len(self.telemetry_buffer) > self.max_buffer_size:
                self.telemetry_buffer = self.telemetry_buffer[-self.max_buffer_size:]
            
            # Store in database (if available)
            await self.store_telemetry_db(record)
            
        except Exception as e:
            logger.error(f"Failed to store telemetry: {e}")

    async def store_telemetry_db(self, record: dict):
        """Store telemetry record in PostgreSQL database"""
        try:
            conn = psycopg2.connect(**self.db_config)
            cursor = conn.cursor()
            
            # Create table if not exists
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS device_telemetry (
                    id SERIAL PRIMARY KEY,
                    timestamp TIMESTAMP,
                    device_id VARCHAR(255),
                    agent_id VARCHAR(255),
                    telemetry_data JSONB,
                    anomaly_score FLOAT,
                    is_anomaly BOOLEAN,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Insert record
            cursor.execute("""
                INSERT INTO device_telemetry 
                (timestamp, device_id, agent_id, telemetry_data, anomaly_score, is_anomaly)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                record['timestamp'],
                record['device_id'],
                record['agent_id'],
                json.dumps(record['telemetry']),
                record['anomaly_score'],
                record['is_anomaly']
            ))
            
            conn.commit()
            cursor.close()
            conn.close()
            
        except Exception as e:
            logger.error(f"Database storage failed: {e}")

    async def train_isolation_forest(self):
        """Train IsolationForest model with historical data"""
        try:
            logger.info("Starting IsolationForest training...")
            
            # Get training data from buffer and database
            training_data = await self.get_training_data()
            
            if len(training_data) < 50:
                logger.warning(f"Insufficient training data: {len(training_data)} samples")
                return
            
            # Prepare features
            features = []
            for record in training_data:
                telemetry = record.get('telemetry', {})
                feature_vector = self.extract_features({'telemetryData': telemetry})
                features.append(feature_vector)
            
            features_array = np.array(features)
            
            # Scale features
            features_scaled = self.scaler.fit_transform(features_array)
            
            # Train model
            self.isolation_forest.fit(features_scaled)
            
            # Save models
            os.makedirs('models', exist_ok=True)
            joblib.dump(self.isolation_forest, 'models/isolation_forest.joblib')
            joblib.dump(self.scaler, 'models/scaler.joblib')
            
            logger.info(f"IsolationForest training completed with {len(training_data)} samples")
            
            # Evaluate model
            anomaly_predictions = self.isolation_forest.predict(features_scaled)
            anomaly_count = np.sum(anomaly_predictions == -1)
            
            logger.info(f"Model training complete. Detected {anomaly_count} anomalies in training data")
            
        except Exception as e:
            logger.error(f"Model training failed: {e}")

    async def get_training_data(self) -> List[dict]:
        """Get training data from buffer and database"""
        training_data = []
        
        # Add buffer data
        training_data.extend(self.telemetry_buffer)
        
        # Add database data
        try:
            conn = psycopg2.connect(**self.db_config)
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            # Get last 30 days of data
            cursor.execute("""
                SELECT device_id, agent_id, telemetry_data as telemetry, anomaly_score, is_anomaly
                FROM device_telemetry 
                WHERE created_at > %s
                ORDER BY created_at DESC
                LIMIT 10000
            """, (datetime.now() - timedelta(days=30),))
            
            db_records = cursor.fetchall()
            training_data.extend([dict(record) for record in db_records])
            
            cursor.close()
            conn.close()
            
        except Exception as e:
            logger.error(f"Failed to load training data from database: {e}")
        
        return training_data

    async def get_model_status(self) -> dict:
        """Get current model status and statistics"""
        try:
            model_status = {
                "model_loaded": self.isolation_forest is not None,
                "training_samples": len(self.telemetry_buffer),
                "anomaly_threshold": self.anomaly_threshold,
                "last_trained": "unknown",
                "model_parameters": {}
            }
            
            if self.isolation_forest is not None:
                model_status["model_parameters"] = {
                    "contamination": self.isolation_forest.contamination,
                    "n_estimators": self.isolation_forest.n_estimators,
                    "max_samples": self.isolation_forest.max_samples
                }
            
            # Check for model file timestamp
            if os.path.exists('models/isolation_forest.joblib'):
                model_time = os.path.getmtime('models/isolation_forest.joblib')
                model_status["last_trained"] = datetime.fromtimestamp(model_time).isoformat()
            
            return model_status
            
        except Exception as e:
            logger.error(f"Failed to get model status: {e}")
            return {"error": str(e)}

    async def update_device_fingerprint(self, device_data: dict) -> dict:
        """Update device fingerprint and trust information"""
        try:
            device_id = device_data.get('device_id')
            mac_address = device_data.get('mac_address')
            
            fingerprint = {
                "device_id": device_id,
                "mac_address": mac_address,
                "hostname": device_data.get('hostname', 'unknown'),
                "vendor": device_data.get('vendor', 'unknown'),
                "first_seen": device_data.get('first_seen', datetime.now().isoformat()),
                "last_seen": datetime.now().isoformat(),
                "rssi_signature": device_data.get('rssi_signature', []),
                "trust_level": device_data.get('trust_level', 'unknown'),
                "device_type": device_data.get('device_type', 'unknown'),
                "capabilities": device_data.get('capabilities', [])
            }
            
            self.device_fingerprints[device_id] = fingerprint
            
            # Store in database
            await self.store_device_fingerprint(fingerprint)
            
            return {
                "status": "success",
                "message": f"Device fingerprint updated for {device_id}",
                "fingerprint": fingerprint
            }
            
        except Exception as e:
            logger.error(f"Failed to update device fingerprint: {e}")
            return {"error": str(e)}

    async def store_device_fingerprint(self, fingerprint: dict):
        """Store device fingerprint in database"""
        try:
            conn = psycopg2.connect(**self.db_config)
            cursor = conn.cursor()
            
            # Create table if not exists
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS device_fingerprints (
                    id SERIAL PRIMARY KEY,
                    device_id VARCHAR(255) UNIQUE,
                    mac_address VARCHAR(17),
                    hostname VARCHAR(255),
                    vendor VARCHAR(255),
                    first_seen TIMESTAMP,
                    last_seen TIMESTAMP,
                    rssi_signature JSONB,
                    trust_level VARCHAR(50),
                    device_type VARCHAR(100),
                    capabilities JSONB,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Upsert fingerprint
            cursor.execute("""
                INSERT INTO device_fingerprints 
                (device_id, mac_address, hostname, vendor, first_seen, last_seen, 
                 rssi_signature, trust_level, device_type, capabilities)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (device_id) DO UPDATE SET
                    mac_address = EXCLUDED.mac_address,
                    hostname = EXCLUDED.hostname,
                    vendor = EXCLUDED.vendor,
                    last_seen = EXCLUDED.last_seen,
                    rssi_signature = EXCLUDED.rssi_signature,
                    trust_level = EXCLUDED.trust_level,
                    device_type = EXCLUDED.device_type,
                    capabilities = EXCLUDED.capabilities,
                    updated_at = CURRENT_TIMESTAMP
            """, (
                fingerprint['device_id'],
                fingerprint['mac_address'],
                fingerprint['hostname'],
                fingerprint['vendor'],
                fingerprint['first_seen'],
                fingerprint['last_seen'],
                json.dumps(fingerprint['rssi_signature']),
                fingerprint['trust_level'],
                fingerprint['device_type'],
                json.dumps(fingerprint['capabilities'])
            ))
            
            conn.commit()
            cursor.close()
            conn.close()
            
        except Exception as e:
            logger.error(f"Failed to store device fingerprint: {e}")

    async def get_device_anomalies(self, device_id: str, hours: int = 24) -> dict:
        """Get anomalies for a specific device within time window"""
        try:
            anomalies = []
            cutoff_time = datetime.now() - timedelta(hours=hours)
            
            # Search in buffer
            for record in self.telemetry_buffer:
                record_time = datetime.fromisoformat(record['timestamp'].replace('Z', '+00:00'))
                if (record['device_id'] == device_id and 
                    record['is_anomaly'] and 
                    record_time > cutoff_time):
                    anomalies.append(record)
            
            # Search in database
            try:
                conn = psycopg2.connect(**self.db_config)
                cursor = conn.cursor(cursor_factory=RealDictCursor)
                
                cursor.execute("""
                    SELECT * FROM device_telemetry 
                    WHERE device_id = %s AND is_anomaly = true AND created_at > %s
                    ORDER BY created_at DESC
                """, (device_id, cutoff_time))
                
                db_anomalies = cursor.fetchall()
                anomalies.extend([dict(record) for record in db_anomalies])
                
                cursor.close()
                conn.close()
                
            except Exception as e:
                logger.error(f"Failed to query database for anomalies: {e}")
            
            return {
                "device_id": device_id,
                "time_window_hours": hours,
                "anomaly_count": len(anomalies),
                "anomalies": anomalies
            }
            
        except Exception as e:
            logger.error(f"Failed to get device anomalies: {e}")
            return {"error": str(e)}

    async def set_device_trust(self, device_id: str, trust_level: str) -> dict:
        """Set trust level for a device"""
        try:
            valid_trust_levels = ['trusted', 'guest', 'suspicious', 'unknown']
            if trust_level not in valid_trust_levels:
                raise ValueError(f"Invalid trust level. Must be one of: {valid_trust_levels}")
            
            self.device_trust_levels[device_id] = trust_level
            
            # Update device fingerprint
            if device_id in self.device_fingerprints:
                self.device_fingerprints[device_id]['trust_level'] = trust_level
                await self.store_device_fingerprint(self.device_fingerprints[device_id])
            
            return {
                "device_id": device_id,
                "trust_level": trust_level,
                "status": "updated"
            }
            
        except Exception as e:
            logger.error(f"Failed to set device trust: {e}")
            return {"error": str(e)}

    async def get_network_topology(self) -> dict:
        """Get network topology with device trust and signal information"""
        try:
            topology = {
                "devices": [],
                "trust_summary": {
                    "trusted": 0,
                    "guest": 0,
                    "suspicious": 0,
                    "unknown": 0
                },
                "total_devices": 0,
                "last_updated": datetime.now().isoformat()
            }
            
            # Get devices from fingerprints
            for device_id, fingerprint in self.device_fingerprints.items():
                device_info = {
                    "device_id": device_id,
                    "mac_address": fingerprint.get('mac_address'),
                    "hostname": fingerprint.get('hostname'),
                    "vendor": fingerprint.get('vendor'),
                    "trust_level": fingerprint.get('trust_level', 'unknown'),
                    "device_type": fingerprint.get('device_type'),
                    "last_seen": fingerprint.get('last_seen'),
                    "rssi_signature": fingerprint.get('rssi_signature', [])
                }
                
                # Get latest telemetry
                latest_telemetry = None
                for record in reversed(self.telemetry_buffer):
                    if record['device_id'] == device_id:
                        latest_telemetry = record['telemetry']
                        break
                
                if latest_telemetry:
                    device_info.update({
                        "signal_strength": latest_telemetry.get('rssi', 0),
                        "connection_quality": latest_telemetry.get('connectionQuality', 0),
                        "performance_score": latest_telemetry.get('performanceScore', 0)
                    })
                
                topology["devices"].append(device_info)
                
                # Update trust summary
                trust_level = device_info["trust_level"]
                if trust_level in topology["trust_summary"]:
                    topology["trust_summary"][trust_level] += 1
            
            topology["total_devices"] = len(topology["devices"])
            
            return topology
            
        except Exception as e:
            logger.error(f"Failed to get network topology: {e}")
            return {"error": str(e)}

    async def send_anomaly_alert(self, anomaly_result: dict):
        """Send real-time anomaly alerts via WebSocket"""
        try:
            alert_message = {
                "type": "anomaly_alert",
                "timestamp": datetime.now().isoformat(),
                "device_id": anomaly_result.get('device_id'),
                "anomaly_score": anomaly_result.get('anomaly_score'),
                "confidence": anomaly_result.get('confidence'),
                "anomaly_details": anomaly_result.get('anomaly_details', {}),
                "severity": self.calculate_alert_severity(anomaly_result)
            }
            
            # Send to all connected WebSocket clients
            if self.websocket_connections:
                message = json.dumps(alert_message)
                disconnected = set()
                
                for ws in self.websocket_connections:
                    try:
                        await ws.send_text(message)
                    except:
                        disconnected.add(ws)
                
                # Remove disconnected clients
                self.websocket_connections -= disconnected
            
            logger.info(f"Anomaly alert sent for device {anomaly_result.get('device_id')}")
            
        except Exception as e:
            logger.error(f"Failed to send anomaly alert: {e}")

    def calculate_alert_severity(self, anomaly_result: dict) -> str:
        """Calculate alert severity based on anomaly details"""
        anomaly_details = anomaly_result.get('anomaly_details', {})
        confidence = anomaly_result.get('confidence', 0)
        
        high_severity_patterns = ['flapping_device', 'resource_exhaustion']
        medium_severity_patterns = ['high_latency', 'performance_degradation']
        
        # Check for high severity patterns
        for pattern_name, pattern_data in anomaly_details.items():
            if (pattern_name in high_severity_patterns and 
                pattern_data.get('detected') and 
                pattern_data.get('severity') == 'high'):
                return 'critical'
        
        # Check for medium severity patterns
        for pattern_name, pattern_data in anomaly_details.items():
            if (pattern_name in medium_severity_patterns and 
                pattern_data.get('detected')):
                return 'high' if pattern_data.get('severity') == 'high' else 'medium'
        
        # Base on confidence
        if confidence > 0.8:
            return 'high'
        elif confidence > 0.5:
            return 'medium'
        else:
            return 'low'

    async def handle_websocket_telemetry(self, websocket: WebSocket):
        """Handle WebSocket connections for real-time telemetry"""
        await websocket.accept()
        self.websocket_connections.add(websocket)
        
        try:
            while True:
                # Receive telemetry data
                data = await websocket.receive_text()
                telemetry_data = json.loads(data)
                
                # Process through ML pipeline
                anomaly_result = await self.predict_anomaly(telemetry_data)
                
                # Send result back
                await websocket.send_text(json.dumps(anomaly_result))
                
        except WebSocketDisconnect:
            self.websocket_connections.discard(websocket)
        except Exception as e:
            logger.error(f"WebSocket error: {e}")
            self.websocket_connections.discard(websocket)

# Create global service instance
ml_service = MLInferenceService()
app = ml_service.app

if __name__ == "__main__":
    uvicorn.run(
        "ml_inference_service:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )