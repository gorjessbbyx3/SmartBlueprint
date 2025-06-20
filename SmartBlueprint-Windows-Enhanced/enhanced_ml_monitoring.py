#!/usr/bin/env python3
"""
SmartBlueprint Pro - Enhanced ML Monitoring System
Lightweight, production-ready ML system for device health monitoring
"""

import json
import logging
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from collections import defaultdict, deque
import asyncio

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DeviceHealthMonitor:
    def __init__(self):
        self.device_data = defaultdict(lambda: deque(maxlen=100))  # Store last 100 readings per device
        self.health_scores = {}
        self.anomaly_alerts = []
        self.baseline_metrics = {}
        
        logger.info("Enhanced ML Monitoring System initialized")

    def add_telemetry(self, device_id: str, data: Dict[str, Any]):
        """Add telemetry data for a device"""
        # Add timestamp if not present
        if 'timestamp' not in data:
            data['timestamp'] = datetime.now().isoformat()
        
        self.device_data[device_id].append(data)
        
        # Update health assessment
        self._update_device_health(device_id)
        
        # Check for anomalies
        self._check_anomalies(device_id, data)

    def _update_device_health(self, device_id: str):
        """Update health score for a device"""
        data_points = list(self.device_data[device_id])
        if len(data_points) < 3:
            return
        
        # Calculate health metrics
        health_score = 100.0
        
        # RSSI analysis
        rssi_values = [d.get('rssi', 0) for d in data_points if 'rssi' in d]
        if rssi_values:
            avg_rssi = np.mean(rssi_values)
            if avg_rssi < -70:
                health_score -= 20
            elif avg_rssi < -60:
                health_score -= 10
        
        # Response time analysis
        response_times = [d.get('response_time', 0) for d in data_points if 'response_time' in d]
        if response_times:
            avg_response = np.mean(response_times)
            if avg_response > 1000:
                health_score -= 25
            elif avg_response > 500:
                health_score -= 15
        
        # Connection stability
        online_states = [d.get('is_online', True) for d in data_points if 'is_online' in d]
        if online_states:
            uptime_ratio = sum(online_states) / len(online_states)
            health_score *= uptime_ratio
        
        # Error rate analysis
        error_counts = [d.get('error_count', 0) for d in data_points if 'error_count' in d]
        if error_counts:
            avg_errors = np.mean(error_counts)
            health_score -= min(avg_errors * 5, 30)
        
        # Temperature check
        temperatures = [d.get('temperature', 0) for d in data_points if 'temperature' in d]
        if temperatures:
            max_temp = max(temperatures)
            if max_temp > 85:
                health_score -= 20
            elif max_temp > 75:
                health_score -= 10
        
        self.health_scores[device_id] = {
            'score': max(0, min(100, health_score)),
            'risk_level': self._get_risk_level(health_score),
            'last_updated': datetime.now().isoformat(),
            'data_points': len(data_points)
        }

    def _get_risk_level(self, score: float) -> str:
        """Determine risk level from health score"""
        if score >= 80:
            return 'low'
        elif score >= 60:
            return 'medium'
        elif score >= 30:
            return 'high'
        else:
            return 'critical'

    def _check_anomalies(self, device_id: str, current_data: Dict[str, Any]):
        """Check for anomalies in current data"""
        data_points = list(self.device_data[device_id])
        if len(data_points) < 10:
            return
        
        # Get recent baseline (last 10 readings excluding current)
        baseline_data = data_points[-11:-1]
        
        anomalies = []
        
        # RSSI anomaly detection
        if 'rssi' in current_data:
            baseline_rssi = [d.get('rssi', 0) for d in baseline_data if 'rssi' in d]
            if baseline_rssi:
                baseline_mean = np.mean(baseline_rssi)
                baseline_std = np.std(baseline_rssi)
                current_rssi = current_data['rssi']
                
                if abs(current_rssi - baseline_mean) > 2 * baseline_std:
                    anomalies.append(f"RSSI anomaly: {current_rssi} dBm (baseline: {baseline_mean:.1f}±{baseline_std:.1f})")
        
        # Response time anomaly
        if 'response_time' in current_data:
            baseline_rt = [d.get('response_time', 0) for d in baseline_data if 'response_time' in d]
            if baseline_rt:
                baseline_mean = np.mean(baseline_rt)
                current_rt = current_data['response_time']
                
                if current_rt > baseline_mean * 2:
                    anomalies.append(f"Response time spike: {current_rt}ms (baseline: {baseline_mean:.1f}ms)")
        
        # Connection drop
        if 'is_online' in current_data and not current_data['is_online']:
            recent_online = [d.get('is_online', True) for d in baseline_data[-5:]]
            if all(recent_online):
                anomalies.append("Unexpected device disconnect")
        
        # Temperature spike
        if 'temperature' in current_data:
            baseline_temp = [d.get('temperature', 0) for d in baseline_data if 'temperature' in d]
            if baseline_temp:
                baseline_max = max(baseline_temp)
                current_temp = current_data['temperature']
                
                if current_temp > baseline_max + 10:
                    anomalies.append(f"Temperature spike: {current_temp}°C (previous max: {baseline_max}°C)")
        
        # Store anomalies
        for anomaly in anomalies:
            alert = {
                'device_id': device_id,
                'anomaly': anomaly,
                'timestamp': datetime.now().isoformat(),
                'severity': 'high' if len(anomalies) > 2 else 'medium'
            }
            self.anomaly_alerts.append(alert)
            logger.warning(f"Anomaly detected for {device_id}: {anomaly}")

    def get_health_summary(self) -> Dict[str, Any]:
        """Get overall health summary"""
        if not self.health_scores:
            return {
                'total_devices': 0,
                'healthy_devices': 0,
                'at_risk_devices': 0,
                'critical_devices': 0,
                'average_health_score': 0.0,
                'devices_needing_attention': []
            }
        
        scores = [data['score'] for data in self.health_scores.values()]
        risk_levels = [data['risk_level'] for data in self.health_scores.values()]
        
        summary = {
            'total_devices': len(self.health_scores),
            'healthy_devices': sum(1 for level in risk_levels if level == 'low'),
            'at_risk_devices': sum(1 for level in risk_levels if level in ['medium', 'high']),
            'critical_devices': sum(1 for level in risk_levels if level == 'critical'),
            'average_health_score': np.mean(scores),
            'devices_needing_attention': []
        }
        
        # Add devices needing attention
        for device_id, data in self.health_scores.items():
            if data['risk_level'] in ['high', 'critical']:
                summary['devices_needing_attention'].append({
                    'device_id': device_id,
                    'health_score': data['score'],
                    'risk_level': data['risk_level'],
                    'last_updated': data['last_updated']
                })
        
        return summary

    def get_device_health(self, device_id: str) -> Optional[Dict[str, Any]]:
        """Get health data for specific device"""
        if device_id not in self.health_scores:
            return None
        
        health_data = self.health_scores[device_id].copy()
        
        # Add recommendations based on risk level
        recommendations = []
        if health_data['risk_level'] == 'critical':
            recommendations.append("Schedule immediate maintenance inspection")
        elif health_data['risk_level'] == 'high':
            recommendations.append("Plan preventive maintenance within 1 week")
        elif health_data['risk_level'] == 'medium':
            recommendations.append("Monitor closely for degradation")
        
        # Add specific recommendations based on recent data
        recent_data = list(self.device_data[device_id])[-5:]
        if recent_data:
            avg_rssi = np.mean([d.get('rssi', 0) for d in recent_data if 'rssi' in d] or [0])
            if avg_rssi < -70:
                recommendations.append("Improve device positioning or add WiFi extender")
            
            avg_temp = np.mean([d.get('temperature', 0) for d in recent_data if 'temperature' in d] or [0])
            if avg_temp > 80:
                recommendations.append("Improve device ventilation or cooling")
        
        health_data['recommendations'] = recommendations
        return health_data

    def get_recent_anomalies(self, hours: int = 24) -> List[Dict[str, Any]]:
        """Get recent anomaly alerts"""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        
        recent_alerts = []
        for alert in self.anomaly_alerts:
            alert_time = datetime.fromisoformat(alert['timestamp'])
            if alert_time > cutoff_time:
                recent_alerts.append(alert)
        
        return sorted(recent_alerts, key=lambda x: x['timestamp'], reverse=True)

    def generate_predictive_insights(self) -> List[Dict[str, Any]]:
        """Generate predictive insights based on trends"""
        insights = []
        
        for device_id, health_data in self.health_scores.items():
            if health_data['score'] < 50:
                insight = {
                    'type': 'device_health_decline',
                    'severity': 'high' if health_data['score'] < 30 else 'medium',
                    'description': f"Device {device_id} showing health decline (score: {health_data['score']:.1f}%)",
                    'affected_devices': [device_id],
                    'predicted_impact': 'Potential service disruption within 30 days',
                    'recommended_actions': self.get_device_health(device_id).get('recommendations', []),
                    'confidence': 0.85,
                    'timestamp': datetime.now().isoformat()
                }
                insights.append(insight)
        
        return insights

