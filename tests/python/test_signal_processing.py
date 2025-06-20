import pytest
import numpy as np
from datetime import datetime, timedelta
import sys
import os

# Add the project root to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from advanced_signal_processing import (
    SignalMeasurement, DevicePosition, AnomalyRegion,
    KalmanFilter, ExponentialWeightedMovingAverage, AdvancedSignalProcessor
)

class TestKalmanFilter:
    def test_initialization(self):
        kf = KalmanFilter()
        assert kf.process_variance == 1e-3
        assert kf.measurement_variance == 0.1
        assert kf.estimated_value == 0
        assert kf.estimation_error == 1

    def test_update_single_measurement(self):
        kf = KalmanFilter()
        result = kf.update(10.0)
        
        # First measurement should move estimate significantly toward measurement
        assert result != 0
        assert abs(result - 10.0) < 10.0

    def test_update_multiple_measurements(self):
        kf = KalmanFilter()
        
        # Feed consistent measurements
        values = [10.0, 10.1, 9.9, 10.05, 9.95]
        results = []
        
        for value in values:
            result = kf.update(value)
            results.append(result)
        
        # Should converge toward 10.0
        assert abs(results[-1] - 10.0) < 0.5

    def test_noise_reduction(self):
        kf = KalmanFilter()
        
        # Add noisy measurements around true value of 50
        noisy_measurements = [50 + np.random.normal(0, 5) for _ in range(20)]
        filtered_values = [kf.update(m) for m in noisy_measurements]
        
        # Filtered values should be less noisy than input
        input_variance = np.var(noisy_measurements)
        output_variance = np.var(filtered_values[5:])  # Skip initial convergence
        
        assert output_variance < input_variance

class TestExponentialWeightedMovingAverage:
    def test_initialization(self):
        ewma = ExponentialWeightedMovingAverage(alpha=0.3)
        assert ewma.alpha == 0.3
        assert ewma.current_value is None

    def test_first_update(self):
        ewma = ExponentialWeightedMovingAverage()
        result = ewma.update(10.0)
        assert result == 10.0
        assert ewma.current_value == 10.0

    def test_subsequent_updates(self):
        ewma = ExponentialWeightedMovingAverage(alpha=0.5)
        
        ewma.update(10.0)
        result = ewma.update(20.0)
        
        # Should be weighted average: 0.5 * 10 + 0.5 * 20 = 15
        assert result == 15.0

    def test_smoothing_effect(self):
        ewma = ExponentialWeightedMovingAverage(alpha=0.1)
        
        values = [10, 100, 10, 100, 10]  # Alternating high/low
        results = []
        
        for value in values:
            result = ewma.update(value)
            results.append(result)
        
        # Should smooth out the oscillations
        assert max(results[1:]) < max(values[1:])
        assert min(results[1:]) > min(values[1:])

