#include "SignalProcessor.h"
#include <algorithm>
#include <cmath>
#include <numeric>

SignalProcessor::SignalProcessor() {
    // Initialize default parameters
}

double SignalProcessor::processRSSI(double rawRSSI, const std::string& deviceId) {
    // Apply Kalman filtering for signal smoothing
    auto it = kalmanFilters.find(deviceId);
    if (it == kalmanFilters.end()) {
        kalmanFilters[deviceId] = KalmanFilter(1e-3, 0.1);
    }
    
    return kalmanFilters[deviceId].update(rawRSSI);
}

double SignalProcessor::estimateDistance(double rssi, double txPower, double pathLossExponent) {
    if (rssi == 0) return -1.0;
    
    double ratio = rssi * 1.0 / txPower;
    if (ratio < 1.0) {
        return std::pow(ratio, 1.0 / pathLossExponent);
    } else {
        double accuracy = (1.5 * pathLossExponent - 0.96) * std::pow(ratio, pathLossExponent) + 0.62;
        return accuracy;
    }
}

SignalQuality SignalProcessor::analyzeSignalQuality(double rssi) {
    SignalQuality quality;
    quality.rssi = rssi;
    
    if (rssi >= -50) {
        quality.strength = "Excellent";
        quality.percentage = 100;
        quality.bars = 4;
    } else if (rssi >= -60) {
        quality.strength = "Good";
        quality.percentage = 75;
        quality.bars = 3;
    } else if (rssi >= -70) {
        quality.strength = "Fair";
        quality.percentage = 50;
        quality.bars = 2;
    } else if (rssi >= -80) {
        quality.strength = "Poor";
        quality.percentage = 25;
        quality.bars = 1;
    } else {
        quality.strength = "Very Poor";
        quality.percentage = 0;
        quality.bars = 0;
    }
    
    return quality;
}

std::vector<double> SignalProcessor::smoothSignalHistory(const std::vector<double>& rawSignals) {
    if (rawSignals.empty()) return {};
    
    std::vector<double> smoothed;
    smoothed.reserve(rawSignals.size());
    
    // Apply exponential weighted moving average
    double alpha = 0.3;
    double smoothedValue = rawSignals[0];
    smoothed.push_back(smoothedValue);
    
    for (size_t i = 1; i < rawSignals.size(); ++i) {
        smoothedValue = alpha * rawSignals[i] + (1.0 - alpha) * smoothedValue;
        smoothed.push_back(smoothedValue);
    }
    
    return smoothed;
}

double SignalProcessor::calculateSignalStability(const std::vector<double>& signalHistory) {
    if (signalHistory.size() < 2) return 0.0;
    
    // Calculate variance
    double mean = std::accumulate(signalHistory.begin(), signalHistory.end(), 0.0) / signalHistory.size();
    
    double variance = 0.0;
    for (double signal : signalHistory) {
        variance += std::pow(signal - mean, 2);
    }
    variance /= signalHistory.size();
    
    double stdDev = std::sqrt(variance);
    
    // Convert to stability score (0-1, higher is more stable)
    double stability = 1.0 / (1.0 + stdDev / 10.0);
    return std::max(0.0, std::min(1.0, stability));
}

// Kalman Filter Implementation
KalmanFilter::KalmanFilter(double processVariance, double measurementVariance)
    : processVariance(processVariance), measurementVariance(measurementVariance),
      estimatedValue(0.0), estimationError(1.0), isInitialized(false) {
}

double KalmanFilter::update(double measurement) {
    if (!isInitialized) {
        estimatedValue = measurement;
        isInitialized = true;
        return estimatedValue;
    }
    
    // Prediction step
    double predictedError = estimationError + processVariance;
    
    // Update step
    double kalmanGain = predictedError / (predictedError + measurementVariance);
    estimatedValue = estimatedValue + kalmanGain * (measurement - estimatedValue);
    estimationError = (1.0 - kalmanGain) * predictedError;
    
    return estimatedValue;
}

// Exponential Weighted Moving Average Implementation
EWMA::EWMA(double alpha) : alpha(alpha), isInitialized(false), currentValue(0.0) {
}

double EWMA::update(double value) {
    if (!isInitialized) {
        currentValue = value;
        isInitialized = true;
    } else {
        currentValue = alpha * value + (1.0 - alpha) * currentValue;
    }
    
    return currentValue;
}