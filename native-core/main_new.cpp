#include "SmartBlueprintCore.h"
#include "DesktopUI.h"
#include <iostream>
#include <chrono>
#include <thread>
#include <csignal>
#include <atomic>

class SmartBlueprintApp {
private:
    SmartBlueprintCore core;
    DesktopUI ui;
    std::atomic<bool> isRunning;

public:
    SmartBlueprintApp() : isRunning(true) {
        // Set up signal handler for graceful shutdown
        std::signal(SIGINT, [](int) {
            std::cout << "\n\nReceived interrupt signal. Shutting down...\n";
            std::exit(0);
        });
    }

    void run() {
        showWelcomeScreen();
        
        // Start core monitoring
        core.startMonitoring();
        
        // Main application loop
        while (isRunning.load()) {
            // Update UI with latest data
            auto devices = core.getCurrentDevices();
            auto anomalies = core.detectAnomalies();
            
            ui.updateDevices(devices);
            ui.updateAnomalies(anomalies);
            
            // Render the interface
            ui.render();
            
            // Handle user input
            handleInput();
            
            // Auto-refresh delay
            if (ui.isAutoRefreshEnabled()) {
                std::this_thread::sleep_for(std::chrono::seconds(1));
            } else {
                std::this_thread::sleep_for(std::chrono::milliseconds(100));
            }
        }
        
        // Cleanup
        core.stopMonitoring();
        showExitScreen();
    }

private:
    void showWelcomeScreen() {
        ui.clearScreen();
        std::cout << "╔══════════════════════════════════════════════════════════════╗\n";
        std::cout << "║                   SmartBlueprint Pro                        ║\n";
        std::cout << "║                Native Network Intelligence                   ║\n";
        std::cout << "╠══════════════════════════════════════════════════════════════╣\n";
        std::cout << "║  Real-time device discovery and network optimization        ║\n";
        std::cout << "║  ML-powered anomaly detection and signal analysis           ║\n";
        std::cout << "╚══════════════════════════════════════════════════════════════╝\n\n";
        
        std::cout << "🔍 Initializing network scanner...\n";
        std::this_thread::sleep_for(std::chrono::milliseconds(500));
        
        std::cout << "🤖 Loading ML anomaly detection models...\n";
        std::this_thread::sleep_for(std::chrono::milliseconds(500));
        
        std::cout << "📡 Starting device discovery...\n";
        std::this_thread::sleep_for(std::chrono::milliseconds(1000));
        
        std::cout << "\n✅ System ready! Switching to dashboard...\n";
        std::this_thread::sleep_for(std::chrono::seconds(1));
    }

    void showExitScreen() {
        ui.clearScreen();
        std::cout << "╔══════════════════════════════════════════════════════════════╗\n";
        std::cout << "║                    SmartBlueprint Pro                       ║\n";
        std::cout << "║                      Shutting Down                          ║\n";
        std::cout << "╚══════════════════════════════════════════════════════════════╝\n\n";
        std::cout << "Thank you for using SmartBlueprint Pro!\n";
        std::cout << "Network monitoring stopped safely.\n\n";
    }

    void handleInput() {
        char key = ui.getKeyPress();
        if (key == 0) return; // No key pressed
        
        switch (std::tolower(key)) {
            case 'q':
                isRunning.store(false);
                break;
                
            case 'r':
                // Force refresh
                core.performScan();
                break;
                
            case 's':
                // Force immediate scan
                core.performScan();
                break;
                
            case '1':
                ui.setView(ViewMode::DASHBOARD);
                break;
                
            case '2':
                ui.setView(ViewMode::DEVICE_LIST);
                break;
                
            case '3':
                ui.setView(ViewMode::ANOMALY_MONITOR);
                break;
                
            case '4':
                ui.setView(ViewMode::SIGNAL_ANALYSIS);
                break;
                
            case '5':
                ui.setView(ViewMode::SETTINGS);
                break;
                
            case 'h':
                ui.setView(ViewMode::HELP);
                break;
                
            case 'a':
                if (ui.getCurrentView() == ViewMode::SETTINGS) {
                    ui.toggleAutoRefresh();
                }
                break;
                
            case 'd':
                if (ui.getCurrentView() == ViewMode::SETTINGS) {
                    ui.setView(ViewMode::DASHBOARD);
                }
                break;
                
            case 'c':
                if (ui.getCurrentView() == ViewMode::SETTINGS) {
                    // Clear device history - implement if needed
                }
                break;
                
            case 'e':
                if (ui.getCurrentView() == ViewMode::SETTINGS) {
                    exportDeviceData();
                }
                break;
        }
    }

    void exportDeviceData() {
        auto devices = core.getCurrentDevices();
        
        std::cout << "\n📤 Exporting device data...\n";
        
        try {
            std::ofstream csvFile("smartblueprint_devices.csv");
            csvFile << "Device Name,MAC Address,IP Address,Signal Strength,Status,Device Type,Vendor\n";
            
            for (const auto& device : devices) {
                std::string deviceName = device->hostname.empty() ? 
                    ("Device-" + device->macAddress.substr(15, 2)) : device->hostname;
                std::string ipAddr = device->ipAddress.empty() ? "Unknown" : device->ipAddress;
                std::string status = device->isOnline ? "Online" : "Offline";
                
                csvFile << deviceName << ","
                       << device->macAddress << ","
                       << ipAddr << ","
                       << device->rssi << " dBm,"
                       << status << ","
                       << device->deviceType << ","
                       << device->vendor << "\n";
            }
            
            csvFile.close();
            
            std::cout << "✅ Device data exported to 'smartblueprint_devices.csv'\n";
            std::cout << "   " << devices.size() << " devices exported\n";
            
        } catch (const std::exception& e) {
            std::cout << "❌ Export failed: " << e.what() << "\n";
        }
        
        std::this_thread::sleep_for(std::chrono::seconds(2));
    }
};

int main() {
    try {
        SmartBlueprintApp app;
        app.run();
        return 0;
        
    } catch (const std::exception& e) {
        std::cerr << "Fatal error: " << e.what() << std::endl;
        std::cerr << "Press any key to exit..." << std::endl;
        std::cin.get();
        return 1;
    }
}