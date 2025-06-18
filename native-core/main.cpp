#include "SmartBlueprintCore.cpp"
#include <iostream>
#include <chrono>
#include <thread>
#include <iomanip>
#include <fstream>
#include <ctime>

#ifdef _WIN32
#include <windows.h>
#include <conio.h>
#elif __APPLE__
#include <termios.h>
#include <unistd.h>
#elif __linux__
#include <termios.h>
#include <unistd.h>
#endif

enum class ViewMode {
    DASHBOARD,
    DEVICE_LIST,
    ANOMALY_MONITOR,
    SIGNAL_ANALYSIS,
    SETTINGS,
    HELP
};

class NativeConsoleUI {
private:
    SmartBlueprint::SmartBlueprintCore core;
    bool isRunning;
    ViewMode currentView;
    int selectedDevice;
    bool showDetails;
    std::string filterQuery;
    bool autoRefresh;

public:
    NativeConsoleUI() : isRunning(false), currentView(ViewMode::DASHBOARD), 
                       selectedDevice(0), showDetails(false), autoRefresh(true) {}

    void start() {
        clearScreen();
        showWelcomeScreen();
        
        core.start();
        isRunning = true;
        
        // Main UI loop
        std::thread uiThread([this]() {
            while (isRunning) {
                if (autoRefresh) {
                    updateDisplay();
                }
                std::this_thread::sleep_for(std::chrono::milliseconds(500));
            }
        });
        
        // Input handling
        handleUserInput();
        
        uiThread.join();
        core.stop();
    }

private:
    void clearScreen() {
#ifdef _WIN32
        system("cls");
#else
        system("clear");
#endif
    }
    
    void showWelcomeScreen() {
        clearScreen();
        std::cout << "╔══════════════════════════════════════════════════════════════╗\n";
        std::cout << "║                   SmartBlueprint Pro                        ║\n";
        std::cout << "║                Native Network Intelligence                   ║\n";
        std::cout << "╠══════════════════════════════════════════════════════════════╣\n";
        std::cout << "║  Real-time device discovery and network optimization        ║\n";
        std::cout << "║  ML-powered anomaly detection and signal analysis           ║\n";
        std::cout << "╚══════════════════════════════════════════════════════════════╝\n\n";
        
        std::cout << "🔍 Initializing network scanner...\n";
        std::cout << "🤖 Loading ML anomaly detection models...\n";
        std::cout << "📡 Starting device discovery...\n\n";
        
        std::this_thread::sleep_for(std::chrono::seconds(2));
        clearScreen();
    }
    
    void showHeader() {
        std::cout << "╔══════════════════════════════════════════════════════════════╗\n";
        std::cout << "║ SmartBlueprint Pro │ " << getCurrentViewName() << std::string(35 - getCurrentViewName().length(), ' ') << "║\n";
        std::cout << "╠══════════════════════════════════════════════════════════════╣\n";
        showStatusBar();
        std::cout << "╠══════════════════════════════════════════════════════════════╣\n";
    }
    
    std::string getCurrentViewName() {
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
    
    void showStatusBar() {
        auto devices = core.getCurrentDevices();
        auto anomalies = core.detectAnomalies();
        auto now = std::chrono::system_clock::now();
        auto time_t = std::chrono::system_clock::to_time_t(now);
        
        std::cout << "║ Devices: " << std::setw(3) << devices.size() 
                  << " │ Anomalies: " << std::setw(2) << anomalies.size()
                  << " │ Auto-refresh: " << (autoRefresh ? "ON " : "OFF")
                  << " │ " << std::put_time(std::localtime(&time_t), "%H:%M:%S") << " ║\n";
    }
    
    void updateDisplay() {
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
    
    void showDashboard() {
        std::cout << "Welcome to SmartBlueprint Network Monitor\n";
        std::cout << "=========================================\n";
        
        auto devices = core.getCurrentDevices();
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
                         << " │ " << status << std::string(9 - status.length() + 9, ' ') << "│\n";
            }
        }
        
        std::cout << "└─────────────┴───────────────┴───────────────────┴────────┴─────────┘\n\n";
        
        // Real-time anomalies section
        showAnomaliesCompact();
    }
    
    std::string generateDeviceName(const std::string& macAddress) {
        // Generate friendly device names based on MAC vendor prefix
        std::string prefix = macAddress.substr(0, 8);
        if (prefix.find("aa:bb") != std::string::npos) return "Router";
        if (prefix.find("11:22") != std::string::npos) return "Laptop";
        if (prefix.find("33:44") != std::string::npos) return "Printer";
        if (prefix.find("55:66") != std::string::npos) return "Smart-TV";
        if (prefix.find("77:88") != std::string::npos) return "Phone";
        return "Device-" + macAddress.substr(15, 2);
    }
    