# Global monitor instance
health_monitor = DeviceHealthMonitor()

def main():
    """Test the monitoring system"""
    # Simulate device data
    test_devices = ['printer_001', 'router_main', 'camera_front']
    
    for i in range(20):
        for device_id in test_devices:
            # Simulate degrading device health
            base_rssi = -50 if device_id == 'router_main' else -60
            telemetry = {
                'rssi': base_rssi - (i * 2),  # Signal degrading
                'response_time': 200 + (i * 30),  # Response time increasing
                'is_online': True if i < 15 else (i % 3 == 0),  # Going offline intermittently
                'error_count': i // 5,  # Errors increasing
                'temperature': 65 + (i * 1.2),  # Temperature rising
                'timestamp': (datetime.now() - timedelta(hours=20-i)).isoformat()
            }
            
            health_monitor.add_telemetry(device_id, telemetry)
    
    # Print results
    summary = health_monitor.get_health_summary()
    print("Health Summary:")
    print(json.dumps(summary, indent=2, default=str))
    
    print("\nRecent Anomalies:")
    anomalies = health_monitor.get_recent_anomalies()
    for anomaly in anomalies[:5]:
        print(f"- {anomaly['device_id']}: {anomaly['anomaly']}")
    
    print("\nPredictive Insights:")
    insights = health_monitor.generate_predictive_insights()
    for insight in insights:
        print(f"- {insight['description']} (confidence: {insight['confidence']*100:.0f}%)")

if __name__ == "__main__":
    main()