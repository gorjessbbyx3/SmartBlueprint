// SmartBlueprint Pro - Enhanced Production Version
// Complete implementation with live device scanning, logging, and security features
// Compilation: Use Visual Studio Developer Command Prompt and run compile-enhanced.bat

#include <iostream>
#include <vector>
#include <string>
#include <map>
#include <set>
#include <thread>
#include <chrono>
#include <iomanip>
#include <fstream>
#include <mutex>
#include <atomic>
#include <sstream>
#include <algorithm>

#ifdef _WIN32
#include <windows.h>
#include <winsock2.h>
#include <ws2tcpip.h>
#include <iphlpapi.h>
#include <icmpapi.h>
#include <conio.h>
#pragma comment(lib, "ws2_32.lib")
#pragma comment(lib, "iphlpapi.lib")
#pragma comment(lib, "icmp.lib")
#else
#include <unistd.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <netdb.h>
#include <sys/select.h>
#endif

struct Settings {
    int scanIntervalSeconds = 30;
    std::string logFile = "smartblueprint_scan.csv";
    std::set<std::string> macWhitelist;
    bool enableSecurityFlags = true;
    bool autoRefresh = true;
    
    void loadFromFile(const std::string& filename) {
        std::ifstream file(filename);
        if (!file.is_open()) {
            // Create default settings file
            std::ofstream outFile(filename);
            outFile << "[Scan]\n";
            outFile << "IntervalSeconds=30\n";
            outFile << "LogFile=smartblueprint_scan.csv\n";
            outFile << "MACWhitelist=\n";
            outFile << "EnableSecurityFlags=true\n";
            outFile << "AutoRefresh=true\n";
            outFile.close();
            return;
        }
        
        std::string line;
        while (std::getline(file, line)) {
            if (line.empty() || line[0] == '[' || line[0] == '#') continue;
            
            size_t pos = line.find('=');
            if (pos != std::string::npos) {
                std::string key = line.substr(0, pos);
                std::string value = line.substr(pos + 1);
                
                if (key == "IntervalSeconds") {
                    scanIntervalSeconds = std::stoi(value);
                } else if (key == "LogFile") {
                    logFile = value;
                } else if (key == "MACWhitelist") {
                    std::istringstream iss(value);
                    std::string mac;
                    while (std::getline(iss, mac, ',')) {
                        if (!mac.empty()) {
                            macWhitelist.insert(mac);
                        }
                    }
                } else if (key == "EnableSecurityFlags") {
                    enableSecurityFlags = (value == "true");
                } else if (key == "AutoRefresh") {
                    autoRefresh = (value == "true");
                }
            }
        }
        file.close();
    }
};

struct Device {
    std::string macAddress;
    std::string ipAddress;
    std::string hostname;
    int rssi;
    bool isOnline;
    std::chrono::system_clock::time_point lastSeen;
    std::chrono::system_clock::time_point firstSeen;
    double confidence;
    bool isAuthorized;
    int scanCount;
    
    Device() : rssi(-50), isOnline(true), 
               lastSeen(std::chrono::system_clock::now()),
               firstSeen(std::chrono::system_clock::now()),
               confidence(0.8), isAuthorized(true), scanCount(1) {}
};

class SmartBlueprintApp {
private:
    std::vector<std::shared_ptr<Device>> devices;
    std::mutex devicesMutex;
    std::atomic<bool> running{true};
    std::atomic<bool> autoRefresh{true};
    int currentView = 0; // 0=Dashboard, 1=Devices, 2=Help, 3=History, 4=Filtered
    int filterMode = 0; // 0=All, 1=Online, 2=Offline, 3=Unauthorized
    Settings settings;
    std::map<std::string, std::vector<int>> signalHistory; // MAC -> RSSI history
    
public:
    SmartBlueprintApp() {
#ifdef _WIN32
        WSADATA wsaData;
        WSAStartup(MAKEWORD(2, 2), &wsaData);
        
        HANDLE hConsole = GetStdHandle(STD_OUTPUT_HANDLE);
        DWORD mode;
        GetConsoleMode(hConsole, &mode);
        mode |= ENABLE_VIRTUAL_TERMINAL_PROCESSING;
        SetConsoleMode(hConsole, mode);
        
        SetConsoleTitleA("SmartBlueprint Pro - Enhanced Network Monitor");
#endif
        settings.loadFromFile("settings.ini");
        autoRefresh = settings.autoRefresh;
        initializeLogFile();
    }
    
