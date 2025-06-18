#pragma once

#include "NetworkScanner.h"
#include <string>
#include <map>
#include <memory>

class DeviceClassifier {
public:
    DeviceClassifier();
    
    std::string classifyDevice(const std::shared_ptr<NetworkDevice>& device);
    std::string identifyVendor(const std::string& macAddress);
    
private:
    std::map<std::string, std::string> ouiDatabase;
    std::map<std::string, std::string> devicePatterns;
    std::map<std::string, std::string> vendorPatterns;
    std::map<std::string, std::string> macToDeviceType;
    
    void initializeVendorDatabase();
    void initializeDevicePatterns();
};