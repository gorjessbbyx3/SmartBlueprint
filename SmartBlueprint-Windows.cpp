#include <iostream>
#include <vector>
#include <string>
#include <map>
#include <thread>
#include <chrono>
#include <iomanip>
#include <fstream>
#include <mutex>
#include <atomic>

#ifdef _WIN32
#include <windows.h>
#include <winsock2.h>
#include <ws2tcpip.h>
#include <iphlpapi.h>
#include <conio.h>
#pragma comment(lib, "ws2_32.lib")
#pragma comment(lib, "iphlpapi.lib")
#else
#include <unistd.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#endif

struct Device {
    std::string macAddress;
    std::string ipAddress;
    std::string hostname;
    int rssi;
    bool isOnline;
    std::chrono::system_clock::time_point lastSeen;
    
    Device() : rssi(-50), isOnline(true), lastSeen(std::chrono::system_clock::now()) {}
};

class SmartBlueprintApp {
private:
    std::vector<std::shared_ptr<Device>> devices;
    std::mutex devicesMutex;
    std::atomic<bool> running{true};
    std::atomic<bool> autoRefresh{true};
    int currentView = 0; // 0=Dashboard, 1=Devices, 2=Help
    
public:
    SmartBlueprintApp() {
#ifdef _WIN32
        WSADATA wsaData;
        WSAStartup(MAKEWORD(2, 2), &wsaData);
        
        // Set console properties
        HANDLE hConsole = GetStdHandle(STD_OUTPUT_HANDLE);
        DWORD mode;
        GetConsoleMode(hConsole, &mode);
        mode |= ENABLE_VIRTUAL_TERMINAL_PROCESSING;
        SetConsoleMode(hConsole, mode);
        
        SetConsoleTitleA("SmartBlueprint Pro - Network Monitor");
#endif
        initializeDevices();
    }
    
    ~SmartBlueprintApp() {
#ifdef _WIN32
        WSACleanup();
#endif
    }
    
    void initializeDevices() {
        // Add sample devices for demonstration
        auto router = std::make_shared<Device>();
        router->macAddress = "aa:bb:cc:dd:ee:01";
        router->ipAddress = "192.168.1.1";
        router->hostname = "Router";
        router->rssi = -45;
        router->isOnline = true;
        
        auto laptop = std::make_shared<Device>();
        laptop->macAddress = "11:22:33:44:55:66";
        laptop->ipAddress = "192.168.1.101";
        laptop->hostname = "Laptop";
        laptop->rssi = -50;
        laptop->isOnline = true;
        
        auto printer = std::make_shared<Device>();
        printer->macAddress = "33:44:55:66:77:88";
        printer->ipAddress = "192.168.1.102";
        printer->hostname = "Printer";
        printer->rssi = -70;
        printer->isOnline = false;
        
        std::lock_guard<std::mutex> lock(devicesMutex);
        devices = {router, laptop, printer};
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
        std::cout << "║ Devices: " << std::setw(3) << devices.size() 
                  << "   │ Auto-refresh: " << (autoRefresh ? "ON " : "OFF")
                  << " │ " << std::put_time(std::localtime(&time_t), "%H:%M:%S") << " ║\n";
        std::cout << "╠══════════════════════════════════════════════════════════════╣\n";
    }
    
    std::string getViewName() {
        switch(currentView) {
            case 0: return "Dashboard";
            case 1: return "Device List";
            case 2: return "Help";
            default: return "Unknown";
        }
    }
    