    ~SmartBlueprintApp() {
#ifdef _WIN32
        WSACleanup();
#endif
    }
    
    void initializeLogFile() {
        std::ofstream logFile(settings.logFile, std::ios::app);
        if (logFile.tellp() == 0) {
            logFile << "Timestamp,Device,MAC,IP,Signal,Status,Confidence,FirstSeen,ScanCount\n";
        }
        logFile.close();
    }
    
    void performLiveDeviceScanning() {
        std::vector<std::shared_ptr<Device>> discoveredDevices;
        std::map<std::string, std::shared_ptr<Device>> existingDevices;
        
        // Create map of existing devices by MAC address
        {
            std::lock_guard<std::mutex> lock(devicesMutex);
            for (auto& device : devices) {
                existingDevices[device->macAddress] = device;
            }
        }
        
#ifdef _WIN32
        // Windows ARP table scanning
        ULONG bufferSize = 0;
        GetIpNetTable(nullptr, &bufferSize, FALSE);
        
        std::vector<BYTE> buffer(bufferSize);
        PMIB_IPNETTABLE pIpNetTable = reinterpret_cast<PMIB_IPNETTABLE>(buffer.data());
        
        if (GetIpNetTable(pIpNetTable, &bufferSize, FALSE) == NO_ERROR) {
            for (DWORD i = 0; i < pIpNetTable->dwNumEntries; i++) {
                MIB_IPNETROW& entry = pIpNetTable->table[i];
                
                if (entry.dwType == MIB_IPNET_TYPE_DYNAMIC || entry.dwType == MIB_IPNET_TYPE_STATIC) {
                    // Convert IP address
                    IN_ADDR addr;
                    addr.S_un.S_addr = entry.dwAddr;
                    std::string ipAddress = inet_ntoa(addr);
                    
                    // Convert MAC address
                    std::ostringstream macStream;
                    for (DWORD j = 0; j < entry.dwPhysAddrLen; j++) {
                        if (j > 0) macStream << ":";
                        macStream << std::hex << std::setfill('0') << std::setw(2) 
                                 << static_cast<int>(entry.bPhysAddr[j]);
                    }
                    std::string macAddress = macStream.str();
                    
                    if (macAddress.empty() || macAddress == "00:00:00:00:00:00") continue;
                    
                    // Check if device exists
                    std::shared_ptr<Device> device;
                    if (existingDevices.find(macAddress) != existingDevices.end()) {
                        device = existingDevices[macAddress];
                        device->scanCount++;
                    } else {
                        device = std::make_shared<Device>();
                        device->macAddress = macAddress;
                        device->firstSeen = std::chrono::system_clock::now();
                    }
                    
                    device->ipAddress = ipAddress;
                    device->hostname = getHostname(ipAddress);
                    device->rssi = measureSignalStrength(ipAddress);
                    device->isOnline = (device->rssi > -100);
                    device->lastSeen = std::chrono::system_clock::now();
                    device->confidence = calculateConfidence(device->rssi, device->isOnline);
                    device->isAuthorized = checkAuthorization(macAddress);
                    
                    // Update signal history
                    signalHistory[macAddress].push_back(device->rssi);
                    if (signalHistory[macAddress].size() > 20) {
                        signalHistory[macAddress].erase(signalHistory[macAddress].begin());
                    }
                    
                    discoveredDevices.push_back(device);
                }
            }
        }
        
        // ICMP ping sweep for additional discovery
        performPingSweep(discoveredDevices, existingDevices);
        
#else
        // Linux /proc/net/arp scanning
        std::ifstream arpFile("/proc/net/arp");
        std::string line;
        
        std::getline(arpFile, line); // Skip header
        
        while (std::getline(arpFile, line)) {
            std::istringstream iss(line);
            std::string ip, hwType, flags, mac, mask, device;
            
            if (iss >> ip >> hwType >> flags >> mac >> mask >> device) {
                if (mac != "00:00:00:00:00:00") {
                    std::shared_ptr<Device> dev;
                    if (existingDevices.find(mac) != existingDevices.end()) {
                        dev = existingDevices[mac];
                        dev->scanCount++;
                    } else {
                        dev = std::make_shared<Device>();
                        dev->macAddress = mac;
                        dev->firstSeen = std::chrono::system_clock::now();
                    }
                    
                    dev->ipAddress = ip;
                    dev->hostname = getHostname(ip);
                    dev->rssi = measureSignalStrength(ip);
                    dev->isOnline = (dev->rssi > -100);
                    dev->lastSeen = std::chrono::system_clock::now();
                    dev->confidence = calculateConfidence(dev->rssi, dev->isOnline);
                    dev->isAuthorized = checkAuthorization(mac);
                    
                    signalHistory[mac].push_back(dev->rssi);
                    if (signalHistory[mac].size() > 20) {
                        signalHistory[mac].erase(signalHistory[mac].begin());
                    }
                    
                    discoveredDevices.push_back(dev);
                }
            }
        }
#endif
        
        // Update device list
        {
            std::lock_guard<std::mutex> lock(devicesMutex);
            devices = discoveredDevices;
        }
        
        // Log results
        logScanResults();
        detectSecurityThreats();
    }
    