class TestAdvancedSignalProcessor:
    @pytest.fixture
    def processor(self):
        return AdvancedSignalProcessor()

    def test_initialization(self, processor):
        assert len(processor.devices) == 0
        assert len(processor.reference_points) == 0
        assert len(processor.measurements_history) == 0

    def test_add_reference_point(self, processor):
        processor.add_reference_point("router_01", 0, 0, 100)
        
        assert "router_01" in processor.reference_points
        ref_point = processor.reference_points["router_01"]
        assert ref_point["x"] == 0
        assert ref_point["y"] == 0
        assert ref_point["range"] == 100

    def test_process_signal_measurement(self, processor):
        measurement = SignalMeasurement(
            device_id="device_01",
            rssi=-50.0,
            timestamp=datetime.now(),
            location=(10.0, 10.0),
            frequency=2412.0,
            channel=6,
            snr=30.0
        )
        
        result = processor.process_signal_measurement(measurement)
        
        assert "device_id" in result
        assert "smoothed_rssi" in result
        assert "signal_quality" in result
        assert result["device_id"] == "device_01"

    def test_rssi_to_distance_conversion(self, processor):
        # Test with typical WiFi values
        distance = processor.rssi_to_distance(-30, -30, 2.0)
        assert distance == pytest.approx(1.0, rel=0.1)  # Should be ~1 meter
        
        distance = processor.rssi_to_distance(-50, -30, 2.0)
        assert distance > 1.0  # Weaker signal = greater distance

    def test_triangulation_with_insufficient_points(self, processor):
        # Add only one reference point
        processor.add_reference_point("router_01", 0, 0, 100)
        
        measurement = SignalMeasurement(
            device_id="device_01",
            rssi=-50.0,
            timestamp=datetime.now(),
            location=(0, 0),
            frequency=2412.0,
            channel=6,
            snr=30.0
        )
        processor.process_signal_measurement(measurement)
        
        position = processor.triangulate_position("device_01")
        assert position is None  # Not enough reference points

    def test_triangulation_with_sufficient_points(self, processor):
        # Add three reference points
        processor.add_reference_point("router_01", 0, 0, 100)
        processor.add_reference_point("router_02", 100, 0, 100)
        processor.add_reference_point("router_03", 50, 100, 100)
        
        # Add measurements from all reference points
        for i, router_id in enumerate(["router_01", "router_02", "router_03"]):
            measurement = SignalMeasurement(
                device_id="device_01",
                rssi=-50.0 - i * 5,  # Varying signal strength
                timestamp=datetime.now(),
                location=(0, 0),
                frequency=2412.0,
                channel=6,
                snr=30.0
            )
            processor.process_signal_measurement(measurement)
        
        position = processor.triangulate_position("device_01")
        assert position is not None
        assert isinstance(position, DevicePosition)
        assert position.device_id == "device_01"
        assert position.confidence >= 0.0

    def test_signal_quality_calculation(self, processor):
        # Add measurements over time
        base_time = datetime.now()
        for i in range(10):
            measurement = SignalMeasurement(
                device_id="device_01",
                rssi=-50.0 + np.random.normal(0, 2),  # Some noise
                timestamp=base_time + timedelta(seconds=i),
                location=(10, 10),
                frequency=2412.0,
                channel=6,
                snr=30.0 + np.random.normal(0, 1)
            )
            processor.process_signal_measurement(measurement)
        
        quality = processor.calculate_signal_quality("device_01")
        
        assert "avg_rssi" in quality
        assert "rssi_stability" in quality
        assert "snr_quality" in quality
        assert "overall_score" in quality
        assert 0 <= quality["overall_score"] <= 1

    def test_anomaly_detection(self, processor):
        # Add normal measurements
        base_time = datetime.now()
        for i in range(20):
            measurement = SignalMeasurement(
                device_id="device_01",
                rssi=-50.0 + np.random.normal(0, 1),  # Normal variation
                timestamp=base_time + timedelta(seconds=i),
                location=(10, 10),
                frequency=2412.0,
                channel=6,
                snr=30.0
            )
            processor.process_signal_measurement(measurement)
        
        # Add anomalous measurement
        anomalous_measurement = SignalMeasurement(
            device_id="device_01",
            rssi=-90.0,  # Very weak signal
            timestamp=base_time + timedelta(seconds=21),
            location=(10, 10),
            frequency=2412.0,
            channel=6,
            snr=5.0  # Poor SNR
        )
        
        anomaly_score = processor.detect_signal_anomaly("device_01", anomalous_measurement)
        assert anomaly_score > 0.5  # Should detect as anomaly

    def test_export_analytics_data(self, processor):
        # Add some test data
        processor.add_reference_point("router_01", 0, 0, 100)
        
        measurement = SignalMeasurement(
            device_id="device_01",
            rssi=-50.0,
            timestamp=datetime.now(),
            location=(10, 10),
            frequency=2412.0,
            channel=6,
            snr=30.0
        )
        processor.process_signal_measurement(measurement)
        
        export_data = processor.export_analytics_data()
        
        assert "devices" in export_data
        assert "reference_points" in export_data
        assert "measurements_summary" in export_data
        assert "export_timestamp" in export_data

class TestSignalMeasurement:
    def test_creation(self):
        timestamp = datetime.now()
        measurement = SignalMeasurement(
            device_id="test_device",
            rssi=-45.0,
            timestamp=timestamp,
            location=(10.0, 20.0),
            frequency=2412.0,
            channel=6,
            snr=25.0
        )
        
        assert measurement.device_id == "test_device"
        assert measurement.rssi == -45.0
        assert measurement.timestamp == timestamp
        assert measurement.location == (10.0, 20.0)
        assert measurement.frequency == 2412.0
        assert measurement.channel == 6
        assert measurement.snr == 25.0

class TestDevicePosition:
    def test_creation(self):
        timestamp = datetime.now()
        position = DevicePosition(
            device_id="test_device",
            x=10.0,
            y=20.0,
            confidence=0.85,
            timestamp=timestamp,
            method="triangulation"
        )
        
        assert position.device_id == "test_device"
        assert position.x == 10.0
        assert position.y == 20.0
        assert position.confidence == 0.85
        assert position.timestamp == timestamp
        assert position.method == "triangulation"

class TestAnomalyRegion:
    def test_creation(self):
        timestamp = datetime.now()
        region = AnomalyRegion(
            center=(50.0, 50.0),
            radius=10.0,
            severity="high",
            anomaly_type="signal_drop",
            confidence=0.9,
            affected_devices=["device_01", "device_02"],
            timestamp=timestamp
        )
        
        assert region.center == (50.0, 50.0)
        assert region.radius == 10.0
        assert region.severity == "high"
        assert region.anomaly_type == "signal_drop"
        assert region.confidence == 0.9
        assert region.affected_devices == ["device_01", "device_02"]
        assert region.timestamp == timestamp

if __name__ == "__main__":
    pytest.main([__file__, "-v"])