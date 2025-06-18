#include "DeviceClassifier.h"
#include <algorithm>
#include <cctype>

DeviceClassifier::DeviceClassifier() {
    initializeVendorDatabase();
    initializeDevicePatterns();
}

std::string DeviceClassifier::classifyDevice(const std::shared_ptr<NetworkDevice>& device) {
    std::string vendor = identifyVendor(device->macAddress);
    std::string hostname = device->hostname;
    
    // Convert to lowercase for pattern matching
    std::transform(hostname.begin(), hostname.end(), hostname.begin(), ::tolower);
    std::transform(vendor.begin(), vendor.end(), vendor.begin(), ::tolower);
    
    // Check hostname patterns first
    for (const auto& pattern : devicePatterns) {
        if (hostname.find(pattern.first) != std::string::npos) {
            return pattern.second;
        }
    }
    
    // Check vendor patterns
    for (const auto& pattern : vendorPatterns) {
        if (vendor.find(pattern.first) != std::string::npos) {
            return pattern.second;
        }
    }
    
    // Check MAC address patterns
    std::string macPrefix = device->macAddress.substr(0, 8);
    std::transform(macPrefix.begin(), macPrefix.end(), macPrefix.begin(), ::tolower);
    
    auto it = macToDeviceType.find(macPrefix);
    if (it != macToDeviceType.end()) {
        return it->second;
    }
    
    return "unknown";
}

std::string DeviceClassifier::identifyVendor(const std::string& macAddress) {
    if (macAddress.length() < 8) return "Unknown";
    
    std::string prefix = macAddress.substr(0, 8);
    std::transform(prefix.begin(), prefix.end(), prefix.begin(), ::tolower);
    
    auto it = ouiDatabase.find(prefix);
    if (it != ouiDatabase.end()) {
        return it->second;
    }
    
    return "Unknown";
}