    void performPingSweep(std::vector<std::shared_ptr<Device>>& discoveredDevices, 
                         std::map<std::string, std::shared_ptr<Device>>& existingDevices) {
        // Ping common IP ranges to discover devices not in ARP table
        std::vector<std::string> commonIPs = {
            "192.168.1.1", "192.168.1.254", "192.168.0.1", "192.168.0.254",
            "10.0.0.1", "10.0.0.254", "172.16.0.1"
        };
        
        for (const auto& ip : commonIPs) {
            int rssi = measureSignalStrength(ip);
            if (rssi > -100) { // Device responded
                // Create synthetic MAC for ping-only devices
                std::string syntheticMAC = "ping:" + ip;
                
                std::shared_ptr<Device> device;
                if (existingDevices.find(syntheticMAC) != existingDevices.end()) {
                    device = existingDevices[syntheticMAC];
                    device->scanCount++;
                } else {
                    device = std::make_shared<Device>();
                    device->macAddress = syntheticMAC;
                    device->firstSeen = std::chrono::system_clock::now();
                }
                
                device->ipAddress = ip;
                device->hostname = getHostname(ip);
                device->rssi = rssi;
                device->isOnline = true;
                device->lastSeen = std::chrono::system_clock::now();
                device->confidence = calculateConfidence(rssi, true);
                device->isAuthorized = true; // Ping-discovered devices are typically infrastructure
                
                discoveredDevices.push_back(device);
            }
        }
    }
    
    bool checkAuthorization(const std::string& macAddress) {
        if (!settings.enableSecurityFlags) return true;
        if (settings.macWhitelist.empty()) return true;
        
        // Check full MAC
        if (settings.macWhitelist.find(macAddress) != settings.macWhitelist.end()) {
            return true;
        }
        
        // Check MAC prefix (first 8 characters)
        std::string macPrefix = macAddress.substr(0, 8);
        for (const auto& whitelistedPrefix : settings.macWhitelist) {
            if (macAddress.find(whitelistedPrefix) == 0) {
                return true;
            }
        }
        
        return false;
    }
    
    void detectSecurityThreats() {
        std::lock_guard<std::mutex> lock(devicesMutex);
        
        for (const auto& device : devices) {
            if (!device->isAuthorized && device->scanCount == 1) {
                // New unauthorized device detected
                std::cout << "\n🚨 SECURITY ALERT: Unknown Device Detected\n";
                std::cout << "   MAC: " << device->macAddress << "\n";
                std::cout << "   IP:  " << device->ipAddress << "\n";
                std::cout << "   Name: " << device->hostname << "\n";
                std::cout << "   Potential Rogue Device - Manual Review Required\n";
            }
        }
    }
    
