#include "DesktopUI.h"
#include <iostream>
#include <iomanip>
#include <ctime>
#include <algorithm>

#ifdef _WIN32
#include <windows.h>
#include <conio.h>
#else
#include <termios.h>
#include <unistd.h>
#include <sys/select.h>
#endif

DesktopUI::DesktopUI() : currentView(ViewMode::DASHBOARD), autoRefresh(true) {
    setupConsole();
}

DesktopUI::~DesktopUI() {
    restoreConsole();
}

void DesktopUI::setupConsole() {
#ifdef _WIN32
    // Enable ANSI color codes on Windows
    HANDLE hOut = GetStdHandle(STD_OUTPUT_HANDLE);
    DWORD dwMode = 0;
    GetConsoleMode(hOut, &dwMode);
    dwMode |= ENABLE_VIRTUAL_TERMINAL_PROCESSING;
    SetConsoleMode(hOut, dwMode);
    
    // Set console title
    SetConsoleTitleA("SmartBlueprint Pro - Network Monitor");
    
    // Hide cursor
    CONSOLE_CURSOR_INFO cursorInfo;
    GetConsoleCursorInfo(hOut, &cursorInfo);
    cursorInfo.bVisible = FALSE;
    SetConsoleCursorInfo(hOut, &cursorInfo);
#else
    // Linux/macOS terminal setup
    std::cout << "\033]0;SmartBlueprint Pro - Network Monitor\007"; // Set title
    std::cout << "\033[?25l"; // Hide cursor
#endif
}

void DesktopUI::restoreConsole() {
#ifdef _WIN32
    // Restore cursor
    HANDLE hOut = GetStdHandle(STD_OUTPUT_HANDLE);
    CONSOLE_CURSOR_INFO cursorInfo;
    GetConsoleCursorInfo(hOut, &cursorInfo);
    cursorInfo.bVisible = TRUE;
    SetConsoleCursorInfo(hOut, &cursorInfo);
#else
    std::cout << "\033[?25h"; // Show cursor
#endif
}

void DesktopUI::clearScreen() {
#ifdef _WIN32
    system("cls");
#else
    system("clear");
#endif
}

void DesktopUI::showHeader() {
    auto now = std::chrono::system_clock::now();
    auto time_t = std::chrono::system_clock::to_time_t(now);
    
    std::cout << "╔══════════════════════════════════════════════════════════════╗\n";
    std::cout << "║ SmartBlueprint Pro │ " << getCurrentViewName() 
              << std::string(30 - getCurrentViewName().length(), ' ') << "║\n";
    std::cout << "╠══════════════════════════════════════════════════════════════╣\n";
    std::cout << "║ Devices: " << std::setw(3) << devices.size() 
              << "   │ Anomalies: " << std::setw(2) << anomalies.size()
              << "  │ Auto-refresh: " << (autoRefresh ? "ON " : "OFF")
              << " │ " << std::put_time(std::localtime(&time_t), "%H:%M:%S") << " ║\n";
    std::cout << "╠══════════════════════════════════════════════════════════════╣\n";
}

std::string DesktopUI::getCurrentViewName() {
    switch (currentView) {
        case ViewMode::DASHBOARD: return "Dashboard";
        case ViewMode::DEVICE_LIST: return "Device List";
        case ViewMode::ANOMALY_MONITOR: return "Anomaly Monitor";
        case ViewMode::SIGNAL_ANALYSIS: return "Signal Analysis";
        case ViewMode::SETTINGS: return "Settings";
        case ViewMode::HELP: return "Help";
        default: return "Unknown";
    }
}

void DesktopUI::updateDevices(const std::vector<std::shared_ptr<NetworkDevice>>& newDevices) {
    devices = newDevices;
}

void DesktopUI::updateAnomalies(const std::vector<std::pair<std::shared_ptr<NetworkDevice>, double>>& newAnomalies) {
    anomalies = newAnomalies;
}