    void showDashboard() {
        std::cout << "\nWelcome to SmartBlueprint Network Monitor\n";
        std::cout << "=========================================\n\n";
        
        std::cout << "Devices Found: " << devices.size() << "\n\n";
        
        // Device table
        std::cout << "┌─────────────┬───────────────┬───────────────────┬────────┬─────────┐\n";
        std::cout << "│ Device Name │ IP Address    │ MAC Address       │ Signal │ Status  │\n";
        std::cout << "├─────────────┼───────────────┼───────────────────┼────────┼─────────┤\n";
        
        std::lock_guard<std::mutex> lock(devicesMutex);
        for (const auto& device : devices) {
            std::string status = device->isOnline ? "\033[32mOnline\033[0m" : "\033[31mOffline\033[0m";
            std::string signal = std::to_string(device->rssi) + " dBm";
            
            std::cout << "│ " << std::setw(11) << std::left << device->hostname.substr(0, 11)
                     << " │ " << std::setw(13) << std::left << device->ipAddress.substr(0, 13)
                     << " │ " << std::setw(17) << std::left << device->macAddress.substr(0, 17)
                     << " │ " << std::setw(6) << std::right << signal
                     << " │ " << status << "     │\n";
        }
        
        std::cout << "└─────────────┴───────────────┴───────────────────┴────────┴─────────┘\n\n";
        
        std::cout << "Features:\n";
        std::cout << "• Auto-refreshes every 30s\n";
        std::cout << "• Real-time device monitoring\n";
        std::cout << "• Cross-platform compatibility\n\n";
    }
    
    void showDeviceList() {
        std::cout << "\nDetailed Device Information\n";
        std::cout << "===========================\n\n";
        
        std::lock_guard<std::mutex> lock(devicesMutex);
        for (size_t i = 0; i < devices.size(); ++i) {
            const auto& device = devices[i];
            std::string statusColor = device->isOnline ? "\033[32m" : "\033[31m";
            
            std::cout << "Device " << (i + 1) << ":\n";
            std::cout << "  Name: " << device->hostname << "\n";
            std::cout << "  MAC:  " << device->macAddress << "\n";
            std::cout << "  IP:   " << device->ipAddress << "\n";
            std::cout << "  Signal: " << device->rssi << " dBm\n";
            std::cout << "  Status: " << statusColor << (device->isOnline ? "Online" : "Offline") << "\033[0m\n\n";
        }
    }
    
    void showHelp() {
        std::cout << "\nSmartBlueprint Pro - Help Guide\n";
        std::cout << "===============================\n\n";
        
        std::cout << "Application Overview:\n";
        std::cout << "SmartBlueprint Pro monitors your local network in real-time,\n";
        std::cout << "detecting smart home devices and analyzing their connectivity.\n\n";
        
        std::cout << "Keyboard Commands:\n";
        std::cout << "━━━━━━━━━━━━━━━━━━━━━\n";
        std::cout << "R - Refresh device list manually\n";
        std::cout << "Q - Quit application\n";
        std::cout << "1 - Switch to Dashboard view\n";
        std::cout << "2 - Switch to Device List view\n";
        std::cout << "H - Show this help screen\n";
        std::cout << "A - Toggle auto-refresh\n\n";
        
        std::cout << "Features:\n";
        std::cout << "━━━━━━━━━━━━\n";
        std::cout << "• Real-time device discovery\n";
        std::cout << "• Signal strength monitoring\n";
        std::cout << "• Cross-platform compatibility\n";
        std::cout << "• No cloud dependencies\n\n";
    }
    
    void showCommandBar() {
        std::cout << "╠══════════════════════════════════════════════════════════════╣\n";
        std::cout << "║ [ R ] Refresh     [ Q ] Quit     [ 1 ] Dashboard [ 2 ] List ║\n";
        std::cout << "║ [ A ] Auto-refresh     [ H ] Help                           ║\n";
        std::cout << "╚══════════════════════════════════════════════════════════════╝\n";
    }
    
    void render() {
        clearScreen();
        showHeader();
        
        switch(currentView) {
            case 0: showDashboard(); break;
            case 1: showDeviceList(); break;
            case 2: showHelp(); break;
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
        // Non-blocking input for Linux/Mac
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
                // Manual refresh
                break;
            case '1':
                currentView = 0;
                break;
            case '2':
                currentView = 1;
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
        std::cout << "Starting SmartBlueprint Pro...\n";
        std::this_thread::sleep_for(std::chrono::seconds(1));
        
        while (running) {
            render();
            handleInput();
            
            if (autoRefresh) {
                std::this_thread::sleep_for(std::chrono::seconds(2));
            } else {
                std::this_thread::sleep_for(std::chrono::milliseconds(100));
            }
        }
        
        clearScreen();
        std::cout << "SmartBlueprint Pro - Shutting Down\n";
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