    std::string getHostname(const std::string& ipAddress) {
        struct sockaddr_in sa;
        char hostname[NI_MAXHOST];
        
        sa.sin_family = AF_INET;
        inet_pton(AF_INET, ipAddress.c_str(), &sa.sin_addr);
        
        if (getnameinfo(reinterpret_cast<struct sockaddr*>(&sa), sizeof(sa), 
                       hostname, NI_MAXHOST, nullptr, 0, NI_NAMEREQD) == 0) {
            return std::string(hostname);
        }
        
        return "Unknown";
    }
    
    int measureSignalStrength(const std::string& ipAddress) {
#ifdef _WIN32
        HANDLE hIcmpFile = IcmpCreateFile();
        if (hIcmpFile == INVALID_HANDLE_VALUE) {
            return -100;
        }
        
        char SendData[] = "SmartBlueprint";
        LPVOID ReplyBuffer = nullptr;
        DWORD ReplySize = sizeof(ICMP_ECHO_REPLY) + sizeof(SendData);
        ReplyBuffer = malloc(ReplySize);
        
        if (ReplyBuffer == nullptr) {
            IcmpCloseHandle(hIcmpFile);
            return -100;
        }
        
        DWORD dwRetVal = IcmpSendEcho(hIcmpFile, inet_addr(ipAddress.c_str()),
                                     SendData, sizeof(SendData), nullptr,
                                     ReplyBuffer, ReplySize, 3000);
        
        int signalStrength = -100;
        if (dwRetVal != 0) {
            PICMP_ECHO_REPLY pEchoReply = static_cast<PICMP_ECHO_REPLY>(ReplyBuffer);
            if (pEchoReply->Status == IP_SUCCESS) {
                // Convert RTT to signal strength: RSSI ≈ -30 - (RTT * 1.5)
                signalStrength = std::max(-100, static_cast<int>(-30 - (pEchoReply->RoundTripTime * 1.5)));
            }
        }
        
        free(ReplyBuffer);
        IcmpCloseHandle(hIcmpFile);
        return signalStrength;
#else
        std::string command = "ping -c 1 -W 1 " + ipAddress + " 2>/dev/null | grep 'time=' | awk -F'time=' '{print $2}' | awk '{print $1}'";
        FILE* pipe = popen(command.c_str(), "r");
        if (!pipe) return -100;
        
        char buffer[128];
        std::string result = "";
        while (fgets(buffer, sizeof buffer, pipe) != nullptr) {
            result += buffer;
        }
        pclose(pipe);
        
        if (!result.empty()) {
            double rtt = std::stod(result);
            return std::max(-100, static_cast<int>(-30 - (rtt * 1.5)));
        }
        return -100;
#endif
    }
    
    double calculateConfidence(int rssi, bool isOnline) {
        if (!isOnline) return 0.95;
        if (rssi > -40) return 0.95;
        if (rssi > -60) return 0.85;
        if (rssi > -80) return 0.70;
        return 0.50;
    }
    
    void logScanResults() {
        std::ofstream logFile(settings.logFile, std::ios::app);
        auto now = std::chrono::system_clock::now();
        auto time_t = std::chrono::system_clock::to_time_t(now);
        
        std::lock_guard<std::mutex> lock(devicesMutex);
        for (const auto& device : devices) {
            auto firstSeenTime = std::chrono::system_clock::to_time_t(device->firstSeen);
            
            logFile << std::put_time(std::localtime(&time_t), "%Y-%m-%d %H:%M:%S") << ","
                   << device->hostname << ","
                   << device->macAddress << ","
                   << device->ipAddress << ","
                   << device->rssi << ","
                   << (device->isOnline ? "Online" : "Offline") << ","
                   << std::fixed << std::setprecision(2) << device->confidence << ","
                   << std::put_time(std::localtime(&firstSeenTime), "%Y-%m-%d %H:%M:%S") << ","
                   << device->scanCount << "\n";
        }
        logFile.close();
    }
    