void DesktopUI::render() {
    clearScreen();
    showHeader();
    
    switch (currentView) {
        case ViewMode::DASHBOARD:
            showDashboard();
            break;
        case ViewMode::DEVICE_LIST:
            showDeviceList();
            break;
        case ViewMode::ANOMALY_MONITOR:
            showAnomalyMonitor();
            break;
        case ViewMode::SIGNAL_ANALYSIS:
            showSignalAnalysis();
            break;
        case ViewMode::SETTINGS:
            showSettings();
            break;
        case ViewMode::HELP:
            showHelp();
            break;
    }
    
    showCommandBar();
}

void DesktopUI::showDashboard() {
    std::cout << "\nWelcome to SmartBlueprint Network Monitor\n";
    std::cout << "=========================================\n";
    
    std::cout << "Devices Found: " << devices.size() << "\n\n";
    
    // Device table header
    std::cout << "┌─────────────┬───────────────┬───────────────────┬────────┬─────────┐\n";
    std::cout << "│ Device Name │ IP Address    │ MAC Address       │ Signal │ Status  │\n";
    std::cout << "├─────────────┼───────────────┼───────────────────┼────────┼─────────┤\n";
    
    if (devices.empty()) {
        std::cout << "│             │               │ No devices found  │        │ Scanning│\n";
    } else {
        for (const auto& device : devices) {
            std::string deviceName = device->hostname.empty() ? 
                generateDeviceName(device->macAddress) : device->hostname;
            std::string ipAddr = device->ipAddress.empty() ? "Unknown" : device->ipAddress;
            std::string status = device->isOnline ? "\033[32mOnline\033[0m" : "\033[31mOffline\033[0m";
            std::string signal = std::to_string(device->rssi) + " dBm";
            
            std::cout << "│ " << std::setw(11) << std::left << deviceName.substr(0, 11)
                     << " │ " << std::setw(13) << std::left << ipAddr.substr(0, 13)
                     << " │ " << std::setw(17) << std::left << device->macAddress.substr(0, 17)
                     << " │ " << std::setw(6) << std::right << signal
                     << " │ " << status << std::string(9, ' ') << "│\n";
        }
    }
    
    std::cout << "└─────────────┴───────────────┴───────────────────┴────────┴─────────┘\n\n";
    
    // Real-time anomalies section
    showAnomaliesCompact();
}

void DesktopUI::showAnomaliesCompact() {
    if (!anomalies.empty()) {
        std::cout << "Real-time anomalies:\n";
        for (const auto& anomaly : anomalies) {
            std::string deviceName = generateDeviceName(anomaly.first->macAddress);
            int confidence = static_cast<int>(anomaly.second * 100);
            
            std::cout << "\033[33m⚠️  Device " << deviceName 
                     << ": Offline unexpectedly — Confidence: " << confidence << "%\033[0m\n";
        }
    }
    
    std::cout << "\nFeatures:\n";
    std::cout << "• Auto-refreshes every 30s\n";
    std::cout << "• Real-time anomaly detection\n";
    std::cout << "• ML-powered signal analysis\n\n";
}

std::string DesktopUI::generateDeviceName(const std::string& macAddress) {
    std::string prefix = macAddress.substr(0, 8);
    if (prefix.find("aa:bb") != std::string::npos) return "Router";
    if (prefix.find("11:22") != std::string::npos) return "Laptop";
    if (prefix.find("33:44") != std::string::npos) return "Printer";
    if (prefix.find("55:66") != std::string::npos) return "Smart-TV";
    if (prefix.find("77:88") != std::string::npos) return "Phone";
    return "Device-" + macAddress.substr(15, 2);
}

void DesktopUI::showDeviceList() {
    std::cout << "\nDetailed Device Information\n";
    std::cout << "===========================\n\n";
    
    if (devices.empty()) {
        std::cout << "🔍 No devices detected. Network scanning in progress...\n\n";
        std::cout << "Tips:\n";
        std::cout << "• Ensure you're connected to a WiFi network\n";
        std::cout << "• Check that devices are powered on\n";
        std::cout << "• Wait 30-60 seconds for full discovery\n";
        return;
    }
    
    for (size_t i = 0; i < devices.size(); ++i) {
        const auto& device = devices[i];
        std::string statusColor = device->isOnline ? "\033[32m" : "\033[31m";
        std::string signalQuality = getSignalQuality(device->rssi);
        
        std::cout << "Device " << (i + 1) << ":\n";
        std::cout << "  Name: " << generateDeviceName(device->macAddress) << "\n";
        std::cout << "  MAC:  " << device->macAddress << "\n";
        std::cout << "  IP:   " << (device->ipAddress.empty() ? "Unknown" : device->ipAddress) << "\n";
        std::cout << "  Signal: " << device->rssi << " dBm (" << signalQuality << ")\n";
        std::cout << "  Status: " << statusColor << (device->isOnline ? "Online" : "Offline") << "\033[0m\n";
        
        auto now = std::chrono::system_clock::now();
        auto lastSeen = std::chrono::duration_cast<std::chrono::seconds>(now - device->lastSeen).count();
        std::cout << "  Last Seen: " << lastSeen << " seconds ago\n\n";
    }
}