void DeviceClassifier::initializeVendorDatabase() {
    // Major network equipment vendors
    ouiDatabase["00:00:0c"] = "Cisco";
    ouiDatabase["00:01:42"] = "Cisco";
    ouiDatabase["00:01:96"] = "Cisco";
    ouiDatabase["00:0f:66"] = "Cisco";
    ouiDatabase["00:1b:0d"] = "Cisco";
    
    // Apple devices
    ouiDatabase["00:03:93"] = "Apple";
    ouiDatabase["00:0a:95"] = "Apple";
    ouiDatabase["00:0d:93"] = "Apple";
    ouiDatabase["00:16:cb"] = "Apple";
    ouiDatabase["00:17:f2"] = "Apple";
    ouiDatabase["00:19:e3"] = "Apple";
    ouiDatabase["00:1b:63"] = "Apple";
    ouiDatabase["00:1c:b3"] = "Apple";
    ouiDatabase["00:1e:c2"] = "Apple";
    ouiDatabase["00:21:e9"] = "Apple";
    ouiDatabase["00:22:41"] = "Apple";
    ouiDatabase["00:23:12"] = "Apple";
    ouiDatabase["00:23:df"] = "Apple";
    ouiDatabase["00:25:00"] = "Apple";
    ouiDatabase["00:25:4b"] = "Apple";
    ouiDatabase["00:25:bc"] = "Apple";
    ouiDatabase["00:26:08"] = "Apple";
    ouiDatabase["00:26:4a"] = "Apple";
    ouiDatabase["00:26:b0"] = "Apple";
    ouiDatabase["00:26:bb"] = "Apple";
    
    // Samsung
    ouiDatabase["00:12:fb"] = "Samsung";
    ouiDatabase["00:13:77"] = "Samsung";
    ouiDatabase["00:15:99"] = "Samsung";
    ouiDatabase["00:16:32"] = "Samsung";
    ouiDatabase["00:17:c9"] = "Samsung";
    ouiDatabase["00:1a:8a"] = "Samsung";
    ouiDatabase["00:1d:25"] = "Samsung";
    ouiDatabase["00:1e:7d"] = "Samsung";
    ouiDatabase["00:21:19"] = "Samsung";
    ouiDatabase["00:23:39"] = "Samsung";
    
    // HP
    ouiDatabase["00:01:e6"] = "HP";
    ouiDatabase["00:02:a5"] = "HP";
    ouiDatabase["00:04:ea"] = "HP";
    ouiDatabase["00:08:c7"] = "HP";
    ouiDatabase["00:0b:cd"] = "HP";
    ouiDatabase["00:0e:7f"] = "HP";
    ouiDatabase["00:10:e3"] = "HP";
    ouiDatabase["00:11:0a"] = "HP";
    ouiDatabase["00:12:79"] = "HP";
    ouiDatabase["00:13:21"] = "HP";
    ouiDatabase["00:14:38"] = "HP";
    ouiDatabase["00:14:c2"] = "HP";
    ouiDatabase["00:15:60"] = "HP";
    ouiDatabase["00:16:35"] = "HP";
    ouiDatabase["00:17:08"] = "HP";
    ouiDatabase["00:17:a4"] = "HP";
    ouiDatabase["00:18:fe"] = "HP";
    ouiDatabase["00:19:bb"] = "HP";
    ouiDatabase["00:1a:4b"] = "HP";
    ouiDatabase["00:1b:78"] = "HP";
    ouiDatabase["00:1c:c4"] = "HP";
    ouiDatabase["00:1e:0b"] = "HP";
    ouiDatabase["00:1f:29"] = "HP";
    
    // Intel
    ouiDatabase["00:02:b3"] = "Intel";
    ouiDatabase["00:03:47"] = "Intel";
    ouiDatabase["00:04:23"] = "Intel";
    ouiDatabase["00:07:e9"] = "Intel";
    ouiDatabase["00:0c:f1"] = "Intel";
    ouiDatabase["00:0e:0c"] = "Intel";
    ouiDatabase["00:12:f0"] = "Intel";
    ouiDatabase["00:13:02"] = "Intel";
    ouiDatabase["00:13:20"] = "Intel";
    ouiDatabase["00:13:ce"] = "Intel";
    ouiDatabase["00:13:e8"] = "Intel";
    ouiDatabase["00:15:17"] = "Intel";
    ouiDatabase["00:16:76"] = "Intel";
    ouiDatabase["00:16:ea"] = "Intel";
    ouiDatabase["00:18:de"] = "Intel";
    ouiDatabase["00:19:d1"] = "Intel";
    ouiDatabase["00:1b:21"] = "Intel";
    ouiDatabase["00:1c:bf"] = "Intel";
    ouiDatabase["00:1d:e0"] = "Intel";
    ouiDatabase["00:1e:64"] = "Intel";
    ouiDatabase["00:1f:3a"] = "Intel";
    
    // D-Link
    ouiDatabase["00:05:5d"] = "D-Link";
    ouiDatabase["00:07:7d"] = "D-Link";
    ouiDatabase["00:0d:88"] = "D-Link";
    ouiDatabase["00:0f:3d"] = "D-Link";
    ouiDatabase["00:11:95"] = "D-Link";
    ouiDatabase["00:13:46"] = "D-Link";
    ouiDatabase["00:15:e9"] = "D-Link";
    ouiDatabase["00:17:9a"] = "D-Link";
    ouiDatabase["00:18:e7"] = "D-Link";
    ouiDatabase["00:19:5b"] = "D-Link";
    ouiDatabase["00:1b:11"] = "D-Link";
    ouiDatabase["00:1c:f0"] = "D-Link";
    ouiDatabase["00:1e:58"] = "D-Link";
    ouiDatabase["00:1f:1f"] = "D-Link";
    
    // TP-Link
    ouiDatabase["00:1d:0f"] = "TP-Link";
    ouiDatabase["00:21:27"] = "TP-Link";
    ouiDatabase["00:22:b0"] = "TP-Link";
    ouiDatabase["00:23:cd"] = "TP-Link";
    ouiDatabase["00:24:a5"] = "TP-Link";
    ouiDatabase["00:25:86"] = "TP-Link";
    ouiDatabase["00:26:5a"] = "TP-Link";
    ouiDatabase["00:27:19"] = "TP-Link";
    
    // Netgear
    ouiDatabase["00:09:5b"] = "Netgear";
    ouiDatabase["00:0f:b5"] = "Netgear";
    ouiDatabase["00:14:6c"] = "Netgear";
    ouiDatabase["00:18:4d"] = "Netgear";
    ouiDatabase["00:1b:2f"] = "Netgear";
    ouiDatabase["00:1e:2a"] = "Netgear";
    ouiDatabase["00:22:3f"] = "Netgear";
    ouiDatabase["00:24:b2"] = "Netgear";
    ouiDatabase["00:26:f2"] = "Netgear";
    
    // Linksys
    ouiDatabase["00:06:25"] = "Linksys";
    ouiDatabase["00:0c:41"] = "Linksys";
    ouiDatabase["00:0e:08"] = "Linksys";
    ouiDatabase["00:12:17"] = "Linksys";
    ouiDatabase["00:13:10"] = "Linksys";
    ouiDatabase["00:14:bf"] = "Linksys";
    ouiDatabase["00:16:b6"] = "Linksys";
    ouiDatabase["00:18:39"] = "Linksys";
    ouiDatabase["00:18:f8"] = "Linksys";
    ouiDatabase["00:1a:70"] = "Linksys";
    ouiDatabase["00:1c:10"] = "Linksys";
    ouiDatabase["00:1d:7e"] = "Linksys";
    ouiDatabase["00:20:a6"] = "Linksys";
    ouiDatabase["00:21:29"] = "Linksys";
    ouiDatabase["00:22:6b"] = "Linksys";
    ouiDatabase["00:23:69"] = "Linksys";
    ouiDatabase["00:25:9c"] = "Linksys";
}

