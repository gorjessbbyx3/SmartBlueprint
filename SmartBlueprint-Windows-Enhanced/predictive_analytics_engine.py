#!/usr/bin/env python3
"""
SmartBlueprint Pro - Advanced Predictive Analytics Engine
Real-time failure prediction, performance optimization, and intelligent recommendations
"""

import asyncio
import json
import logging
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score
import warnings
warnings.filterwarnings('ignore')

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class DeviceHealth:
    device_id: str
    health_score: float  # 0-100
    risk_level: str  # 'low', 'medium', 'high', 'critical'
    predicted_failure_date: Optional[datetime]
    confidence: float
    contributing_factors: List[str]
    recommendations: List[str]
    last_updated: datetime

@dataclass
class PredictiveInsight:
    insight_type: str
    severity: str
    description: str
    affected_devices: List[str]
    predicted_impact: str
    recommended_actions: List[str]
    confidence: float
    timestamp: datetime

class PredictiveAnalyticsEngine:
    def __init__(self):
        self.device_history = {}  # device_id -> historical data
        self.health_models = {}   # device_type -> trained model
        self.scalers = {}        # device_type -> scaler
        self.device_health = {}  # device_id -> DeviceHealth
        self.insights = []       # List of PredictiveInsight
        
        # Model parameters
        self.failure_threshold = 30  # Health score below which failure is predicted
        self.prediction_window_days = 30
        self.min_data_points = 10
        
        logger.info("Predictive Analytics Engine initialized")

    def add_device_telemetry(self, device_id: str, telemetry: Dict[str, Any]):
        """Add new telemetry data for a device"""
        if device_id not in self.device_history:
            self.device_history[device_id] = []
        
        # Add timestamp if not present
        if 'timestamp' not in telemetry:
            telemetry['timestamp'] = datetime.now()
        
        self.device_history[device_id].append(telemetry)
        
        # Keep only recent data (last 30 days)
        cutoff_date = datetime.now() - timedelta(days=30)
        self.device_history[device_id] = [
            data for data in self.device_history[device_id]
            if data['timestamp'] > cutoff_date
        ]
        
        # Update health assessment if we have enough data
        if len(self.device_history[device_id]) >= self.min_data_points:
            asyncio.create_task(self.update_device_health(device_id))

    async def update_device_health(self, device_id: str):
        """Update health assessment for a specific device"""
        try:
            history = self.device_history.get(device_id, [])
            if len(history) < self.min_data_points:
                return
            
            # Extract features for health assessment
            features = self.extract_health_features(history)
            
            # Calculate base health score
            health_score = self.calculate_health_score(features)
            
            # Determine risk level
            risk_level = self.determine_risk_level(health_score)
            
            # Predict failure date
            failure_date, confidence = self.predict_failure_date(device_id, features)
            
            # Identify contributing factors
            factors = self.identify_health_factors(features)
            
            # Generate recommendations
            recommendations = self.generate_recommendations(device_id, features, health_score)
            
            # Update device health record
            self.device_health[device_id] = DeviceHealth(
                device_id=device_id,
                health_score=health_score,
                risk_level=risk_level,
                predicted_failure_date=failure_date,
                confidence=confidence,
                contributing_factors=factors,
                recommendations=recommendations,
                last_updated=datetime.now()
            )
            
            # Generate insights if needed
            if health_score < 50:
                await self.generate_predictive_insight(device_id, health_score)
                
        except Exception as e:
            logger.error(f"Error updating device health for {device_id}: {e}")

    def extract_health_features(self, history: List[Dict]) -> Dict[str, float]:
        """Extract health-related features from device history"""
        features = {}
        
        # Convert to DataFrame for easier analysis
        df = pd.DataFrame(history)
        
        # Connection stability features
        if 'rssi' in df.columns:
            features['rssi_mean'] = df['rssi'].mean()
            features['rssi_std'] = df['rssi'].std()
            features['rssi_trend'] = self.calculate_trend(df['rssi'].values)
        
        # Response time features
        if 'response_time' in df.columns:
            features['response_time_mean'] = df['response_time'].mean()
            features['response_time_std'] = df['response_time'].std()
            features['response_time_trend'] = self.calculate_trend(df['response_time'].values)
        
        # Availability features
        if 'is_online' in df.columns:
            features['uptime_ratio'] = df['is_online'].mean()
            features['disconnect_events'] = (df['is_online'].diff() == -1).sum()
        
        # Traffic patterns
        if 'bytes_sent' in df.columns and 'bytes_received' in df.columns:
            features['traffic_volume'] = (df['bytes_sent'] + df['bytes_received']).mean()
            features['traffic_variance'] = (df['bytes_sent'] + df['bytes_received']).var()
        
        # Error rates
        if 'error_count' in df.columns:
            features['error_rate'] = df['error_count'].sum() / len(df)
            features['error_trend'] = self.calculate_trend(df['error_count'].values)
        
        # Temperature and power (if available)
        if 'temperature' in df.columns:
            features['temp_mean'] = df['temperature'].mean()
            features['temp_max'] = df['temperature'].max()
        
        if 'power_consumption' in df.columns:
            features['power_mean'] = df['power_consumption'].mean()
            features['power_trend'] = self.calculate_trend(df['power_consumption'].values)
        
        return features

    def calculate_trend(self, values: np.ndarray) -> float:
        """Calculate trend (slope) of values over time"""
        if len(values) < 2:
            return 0.0
        
        x = np.arange(len(values))
        coeffs = np.polyfit(x, values, 1)
        return coeffs[0]  # Return slope

    def calculate_health_score(self, features: Dict[str, float]) -> float:
        """Calculate overall health score (0-100) based on features"""
        score = 100.0
        
        # RSSI health impact (signal strength)
        if 'rssi_mean' in features:
            rssi = features['rssi_mean']
            if rssi < -70:  # Poor signal
                score -= 20
            elif rssi < -60:  # Fair signal
                score -= 10
            
            # Signal instability
            if 'rssi_std' in features and features['rssi_std'] > 10:
                score -= 15

        # Response time impact
        if 'response_time_mean' in features:
            rt = features['response_time_mean']
            if rt > 1000:  # Slow response
                score -= 25
            elif rt > 500:
                score -= 15
            
            # Response time getting worse
            if 'response_time_trend' in features and features['response_time_trend'] > 0:
                score -= 10

        # Availability impact
        if 'uptime_ratio' in features:
            uptime = features['uptime_ratio']
            score *= uptime  # Direct multiplier for availability
            
        if 'disconnect_events' in features:
            disconnects = features['disconnect_events']
            score -= min(disconnects * 5, 30)  # Cap at 30 point deduction

        # Error rate impact
        if 'error_rate' in features:
            error_rate = features['error_rate']
            score -= min(error_rate * 100, 40)  # Cap at 40 point deduction

        # Temperature issues
        if 'temp_max' in features and features['temp_max'] > 85:
            score -= 20  # Overheating concern

        # Power consumption trends
        if 'power_trend' in features and features['power_trend'] > 0:
            score -= 10  # Power consumption increasing

        return max(0.0, min(100.0, score))

    def determine_risk_level(self, health_score: float) -> str:
        """Determine risk level based on health score"""
        if health_score >= 80:
            return 'low'
        elif health_score >= 60:
            return 'medium'
        elif health_score >= 30:
            return 'high'
        else:
            return 'critical'

    def predict_failure_date(self, device_id: str, features: Dict[str, float]) -> Tuple[Optional[datetime], float]:
        """Predict when a device might fail"""
        health_score = self.calculate_health_score(features)
        
        if health_score > 70:
            return None, 0.0  # Device is healthy
        
        # Calculate failure prediction based on degradation trends
        degradation_rate = 0.0
        confidence = 0.5
        
        # Use trends to estimate degradation rate
        trend_features = [k for k in features.keys() if 'trend' in k]
        negative_trends = sum(1 for k in trend_features if features[k] < 0)
        
        if negative_trends > 0:
            degradation_rate = (100 - health_score) / self.prediction_window_days
            confidence = min(0.9, 0.5 + (negative_trends * 0.1))
            
            days_to_failure = max(1, (health_score - self.failure_threshold) / degradation_rate)
            failure_date = datetime.now() + timedelta(days=days_to_failure)
            
            return failure_date, confidence
        
        return None, 0.0

    def identify_health_factors(self, features: Dict[str, float]) -> List[str]:
        """Identify factors contributing to poor health"""
        factors = []
        
        if 'rssi_mean' in features and features['rssi_mean'] < -70:
            factors.append("Poor signal strength")
        
        if 'rssi_std' in features and features['rssi_std'] > 10:
            factors.append("Signal instability")
        
        if 'response_time_mean' in features and features['response_time_mean'] > 500:
            factors.append("High response times")
        
        if 'uptime_ratio' in features and features['uptime_ratio'] < 0.95:
            factors.append("Frequent disconnections")
        
        if 'error_rate' in features and features['error_rate'] > 0.05:
            factors.append("High error rate")
        
        if 'temp_max' in features and features['temp_max'] > 80:
            factors.append("Temperature concerns")
        
        if 'power_trend' in features and features['power_trend'] > 0:
            factors.append("Increasing power consumption")
        
        return factors

    def generate_recommendations(self, device_id: str, features: Dict[str, float], health_score: float) -> List[str]:
        """Generate actionable recommendations"""
        recommendations = []
        
        if health_score < 30:
            recommendations.append("Schedule immediate maintenance inspection")
        elif health_score < 50:
            recommendations.append("Plan preventive maintenance within 2 weeks")
        
        if 'rssi_mean' in features and features['rssi_mean'] < -70:
            recommendations.append("Improve device positioning or add WiFi extender")
        
        if 'response_time_mean' in features and features['response_time_mean'] > 1000:
            recommendations.append("Check network congestion and device load")
        
        if 'disconnect_events' in features and features['disconnect_events'] > 5:
            recommendations.append("Investigate network stability issues")
        
        if 'error_rate' in features and features['error_rate'] > 0.1:
            recommendations.append("Review device logs for error patterns")
        
        if 'temp_max' in features and features['temp_max'] > 85:
            recommendations.append("Improve device ventilation or cooling")
        
        return recommendations

    async def generate_predictive_insight(self, device_id: str, health_score: float):
        """Generate predictive insights for poor device health"""
        device_health = self.device_health.get(device_id)
        if not device_health:
            return
        
        severity = 'high' if health_score < 30 else 'medium'
        
        insight = PredictiveInsight(
            insight_type='device_health_decline',
            severity=severity,
            description=f"Device {device_id} showing health decline (score: {health_score:.1f})",
            affected_devices=[device_id],
            predicted_impact=f"Potential service disruption within {self.prediction_window_days} days",
            recommended_actions=device_health.recommendations,
            confidence=device_health.confidence,
            timestamp=datetime.now()
        )
        
        self.insights.append(insight)
        logger.warning(f"Generated predictive insight for {device_id}: {insight.description}")

    def get_device_health_summary(self) -> Dict[str, Any]:
        """Get summary of all device health statuses"""
        summary = {
            'total_devices': len(self.device_health),
            'healthy_devices': 0,
            'at_risk_devices': 0,
            'critical_devices': 0,
            'average_health_score': 0.0,
            'devices_needing_attention': []
        }
        
        if not self.device_health:
            return summary
        
        health_scores = []
        for device_id, health in self.device_health.items():
            health_scores.append(health.health_score)
            
            if health.risk_level == 'low':
                summary['healthy_devices'] += 1
            elif health.risk_level in ['medium', 'high']:
                summary['at_risk_devices'] += 1
            else:  # critical
                summary['critical_devices'] += 1
                summary['devices_needing_attention'].append({
                    'device_id': device_id,
                    'health_score': health.health_score,
                    'risk_level': health.risk_level,
                    'predicted_failure': health.predicted_failure_date.isoformat() if health.predicted_failure_date else None
                })
        
        summary['average_health_score'] = np.mean(health_scores)
        return summary

    def get_predictive_insights(self, hours: int = 24) -> List[Dict[str, Any]]:
        """Get recent predictive insights"""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        recent_insights = [
            {
                'type': insight.insight_type,
                'severity': insight.severity,
                'description': insight.description,
                'affected_devices': insight.affected_devices,
                'predicted_impact': insight.predicted_impact,
                'recommended_actions': insight.recommended_actions,
                'confidence': insight.confidence,
                'timestamp': insight.timestamp.isoformat()
            }
            for insight in self.insights
            if insight.timestamp > cutoff_time
        ]
        
        return sorted(recent_insights, key=lambda x: x['timestamp'], reverse=True)

    async def run_health_assessment_cycle(self):
        """Run periodic health assessment for all devices"""
        logger.info("Starting health assessment cycle")
        
        for device_id in list(self.device_history.keys()):
            await self.update_device_health(device_id)
        
        logger.info(f"Health assessment completed for {len(self.device_history)} devices")

# Global instance
predictive_engine = PredictiveAnalyticsEngine()

async def main():
    """Main function for testing"""
    # Simulate device telemetry
    test_devices = ['device_001', 'device_002', 'device_003']
    
    for device_id in test_devices:
        for i in range(20):
            telemetry = {
                'rssi': -50 - (i * 2),  # Signal degrading
                'response_time': 200 + (i * 50),  # Response time increasing
                'is_online': True if i < 15 else False,  # Going offline
                'error_count': i // 5,  # Errors increasing
                'temperature': 60 + (i * 1.5),  # Temperature rising
                'timestamp': datetime.now() - timedelta(hours=24-i)
            }
            
            predictive_engine.add_device_telemetry(device_id, telemetry)
    
    # Run health assessment
    await predictive_engine.run_health_assessment_cycle()
    
    # Print results
    summary = predictive_engine.get_device_health_summary()
    print("Health Summary:", json.dumps(summary, indent=2))
    
    insights = predictive_engine.get_predictive_insights()
    print("Predictive Insights:", json.dumps(insights, indent=2))

if __name__ == "__main__":
    asyncio.run(main())