std::string DesktopUI::getSignalQuality(int rssi) {
    if (rssi >= -50) return "\033[32mExcellent\033[0m";
    if (rssi >= -60) return "\033[32mGood\033[0m";
    if (rssi >= -70) return "\033[33mFair\033[0m";
    return "\033[31mPoor\033[0m";
}

void DesktopUI::showAnomalyMonitor() {
    std::cout << "\nNetwork Anomaly Detection\n";
    std::cout << "=========================\n\n";
    
    std::cout << "Active Monitoring: \033[32mENABLED\033[0m\n";
    std::cout << "Detection Algorithm: ML-based pattern analysis\n";
    std::cout << "Anomalies Found: " << anomalies.size() << "\n\n";
    
    if (anomalies.empty()) {
        std::cout << "✅ No anomalies detected\n";
        std::cout << "   Network appears to be functioning normally\n\n";
    } else {
        std::cout << "⚠️  Anomalies Detected:\n";
        std::cout << "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";
        
        for (size_t i = 0; i < anomalies.size(); ++i) {
            const auto& anomaly = anomalies[i];
            std::string deviceName = generateDeviceName(anomaly.first->macAddress);
            int confidence = static_cast<int>(anomaly.second * 100);
            
            std::cout << "Anomaly " << (i + 1) << ":\n";
            std::cout << "  Device: " << deviceName << " (" << anomaly.first->macAddress << ")\n";
            std::cout << "  Issue: Signal deviation from normal pattern\n";
            std::cout << "  Confidence: " << confidence << "%\n";
            std::cout << "  Recommendation: Check device connectivity\n\n";
        }
    }
    
    std::cout << "Monitoring Statistics:\n";
    std::cout << "• Total devices monitored: " << devices.size() << "\n";
    std::cout << "• Scan frequency: Every 30 seconds\n";
    std::cout << "• Detection sensitivity: High\n";
}

void DesktopUI::showSignalAnalysis() {
    std::cout << "\nSignal Strength Analysis\n";
    std::cout << "========================\n\n";
    
    if (devices.empty()) {
        std::cout << "No devices available for analysis\n";
        return;
    }
    
    int totalSignal = 0;
    int strongSignals = 0;
    int weakSignals = 0;
    
    for (const auto& device : devices) {
        totalSignal += device->rssi;
        if (device->rssi >= -60) strongSignals++;
        if (device->rssi <= -70) weakSignals++;
    }
    
    int averageSignal = totalSignal / devices.size();
    
    std::cout << "Network Signal Summary:\n";
    std::cout << "━━━━━━━━━━━━━━━━━━━━━━━━━\n";
    std::cout << "Average Signal Strength: " << averageSignal << " dBm\n";
    std::cout << "Strong Signals (>-60 dBm): " << strongSignals << " devices\n";
    std::cout << "Weak Signals (<-70 dBm): " << weakSignals << " devices\n\n";
    
    std::cout << "Signal Quality Distribution:\n";
    std::cout << "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
    
    for (const auto& device : devices) {
        std::string deviceName = generateDeviceName(device->macAddress);
        std::string quality = getSignalQuality(device->rssi);
        std::string bars = getSignalBars(device->rssi);
        
        std::cout << deviceName << std::string(12 - deviceName.length(), ' ') 
                 << ": " << bars << " " << device->rssi << " dBm (" << quality << ")\n";
    }
}

std::string DesktopUI::getSignalBars(int rssi) {
    if (rssi >= -50) return "████████";
    if (rssi >= -60) return "██████░░";
    if (rssi >= -70) return "████░░░░";
    return "██░░░░░░";
}

