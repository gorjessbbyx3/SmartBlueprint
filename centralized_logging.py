#!/usr/bin/env python3
"""
SmartBlueprint Pro - Centralized Logging System
Aggregates logs from desktop agents and ML services for debugging and monitoring
"""

import asyncio
import json
import logging
import os
from datetime import datetime, timedelta
import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('centralized_logging.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class CentralizedLoggingSystem:
    def __init__(self):
        self.app = FastAPI(title="SmartBlueprint Pro Centralized Logging", version="2.0.0")
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
        
        # Log aggregation buffers
        self.log_buffer = []
        self.max_buffer_size = 10000
        self.alert_buffer = []
        self.performance_metrics = {}
        
        # WebSocket connections for real-time log streaming
        self.websocket_connections = set()
        
        # Initialize database
        self.init_database()
        
        logger.info("Centralized Logging System initialized")

    def setup_cors(self):
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    def setup_routes(self):
        @self.app.post("/api/logs/ingest")
        async def ingest_logs(log_data: dict):
            return await self.ingest_logs(log_data)
        
        @self.app.get("/api/logs/search")
        async def search_logs(
            query: str = "",
            level: str = "all",
            source: str = "all",
            start_time: str = "",
            end_time: str = "",
            limit: int = 1000
        ):
            return await self.search_logs(query, level, source, start_time, end_time, limit)
        
        @self.app.get("/api/logs/alerts")
        async def get_alerts(hours: int = 24):
            return await self.get_alerts(hours)
        
        @self.app.get("/api/logs/performance")
        async def get_performance_metrics():
            return await self.get_performance_metrics()
        
        @self.app.get("/api/logs/agents")
        async def get_agent_status():
            return await self.get_agent_status()
        
        @self.app.post("/api/logs/alert")
        async def create_alert(alert_data: dict):
            return await self.create_alert(alert_data)
        
        @self.app.get("/api/logs/statistics")
        async def get_statistics(hours: int = 24):
            return await self.get_log_statistics(hours)
        
        @self.app.websocket("/ws/logs")
        async def websocket_logs(websocket):
            await self.handle_websocket_logs(websocket)

    def init_database(self):
        """Initialize database tables for log storage"""
        try:
            conn = psycopg2.connect(**self.db_config)
            cursor = conn.cursor()
            
            # Create logs table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS system_logs (
                    id SERIAL PRIMARY KEY,
                    timestamp TIMESTAMP,
                    level VARCHAR(20),
                    source VARCHAR(100),
                    agent_id VARCHAR(100),
                    message TEXT,
                    metadata JSONB,
                    error_trace TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create alerts table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS log_alerts (
                    id SERIAL PRIMARY KEY,
                    alert_type VARCHAR(50),
                    severity VARCHAR(20),
                    title VARCHAR(255),
                    description TEXT,
                    source VARCHAR(100),
                    agent_id VARCHAR(100),
                    metadata JSONB,
                    resolved BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    resolved_at TIMESTAMP
                )
            """)
            
            # Create performance metrics table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS performance_metrics (
                    id SERIAL PRIMARY KEY,
                    metric_name VARCHAR(100),
                    metric_value FLOAT,
                    source VARCHAR(100),
                    agent_id VARCHAR(100),
                    timestamp TIMESTAMP,
                    metadata JSONB,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create agent status table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS agent_status (
                    id SERIAL PRIMARY KEY,
                    agent_id VARCHAR(100) UNIQUE,
                    agent_type VARCHAR(50),
                    status VARCHAR(20),
                    last_heartbeat TIMESTAMP,
                    version VARCHAR(20),
                    capabilities TEXT[],
                    system_info JSONB,
                    error_count INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create indexes for better performance
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON system_logs(timestamp)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_logs_level ON system_logs(level)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_logs_source ON system_logs(source)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_alerts_created ON log_alerts(created_at)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON performance_metrics(timestamp)")
            
            conn.commit()
            cursor.close()
            conn.close()
            
            logger.info("Database tables initialized")
            
        except Exception as e:
            logger.error(f"Database initialization failed: {e}")

    async def ingest_logs(self, log_data: dict) -> dict:
        """Ingest logs from agents and services"""
        try:
            # Extract log information
            log_entry = {
                'timestamp': log_data.get('timestamp', datetime.now().isoformat()),
                'level': log_data.get('level', 'INFO'),
                'source': log_data.get('source', 'unknown'),
                'agent_id': log_data.get('agent_id', 'unknown'),
                'message': log_data.get('message', ''),
                'metadata': log_data.get('metadata', {}),
                'error_trace': log_data.get('error_trace', None)
            }
            
            # Add to buffer
            self.log_buffer.append(log_entry)
            
            # Trim buffer if too large
            if len(self.log_buffer) > self.max_buffer_size:
                self.log_buffer = self.log_buffer[-self.max_buffer_size:]
            
            # Store in database
            await self.store_log_entry(log_entry)
            
            # Check for alert conditions
            await self.check_alert_conditions(log_entry)
            
            # Update agent status
            await self.update_agent_status(log_entry)
            
            # Stream to WebSocket clients
            await self.stream_log_to_clients(log_entry)
            
            return {"status": "success", "message": "Log ingested successfully"}
            
        except Exception as e:
            logger.error(f"Log ingestion failed: {e}")
            return {"error": str(e)}

    async def store_log_entry(self, log_entry: dict):
        """Store log entry in database"""
        try:
            conn = psycopg2.connect(**self.db_config)
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO system_logs 
                (timestamp, level, source, agent_id, message, metadata, error_trace)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                log_entry['timestamp'],
                log_entry['level'],
                log_entry['source'],
                log_entry['agent_id'],
                log_entry['message'],
                json.dumps(log_entry['metadata']),
                log_entry['error_trace']
            ))
            
            conn.commit()
            cursor.close()
            conn.close()
            
        except Exception as e:
            logger.error(f"Failed to store log entry: {e}")

    async def check_alert_conditions(self, log_entry: dict):
        """Check if log entry triggers any alert conditions"""
        try:
            level = log_entry.get('level', '').upper()
            message = log_entry.get('message', '').lower()
            source = log_entry.get('source', '')
            
            # Error level alerts
            if level in ['ERROR', 'CRITICAL']:
                await self.create_alert({
                    'alert_type': 'error_log',
                    'severity': 'high' if level == 'CRITICAL' else 'medium',
                    'title': f'{level} in {source}',
                    'description': log_entry.get('message', ''),
                    'source': source,
                    'agent_id': log_entry.get('agent_id'),
                    'metadata': log_entry.get('metadata', {})
                })
            
            # Connection failure alerts
            if any(keyword in message for keyword in ['connection failed', 'websocket error', 'timeout']):
                await self.create_alert({
                    'alert_type': 'connection_failure',
                    'severity': 'medium',
                    'title': f'Connection issue in {source}',
                    'description': log_entry.get('message', ''),
                    'source': source,
                    'agent_id': log_entry.get('agent_id'),
                    'metadata': log_entry.get('metadata', {})
                })
            
            # Performance alerts
            if any(keyword in message for keyword in ['slow response', 'high latency', 'performance degradation']):
                await self.create_alert({
                    'alert_type': 'performance_issue',
                    'severity': 'low',
                    'title': f'Performance issue in {source}',
                    'description': log_entry.get('message', ''),
                    'source': source,
                    'agent_id': log_entry.get('agent_id'),
                    'metadata': log_entry.get('metadata', {})
                })
            
        except Exception as e:
            logger.error(f"Alert condition check failed: {e}")

    async def create_alert(self, alert_data: dict) -> dict:
        """Create a new alert"""
        try:
            alert = {
                'alert_type': alert_data.get('alert_type', 'general'),
                'severity': alert_data.get('severity', 'low'),
                'title': alert_data.get('title', 'Alert'),
                'description': alert_data.get('description', ''),
                'source': alert_data.get('source', 'unknown'),
                'agent_id': alert_data.get('agent_id', 'unknown'),
                'metadata': alert_data.get('metadata', {}),
                'created_at': datetime.now().isoformat()
            }
            
            # Add to buffer
            self.alert_buffer.append(alert)
            
            # Store in database
            conn = psycopg2.connect(**self.db_config)
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO log_alerts 
                (alert_type, severity, title, description, source, agent_id, metadata)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                alert['alert_type'],
                alert['severity'],
                alert['title'],
                alert['description'],
                alert['source'],
                alert['agent_id'],
                json.dumps(alert['metadata'])
            ))
            
            alert_id = cursor.fetchone()[0]
            alert['id'] = alert_id
            
            conn.commit()
            cursor.close()
            conn.close()
            
            # Stream alert to WebSocket clients
            await self.stream_alert_to_clients(alert)
            
            logger.info(f"Alert created: {alert['title']}")
            
            return {"status": "success", "alert_id": alert_id, "alert": alert}
            
        except Exception as e:
            logger.error(f"Alert creation failed: {e}")
            return {"error": str(e)}

    async def update_agent_status(self, log_entry: dict):
        """Update agent status based on log entry"""
        try:
            agent_id = log_entry.get('agent_id')
            if not agent_id or agent_id == 'unknown':
                return
            
            source = log_entry.get('source', '')
            level = log_entry.get('level', '').upper()
            
            # Determine agent type from source
            agent_type = 'unknown'
            if 'ping' in source.lower():
                agent_type = 'ping_agent'
            elif 'enhanced' in source.lower() or 'desktop' in source.lower():
                agent_type = 'desktop_agent'
            elif 'ml' in source.lower():
                agent_type = 'ml_service'
            
            # Determine status
            status = 'active'
            if level in ['ERROR', 'CRITICAL']:
                status = 'error'
            elif 'stopping' in log_entry.get('message', '').lower():
                status = 'stopped'
            elif 'starting' in log_entry.get('message', '').lower():
                status = 'starting'
            
            # Update database
            conn = psycopg2.connect(**self.db_config)
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO agent_status 
                (agent_id, agent_type, status, last_heartbeat)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (agent_id) DO UPDATE SET
                    status = EXCLUDED.status,
                    last_heartbeat = EXCLUDED.last_heartbeat,
                    updated_at = CURRENT_TIMESTAMP
            """, (agent_id, agent_type, status, datetime.now()))
            
            # Update error count for error logs
            if level in ['ERROR', 'CRITICAL']:
                cursor.execute("""
                    UPDATE agent_status 
                    SET error_count = error_count + 1 
                    WHERE agent_id = %s
                """, (agent_id,))
            
            conn.commit()
            cursor.close()
            conn.close()
            
        except Exception as e:
            logger.error(f"Agent status update failed: {e}")

    async def search_logs(self, query: str, level: str, source: str, start_time: str, end_time: str, limit: int) -> dict:
        """Search logs with filters"""
        try:
            conn = psycopg2.connect(**self.db_config)
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            # Build query
            where_conditions = []
            params = []
            
            if query:
                where_conditions.append("message ILIKE %s")
                params.append(f"%{query}%")
            
            if level != "all":
                where_conditions.append("level = %s")
                params.append(level.upper())
            
            if source != "all":
                where_conditions.append("source = %s")
                params.append(source)
            
            if start_time:
                where_conditions.append("timestamp >= %s")
                params.append(start_time)
            
            if end_time:
                where_conditions.append("timestamp <= %s")
                params.append(end_time)
            
            where_clause = ""
            if where_conditions:
                where_clause = "WHERE " + " AND ".join(where_conditions)
            
            query_sql = f"""
                SELECT * FROM system_logs 
                {where_clause}
                ORDER BY timestamp DESC 
                LIMIT %s
            """
            params.append(limit)
            
            cursor.execute(query_sql, params)
            logs = [dict(record) for record in cursor.fetchall()]
            
            cursor.close()
            conn.close()
            
            return {
                "logs": logs,
                "count": len(logs),
                "query_params": {
                    "query": query,
                    "level": level,
                    "source": source,
                    "start_time": start_time,
                    "end_time": end_time,
                    "limit": limit
                }
            }
            
        except Exception as e:
            logger.error(f"Log search failed: {e}")
            return {"error": str(e)}

    async def get_alerts(self, hours: int) -> dict:
        """Get alerts within time window"""
        try:
            conn = psycopg2.connect(**self.db_config)
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            cutoff_time = datetime.now() - timedelta(hours=hours)
            
            cursor.execute("""
                SELECT * FROM log_alerts 
                WHERE created_at > %s
                ORDER BY created_at DESC
            """, (cutoff_time,))
            
            alerts = [dict(record) for record in cursor.fetchall()]
            
            # Get alert summary
            cursor.execute("""
                SELECT severity, COUNT(*) as count
                FROM log_alerts 
                WHERE created_at > %s AND resolved = false
                GROUP BY severity
            """, (cutoff_time,))
            
            severity_summary = {row['severity']: row['count'] for row in cursor.fetchall()}
            
            cursor.close()
            conn.close()
            
            return {
                "alerts": alerts,
                "total_alerts": len(alerts),
                "unresolved_count": sum(1 for alert in alerts if not alert.get('resolved', False)),
                "severity_summary": severity_summary,
                "time_window_hours": hours
            }
            
        except Exception as e:
            logger.error(f"Get alerts failed: {e}")
            return {"error": str(e)}

    async def get_performance_metrics(self) -> dict:
        """Get performance metrics summary"""
        try:
            conn = psycopg2.connect(**self.db_config)
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            # Get recent performance metrics
            cursor.execute("""
                SELECT metric_name, AVG(metric_value) as avg_value, 
                       MAX(metric_value) as max_value, MIN(metric_value) as min_value,
                       COUNT(*) as sample_count
                FROM performance_metrics 
                WHERE timestamp > %s
                GROUP BY metric_name
                ORDER BY metric_name
            """, (datetime.now() - timedelta(hours=24),))
            
            metrics = [dict(record) for record in cursor.fetchall()]
            
            # Get log volume by hour
            cursor.execute("""
                SELECT DATE_TRUNC('hour', timestamp) as hour, 
                       COUNT(*) as log_count,
                       COUNT(CASE WHEN level = 'ERROR' THEN 1 END) as error_count
                FROM system_logs 
                WHERE timestamp > %s
                GROUP BY hour
                ORDER BY hour DESC
                LIMIT 24
            """, (datetime.now() - timedelta(hours=24),))
            
            log_volume = [dict(record) for record in cursor.fetchall()]
            
            cursor.close()
            conn.close()
            
            return {
                "performance_metrics": metrics,
                "log_volume": log_volume,
                "last_updated": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Get performance metrics failed: {e}")
            return {"error": str(e)}

    async def get_agent_status(self) -> dict:
        """Get status of all agents"""
        try:
            conn = psycopg2.connect(**self.db_config)
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            cursor.execute("""
                SELECT *, 
                       EXTRACT(EPOCH FROM (NOW() - last_heartbeat)) as seconds_since_heartbeat
                FROM agent_status
                ORDER BY last_heartbeat DESC
            """)
            
            agents = [dict(record) for record in cursor.fetchall()]
            
            # Classify agents as online/offline based on heartbeat
            for agent in agents:
                seconds_since = agent.get('seconds_since_heartbeat', 0)
                if seconds_since > 300:  # 5 minutes
                    agent['status'] = 'offline'
                elif seconds_since > 120:  # 2 minutes
                    agent['status'] = 'stale'
            
            # Get summary
            status_summary = {}
            for agent in agents:
                status = agent.get('status', 'unknown')
                status_summary[status] = status_summary.get(status, 0) + 1
            
            cursor.close()
            conn.close()
            
            return {
                "agents": agents,
                "total_agents": len(agents),
                "status_summary": status_summary,
                "last_updated": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Get agent status failed: {e}")
            return {"error": str(e)}

    async def get_log_statistics(self, hours: int) -> dict:
        """Get log statistics for time window"""
        try:
            conn = psycopg2.connect(**self.db_config)
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            cutoff_time = datetime.now() - timedelta(hours=hours)
            
            # Get log counts by level
            cursor.execute("""
                SELECT level, COUNT(*) as count
                FROM system_logs 
                WHERE timestamp > %s
                GROUP BY level
                ORDER BY count DESC
            """, (cutoff_time,))
            
            level_stats = [dict(record) for record in cursor.fetchall()]
            
            # Get log counts by source
            cursor.execute("""
                SELECT source, COUNT(*) as count
                FROM system_logs 
                WHERE timestamp > %s
                GROUP BY source
                ORDER BY count DESC
            """, (cutoff_time,))
            
            source_stats = [dict(record) for record in cursor.fetchall()]
            
            # Get error trends
            cursor.execute("""
                SELECT DATE_TRUNC('hour', timestamp) as hour, 
                       COUNT(CASE WHEN level IN ('ERROR', 'CRITICAL') THEN 1 END) as error_count
                FROM system_logs 
                WHERE timestamp > %s
                GROUP BY hour
                ORDER BY hour
            """, (cutoff_time,))
            
            error_trends = [dict(record) for record in cursor.fetchall()]
            
            cursor.close()
            conn.close()
            
            return {
                "level_statistics": level_stats,
                "source_statistics": source_stats,
                "error_trends": error_trends,
                "time_window_hours": hours,
                "generated_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Get log statistics failed: {e}")
            return {"error": str(e)}

    async def stream_log_to_clients(self, log_entry: dict):
        """Stream log entry to WebSocket clients"""
        try:
            if not self.websocket_connections:
                return
            
            message = {
                "type": "log_entry",
                "data": log_entry,
                "timestamp": datetime.now().isoformat()
            }
            
            message_str = json.dumps(message)
            disconnected = set()
            
            for ws in self.websocket_connections:
                try:
                    await ws.send_text(message_str)
                except:
                    disconnected.add(ws)
            
            # Remove disconnected clients
            self.websocket_connections -= disconnected
            
        except Exception as e:
            logger.error(f"Failed to stream log to clients: {e}")

    async def stream_alert_to_clients(self, alert: dict):
        """Stream alert to WebSocket clients"""
        try:
            if not self.websocket_connections:
                return
            
            message = {
                "type": "alert",
                "data": alert,
                "timestamp": datetime.now().isoformat()
            }
            
            message_str = json.dumps(message)
            disconnected = set()
            
            for ws in self.websocket_connections:
                try:
                    await ws.send_text(message_str)
                except:
                    disconnected.add(ws)
            
            # Remove disconnected clients
            self.websocket_connections -= disconnected
            
        except Exception as e:
            logger.error(f"Failed to stream alert to clients: {e}")

    async def handle_websocket_logs(self, websocket):
        """Handle WebSocket connections for real-time log streaming"""
        try:
            await websocket.accept()
            self.websocket_connections.add(websocket)
            
            # Send recent logs on connection
            recent_logs = self.log_buffer[-50:] if len(self.log_buffer) > 50 else self.log_buffer
            for log_entry in recent_logs:
                await websocket.send_text(json.dumps({
                    "type": "log_entry",
                    "data": log_entry,
                    "timestamp": datetime.now().isoformat()
                }))
            
            # Keep connection alive
            while True:
                await asyncio.sleep(30)
                await websocket.send_text(json.dumps({
                    "type": "heartbeat",
                    "timestamp": datetime.now().isoformat()
                }))
                
        except Exception as e:
            logger.error(f"WebSocket error: {e}")
        finally:
            self.websocket_connections.discard(websocket)

# Create global logging service instance
logging_service = CentralizedLoggingSystem()
app = logging_service.app

if __name__ == "__main__":
    uvicorn.run(
        "centralized_logging:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )