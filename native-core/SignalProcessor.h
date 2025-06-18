#pragma once

#include <vector>
#include <string>
#include <map>

struct SignalQuality {
    double rssi;
    std::string strength;
    int percentage;
    int bars;
};

class KalmanFilter {
public:
    KalmanFilter(double processVariance = 1e-3, double measurementVariance = 0.1);
    double update(double measurement);
    
private:
    double processVariance;
    double measurementVariance;
    double estimatedValue;
    double estimationError;
    bool isInitialized;
};

class EWMA {
public:
    EWMA(double alpha = 0.3);
    double update(double value);
    
private:
    double alpha;
    bool isInitialized;
    double currentValue;
};

class SignalProcessor {
public:
    SignalProcessor();
    
    double processRSSI(double rawRSSI, const std::string& deviceId);
    double estimateDistance(double rssi, double txPower = -59, double pathLossExponent = 2.0);
    SignalQuality analyzeSignalQuality(double rssi);
    std::vector<double> smoothSignalHistory(const std::vector<double>& rawSignals);
    double calculateSignalStability(const std::vector<double>& signalHistory);
    
private:
    std::map<std::string, KalmanFilter> kalmanFilters;
};