void DesktopUI::showSettings() {
    std::cout << "\nApplication Settings\n";
    std::cout << "===================\n\n";
    
    std::cout << "Current Configuration:\n";
    std::cout << "━━━━━━━━━━━━━━━━━━━━━━━\n";
    std::cout << "Auto-refresh: " << (autoRefresh ? "\033[32mEnabled\033[0m" : "\033[31mDisabled\033[0m") << "\n";
    std::cout << "Scan interval: 30 seconds\n";
    std::cout << "Display mode: " << getCurrentViewName() << "\n";
    std::cout << "Anomaly detection: \033[32mEnabled\033[0m\n\n";
    
    std::cout << "Available Actions:\n";
    std::cout << "━━━━━━━━━━━━━━━━━━\n";
    std::cout << "A: Toggle auto-refresh\n";
    std::cout << "D: Reset to dashboard view\n";
    std::cout << "C: Clear device history\n";
    std::cout << "E: Export device data\n";
}

void DesktopUI::showHelp() {
    std::cout << "\nSmartBlueprint Pro - Help Guide\n";
    std::cout << "===============================\n\n";
    
    std::cout << "🔧 Application Overview:\n";
    std::cout << "SmartBlueprint Pro monitors your local network in real-time,\n";
    std::cout << "detecting smart home devices and analyzing their connectivity.\n\n";
    
    std::cout << "⌨️  Keyboard Commands:\n";
    std::cout << "━━━━━━━━━━━━━━━━━━━━━\n";
    std::cout << "R - Refresh device list manually\n";
    std::cout << "S - Trigger immediate network scan\n";
    std::cout << "Q - Quit application\n";
    std::cout << "1 - Switch to Dashboard view\n";
    std::cout << "2 - Switch to Device List view\n";
    std::cout << "3 - Switch to Anomaly Monitor\n";
    std::cout << "4 - Switch to Signal Analysis\n";
    std::cout << "5 - Switch to Settings\n";
    std::cout << "H - Show this help screen\n\n";
    
    std::cout << "📊 Features:\n";
    std::cout << "━━━━━━━━━━━━\n";
    std::cout << "• Real-time device discovery\n";
    std::cout << "• Signal strength monitoring\n";
    std::cout << "• ML-powered anomaly detection\n";
    std::cout << "• Cross-platform compatibility\n";
    std::cout << "• No cloud dependencies\n\n";
    
    std::cout << "❓ Troubleshooting:\n";
    std::cout << "━━━━━━━━━━━━━━━━━━\n";
    std::cout << "• If no devices appear, wait 60 seconds for full scan\n";
    std::cout << "• Ensure network adapter is active\n";
    std::cout << "• Run with administrator privileges for best results\n";
    std::cout << "• Check firewall settings if scanning fails\n";
}

void DesktopUI::showCommandBar() {
    std::cout << "╠══════════════════════════════════════════════════════════════╣\n";
    std::cout << "║ [ R ] Refresh List     [ S ] Scan Now     [ Q ] Quit        ║\n";
    std::cout << "║                                                              ║\n";
    std::cout << "║ Keyboard shortcuts to control the app:                      ║\n";
    std::cout << "║ R: Refresh the list manually                                ║\n";
    std::cout << "║ S: Trigger an immediate scan                                ║\n";
    std::cout << "║ Q: Quit the application                                     ║\n";
    std::cout << "║ 1: Dashboard  2: Device List  3: Anomalies  4: Settings    ║\n";
    std::cout << "╚══════════════════════════════════════════════════════════════╝\n";
}

char DesktopUI::getKeyPress() {
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
    tv.tv_usec = 100000; // 100ms timeout
    
    if (select(STDIN_FILENO + 1, &readfds, NULL, NULL, &tv) > 0) {
        if (FD_ISSET(STDIN_FILENO, &readfds)) {
            read(STDIN_FILENO, &ch, 1);
        }
    }
    
    return ch;
#endif
}

void DesktopUI::setView(ViewMode view) {
    currentView = view;
}

void DesktopUI::toggleAutoRefresh() {
    autoRefresh = !autoRefresh;
}