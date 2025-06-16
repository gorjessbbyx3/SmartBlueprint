#!/usr/bin/env python3
"""
SmartBlueprint Pro - Advanced Signal Processing
Real-time signal smoothing, multi-point triangulation, and anomaly detection
"""

import asyncio
import json
import logging
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass
from collections import deque
import psycopg2
from psycopg2.extras import RealDictCursor
from scipy.spatial.distance import euclidean
from scipy.optimize import minimize
from sklearn.cluster import DBSCAN
import websockets

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class SignalMeasurement:
    device_id: str
    rssi: float
    timestamp: datetime
    location: Tuple[float, float]
    frequency: float
    channel: int
    snr: float
    
@dataclass
class DevicePosition:
    device_id: str
    x: float
    y: float
    confidence: float
    timestamp: datetime
    method: str  # 'triangulation', 'fingerprinting', 'hybrid'
    
@dataclass
class AnomalyRegion:
    center: Tuple[float, float]
    radius: float
    severity: str
    anomaly_type: str
    confidence: float
    affected_devices: List[str]
    timestamp: datetime

class KalmanFilter:
    """Kalman filter for signal smoothing"""
    
    def __init__(self, process_variance=1e-3, measurement_variance=0.1):
        self.process_variance = process_variance
        self.measurement_variance = measurement_variance
        self.estimate = None
        self.error_estimate = 1.0
        
    def update(self, measurement):
        if self.estimate is None:
            self.estimate = measurement
            return self.estimate
            
        # Prediction step
        prediction = self.estimate
        prediction_error = self.error_estimate + self.process_variance
        
        # Update step
        kalman_gain = prediction_error / (prediction_error + self.measurement_variance)
        self.estimate = prediction + kalman_gain * (measurement - prediction)
        self.error_estimate = (1 - kalman_gain) * prediction_error
        
        return self.estimate

class ExponentialWeightedMovingAverage:
    """EWMA for signal smoothing"""
    
    def __init__(self, alpha=0.3):
        self.alpha = alpha
        self.value = None
        
    def update(self, measurement):
        if self.value is None:
            self.value = measurement
        else:
            self.value = self.alpha * measurement + (1 - self.alpha) * self.value
        return self.value

