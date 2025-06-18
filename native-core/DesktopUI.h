#pragma once

#include "NetworkScanner.h"
#include <vector>
#include <memory>
#include <string>
#include <chrono>

enum class ViewMode {
    DASHBOARD,
    DEVICE_LIST,
    ANOMALY_MONITOR,
    SIGNAL_ANALYSIS,
    SETTINGS,
    HELP
};

class DesktopUI {
public:
    DesktopUI();
    ~DesktopUI();
    
    void render();
    void updateDevices(const std::vector<std::shared_ptr<NetworkDevice>>& devices);
    void updateAnomalies(const std::vector<std::pair<std::shared_ptr<NetworkDevice>, double>>& anomalies);
    
    char getKeyPress();
    void setView(ViewMode view);
    void toggleAutoRefresh();
    
    ViewMode getCurrentView() const { return currentView; }
    bool isAutoRefreshEnabled() const { return autoRefresh; }
    
private:
    ViewMode currentView;
    bool autoRefresh;
    
    std::vector<std::shared_ptr<NetworkDevice>> devices;
    std::vector<std::pair<std::shared_ptr<NetworkDevice>, double>> anomalies;
    
    void setupConsole();
    void restoreConsole();
    void clearScreen();
    void showHeader();
    std::string getCurrentViewName();
    
    void showDashboard();
    void showDeviceList();
    void showAnomalyMonitor();
    void showSignalAnalysis();
    void showSettings();
    void showHelp();
    void showCommandBar();
    void showAnomaliesCompact();
    
    std::string generateDeviceName(const std::string& macAddress);
    std::string getSignalQuality(int rssi);
    std::string getSignalBars(int rssi);
};