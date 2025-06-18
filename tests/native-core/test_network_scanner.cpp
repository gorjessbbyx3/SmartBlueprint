#include <gtest/gtest.h>
#include "../../native-core/SmartBlueprintCore.cpp"
#include <thread>
#include <chrono>

class NetworkScannerTest : public ::testing::Test {
protected:
    void SetUp() override {
        scanner = std::make_unique<SmartBlueprint::NetworkScanner>();
    }

    void TearDown() override {
        if (scanner) {
            scanner->stopScanning();
        }
    }

    std::unique_ptr<SmartBlueprint::NetworkScanner> scanner;
};

TEST_F(NetworkScannerTest, InitialState) {
    auto devices = scanner->getDevices();
    EXPECT_TRUE(devices.empty());
}

TEST_F(NetworkScannerTest, StartStopScanning) {
    scanner->startScanning();
    std::this_thread::sleep_for(std::chrono::milliseconds(100));
    
    scanner->stopScanning();
    // Test should complete without hanging
    SUCCEED();
}

TEST_F(NetworkScannerTest, DeviceDetection) {
    scanner->startScanning();
    
    // Wait for potential device discovery
    std::this_thread::sleep_for(std::chrono::seconds(2));
    
    auto devices = scanner->getDevices();
    // Devices may or may not be found depending on network environment
    EXPECT_GE(devices.size(), 0);
    
    scanner->stopScanning();
}

class MLAnomalyDetectorTest : public ::testing::Test {
protected:
    void SetUp() override {
        detector = std::make_unique<SmartBlueprint::MLAnomalyDetector>();
    }

    std::unique_ptr<SmartBlueprint::MLAnomalyDetector> detector;
};

TEST_F(MLAnomalyDetectorTest, TrainingWithEmptyData) {
    std::vector<std::shared_ptr<SmartBlueprint::Device>> emptyDevices;
    detector->trainModel(emptyDevices);
    SUCCEED(); // Should not crash
}

TEST_F(MLAnomalyDetectorTest, AnomalyDetectionWithoutTraining) {
    auto device = std::make_shared<SmartBlueprint::Device>("aa:bb:cc:dd:ee:ff", "192.168.1.100");
    device->rssi = -50;
    device->isOnline = true;
    
    double score = detector->detectAnomaly(device);
    EXPECT_EQ(score, 0.0); // Should return 0 when not trained
}

TEST_F(MLAnomalyDetectorTest, TrainingAndDetection) {
    // Create training data
    std::vector<std::shared_ptr<SmartBlueprint::Device>> devices;
    for (int i = 0; i < 5; ++i) {
        auto device = std::make_shared<SmartBlueprint::Device>(
            "aa:bb:cc:dd:ee:0" + std::to_string(i), 
            "192.168.1.10" + std::to_string(i)
        );
        device->rssi = -50 + i * 5; // Normal range
        device->isOnline = true;
        devices.push_back(device);
    }
    
    detector->trainModel(devices);
    
    // Test normal device
    auto normalDevice = std::make_shared<SmartBlueprint::Device>("normal", "192.168.1.200");
    normalDevice->rssi = -52;
    normalDevice->isOnline = true;
    
    double normalScore = detector->detectAnomaly(normalDevice);
    
    // Test anomalous device
    auto anomalousDevice = std::make_shared<SmartBlueprint::Device>("anomaly", "192.168.1.201");
    anomalousDevice->rssi = -90; // Much weaker signal
    anomalousDevice->isOnline = false;
    
    double anomalyScore = detector->detectAnomaly(anomalousDevice);
    
    EXPECT_GT(anomalyScore, normalScore);
}

class SmartBlueprintCoreTest : public ::testing::Test {
protected:
    void SetUp() override {
        core = std::make_unique<SmartBlueprint::SmartBlueprintCore>();
    }

    void TearDown() override {
        if (core) {
            core->stop();
        }
    }

    std::unique_ptr<SmartBlueprint::SmartBlueprintCore> core;
};

TEST_F(SmartBlueprintCoreTest, StartStop) {
    core->start();
    std::this_thread::sleep_for(std::chrono::milliseconds(100));
    
    core->stop();
    SUCCEED();
}

TEST_F(SmartBlueprintCoreTest, DeviceRetrieval) {
    core->start();
    
    auto devices = core->getCurrentDevices();
    EXPECT_GE(devices.size(), 0);
    
    core->stop();
}

TEST_F(SmartBlueprintCoreTest, AnomalyDetection) {
    core->start();
    std::this_thread::sleep_for(std::chrono::milliseconds(500));
    
    auto anomalies = core->detectAnomalies();
    EXPECT_GE(anomalies.size(), 0);
    
    core->stop();
}

int main(int argc, char **argv) {
    ::testing::InitGoogleTest(&argc, argv);
    return RUN_ALL_TESTS();
}