class AdvancedSignalProcessor:
    def __init__(self):
        self.signal_history = {}  # device_id -> deque of measurements
        self.kalman_filters = {}  # device_id -> KalmanFilter
        self.ewma_filters = {}    # device_id -> EWMA
        self.device_positions = {}
        self.anomaly_regions = []
        self.reference_points = []  # Known anchor points for triangulation
        
        # Signal processing parameters
        self.history_size = 100
        self.smoothing_window = 10
        self.triangulation_min_points = 3
        self.anomaly_threshold = 2.5  # Standard deviations
        
        logger.info("Advanced Signal Processor initialized")

    def add_reference_point(self, device_id: str, x: float, y: float, rssi_range: float):
        """Add a reference point for triangulation (e.g., router, access point)"""
        self.reference_points.append({
            'device_id': device_id,
            'position': (x, y),
            'rssi_range': rssi_range,
            'calibrated': True
        })
        logger.info(f"Added reference point: {device_id} at ({x}, {y})")

    def process_signal_measurement(self, measurement: SignalMeasurement) -> Dict[str, Any]:
        """Process a new signal measurement with smoothing and analysis"""
        device_id = measurement.device_id
        
        # Initialize filters if needed
        if device_id not in self.kalman_filters:
            self.kalman_filters[device_id] = KalmanFilter()
            self.ewma_filters[device_id] = ExponentialWeightedMovingAverage()
            self.signal_history[device_id] = deque(maxlen=self.history_size)
        
        # Apply signal smoothing
        kalman_rssi = self.kalman_filters[device_id].update(measurement.rssi)
        ewma_rssi = self.ewma_filters[device_id].update(measurement.rssi)
        
        # Store in history
        smoothed_measurement = SignalMeasurement(
            device_id=device_id,
            rssi=kalman_rssi,
            timestamp=measurement.timestamp,
            location=measurement.location,
            frequency=measurement.frequency,
            channel=measurement.channel,
            snr=measurement.snr
        )
        self.signal_history[device_id].append(smoothed_measurement)
        
        # Perform multi-point triangulation
        position = self.triangulate_position(device_id)
        
        # Detect anomalies
        anomaly_score = self.detect_signal_anomaly(device_id, measurement)
        
        # Update device position if valid
        if position:
            self.device_positions[device_id] = position
        
        return {
            'device_id': device_id,
            'original_rssi': measurement.rssi,
            'kalman_rssi': kalman_rssi,
            'ewma_rssi': ewma_rssi,
            'smoothed_measurement': smoothed_measurement,
            'position': position,
            'anomaly_score': anomaly_score,
            'signal_quality': self.calculate_signal_quality(device_id),
            'timestamp': measurement.timestamp.isoformat()
        }

    def triangulate_position(self, device_id: str) -> Optional[DevicePosition]:
        """Perform multi-point triangulation to determine device position"""
        if len(self.reference_points) < self.triangulation_min_points:
            return None
            
        if device_id not in self.signal_history:
            return None
            
        recent_measurements = list(self.signal_history[device_id])[-5:]  # Last 5 measurements
        if len(recent_measurements) < 3:
            return None
        
        # Get average RSSI for stability
        avg_rssi = np.mean([m.rssi for m in recent_measurements])
        
        # Collect distance estimates from reference points
        distances = []
        positions = []
        
        for ref_point in self.reference_points:
            # Convert RSSI to distance estimate
            distance = self.rssi_to_distance(avg_rssi, ref_point['rssi_range'])
            distances.append(distance)
            positions.append(ref_point['position'])
        
        if len(distances) < 3:
            return None
        
        # Solve triangulation using least squares optimization
        estimated_position = self.solve_triangulation(positions, distances)
        
        if estimated_position:
            confidence = self.calculate_position_confidence(positions, distances, estimated_position)
            
            return DevicePosition(
                device_id=device_id,
                x=estimated_position[0],
                y=estimated_position[1],
                confidence=confidence,
                timestamp=datetime.now(),
                method='triangulation'
            )
        
        return None

    def rssi_to_distance(self, rssi: float, reference_rssi: float, path_loss_exponent: float = 2.0) -> float:
        """Convert RSSI to distance estimate using path loss model"""
        if rssi >= reference_rssi:
            return 1.0  # Very close
        
        # Free space path loss model: distance = 10^((ref_rssi - rssi) / (10 * n))
        distance = 10 ** ((reference_rssi - rssi) / (10 * path_loss_exponent))
        return max(1.0, min(distance, 1000.0))  # Clamp between 1m and 1km

    def solve_triangulation(self, positions: List[Tuple[float, float]], distances: List[float]) -> Optional[Tuple[float, float]]:
        """Solve triangulation using weighted least squares"""
        if len(positions) < 3:
            return None
        
        def objective_function(point):
            x, y = point
            error = 0
            for i, (px, py) in enumerate(positions):
                predicted_distance = euclidean((x, y), (px, py))
                error += (predicted_distance - distances[i]) ** 2
            return error
        
        # Initial guess - centroid of reference points
        initial_x = np.mean([p[0] for p in positions])
        initial_y = np.mean([p[1] for p in positions])
        
        try:
            result = minimize(objective_function, [initial_x, initial_y], method='L-BFGS-B')
            if result.success:
                return (result.x[0], result.x[1])
        except Exception as e:
            logger.error(f"Triangulation optimization failed: {e}")
        
        return None

    def calculate_position_confidence(self, positions: List[Tuple[float, float]], 
                                     distances: List[float], 
                                     estimated_position: Tuple[float, float]) -> float:
        """Calculate confidence score for position estimate"""
        if not estimated_position:
            return 0.0
        
        errors = []
        for i, (px, py) in enumerate(positions):
            predicted_distance = euclidean(estimated_position, (px, py))
            error = abs(predicted_distance - distances[i])
            errors.append(error)
        
        # Convert error to confidence (0-1 scale)
        avg_error = np.mean(errors)
        confidence = max(0.0, 1.0 - (avg_error / 100.0))  # Normalize by 100m
        return confidence

    def detect_signal_anomaly(self, device_id: str, measurement: SignalMeasurement) -> float:
        """Detect anomalies in signal patterns"""
        if device_id not in self.signal_history:
            return 0.0
        
        history = list(self.signal_history[device_id])
        if len(history) < 10:
            return 0.0
        
        # Calculate statistical metrics
        recent_rssi = [m.rssi for m in history[-10:]]
        historical_rssi = [m.rssi for m in history[:-10]]
        
        if len(historical_rssi) < 5:
            return 0.0
        
        # Z-score anomaly detection
        hist_mean = np.mean(historical_rssi)
        hist_std = np.std(historical_rssi)
        
        if hist_std == 0:
            return 0.0
        
        current_z_score = abs(measurement.rssi - hist_mean) / hist_std
        
        # Additional anomaly indicators
        anomaly_score = current_z_score
        
        # Sudden signal drops
        if len(recent_rssi) >= 2:
            signal_drop = recent_rssi[-2] - measurement.rssi
            if signal_drop > 20:  # 20 dBm drop
                anomaly_score += 2.0
        
        # Signal oscillation detection
        if len(recent_rssi) >= 5:
            oscillation = np.std(recent_rssi)
            if oscillation > 15:  # High variance
                anomaly_score += 1.0
        
        # Normalize to 0-1 scale
        return min(1.0, anomaly_score / 5.0)

    def calculate_signal_quality(self, device_id: str) -> Dict[str, float]:
        """Calculate comprehensive signal quality metrics"""
        if device_id not in self.signal_history:
            return {'overall': 0.0, 'stability': 0.0, 'strength': 0.0}
        
        history = list(self.signal_history[device_id])
        if len(history) < 5:
            return {'overall': 0.0, 'stability': 0.0, 'strength': 0.0}
        
        recent_rssi = [m.rssi for m in history[-10:]]
        
        # Signal strength score (normalize -100 to -30 dBm)
        avg_rssi = np.mean(recent_rssi)
        strength_score = max(0.0, min(1.0, (avg_rssi + 100) / 70))
        
        # Signal stability score (inverse of variance)
        stability_score = max(0.0, 1.0 - (np.std(recent_rssi) / 30))
        
        # Overall quality (weighted combination)
        overall_score = 0.6 * strength_score + 0.4 * stability_score
        
        return {
            'overall': overall_score,
            'stability': stability_score,
            'strength': strength_score,
            'rssi_mean': avg_rssi,
            'rssi_std': np.std(recent_rssi)
        }

    def detect_anomaly_regions(self, grid_size: int = 50) -> List[AnomalyRegion]:
        """Detect spatial regions with anomalous behavior"""
        if not self.device_positions:
            return []
        
        # Create spatial grid
        positions = [(pos.x, pos.y) for pos in self.device_positions.values()]
        anomaly_scores = []
        
        for device_id, position in self.device_positions.items():
            if device_id in self.signal_history:
                history = list(self.signal_history[device_id])
                if len(history) >= 5:
                    recent_anomaly = np.mean([
                        self.detect_signal_anomaly(device_id, m) 
                        for m in history[-5:]
                    ])
                    anomaly_scores.append(recent_anomaly)
                else:
                    anomaly_scores.append(0.0)
            else:
                anomaly_scores.append(0.0)
        
        if len(positions) < 3:
            return []
        
        # Use DBSCAN to cluster anomalous positions
        high_anomaly_positions = [
            pos for i, pos in enumerate(positions) 
            if anomaly_scores[i] > 0.5
        ]
        
        if len(high_anomaly_positions) < 2:
            return []
        
        clustering = DBSCAN(eps=30, min_samples=2).fit(high_anomaly_positions)
        
        anomaly_regions = []
        for cluster_id in set(clustering.labels_):
            if cluster_id == -1:  # Noise points
                continue
            
            cluster_points = [
                high_anomaly_positions[i] 
                for i in range(len(high_anomaly_positions)) 
                if clustering.labels_[i] == cluster_id
            ]
            
            if len(cluster_points) >= 2:
                # Calculate cluster center and radius
                center_x = np.mean([p[0] for p in cluster_points])
                center_y = np.mean([p[1] for p in cluster_points])
                
                max_distance = max([
                    euclidean((center_x, center_y), point) 
                    for point in cluster_points
                ])
                
                # Get affected devices
                affected_devices = [
                    device_id for device_id, pos in self.device_positions.items()
                    if euclidean((pos.x, pos.y), (center_x, center_y)) <= max_distance
                ]
                
                avg_anomaly_score = np.mean([
                    anomaly_scores[i] for i, pos in enumerate(positions)
                    if euclidean(pos, (center_x, center_y)) <= max_distance
                ])
                
                anomaly_regions.append(AnomalyRegion(
                    center=(center_x, center_y),
                    radius=max_distance,
                    severity='high' if avg_anomaly_score > 0.7 else 'medium',
                    anomaly_type='signal_degradation',
                    confidence=avg_anomaly_score,
                    affected_devices=affected_devices,
                    timestamp=datetime.now()
                ))
        
        self.anomaly_regions = anomaly_regions
        return anomaly_regions

    def generate_signal_heatmap(self, grid_resolution: int = 100, 
                               room_bounds: Tuple[float, float, float, float] = (0, 0, 100, 100)) -> Dict[str, Any]:
        """Generate interpolated signal strength heatmap"""
        x_min, y_min, x_max, y_max = room_bounds
        
        # Create grid
        x_grid = np.linspace(x_min, x_max, grid_resolution)
        y_grid = np.linspace(y_min, y_max, grid_resolution)
        X, Y = np.meshgrid(x_grid, y_grid)
        
        # Collect signal data points
        signal_points = []
        for device_id, position in self.device_positions.items():
            if device_id in self.signal_history:
                history = list(self.signal_history[device_id])
                if history:
                    avg_rssi = np.mean([m.rssi for m in history[-5:]])
                    signal_points.append((position.x, position.y, avg_rssi))
        
        if len(signal_points) < 3:
            # Return empty heatmap
            return {
                'x_grid': X.tolist(),
                'y_grid': Y.tolist(),
                'signal_strength': np.zeros_like(X).tolist(),
                'anomaly_overlay': np.zeros_like(X).tolist()
            }
        
        # Interpolate signal strength using inverse distance weighting
        signal_grid = np.zeros_like(X)
        anomaly_grid = np.zeros_like(X)
        
        for i in range(grid_resolution):
            for j in range(grid_resolution):
                grid_point = (X[i, j], Y[i, j])
                
                # Calculate weighted signal strength
                weights = []
                values = []
                
                for px, py, rssi in signal_points:
                    distance = euclidean(grid_point, (px, py))
                    if distance < 1.0:  # Very close
                        weight = 1.0
                    else:
                        weight = 1.0 / (distance ** 2)
                    
                    weights.append(weight)
                    values.append(rssi)
                
                if weights:
                    signal_grid[i, j] = np.average(values, weights=weights)
                
                # Add anomaly overlay
                for region in self.anomaly_regions:
                    distance_to_center = euclidean(grid_point, region.center)
                    if distance_to_center <= region.radius:
                        anomaly_intensity = 1.0 - (distance_to_center / region.radius)
                        anomaly_grid[i, j] = max(anomaly_grid[i, j], 
                                               anomaly_intensity * region.confidence)
        
        return {
            'x_grid': X.tolist(),
            'y_grid': Y.tolist(),
            'signal_strength': signal_grid.tolist(),
            'anomaly_overlay': anomaly_grid.tolist(),
            'anomaly_regions': [
                {
                    'center': region.center,
                    'radius': region.radius,
                    'severity': region.severity,
                    'confidence': region.confidence,
                    'affected_devices': region.affected_devices
                } for region in self.anomaly_regions
            ],
            'timestamp': datetime.now().isoformat()
        }

    def get_device_trajectory(self, device_id: str, time_window_hours: int = 24) -> List[Dict[str, Any]]:
        """Get historical trajectory of a device for playback analysis"""
        if device_id not in self.signal_history:
            return []
        
        cutoff_time = datetime.now() - timedelta(hours=time_window_hours)
        history = [
            m for m in self.signal_history[device_id] 
            if m.timestamp > cutoff_time
        ]
        
        trajectory = []
        for measurement in history:
            # Try to get position at this timestamp
            position = self.triangulate_position_at_time(device_id, measurement.timestamp)
            
            trajectory.append({
                'timestamp': measurement.timestamp.isoformat(),
                'rssi': measurement.rssi,
                'position': {
                    'x': position.x if position else None,
                    'y': position.y if position else None,
                    'confidence': position.confidence if position else 0.0
                },
                'signal_quality': self.calculate_signal_quality_at_time(device_id, measurement.timestamp),
                'anomaly_score': self.detect_signal_anomaly(device_id, measurement)
            })
        
        return trajectory

    def triangulate_position_at_time(self, device_id: str, timestamp: datetime) -> Optional[DevicePosition]:
        """Triangulate position using measurements around specific timestamp"""
        if device_id not in self.signal_history:
            return None
        
        # Get measurements within 30 seconds of timestamp
        time_window = timedelta(seconds=30)
        relevant_measurements = [
            m for m in self.signal_history[device_id]
            if abs((m.timestamp - timestamp).total_seconds()) <= time_window.total_seconds()
        ]
        
        if len(relevant_measurements) < 1:
            return None
        
        # Use average RSSI from relevant measurements
        avg_rssi = np.mean([m.rssi for m in relevant_measurements])
        
        # Perform triangulation (similar to current method)
        distances = []
        positions = []
        
        for ref_point in self.reference_points:
            distance = self.rssi_to_distance(avg_rssi, ref_point['rssi_range'])
            distances.append(distance)
            positions.append(ref_point['position'])
        
        if len(distances) >= 3:
            estimated_position = self.solve_triangulation(positions, distances)
            if estimated_position:
                confidence = self.calculate_position_confidence(positions, distances, estimated_position)
                
                return DevicePosition(
                    device_id=device_id,
                    x=estimated_position[0],
                    y=estimated_position[1],
                    confidence=confidence,
                    timestamp=timestamp,
                    method='historical_triangulation'
                )
        
        return None

    def calculate_signal_quality_at_time(self, device_id: str, timestamp: datetime) -> Dict[str, float]:
        """Calculate signal quality metrics at specific timestamp"""
        if device_id not in self.signal_history:
            return {'overall': 0.0, 'stability': 0.0, 'strength': 0.0}
        
        # Get measurements within time window
        time_window = timedelta(minutes=5)
        relevant_measurements = [
            m for m in self.signal_history[device_id]
            if abs((m.timestamp - timestamp).total_seconds()) <= time_window.total_seconds()
        ]
        
        if len(relevant_measurements) < 3:
            return {'overall': 0.0, 'stability': 0.0, 'strength': 0.0}
        
        rssi_values = [m.rssi for m in relevant_measurements]
        
        # Calculate metrics
        avg_rssi = np.mean(rssi_values)
        strength_score = max(0.0, min(1.0, (avg_rssi + 100) / 70))
        stability_score = max(0.0, 1.0 - (np.std(rssi_values) / 30))
        overall_score = 0.6 * strength_score + 0.4 * stability_score
        
        return {
            'overall': overall_score,
            'stability': stability_score,
            'strength': strength_score
        }

    def export_analytics_data(self) -> Dict[str, Any]:
        """Export comprehensive analytics data"""
        return {
            'device_positions': {
                device_id: {
                    'x': pos.x,
                    'y': pos.y,
                    'confidence': pos.confidence,
                    'method': pos.method,
                    'timestamp': pos.timestamp.isoformat()
                }
                for device_id, pos in self.device_positions.items()
            },
            'anomaly_regions': [
                {
                    'center': region.center,
                    'radius': region.radius,
                    'severity': region.severity,
                    'anomaly_type': region.anomaly_type,
                    'confidence': region.confidence,
                    'affected_devices': region.affected_devices,
                    'timestamp': region.timestamp.isoformat()
                }
                for region in self.anomaly_regions
            ],
            'signal_quality_summary': {
                device_id: self.calculate_signal_quality(device_id)
                for device_id in self.signal_history.keys()
            },
            'reference_points': self.reference_points,
            'processing_stats': {
                'total_devices': len(self.signal_history),
                'active_filters': len(self.kalman_filters),
                'anomaly_regions': len(self.anomaly_regions),
                'reference_points': len(self.reference_points)
            }
        }

