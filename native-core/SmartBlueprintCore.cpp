#include "SmartBlueprintCore.h"

SmartBlueprintCore::SmartBlueprintCore() : monitoring(false) {
    scanner = std::make_unique<NetworkScanner>();
    mlEngine = std::make_unique<MLEngine>();
    classifier = std::make_unique<DeviceClassifier>();
    signalProcessor = std::make_unique<SignalProcessor>();
}

SmartBlueprintCore::~SmartBlueprintCore() {
    stopMonitoring();
}

void SmartBlueprintCore::startMonitoring() {
    if (monitoring.load()) return;
    
    monitoring.store(true);
    scanner->startScanning();
    
    monitoringThread = std::thread(&SmartBlueprintCore::monitoringLoop, this);
}

void SmartBlueprintCore::stopMonitoring() {
    if (!monitoring.load()) return;
    
    monitoring.store(false);
    scanner->stopScanning();
    
    if (monitoringThread.joinable()) {
        monitoringThread.join();
    }
}

void SmartBlueprintCore::monitoringLoop() {
    while (monitoring.load()) {
        try {
            // Get latest device data
            auto devices = scanner->getCurrentDevices();
            
            // Process and classify devices
            {
                std::lock_guard<std::mutex> lock(dataMutex);
                currentDevices = devices;
                updateDeviceClassifications();
                processSignalData();
                
                // Detect anomalies
                currentAnomalies = mlEngine->detectAnomalies(currentDevices);
            }
            
            // Wait before next iteration
            std::this_thread::sleep_for(std::chrono::seconds(5));
            
        } catch (const std::exception& e) {
            // Log error and continue
            std::this_thread::sleep_for(std::chrono::seconds(1));
        }
    }
}

std::vector<std::shared_ptr<NetworkDevice>> SmartBlueprintCore::getCurrentDevices() {
    std::lock_guard<std::mutex> lock(dataMutex);
    return currentDevices;
}

std::vector<std::pair<std::shared_ptr<NetworkDevice>, double>> SmartBlueprintCore::detectAnomalies() {
    std::lock_guard<std::mutex> lock(dataMutex);
    return currentAnomalies;
}

void SmartBlueprintCore::performScan() {
    scanner->performNetworkScan();
}

void SmartBlueprintCore::updateDeviceClassifications() {
    for (auto& device : currentDevices) {
        if (device->deviceType.empty()) {
            device->deviceType = classifier->classifyDevice(device);
            device->vendor = classifier->identifyVendor(device->macAddress);
        }
    }
}

void SmartBlueprintCore::processSignalData() {
    for (auto& device : currentDevices) {
        // Process RSSI for signal smoothing
        double processedRSSI = signalProcessor->processRSSI(device->rssi, device->macAddress);
        device->rssi = static_cast<int>(processedRSSI);
    }
}

class NetworkScanner {
private:
    std::vector<std::shared_ptr<Device>> devices;
    std::mutex devicesMutex;
    bool isScanning;
    std::thread scanThread;

public:
    NetworkScanner() : isScanning(false) {}
    
    void startScanning() {
        if (isScanning) return;
        
        isScanning = true;
        scanThread = std::thread([this]() {
            while (isScanning) {
                performNetworkScan();
                std::this_thread::sleep_for(std::chrono::seconds(30));
            }
        });
    }
    
    void stopScanning() {
        isScanning = false;
        if (scanThread.joinable()) {
            scanThread.join();
        }
    }
    