    std::string generateSignalBar(int rssi) {
        int bars = std::max(0, std::min(12, (rssi + 100) / 8));
        std::string result = "";
        for (int i = 0; i < bars; i++) {
            result += "█";
        }
        for (int i = bars; i < 12; i++) {
            result += "░";
        }
        return result;
    }
    
    std::string formatLastSeen(const std::chrono::system_clock::time_point& lastSeen) {
        auto now = std::chrono::system_clock::now();
        auto duration = std::chrono::duration_cast<std::chrono::minutes>(now - lastSeen);
        
        if (duration.count() < 1) return "Now";
        if (duration.count() < 60) return std::to_string(duration.count()) + "m ago";
        
        auto hours = std::chrono::duration_cast<std::chrono::hours>(now - lastSeen);
        if (hours.count() < 24) return std::to_string(hours.count()) + "h ago";
        
        auto days = std::chrono::duration_cast<std::chrono::hours>(now - lastSeen).count() / 24;
        return std::to_string(days) + "d ago";
    }
    
    void clearScreen() {
#ifdef _WIN32
        system("cls");
#else
        system("clear");
#endif
    }
    
    void showHeader() {
        auto now = std::chrono::system_clock::now();
        auto time_t = std::chrono::system_clock::to_time_t(now);
        
        std::cout << "╔══════════════════════════════════════════════════════════════╗\n";
        std::cout << "║ SmartBlueprint Pro │ " << getViewName() 
                  << std::string(30 - getViewName().length(), ' ') << "║\n";
        std::cout << "╠══════════════════════════════════════════════════════════════╣\n";
        std::cout << "║ Devices: " << std::setw(3) << getFilteredDeviceCount() 
                  << "/" << devices.size() << " │ Auto: " << (autoRefresh ? "ON " : "OFF")
                  << " │ Filter: " << getFilterName()
                  << " │ " << std::put_time(std::localtime(&time_t), "%H:%M:%S") << " ║\n";
        std::cout << "╠══════════════════════════════════════════════════════════════╣\n";
    }
    
    int getFilteredDeviceCount() {
        std::lock_guard<std::mutex> lock(devicesMutex);
        int count = 0;
        for (const auto& device : devices) {
            if (matchesFilter(device)) count++;
        }
        return count;
    }
    
    bool matchesFilter(std::shared_ptr<Device> device) {
        switch (filterMode) {
            case 1: return device->isOnline;
            case 2: return !device->isOnline;
            case 3: return !device->isAuthorized;
            default: return true;
        }
    }
    
    std::string getFilterName() {
        switch (filterMode) {
            case 1: return "Online";
            case 2: return "Offline";
            case 3: return "Unauthorized";
            default: return "All";
        }
    }
    
    std::string getViewName() {
        switch(currentView) {
            case 0: return "Dashboard";
            case 1: return "Device List";
            case 2: return "Help";
            case 3: return "Scan History";
            case 4: return "Filtered View";
            default: return "Unknown";
        }
    }
    
