# SmartBlueprint Pro - Raspberry Pi 3 B Setup Guide

This guide walks you through setting up SmartBlueprint Pro on your Raspberry Pi 3 B for home security monitoring.

## Hardware Requirements

- **Raspberry Pi 3 Model B** (or newer)
  - Built-in WiFi (802.11n 2.4GHz)
  - Built-in Bluetooth 4.1 BLE
- **Power supply**: 5V 2.5A micro USB
- **MicroSD card**: 16GB+ (32GB recommended)
- **Optional**: USB Bluetooth adapter (for extended range)

## Software Requirements

- Raspberry Pi OS (Bullseye or newer)
- Node.js 18+
- PostgreSQL (or SQLite for simpler setup)

---

## Step 1: Prepare Your Raspberry Pi

### 1.1 Flash Raspberry Pi OS

1. Download [Raspberry Pi Imager](https://www.raspberrypi.com/software/)
2. Choose "Raspberry Pi OS (64-bit)"
3. Click the gear icon to pre-configure:
   - Enable SSH
   - Set username/password
   - Configure WiFi
   - Set locale/timezone
4. Flash to your SD card

### 1.2 Initial Boot & Update

```bash
# SSH into your Pi
ssh pi@raspberrypi.local

# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y git bluetooth bluez libbluetooth-dev
```

---

## Step 2: Install Node.js

```bash
# Install Node.js 18 (or newer)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v18.x.x
npm --version
```

---

## Step 3: Configure Bluetooth

### 3.1 Enable Bluetooth Service

```bash
# Start and enable Bluetooth
sudo systemctl enable bluetooth
sudo systemctl start bluetooth

# Check status
sudo systemctl status bluetooth
```

### 3.2 Grant Bluetooth Permissions

```bash
# Add user to bluetooth group
sudo usermod -a -G bluetooth $USER

# Allow non-root Bluetooth scanning
sudo setcap 'cap_net_raw,cap_net_admin+eip' $(which hcitool)
sudo setcap 'cap_net_raw,cap_net_admin+eip' $(which hciconfig)

# Verify Bluetooth is working
hciconfig
# Should show "hci0" with "UP RUNNING"
```

### 3.3 Test Bluetooth Scanning

```bash
# Quick BLE scan (requires sudo first time)
sudo hcitool lescan --duplicates &
# Press Ctrl+C after a few seconds

# Or use bluetoothctl
bluetoothctl
> scan on
# Wait a few seconds, you should see devices
> scan off
> exit
```

---

## Step 4: Install SmartBlueprint Pro

### 4.1 Clone the Repository

```bash
cd ~
git clone https://github.com/gorjessbbyx3/SmartBlueprint.git
cd SmartBlueprint
```

### 4.2 Install Dependencies

```bash
npm install
```

### 4.3 Build the Application

```bash
npm run build
```

### 4.4 Set Up Environment Variables

```bash
# Create .env file
cat > .env << 'EOF'
NODE_ENV=production
PORT=5000
DATABASE_URL=file:./data/smartblueprint.db
EOF
```

---

## Step 5: Run the Application

### 5.1 Start the Server

```bash
npm start
```

### 5.2 Access the Dashboard

Open a browser and go to:
```
http://raspberrypi.local:5000
```

Or use the Pi's IP address:
```
http://192.168.1.XXX:5000
```

---

## Step 6: Initial Calibration

### 6.1 Register Residents

1. Go to **Security Dashboard** → **Residents** section
2. Click **Add Resident** for each household member
3. Enter name, email (optional), phone (optional)

### 6.2 Register Resident Devices

For each resident:
1. Go to **Device Management** (/devices)
2. Find their phone in the discovered devices list
3. Click **Mark as Trusted**
4. Assign to the resident

Or use the AI Learning feature:
1. When the system detects a new device repeatedly
2. A prompt will appear: "Who owns this device?"
3. Select the resident and give it a name (e.g., "Jane's iPhone")

### 6.3 Home Walk-Through Calibration

1. Start calibration: `POST /api/calibration/start`
2. Walk around your home with your phone
3. At each location, mark the point via the app or API
4. Label rooms and exit points (doors)
5. Complete calibration when done

---

## Step 7: Set Up Auto-Start on Boot

### 7.1 Create Systemd Service

```bash
sudo nano /etc/systemd/system/smartblueprint.service
```

Add this content:

```ini
[Unit]
Description=SmartBlueprint Pro Home Security
After=network.target bluetooth.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/SmartBlueprint
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=5000

[Install]
WantedBy=multi-user.target
```

### 7.2 Enable the Service

```bash
sudo systemctl daemon-reload
sudo systemctl enable smartblueprint
sudo systemctl start smartblueprint

# Check status
sudo systemctl status smartblueprint
```

---

## Step 8: Optional Enhancements

### 8.1 Add More Sensors (Multi-Device Triangulation)

Place old phones or tablets around your home as additional sensors:

1. Install a simple ping responder or keep them connected to WiFi
2. The system will detect them and use them for triangulation
3. Configure their positions via: `POST /api/presence/triangulation/sensors`

### 8.2 Configure Exit Zones

Mark your entry/exit points for smart departure detection:

```bash
# Add front door
curl -X POST http://localhost:5000/api/departure/exit-zones \
  -H "Content-Type: application/json" \
  -d '{"id":"front_door","name":"Front Door","type":"front_door","x":50,"y":0,"radius":15}'

# Add garage
curl -X POST http://localhost:5000/api/departure/exit-zones \
  -H "Content-Type: application/json" \
  -d '{"id":"garage","name":"Garage","type":"garage","x":0,"y":25,"radius":20}'
```

### 8.3 Enable Notifications

Configure notification channels for security alerts:

1. Go to **Security Dashboard** → **Notifications**
2. Add email/SMS/webhook channels
3. Configure which events trigger notifications

---

## Troubleshooting

### Bluetooth Not Working

```bash
# Check if Bluetooth is blocked
rfkill list

# Unblock if needed
sudo rfkill unblock bluetooth

# Restart Bluetooth
sudo systemctl restart bluetooth
```

### Permission Denied for Bluetooth

```bash
# Run with sudo for initial setup
sudo npm start

# Or fix capabilities
sudo setcap 'cap_net_raw,cap_net_admin+eip' /usr/bin/hcitool
```

### Can't Find Devices

```bash
# Check if BLE is enabled
hciconfig hci0 up
hciconfig hci0 leadv 0
hciconfig hci0 noscan

# Reset Bluetooth adapter
sudo hciconfig hci0 down
sudo hciconfig hci0 up
```

### High CPU Usage

The default scan interval is 15 seconds. You can adjust it:

```bash
curl -X PUT http://localhost:5000/api/presence/settings \
  -H "Content-Type: application/json" \
  -d '{"pollInterval": 30000}'  # 30 seconds
```

---

## API Quick Reference

| Endpoint | Description |
|----------|-------------|
| `GET /api/security/status` | Get current security status |
| `POST /api/security/mode` | Set security mode (disarmed/armed_home/armed_away) |
| `GET /api/learning/home-status` | Get who's home |
| `GET /api/presence/state` | Get presence detection state |
| `POST /api/calibration/start` | Start home walk-through calibration |
| `GET /api/departure/exit-zones` | Get configured exit zones |

---

## Support

- GitHub Issues: https://github.com/gorjessbbyx3/SmartBlueprint/issues
- Documentation: See inline code comments

---

*SmartBlueprint Pro - Privacy-focused home security without cameras*
