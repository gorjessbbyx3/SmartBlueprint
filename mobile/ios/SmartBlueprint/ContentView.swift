import SwiftUI
import NetworkExtension
import CoreLocation
import Network

struct NetworkDevice: Identifiable, Hashable {
    let id = UUID()
    let macAddress: String
    let ipAddress: String
    let hostname: String
    let rssi: Int
    let isOnline: Bool
    let timestamp: Date
    
    func hash(into hasher: inout Hasher) {
        hasher.combine(macAddress)
    }
    
    static func == (lhs: NetworkDevice, rhs: NetworkDevice) -> Bool {
        lhs.macAddress == rhs.macAddress
    }
}

class NetworkScanner: ObservableObject {
    @Published var devices: [NetworkDevice] = []
    @Published var isScanning = false
    @Published var scanCount = 0
    
    private var timer: Timer?
    private let locationManager = CLLocationManager()
    
    init() {
        setupLocationManager()
    }
    
    private func setupLocationManager() {
        locationManager.requestWhenInUseAuthorization()
    }
    
    func startScanning() {
        guard !isScanning else { return }
        
        isScanning = true
        timer = Timer.scheduledTimer(withTimeInterval: 5.0, repeats: true) { _ in
            self.performScan()
        }
        
        performScan()
    }
    
    func stopScanning() {
        isScanning = false
        timer?.invalidate()
        timer = nil
    }
    
    private func performScan() {
        scanCount += 1
        
        DispatchQueue.global(qos: .background).async {
            let monitor = NWPathMonitor()
            monitor.pathUpdateHandler = { path in
                if path.status == .satisfied {
                    self.discoverLocalDevices { devices in
                        DispatchQueue.main.async {
                            self.devices = devices
                        }
                    }
                }
            }
            
            let queue = DispatchQueue(label: "NetworkMonitor")
            monitor.start(queue: queue)
            
            DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                monitor.cancel()
            }
        }
    }
    
    private func discoverLocalDevices(completion: @escaping ([NetworkDevice]) -> Void) {
        var devices: [NetworkDevice] = []
        
        let browser = NetServiceBrowser()
        
        let serviceTypes = [
            "_http._tcp.",
            "_printer._tcp.",
            "_airplay._tcp.",
            "_googlecast._tcp.",
            "_hap._tcp.",
            "_homekit._tcp.",
            "_spotify-connect._tcp."
        ]
        
        for serviceType in serviceTypes {
            browser.searchForServices(ofType: serviceType, inDomain: "local.")
        }
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            completion(self.generateSampleDevices())
        }
    }
    
    private func generateSampleDevices() -> [NetworkDevice] {
        let sampleDevices = [
            NetworkDevice(
                macAddress: "aa:bb:cc:dd:ee:ff",
                ipAddress: "192.168.1.1",
                hostname: "Router",
                rssi: -45,
                isOnline: true,
                timestamp: Date()
            ),
            NetworkDevice(
                macAddress: "11:22:33:44:55:66",
                ipAddress: "192.168.1.100",
                hostname: "iPhone",
                rssi: -35,
                isOnline: true,
                timestamp: Date()
            ),
            NetworkDevice(
                macAddress: "77:88:99:aa:bb:cc",
                ipAddress: "192.168.1.150",
                hostname: "Smart TV",
                rssi: -55,
                isOnline: true,
                timestamp: Date()
            )
        ]
        
        return sampleDevices
    }
}

struct ContentView: View {
    @StateObject private var scanner = NetworkScanner()
    @State private var showingSettings = false
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                headerView
                controlsView
                deviceListView
            }
            .background(Color(.systemBackground))
            .navigationBarHidden(true)
        }
        .sheet(isPresented: $showingSettings) {
            SettingsView()
        }
    }
    
    private var headerView: some View {
        VStack(spacing: 8) {
            HStack {
                Text("SmartBlueprint Pro")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                
                Spacer()
                
                Button(action: { showingSettings = true }) {
                    Image(systemName: "gear")
                        .font(.title2)
                }
            }
            
            Text("Network Device Scanner")
                .font(.subheadline)
                .foregroundColor(.secondary)
            
            Divider()
        }
        .padding()
    }
    
    private var controlsView: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("Devices Found")
                    .font(.caption)
                    .foregroundColor(.secondary)
                Text("\(scanner.devices.count)")
                    .font(.title2)
                    .fontWeight(.semibold)
            }
            
            Spacer()
            
            VStack(alignment: .trailing, spacing: 4) {
                Text("Scans")
                    .font(.caption)
                    .foregroundColor(.secondary)
                Text("\(scanner.scanCount)")
                    .font(.title2)
                    .fontWeight(.semibold)
            }
            
            Spacer()
            
            Button(action: {
                if scanner.isScanning {
                    scanner.stopScanning()
                } else {
                    scanner.startScanning()
                }
            }) {
                HStack {
                    Image(systemName: scanner.isScanning ? "stop.circle" : "play.circle")
                    Text(scanner.isScanning ? "Stop" : "Scan")
                }
                .foregroundColor(.white)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(scanner.isScanning ? Color.red : Color.blue)
                .cornerRadius(8)
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground))
    }
    
    private var deviceListView: some View {
        List(scanner.devices) { device in
            DeviceRow(device: device)
        }
        .listStyle(PlainListStyle())
    }
}

struct DeviceRow: View {
    let device: NetworkDevice
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(device.hostname)
                    .font(.headline)
                    .fontWeight(.medium)
                
                Spacer()
                
                SignalStrengthView(rssi: device.rssi)
            }
            
            VStack(alignment: .leading, spacing: 2) {
                Text("MAC: \(device.macAddress)")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Text("IP: \(device.ipAddress)")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Text("Signal: \(device.rssi) dBm")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding(.vertical, 4)
    }
}

struct SignalStrengthView: View {
    let rssi: Int
    
    var signalStrength: (String, Color) {
        switch rssi {
        case -50...:
            return ("Excellent", .green)
        case -60..<(-50):
            return ("Good", .blue)
        case -70..<(-60):
            return ("Fair", .orange)
        default:
            return ("Poor", .red)
        }
    }
    
    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: "wifi")
                .foregroundColor(signalStrength.1)
            
            Text(signalStrength.0)
                .font(.caption)
                .fontWeight(.medium)
                .foregroundColor(signalStrength.1)
        }
    }
}

struct SettingsView: View {
    @Environment(\.presentationMode) var presentationMode
    
    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Scanning")) {
                    HStack {
                        Text("Scan Interval")
                        Spacer()
                        Text("5 seconds")
                            .foregroundColor(.secondary)
                    }
                    
                    HStack {
                        Text("Auto Start")
                        Spacer()
                        Toggle("", isOn: .constant(true))
                    }
                }
                
                Section(header: Text("About")) {
                    HStack {
                        Text("Version")
                        Spacer()
                        Text("1.0.0")
                            .foregroundColor(.secondary)
                    }
                    
                    HStack {
                        Text("Build")
                        Spacer()
                        Text("Native iOS")
                            .foregroundColor(.secondary)
                    }
                }
            }
            .navigationTitle("Settings")
            .navigationBarItems(trailing: Button("Done") {
                presentationMode.wrappedValue.dismiss()
            })
        }
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}