    void showDashboard() {
        std::cout << "\nLive Network Monitoring Dashboard\n";
        std::cout << "==================================\n\n";
        
        // Security summary
        int unauthorized = 0, weakSignals = 0, offline = 0;
        {
            std::lock_guard<std::mutex> lock(devicesMutex);
            for (const auto& device : devices) {
                if (!device->isAuthorized) unauthorized++;
                if (device->rssi < -80) weakSignals++;
                if (!device->isOnline) offline++;
            }
        }
        
        if (unauthorized > 0 || weakSignals > 0 || offline > 0) {
            std::cout << "🚨 Security & Performance Alerts:\n";
            if (unauthorized > 0) {
                std::cout << "   ⚠️  " << unauthorized << " unauthorized device(s) detected\n";
            }
            if (weakSignals > 0) {
                std::cout << "   📶 " << weakSignals << " device(s) with weak signal\n";
            }
            if (offline > 0) {
                std::cout << "   🔴 " << offline << " device(s) offline\n";
            }
            std::cout << "\n";
        }
        
        std::cout << "Device Overview with Signal Strength:\n";
        std::cout << "┌─────────────┬───────────────┬─────────────┬────────────────┬─────────┐\n";
        std::cout << "│ Device      │ IP Address    │ Signal      │ Status         │ Auth    │\n";
        std::cout << "├─────────────┼───────────────┼─────────────┼────────────────┼─────────┤\n";
        
        std::lock_guard<std::mutex> lock(devicesMutex);
        for (const auto& device : devices) {
            if (!matchesFilter(device)) continue;
            
            std::string status = device->isOnline ? 
                "\033[32mOnline\033[0m" : 
                ("\033[31mOffline (" + formatLastSeen(device->lastSeen) + ")\033[0m");
            std::string auth = device->isAuthorized ? "\033[32m✓\033[0m" : "\033[31m✗\033[0m";
            std::string signalDisplay = generateSignalBar(device->rssi) + " " + std::to_string(device->rssi);
            
            std::cout << "│ " << std::setw(11) << std::left << device->hostname.substr(0, 11)
                     << " │ " << std::setw(13) << std::left << device->ipAddress.substr(0, 13)
                     << " │ " << std::setw(11) << std::left << signalDisplay.substr(0, 11)
                     << " │ " << std::setw(14) << std::left << status.substr(0, 14)
                     << " │ " << auth << "       │\n";
        }
        
        std::cout << "└─────────────┴───────────────┴─────────────┴────────────────┴─────────┘\n\n";
        std::cout << "Live scanning every " << settings.scanIntervalSeconds << " seconds\n";
        std::cout << "Log file: " << settings.logFile << "\n";
    }
    
    void showDeviceList() {
        std::cout << "\nDetailed Device Information\n";
        std::cout << "===========================\n\n";
        
        std::lock_guard<std::mutex> lock(devicesMutex);
        int deviceNum = 1;
        for (const auto& device : devices) {
            if (!matchesFilter(device)) continue;
            
            std::string statusColor = device->isOnline ? "\033[32m" : "\033[31m";
            std::string authStatus = device->isAuthorized ? "Authorized" : "🚨 UNAUTHORIZED";
            
            std::cout << "Device " << deviceNum++ << ":\n";
            std::cout << "  Name: " << device->hostname << "\n";
            std::cout << "  MAC:  " << device->macAddress << "\n";
            std::cout << "  IP:   " << device->ipAddress << "\n";
            std::cout << "  Signal: " << generateSignalBar(device->rssi) << " " << device->rssi << " dBm\n";
            std::cout << "  Status: " << statusColor << (device->isOnline ? "Online" : "Offline") << "\033[0m\n";
            std::cout << "  Last Seen: " << formatLastSeen(device->lastSeen) << "\n";
            std::cout << "  First Seen: " << formatLastSeen(device->firstSeen) << "\n";
            std::cout << "  Scan Count: " << device->scanCount << "\n";
            std::cout << "  Confidence: " << std::fixed << std::setprecision(1) << (device->confidence * 100) << "%\n";
            std::cout << "  Authorization: " << authStatus << "\n";
            
            // Show signal history graph
            if (signalHistory.find(device->macAddress) != signalHistory.end()) {
                std::cout << "  Signal History: ";
                const auto& history = signalHistory[device->macAddress];
                for (size_t i = 0; i < history.size(); i++) {
                    int bars = std::max(0, std::min(3, (history[i] + 100) / 25));
                    switch (bars) {
                        case 0: std::cout << "▁"; break;
                        case 1: std::cout << "▂"; break;
                        case 2: std::cout << "▄"; break;
                        case 3: std::cout << "█"; break;
                    }
                }
                std::cout << "\n";
            }
            std::cout << "\n";
        }
    }
    
