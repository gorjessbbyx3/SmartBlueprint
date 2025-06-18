#pragma once

#include <vector>
#include <memory>
#include <thread>
#include <mutex>
#include <map>
#include <string>
#include <chrono>

struct NetworkDevice {
    std::string macAddress;
    std::string ipAddress;
    std::string hostname;
    int rssi;
    bool isOnline;
    std::chrono::system_clock::time_point lastSeen;
    std::string deviceType;
    std::string vendor;
    
    NetworkDevice() : rssi(-100), isOnline(false), lastSeen(std::chrono::system_clock::now()) {}
};

class NetworkScanner {
public:
    NetworkScanner();
    ~NetworkScanner();
    
    void startScanning();
    void stopScanning();
    std::vector<std::shared_ptr<NetworkDevice>> getCurrentDevices();
    void performNetworkScan();
    
private:
    bool isScanning;
    std::thread scanningThread;
    std::mutex devicesMutex;
    std::map<std::string, std::shared_ptr<NetworkDevice>> discoveredDevices;
    
    void initializePlatform();
    void cleanupPlatform();
    void scanLoop();
    void updateDeviceList(const std::vector<std::shared_ptr<NetworkDevice>>& newDevices);
    
#ifdef _WIN32
    std::vector<std::shared_ptr<NetworkDevice>> scanWindowsNetwork();
#elif __APPLE__
    std::vector<std::shared_ptr<NetworkDevice>> scanMacOSNetwork();
#else
    std::vector<std::shared_ptr<NetworkDevice>> scanLinuxNetwork();
#endif
};