void DeviceClassifier::initializeDevicePatterns() {
    // Hostname patterns
    devicePatterns["router"] = "router";
    devicePatterns["gateway"] = "router";
    devicePatterns["ap"] = "access_point";
    devicePatterns["printer"] = "printer";
    devicePatterns["print"] = "printer";
    devicePatterns["hp"] = "printer";
    devicePatterns["canon"] = "printer";
    devicePatterns["epson"] = "printer";
    devicePatterns["brother"] = "printer";
    devicePatterns["tv"] = "smart_tv";
    devicePatterns["samsung"] = "smart_tv";
    devicePatterns["lg"] = "smart_tv";
    devicePatterns["sony"] = "smart_tv";
    devicePatterns["roku"] = "streaming_device";
    devicePatterns["chromecast"] = "streaming_device";
    devicePatterns["appletv"] = "streaming_device";
    devicePatterns["xbox"] = "gaming_console";
    devicePatterns["playstation"] = "gaming_console";
    devicePatterns["ps4"] = "gaming_console";
    devicePatterns["ps5"] = "gaming_console";
    devicePatterns["nintendo"] = "gaming_console";
    devicePatterns["switch"] = "gaming_console";
    devicePatterns["laptop"] = "laptop";
    devicePatterns["desktop"] = "desktop";
    devicePatterns["phone"] = "smartphone";
    devicePatterns["iphone"] = "smartphone";
    devicePatterns["android"] = "smartphone";
    devicePatterns["tablet"] = "tablet";
    devicePatterns["ipad"] = "tablet";
    devicePatterns["echo"] = "smart_speaker";
    devicePatterns["alexa"] = "smart_speaker";
    devicePatterns["homepod"] = "smart_speaker";
    devicePatterns["google home"] = "smart_speaker";
    devicePatterns["nest"] = "smart_home";
    devicePatterns["ring"] = "security_camera";
    devicePatterns["camera"] = "security_camera";
    devicePatterns["doorbell"] = "smart_doorbell";
    devicePatterns["thermostat"] = "smart_thermostat";
    devicePatterns["light"] = "smart_light";
    devicePatterns["bulb"] = "smart_light";
    devicePatterns["switch"] = "smart_switch";
    devicePatterns["plug"] = "smart_plug";
    devicePatterns["outlet"] = "smart_plug";
    
    // Vendor patterns
    vendorPatterns["apple"] = "smartphone";
    vendorPatterns["samsung"] = "smartphone";
    vendorPatterns["hp"] = "printer";
    vendorPatterns["canon"] = "printer";
    vendorPatterns["epson"] = "printer";
    vendorPatterns["brother"] = "printer";
    vendorPatterns["cisco"] = "router";
    vendorPatterns["netgear"] = "router";
    vendorPatterns["linksys"] = "router";
    vendorPatterns["d-link"] = "router";
    vendorPatterns["tp-link"] = "router";
    vendorPatterns["intel"] = "laptop";
    
    // MAC address prefix patterns
    macToDeviceType["00:03:93"] = "smartphone"; // Apple
    macToDeviceType["00:0a:95"] = "smartphone"; // Apple
    macToDeviceType["00:12:fb"] = "smartphone"; // Samsung
    macToDeviceType["00:01:e6"] = "printer"; // HP
    macToDeviceType["00:04:ea"] = "printer"; // HP
    macToDeviceType["00:00:0c"] = "router"; // Cisco
    macToDeviceType["00:05:5d"] = "router"; // D-Link
    macToDeviceType["00:1d:0f"] = "router"; // TP-Link
    macToDeviceType["00:09:5b"] = "router"; // Netgear
    macToDeviceType["00:06:25"] = "router"; // Linksys
}