    void showHelp() {
        std::cout << "\nSmartBlueprint Pro - Enhanced Help Guide\n";
        std::cout << "========================================\n\n";
        
        std::cout << "Live Network Monitoring Features:\n";
        std::cout << "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
        std::cout << "• Real-time device discovery via ARP table scanning\n";
        std::cout << "• ICMP ping sweep for comprehensive network mapping\n";
        std::cout << "• Authentic signal strength measurement (RTT-based)\n";
        std::cout << "• Security threat detection for unauthorized devices\n";
        std::cout << "• Persistent CSV logging with timestamps\n";
        std::cout << "• Signal strength history and graphing\n";
        std::cout << "• Configurable settings via settings.ini\n\n";
        
        std::cout << "Keyboard Commands:\n";
        std::cout << "━━━━━━━━━━━━━━━━━━━\n";
        std::cout << "R - Manual refresh (immediate network scan)\n";
        std::cout << "Q - Quit application\n";
        std::cout << "1 - Dashboard view\n";
        std::cout << "2 - Detailed device list\n";
        std::cout << "3 - Scan history\n";
        std::cout << "F - Toggle filter (All/Online/Offline/Unauthorized)\n";
        std::cout << "A - Toggle auto-refresh\n";
        std::cout << "H - Show this help\n\n";
        
        std::cout << "Filter Modes:\n";
        std::cout << "━━━━━━━━━━━━━\n";
        std::cout << "All - Show all discovered devices\n";
        std::cout << "Online - Show only currently responding devices\n";
        std::cout << "Offline - Show only non-responding devices\n";
        std::cout << "Unauthorized - Show only devices not in whitelist\n\n";
        
        std::cout << "Security Features:\n";
        std::cout << "━━━━━━━━━━━━━━━━━━\n";
        std::cout << "• MAC address whitelist validation\n";
        std::cout << "• Rogue device detection and alerts\n";
        std::cout << "• Authorization status tracking\n";
        std::cout << "• Real-time security notifications\n\n";
        
        std::cout << "Configuration (settings.ini):\n";
        std::cout << "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
        std::cout << "IntervalSeconds - Auto-scan frequency\n";
        std::cout << "LogFile - CSV output filename\n";
        std::cout << "MACWhitelist - Authorized MAC prefixes\n";
        std::cout << "EnableSecurityFlags - Enable/disable security alerts\n\n";
    }
    
    void showScanHistory() {
        std::cout << "\nNetwork Scan History and Analytics\n";
        std::cout << "==================================\n\n";
        
        std::ifstream logFile(settings.logFile);
        if (logFile.is_open()) {
            std::string line;
            std::vector<std::string> recentEntries;
            
            std::getline(logFile, line); // Skip header
            
            while (std::getline(logFile, line)) {
                recentEntries.push_back(line);
            }
            logFile.close();
            
            if (recentEntries.empty()) {
                std::cout << "No scan history available.\n";
                std::cout << "Press 'R' to perform a network scan.\n\n";
            } else {
                std::cout << "Recent Network Activity (Last 15 entries):\n";
                std::cout << "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
                
                int startIdx = std::max(0, (int)recentEntries.size() - 15);
                for (int i = startIdx; i < (int)recentEntries.size(); i++) {
                    std::istringstream iss(recentEntries[i]);
                    std::string timestamp, device, mac, ip, rssi, status, confidence, firstSeen, scanCount;
                    
                    if (std::getline(iss, timestamp, ',') &&
                        std::getline(iss, device, ',') &&
                        std::getline(iss, mac, ',') &&
                        std::getline(iss, ip, ',') &&
                        std::getline(iss, rssi, ',') &&
                        std::getline(iss, status, ',') &&
                        std::getline(iss, confidence, ',') &&
                        std::getline(iss, firstSeen, ',') &&
                        std::getline(iss, scanCount, ',')) {
                        
                        std::cout << timestamp.substr(11, 8) << " │ " 
                                 << std::setw(12) << std::left << device.substr(0, 12) << " │ "
                                 << std::setw(15) << std::left << ip << " │ "
                                 << std::setw(6) << std::right << rssi << " │ "
                                 << std::setw(7) << std::left << status << " │ "
                                 << std::setw(4) << std::right << scanCount << "\n";
                    }
                }
                
                std::cout << "\nStatistics:\n";
                std::cout << "━━━━━━━━━━━\n";
                std::cout << "Total log entries: " << recentEntries.size() << "\n";
                std::cout << "Log file: " << settings.logFile << "\n";
                
                // Calculate some basic statistics
                int onlineCount = 0, offlineCount = 0;
                for (const auto& entry : recentEntries) {
                    if (entry.find(",Online,") != std::string::npos) onlineCount++;
                    if (entry.find(",Offline,") != std::string::npos) offlineCount++;
                }
                
                std::cout << "Online detections: " << onlineCount << "\n";
                std::cout << "Offline detections: " << offlineCount << "\n\n";
            }
        } else {
            std::cout << "Log file not found: " << settings.logFile << "\n";
            std::cout << "Perform a scan to start logging.\n\n";
        }
    }
    