    std::vector<std::shared_ptr<Device>> getDevices() {
        std::lock_guard<std::mutex> lock(devicesMutex);
        return devices;
    }

private:
    void performNetworkScan() {
        std::vector<std::shared_ptr<Device>> newDevices;
        
#ifdef _WIN32
        performWindowsNetworkScan(newDevices);
#elif __APPLE__
        performMacOSNetworkScan(newDevices);
#elif __ANDROID__
        performAndroidNetworkScan(newDevices);
#elif __linux__
        performLinuxNetworkScan(newDevices);
#endif
        
        std::lock_guard<std::mutex> lock(devicesMutex);
        devices = std::move(newDevices);
    }
    
#ifdef _WIN32
    void performWindowsNetworkScan(std::vector<std::shared_ptr<Device>>& newDevices) {
        // Windows-specific network scanning using WinAPI
        PMIB_IPNETTABLE pIpNetTable = nullptr;
        DWORD dwSize = 0;
        DWORD dwRetVal = 0;
        
        // Get size needed for IP Net Table
        if (GetIpNetTable(pIpNetTable, &dwSize, FALSE) == ERROR_INSUFFICIENT_BUFFER) {
            pIpNetTable = (MIB_IPNETTABLE*)malloc(dwSize);
            
            if ((dwRetVal = GetIpNetTable(pIpNetTable, &dwSize, FALSE)) == NO_ERROR) {
                for (DWORD i = 0; i < pIpNetTable->dwNumEntries; i++) {
                    MIB_IPNETROW ipNetRow = pIpNetTable->table[i];
                    
                    // Convert MAC address to string
                    char macStr[18];
                    sprintf_s(macStr, 18, "%02X:%02X:%02X:%02X:%02X:%02X",
                        ipNetRow.bPhysAddr[0], ipNetRow.bPhysAddr[1],
                        ipNetRow.bPhysAddr[2], ipNetRow.bPhysAddr[3],
                        ipNetRow.bPhysAddr[4], ipNetRow.bPhysAddr[5]);
                    
                    // Convert IP address to string
                    struct in_addr addr;
                    addr.S_un.S_addr = ipNetRow.dwAddr;
                    std::string ipStr = inet_ntoa(addr);
                    
                    auto device = std::make_shared<Device>(macStr, ipStr);
                    device->isOnline = (ipNetRow.dwType == MIB_IPNET_TYPE_DYNAMIC);
                    
                    newDevices.push_back(device);
                }
            }
            
            if (pIpNetTable) {
                free(pIpNetTable);
            }
        }
    }
#endif

#ifdef __APPLE__
    void performMacOSNetworkScan(std::vector<std::shared_ptr<Device>>& newDevices) {
        // macOS-specific network scanning using Core WLAN
        @autoreleasepool {
            CWWiFiClient* wifiClient = [CWWiFiClient sharedWiFiClient];
            CWInterface* interface = [wifiClient interface];
            
            if (interface) {
                NSSet<CWNetwork*>* networks = [interface scanForNetworksWithName:nil error:nil];
                
                for (CWNetwork* network in networks) {
                    NSString* bssid = [network bssid];
                    NSNumber* rssiValue = [NSNumber numberWithInteger:[network rssiValue]];
                    
                    if (bssid) {
                        std::string macStr = [bssid UTF8String];
                        auto device = std::make_shared<Device>(macStr, "");
                        device->rssi = [rssiValue intValue];
                        device->isOnline = true;
                        
                        newDevices.push_back(device);
                    }
                }
            }
        }
    }
#endif

#ifdef __ANDROID__
    void performAndroidNetworkScan(std::vector<std::shared_ptr<Device>>& newDevices) {
        // Android-specific network scanning via JNI
        // This would require proper JNI setup and Android permissions
        __android_log_print(ANDROID_LOG_INFO, "SmartBlueprint", "Performing Android network scan");
    }
#endif

#ifdef __linux__
    void performLinuxNetworkScan(std::vector<std::shared_ptr<Device>>& newDevices) {
        // Linux-specific network scanning using /proc/net/arp
        std::ifstream arpFile("/proc/net/arp");
        std::string line;
        
        // Skip header line
        std::getline(arpFile, line);
        
        while (std::getline(arpFile, line)) {
            std::istringstream iss(line);
            std::string ip, hwType, flags, hwAddr, mask, device;
            
            if (iss >> ip >> hwType >> flags >> hwAddr >> mask >> device) {
                if (hwAddr != "00:00:00:00:00:00") {
                    auto devicePtr = std::make_shared<Device>(hwAddr, ip);
                    devicePtr->isOnline = true;
                    newDevices.push_back(devicePtr);
                }
            }
        }
    }
#endif
};

class MLAnomalyDetector {
private:
    std::vector<std::vector<double>> trainingData;
    std::vector<double> thresholds;
    
public:
    void trainModel(const std::vector<std::shared_ptr<Device>>& devices) {
        // Simple anomaly detection based on RSSI patterns
        trainingData.clear();
        
        for (const auto& device : devices) {
            std::vector<double> features;
            features.push_back(static_cast<double>(device->rssi));
            features.push_back(device->isOnline ? 1.0 : 0.0);
            
            trainingData.push_back(features);
        }
        
        // Calculate thresholds (simplified)
        if (!trainingData.empty()) {
            thresholds.resize(trainingData[0].size());
            for (size_t i = 0; i < thresholds.size(); ++i) {
                double sum = 0.0;
                for (const auto& sample : trainingData) {
                    sum += sample[i];
                }
                thresholds[i] = sum / trainingData.size();
            }
        }
    }
    
    double detectAnomaly(const std::shared_ptr<Device>& device) {
        if (thresholds.empty()) return 0.0;
        
        std::vector<double> features;
        features.push_back(static_cast<double>(device->rssi));
        features.push_back(device->isOnline ? 1.0 : 0.0);
        
        double anomalyScore = 0.0;
        for (size_t i = 0; i < features.size() && i < thresholds.size(); ++i) {
            double deviation = std::abs(features[i] - thresholds[i]);
            anomalyScore += deviation;
        }
        
        return anomalyScore / features.size();
    }
};

class SmartBlueprintCore {
private:
    std::unique_ptr<NetworkScanner> scanner;
    std::unique_ptr<MLAnomalyDetector> anomalyDetector;
    bool isRunning;

public:
    SmartBlueprintCore() : isRunning(false) {
        scanner = std::make_unique<NetworkScanner>();
        anomalyDetector = std::make_unique<MLAnomalyDetector>();
    }
    
    void start() {
        if (isRunning) return;
        
        isRunning = true;
        scanner->startScanning();
        
        // Start ML training thread
        std::thread mlThread([this]() {
            while (isRunning) {
                auto devices = scanner->getDevices();
                if (!devices.empty()) {
                    anomalyDetector->trainModel(devices);
                }
                std::this_thread::sleep_for(std::chrono::minutes(5));
            }
        });
        mlThread.detach();
    }
    
    void stop() {
        isRunning = false;
        scanner->stopScanning();
    }
    
    std::vector<std::shared_ptr<Device>> getCurrentDevices() {
        return scanner->getDevices();
    }
    
    std::vector<std::pair<std::shared_ptr<Device>, double>> detectAnomalies() {
        std::vector<std::pair<std::shared_ptr<Device>, double>> anomalies;
        auto devices = scanner->getDevices();
        
        for (const auto& device : devices) {
            double score = anomalyDetector->detectAnomaly(device);
            if (score > 0.5) { // Threshold for anomaly detection
                anomalies.push_back({device, score});
            }
        }
        
        return anomalies;
    }
};

} // namespace SmartBlueprint