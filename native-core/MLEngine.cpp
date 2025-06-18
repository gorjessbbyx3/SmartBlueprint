#include "MLEngine.h"
#include <algorithm>
#include <numeric>
#include <cmath>
#include <random>

MLEngine::MLEngine() : isolationForest(100, 256, 42) {
    // Initialize with default parameters
}

std::vector<std::pair<std::shared_ptr<NetworkDevice>, double>> 
MLEngine::detectAnomalies(const std::vector<std::shared_ptr<NetworkDevice>>& devices) {
    std::vector<std::pair<std::shared_ptr<NetworkDevice>, double>> anomalies;
    
    for (const auto& device : devices) {
        double anomalyScore = calculateAnomalyScore(device);
        if (anomalyScore > 0.6) { // Threshold for anomaly detection
            anomalies.push_back({device, anomalyScore});
        }
    }
    
    return anomalies;
}

double MLEngine::calculateAnomalyScore(const std::shared_ptr<NetworkDevice>& device) {
    // Create feature vector for isolation forest
    std::vector<double> features = {
        static_cast<double>(device->rssi),
        device->isOnline ? 1.0 : 0.0,
        getTimeSinceLastSeen(device),
        getDeviceTypeScore(device->deviceType)
    };
    
    return isolationForest.anomalyScore(features);
}

double MLEngine::getTimeSinceLastSeen(const std::shared_ptr<NetworkDevice>& device) {
    auto now = std::chrono::system_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::seconds>(now - device->lastSeen);
    return static_cast<double>(duration.count());
}

double MLEngine::getDeviceTypeScore(const std::string& deviceType) {
    // Score based on device type reliability
    if (deviceType == "router") return 0.9;
    if (deviceType == "printer") return 0.7;
    if (deviceType == "smart_tv") return 0.8;
    if (deviceType == "laptop") return 0.6;
    if (deviceType == "phone") return 0.5;
    return 0.3; // Unknown devices
}

void MLEngine::trainModel(const std::vector<std::shared_ptr<NetworkDevice>>& historicalData) {
    std::vector<std::vector<double>> trainingData;
    
    for (const auto& device : historicalData) {
        std::vector<double> features = {
            static_cast<double>(device->rssi),
            device->isOnline ? 1.0 : 0.0,
            getTimeSinceLastSeen(device),
            getDeviceTypeScore(device->deviceType)
        };
        trainingData.push_back(features);
    }
    
    isolationForest.train(trainingData);
}

// Isolation Forest Implementation
IsolationForest::IsolationForest(int numTrees, int subsampleSize, int randomSeed)
    : numTrees(numTrees), subsampleSize(subsampleSize), generator(randomSeed) {
}

void IsolationForest::train(const std::vector<std::vector<double>>& data) {
    trees.clear();
    trees.reserve(numTrees);
    
    for (int i = 0; i < numTrees; ++i) {
        // Create subsample
        auto subsample = createSubsample(data);
        
        // Build tree
        auto tree = buildTree(subsample, 0, static_cast<int>(std::log2(subsample.size())));
        trees.push_back(tree);
    }
}

double IsolationForest::anomalyScore(const std::vector<double>& point) {
    if (trees.empty()) return 0.5; // Default score if not trained
    
    double totalPathLength = 0.0;
    
    for (const auto& tree : trees) {
        totalPathLength += getPathLength(tree, point, 0);
    }
    
    double avgPathLength = totalPathLength / trees.size();
    double c = calculateC(subsampleSize);
    
    // Anomaly score formula: 2^(-avgPathLength/c)
    return std::pow(2.0, -avgPathLength / c);
}

std::vector<std::vector<double>> IsolationForest::createSubsample(const std::vector<std::vector<double>>& data) {
    std::vector<std::vector<double>> subsample;
    std::uniform_int_distribution<> dist(0, static_cast<int>(data.size() - 1));
    
    int sampleSize = std::min(subsampleSize, static_cast<int>(data.size()));
    
    for (int i = 0; i < sampleSize; ++i) {
        int index = dist(generator);
        subsample.push_back(data[index]);
    }
    
    return subsample;
}

std::shared_ptr<IsolationTree> IsolationForest::buildTree(const std::vector<std::vector<double>>& data, 
                                                          int depth, int maxDepth) {
    auto node = std::make_shared<IsolationTree>();
    
    // Terminal conditions
    if (data.size() <= 1 || depth >= maxDepth) {
        node->isLeaf = true;
        node->size = static_cast<int>(data.size());
        return node;
    }
    
    // Random feature selection
    int numFeatures = static_cast<int>(data[0].size());
    std::uniform_int_distribution<> featureDist(0, numFeatures - 1);
    int splitFeature = featureDist(generator);
    
    // Find min/max for selected feature
    double minVal = std::numeric_limits<double>::max();
    double maxVal = std::numeric_limits<double>::lowest();
    
    for (const auto& point : data) {
        minVal = std::min(minVal, point[splitFeature]);
        maxVal = std::max(maxVal, point[splitFeature]);
    }
    
    if (minVal >= maxVal) {
        // Cannot split
        node->isLeaf = true;
        node->size = static_cast<int>(data.size());
        return node;
    }
    
    // Random split point
    std::uniform_real_distribution<> splitDist(minVal, maxVal);
    double splitValue = splitDist(generator);
    
    node->isLeaf = false;
    node->splitFeature = splitFeature;
    node->splitValue = splitValue;
    
    // Split data
    std::vector<std::vector<double>> leftData, rightData;
    for (const auto& point : data) {
        if (point[splitFeature] < splitValue) {
            leftData.push_back(point);
        } else {
            rightData.push_back(point);
        }
    }
    
    // Recursively build subtrees
    node->left = buildTree(leftData, depth + 1, maxDepth);
    node->right = buildTree(rightData, depth + 1, maxDepth);
    
    return node;
}

double IsolationForest::getPathLength(const std::shared_ptr<IsolationTree>& tree, 
                                     const std::vector<double>& point, int depth) {
    if (tree->isLeaf) {
        return depth + calculateC(tree->size);
    }
    
    if (point[tree->splitFeature] < tree->splitValue) {
        return getPathLength(tree->left, point, depth + 1);
    } else {
        return getPathLength(tree->right, point, depth + 1);
    }
}

double IsolationForest::calculateC(int n) {
    if (n <= 1) return 0.0;
    return 2.0 * (std::log(n - 1) + 0.5772156649) - (2.0 * (n - 1) / n);
}