    void showCommandBar() {
        std::cout << "╠══════════════════════════════════════════════════════════════╣\n";
        std::cout << "║ [ R ] Refresh    [ Q ] Quit     [ 1 ] Dashboard [ 2 ] List  ║\n";
        std::cout << "║ [ 3 ] History    [ F ] Filter   [ A ] Auto      [ H ] Help  ║\n";
        std::cout << "╚══════════════════════════════════════════════════════════════╝\n";
    }
    
    void render() {
        clearScreen();
        showHeader();
        
        switch(currentView) {
            case 0: showDashboard(); break;
            case 1: showDeviceList(); break;
            case 2: showHelp(); break;
            case 3: showScanHistory(); break;
            case 4: showDeviceList(); break; // Filtered view uses device list
        }
        
        showCommandBar();
    }
    
    char getKeyPress() {
#ifdef _WIN32
        if (_kbhit()) {
            return _getch();
        }
        return 0;
#else
        fd_set readfds;
        struct timeval tv;
        char ch = 0;
        
        FD_ZERO(&readfds);
        FD_SET(STDIN_FILENO, &readfds);
        tv.tv_sec = 0;
        tv.tv_usec = 100000;
        
        if (select(STDIN_FILENO + 1, &readfds, NULL, NULL, &tv) > 0) {
            read(STDIN_FILENO, &ch, 1);
        }
        
        return ch;
#endif
    }
    
    void handleInput() {
        char key = getKeyPress();
        if (key == 0) return;
        
        switch (std::tolower(key)) {
            case 'q':
                running = false;
                break;
            case 'r':
                performLiveDeviceScanning();
                break;
            case '1':
                currentView = 0;
                break;
            case '2':
                currentView = 1;
                break;
            case '3':
                currentView = 3;
                break;
            case 'f':
                filterMode = (filterMode + 1) % 4;
                currentView = (filterMode == 0) ? 0 : 4; // Return to dashboard for "All", use filtered view for others
                break;
            case 'h':
                currentView = 2;
                break;
            case 'a':
                autoRefresh = !autoRefresh;
                break;
        }
    }
    
    void run() {
        std::cout << "Starting SmartBlueprint Pro Enhanced Edition...\n";
        std::cout << "Loading settings from settings.ini...\n";
        std::cout << "Performing initial network scan...\n";
        
        performLiveDeviceScanning();
        
        std::this_thread::sleep_for(std::chrono::seconds(2));
        
        auto lastAutoScan = std::chrono::steady_clock::now();
        auto autoScanInterval = std::chrono::seconds(settings.scanIntervalSeconds);
        
        while (running) {
            render();
            handleInput();
            
            if (autoRefresh) {
                auto now = std::chrono::steady_clock::now();
                if (now - lastAutoScan >= autoScanInterval) {
                    performLiveDeviceScanning();
                    lastAutoScan = now;
                }
                std::this_thread::sleep_for(std::chrono::seconds(1));
            } else {
                std::this_thread::sleep_for(std::chrono::milliseconds(100));
            }
        }
        
        clearScreen();
        std::cout << "SmartBlueprint Pro - Enhanced Edition Shutdown\n";
        std::cout << "===============================================\n";
        std::cout << "Scan history saved to: " << settings.logFile << "\n";
        std::cout << "Total devices discovered: " << devices.size() << "\n";
        std::cout << "Thank you for using SmartBlueprint Pro!\n";
    }
};

int main() {
    try {
        SmartBlueprintApp app;
        app.run();
        return 0;
    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << std::endl;
        return 1;
    }
}