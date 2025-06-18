#include "NetworkScanner.h"
#include <iostream>
#include <thread>
#include <chrono>

#ifdef _WIN32
#include <winsock2.h>
#include <ws2tcpip.h>
#include <iphlpapi.h>
#pragma comment(lib, "ws2_32.lib")
#pragma comment(lib, "iphlpapi.lib")
#elif __APPLE__
#include <SystemConfiguration/SystemConfiguration.h>
#include <CoreWLAN/CoreWLAN.h>
#else
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <ifaddrs.h>
#include <unistd.h>
#endif

NetworkScanner::NetworkScanner() : isScanning(false) {
    initializePlatform();
}

NetworkScanner::~NetworkScanner() {
    stopScanning();
    cleanupPlatform();
}

void NetworkScanner::initializePlatform() {
#ifdef _WIN32
    WSADATA wsaData;
    if (WSAStartup(MAKEWORD(2, 2), &wsaData) != 0) {
        throw std::runtime_error("Failed to initialize Winsock");
    }
#endif
}

void NetworkScanner::cleanupPlatform() {
#ifdef _WIN32
    WSACleanup();
#endif
}

void NetworkScanner::startScanning() {
    if (isScanning) return;
    
    isScanning = true;
    scanningThread = std::thread(&NetworkScanner::scanLoop, this);
}

void NetworkScanner::stopScanning() {
    isScanning = false;
    if (scanningThread.joinable()) {
        scanningThread.join();
    }
}

void NetworkScanner::scanLoop() {
    while (isScanning) {
        try {
            performNetworkScan();
            std::this_thread::sleep_for(std::chrono::seconds(30));
        } catch (const std::exception& e) {
            std::cerr << "Scan error: " << e.what() << std::endl;
            std::this_thread::sleep_for(std::chrono::seconds(5));
        }
    }
}

std::vector<std::shared_ptr<NetworkDevice>> NetworkScanner::getCurrentDevices() {
    std::lock_guard<std::mutex> lock(devicesMutex);
    std::vector<std::shared_ptr<NetworkDevice>> result;
    
    for (const auto& pair : discoveredDevices) {
        result.push_back(pair.second);
    }
    
    return result;
}

void NetworkScanner::performNetworkScan() {
    std::vector<std::shared_ptr<NetworkDevice>> newDevices;
    
#ifdef _WIN32
    newDevices = scanWindowsNetwork();
#elif __APPLE__
    newDevices = scanMacOSNetwork();
#else
    newDevices = scanLinuxNetwork();
#endif
    
    updateDeviceList(newDevices);
}

#ifdef _WIN32
std::vector<std::shared_ptr<NetworkDevice>> NetworkScanner::scanWindowsNetwork() {
    std::vector<std::shared_ptr<NetworkDevice>> devices;
    
    // Get ARP table
    PMIB_IPNETTABLE pIpNetTable;
    DWORD dwSize = 0;
    
    if (GetIpNetTable(NULL, &dwSize, FALSE) == ERROR_INSUFFICIENT_BUFFER) {
        pIpNetTable = (MIB_IPNETTABLE*)malloc(dwSize);
        
        if (GetIpNetTable(pIpNetTable, &dwSize, FALSE) == NO_ERROR) {
            for (DWORD i = 0; i < pIpNetTable->dwNumEntries; i++) {
                MIB_IPNETROW& row = pIpNetTable->table[i];
                
                if (row.dwType == MIB_IPNET_TYPE_DYNAMIC || row.dwType == MIB_IPNET_TYPE_STATIC) {
                    auto device = std::make_shared<NetworkDevice>();
                    
                    // IP Address
                    struct in_addr addr;
                    addr.s_addr = row.dwAddr;
                    device->ipAddress = inet_ntoa(addr);
                    
                    // MAC Address
                    char macStr[18];
                    sprintf_s(macStr, sizeof(macStr), "%02x:%02x:%02x:%02x:%02x:%02x",
                        row.bPhysAddr[0], row.bPhysAddr[1], row.bPhysAddr[2],
                        row.bPhysAddr[3], row.bPhysAddr[4], row.bPhysAddr[5]);
                    device->macAddress = macStr;
                    
                    device->isOnline = true;
                    device->rssi = -50; // Simulated signal strength
                    device->lastSeen = std::chrono::system_clock::now();
                    
                    devices.push_back(device);
                }
            }
        }
        
        free(pIpNetTable);
    }
    
    return devices;
}
#endif

#ifdef __APPLE__
std::vector<std::shared_ptr<NetworkDevice>> NetworkScanner::scanMacOSNetwork() {
    std::vector<std::shared_ptr<NetworkDevice>> devices;
    
    // Placeholder for macOS-specific network scanning
    // Would use CoreWLAN and System Configuration frameworks
    
    return devices;
}
#endif

#ifndef _WIN32
#ifndef __APPLE__
std::vector<std::shared_ptr<NetworkDevice>> NetworkScanner::scanLinuxNetwork() {
    std::vector<std::shared_ptr<NetworkDevice>> devices;
    
    // Placeholder for Linux-specific network scanning
    // Would use /proc/net/arp and other system interfaces
    
    return devices;
}
#endif
#endif

void NetworkScanner::updateDeviceList(const std::vector<std::shared_ptr<NetworkDevice>>& newDevices) {
    std::lock_guard<std::mutex> lock(devicesMutex);
    
    // Mark all existing devices as potentially offline
    for (auto& pair : discoveredDevices) {
        pair.second->isOnline = false;
    }
    
    // Update or add new devices
    for (const auto& newDevice : newDevices) {
        std::string key = newDevice->macAddress;
        
        auto it = discoveredDevices.find(key);
        if (it != discoveredDevices.end()) {
            // Update existing device
            it->second->ipAddress = newDevice->ipAddress;
            it->second->isOnline = true;
            it->second->rssi = newDevice->rssi;
            it->second->lastSeen = newDevice->lastSeen;
        } else {
            // Add new device
            discoveredDevices[key] = newDevice;
        }
    }
    
    // Remove devices not seen for too long
    auto now = std::chrono::system_clock::now();
    auto it = discoveredDevices.begin();
    while (it != discoveredDevices.end()) {
        auto timeSinceLastSeen = std::chrono::duration_cast<std::chrono::minutes>(
            now - it->second->lastSeen).count();
        
        if (timeSinceLastSeen > 10) { // Remove after 10 minutes
            it = discoveredDevices.erase(it);
        } else {
            ++it;
        }
    }
}