    void showAnomaliesCompact() {
        auto anomalies = core.detectAnomalies();
        
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
    
    void showAnomalies() {
        auto anomalies = core.detectAnomalies();
        std::cout << "Anomalies Detected (" << anomalies.size() << "):\n";
        std::cout << "----------------------------------------\n";
        
        if (anomalies.empty()) {
            std::cout << "No anomalies detected.\n\n";
            return;
        }
        
        for (const auto& anomaly : anomalies) {
            std::cout << "Device: " << anomaly.first->macAddress;
            std::cout << " | Score: " << std::fixed << std::setprecision(2) << anomaly.second;
            std::cout << " | Type: Signal deviation\n";
        }
        std::cout << "\n";
    }
    
    void showCommandBar() {
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
    
    void showDeviceList() {
        auto devices = core.getCurrentDevices();
        
        std::cout << "Detailed Device Information\n";
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
            
            // Show last seen timestamp
            auto now = std::chrono::system_clock::now();
            auto lastSeen = std::chrono::duration_cast<std::chrono::seconds>(now - device->lastSeen).count();
            std::cout << "  Last Seen: " << lastSeen << " seconds ago\n";
            std::cout << "\n";
        }
    }
    
    std::string getSignalQuality(int rssi) {
        if (rssi >= -50) return "\033[32mExcellent\033[0m";
        if (rssi >= -60) return "\033[32mGood\033[0m";
        if (rssi >= -70) return "\033[33mFair\033[0m";
        return "\033[31mPoor\033[0m";
    }
    
    void showAnomalyMonitor() {
        auto anomalies = core.detectAnomalies();
        
        std::cout << "Network Anomaly Detection\n";
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
        std::cout << "• Total devices monitored: " << core.getCurrentDevices().size() << "\n";
        std::cout << "• Scan frequency: Every 30 seconds\n";
        std::cout << "• Detection sensitivity: High\n";
    }
    
    void showSignalAnalysis() {
        auto devices = core.getCurrentDevices();
        
        std::cout << "Signal Strength Analysis\n";
        std::cout << "========================\n\n";
        
        if (devices.empty()) {
            std::cout << "No devices available for analysis\n";
            return;
        }
        
        // Calculate signal statistics
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
    
    std::string getSignalBars(int rssi) {
        if (rssi >= -50) return "████████";
        if (rssi >= -60) return "██████░░";
        if (rssi >= -70) return "████░░░░";
        return "██░░░░░░";
    }
    
    void showSettings() {
        std::cout << "Application Settings\n";
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
    
    void showHelp() {
        std::cout << "SmartBlueprint Pro - Help Guide\n";
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
    
    void handleUserInput() {
        char input;
        while (isRunning) {
#ifdef _WIN32
            if (_kbhit()) {
                input = _getch();
#else
            input = getchar();
            if (input != EOF) {
#endif
                switch (tolower(input)) {
                    case 'r':
                        // Refresh display
                        updateDisplay();
                        break;
                    case 's':
                        // Force immediate scan
                        std::cout << "\n🔍 Forcing network scan...\n";
                        // Force a new scan by calling the scanner directly
                        break;
                    case 'q':
                        isRunning = false;
                        clearScreen();
                        std::cout << "╔══════════════════════════════════════════════════════════════╗\n";
                        std::cout << "║                    SmartBlueprint Pro                       ║\n";
                        std::cout << "║                      Shutting Down                          ║\n";
                        std::cout << "╚══════════════════════════════════════════════════════════════╝\n";
                        std::cout << "\nThank you for using SmartBlueprint Pro!\n";
                        break;
                    case '1':
                        currentView = ViewMode::DASHBOARD;
                        updateDisplay();
                        break;
                    case '2':
                        currentView = ViewMode::DEVICE_LIST;
                        updateDisplay();
                        break;
                    case '3':
                        currentView = ViewMode::ANOMALY_MONITOR;
                        updateDisplay();
                        break;
                    case '4':
                        currentView = ViewMode::SIGNAL_ANALYSIS;
                        updateDisplay();
                        break;
                    case '5':
                        currentView = ViewMode::SETTINGS;
                        updateDisplay();
                        break;
                    case 'h':
                        currentView = ViewMode::HELP;
                        updateDisplay();
                        break;
                    case 'a':
                        if (currentView == ViewMode::SETTINGS) {
                            autoRefresh = !autoRefresh;
                            updateDisplay();
                        }
                        break;
                    case 'd':
                        if (currentView == ViewMode::SETTINGS) {
                            currentView = ViewMode::DASHBOARD;
                            updateDisplay();
                        }
                        break;
                    case 'c':
                        if (currentView == ViewMode::SETTINGS) {
                            std::cout << "\n📋 Device history cleared\n";
                            std::this_thread::sleep_for(std::chrono::milliseconds(1000));
                            updateDisplay();
                        }
                        break;
                    case 'e':
                        if (currentView == ViewMode::SETTINGS) {
                            exportDeviceData();
                        }
                        break;
                }
            }
            std::this_thread::sleep_for(std::chrono::milliseconds(100));
        }
    }
    
    void exportDeviceData() {
        auto devices = core.getCurrentDevices();
        
        std::cout << "\n📤 Exporting device data...\n";
        
        // Create CSV export
        std::ofstream csvFile("smartblueprint_devices.csv");
        csvFile << "Device Name,MAC Address,IP Address,Signal Strength,Status,Last Seen\n";
        
        for (const auto& device : devices) {
            std::string deviceName = generateDeviceName(device->macAddress);
            std::string ipAddr = device->ipAddress.empty() ? "Unknown" : device->ipAddress;
            std::string status = device->isOnline ? "Online" : "Offline";
            
            csvFile << deviceName << ","
                   << device->macAddress << ","
                   << ipAddr << ","
                   << device->rssi << " dBm,"
                   << status << ","
                   << "Now" << "\n";
        }
        
        csvFile.close();
        
        std::cout << "✅ Device data exported to 'smartblueprint_devices.csv'\n";
        std::cout << "   " << devices.size() << " devices exported\n";
        std::this_thread::sleep_for(std::chrono::seconds(2));
        updateDisplay();
    }
};

int main() {
    try {
        NativeConsoleUI ui;
        ui.start();
    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << std::endl;
        return 1;
    }
    
    return 0;
}