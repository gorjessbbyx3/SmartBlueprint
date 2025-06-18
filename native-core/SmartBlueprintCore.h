#pragma once

#include "NetworkScanner.h"
#include "MLEngine.h"
#include "DeviceClassifier.h"
#include "SignalProcessor.h"
#include <vector>
#include <memory>
#include <thread>
#include <mutex>
#include <atomic>

class SmartBlueprintCore {
public:
    SmartBlueprintCore();
    ~SmartBlueprintCore();
    
    void startMonitoring();
    void stopMonitoring();
    
    std::vector<std::shared_ptr<NetworkDevice>> getCurrentDevices();
    std::vector<std::pair<std::shared_ptr<NetworkDevice>, double>> detectAnomalies();
    
    void performScan();
    bool isMonitoring() const { return monitoring; }
    
private:
    std::unique_ptr<NetworkScanner> scanner;
    std::unique_ptr<MLEngine> mlEngine;
    std::unique_ptr<DeviceClassifier> classifier;
    std::unique_ptr<SignalProcessor> signalProcessor;
    
    std::atomic<bool> monitoring;
    std::thread monitoringThread;
    std::mutex dataMutex;
    
    std::vector<std::shared_ptr<NetworkDevice>> currentDevices;
    std::vector<std::pair<std::shared_ptr<NetworkDevice>, double>> currentAnomalies;
    
    void monitoringLoop();
    void updateDeviceClassifications();
    void processSignalData();
};