# Global signal processor instance
signal_processor = AdvancedSignalProcessor()

if __name__ == "__main__":
    # Example usage and testing
    processor = AdvancedSignalProcessor()
    
    # Add reference points (routers/access points)
    processor.add_reference_point("router_1", 0, 0, -30)    # Bottom-left
    processor.add_reference_point("router_2", 100, 0, -30)  # Bottom-right
    processor.add_reference_point("router_3", 50, 100, -30) # Top-center
    
    # Simulate signal measurements
    import random
    
    for i in range(100):
        measurement = SignalMeasurement(
            device_id="test_device",
            rssi=-40 - random.uniform(0, 30),  # -40 to -70 dBm
            timestamp=datetime.now(),
            location=(random.uniform(0, 100), random.uniform(0, 100)),
            frequency=2.4,
            channel=6,
            snr=20 + random.uniform(-10, 10)
        )
        
        result = processor.process_signal_measurement(measurement)
        print(f"Processed measurement {i}: RSSI={result['kalman_rssi']:.1f}, Anomaly={result['anomaly_score']:.3f}")
    
    # Generate heatmap
    heatmap = processor.generate_signal_heatmap()
    print(f"Generated heatmap with {len(heatmap['anomaly_regions'])} anomaly regions")
    
    # Detect anomaly regions
    anomalies = processor.detect_anomaly_regions()
    print(f"Detected {len(anomalies)} anomaly regions")
    
    # Export analytics
    analytics = processor.export_analytics_data()
    print(f"Analytics exported for {analytics['processing_stats']['total_devices']} devices")