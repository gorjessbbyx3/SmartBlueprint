#pragma once

#include "NetworkScanner.h"
#include <vector>
#include <memory>
#include <random>
#include <limits>

struct IsolationTree {
    bool isLeaf;
    int splitFeature;
    double splitValue;
    int size;
    std::shared_ptr<IsolationTree> left;
    std::shared_ptr<IsolationTree> right;
    
    IsolationTree() : isLeaf(false), splitFeature(-1), splitValue(0.0), size(0) {}
};

class IsolationForest {
public:
    IsolationForest(int numTrees = 100, int subsampleSize = 256, int randomSeed = 42);
    
    void train(const std::vector<std::vector<double>>& data);
    double anomalyScore(const std::vector<double>& point);
    
private:
    int numTrees;
    int subsampleSize;
    std::mt19937 generator;
    std::vector<std::shared_ptr<IsolationTree>> trees;
    
    std::vector<std::vector<double>> createSubsample(const std::vector<std::vector<double>>& data);
    std::shared_ptr<IsolationTree> buildTree(const std::vector<std::vector<double>>& data, int depth, int maxDepth);
    double getPathLength(const std::shared_ptr<IsolationTree>& tree, const std::vector<double>& point, int depth);
    double calculateC(int n);
};

class MLEngine {
public:
    MLEngine();
    
    std::vector<std::pair<std::shared_ptr<NetworkDevice>, double>> 
    detectAnomalies(const std::vector<std::shared_ptr<NetworkDevice>>& devices);
    
    void trainModel(const std::vector<std::shared_ptr<NetworkDevice>>& historicalData);
    
private:
    IsolationForest isolationForest;
    
    double calculateAnomalyScore(const std::shared_ptr<NetworkDevice>& device);
    double getTimeSinceLastSeen(const std::shared_ptr<NetworkDevice>& device);
    double getDeviceTypeScore(const std::string& deviceType);
};