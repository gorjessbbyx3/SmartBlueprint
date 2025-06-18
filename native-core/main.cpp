#include "SmartBlueprintCore.cpp"
#include <iostream>
#include <chrono>
#include <thread>

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

class NativeConsoleUI {
private:
    SmartBlueprint::SmartBlueprintCore core;
    bool isRunning;

public:
    NativeConsoleUI() : isRunning(false) {}

    void start() {
        clearScreen();
        showHeader();
        
        core.start();
        isRunning = true;
        
        // Main UI loop
        std::thread uiThread([this]() {
            while (isRunning) {
                updateDisplay();
                std::this_thread::sleep_for(std::chrono::seconds(2));
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
    
    void showHeader() {
        std::cout << "=====================================\n";
        std::cout << "    SmartBlueprint Pro - Native     \n";
        std::cout << "  Smart Home Network Monitoring     \n";
        std::cout << "=====================================\n\n";
    }
    
    void updateDisplay() {
        // Move cursor to top (preserve header)
#ifdef _WIN32
        COORD coord = {0, 5};
        SetConsoleCursorPosition(GetStdHandle(STD_OUTPUT_HANDLE), coord);
#else
        std::cout << "\033[6;1H"; // Move to line 6, column 1
#endif
        
        showDevices();
        showAnomalies();
        showCommands();
    }
    
    void showDevices() {
        auto devices = core.getCurrentDevices();
        std::cout << "Network Devices (" << devices.size() << " found):\n";
        std::cout << "----------------------------------------\n";
        
        if (devices.empty()) {
            std::cout << "No devices detected. Scanning...\n\n";
            return;
        }
        
        for (const auto& device : devices) {
            std::cout << "MAC: " << device->macAddress;
            if (!device->ipAddress.empty()) {
                std::cout << " | IP: " << device->ipAddress;
            }
            std::cout << " | RSSI: " << device->rssi << "dBm";
            std::cout << " | Status: " << (device->isOnline ? "Online" : "Offline");
            std::cout << "\n";
        }
        std::cout << "\n";
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
    
    void showCommands() {
        std::cout << "Commands: [R]efresh | [S]can | [Q]uit\n";
        std::cout << "----------------------------------------\n";
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
                        clearScreen();
                        showHeader();
                        break;
                    case 's':
                        std::cout << "\nForcing network scan...\n";
                        break;
                    case 'q':
                        isRunning = false;
                        std::cout << "\nShutting down...\n";
                        break;
                }
            }
            std::this_thread::sleep_for(std::chrono::milliseconds(100));
        }
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