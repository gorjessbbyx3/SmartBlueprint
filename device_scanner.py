#!/usr/bin/env python3
"""
SmartBlueprint Pro - LAN Device Scanner
Comprehensive network device discovery using zeroconf, ARP, and WiFi scanning
"""

import asyncio
import json
import logging
import os
import socket
import subprocess
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Set
import requests
import psycopg2
from psycopg2.extras import RealDictCursor

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DeviceScanner:
    def __init__(self):
        self.discovered_devices = {}
        self.vendor_cache = {}
        self.scan_history = []
        self.trusted_devices = set()
        self.suspicious_devices = set()
        
        # Database configuration
        self.db_config = {
            'host': os.getenv('PGHOST', 'localhost'),
            'database': os.getenv('PGDATABASE', 'postgres'),
            'user': os.getenv('PGUSER', 'postgres'),
            'password': os.getenv('PGPASSWORD', ''),
            'port': os.getenv('PGPORT', '5432')
        }
        
        # Initialize database tables
        self.init_database()
        
        logger.info("Device Scanner initialized")

    def init_database(self):
        """Initialize database tables for device tracking"""
        try:
            conn = psycopg2.connect(**self.db_config)
            cursor = conn.cursor()
            
            # Create devices table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS network_devices (
                    id SERIAL PRIMARY KEY,
                    mac_address VARCHAR(17) UNIQUE,
                    ip_address VARCHAR(15),
                    hostname VARCHAR(255),
                    vendor VARCHAR(255),
                    device_type VARCHAR(100),
                    first_seen TIMESTAMP,
                    last_seen TIMESTAMP,
                    rssi INTEGER,
                    trust_level VARCHAR(20) DEFAULT 'unknown',
                    capabilities TEXT[],
                    services TEXT[],
                    is_online BOOLEAN DEFAULT true,
                    metadata JSONB,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create device history table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS device_scan_history (
                    id SERIAL PRIMARY KEY,
                    scan_id VARCHAR(50),
                    mac_address VARCHAR(17),
                    ip_address VARCHAR(15),
                    rssi INTEGER,
                    scan_timestamp TIMESTAMP,
                    scan_method VARCHAR(50),
                    additional_data JSONB,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            conn.commit()
            cursor.close()
            conn.close()
            
            logger.info("Database tables initialized")
            
        except Exception as e:
            logger.error(f"Database initialization failed: {e}")

    async def comprehensive_scan(self) -> Dict:
        """Perform comprehensive network device discovery"""
        scan_id = f"scan_{int(time.time())}"
        scan_start = datetime.now()
        
        logger.info(f"Starting comprehensive scan: {scan_id}")
        
        discovered_devices = {}
        
        try:
            # ARP table scan
            arp_devices = await self.scan_arp_table()
            self.merge_device_data(discovered_devices, arp_devices, "arp")
            
            # Network range scan
            network_devices = await self.scan_network_range()
            self.merge_device_data(discovered_devices, network_devices, "ping")
            
            # mDNS/Bonjour discovery
            mdns_devices = await self.scan_mdns()
            self.merge_device_data(discovered_devices, mdns_devices, "mdns")
            
            # SSDP/UPnP discovery
            ssdp_devices = await self.scan_ssdp()
            self.merge_device_data(discovered_devices, ssdp_devices, "ssdp")
            
            # WiFi scanning (if available)
            wifi_devices = await self.scan_wifi()
            self.merge_device_data(discovered_devices, wifi_devices, "wifi")
            
            # Enhanced device analysis
            analyzed_devices = await self.analyze_devices(discovered_devices)
            
            # Store results
            await self.store_scan_results(scan_id, analyzed_devices)
            
            scan_duration = (datetime.now() - scan_start).total_seconds()
            
            result = {
                "scan_id": scan_id,
                "timestamp": scan_start.isoformat(),
                "duration_seconds": scan_duration,
                "devices_found": len(analyzed_devices),
                "devices": analyzed_devices,
                "scan_methods": ["arp", "ping", "mdns", "ssdp", "wifi"],
                "trust_summary": self.calculate_trust_summary(analyzed_devices)
            }
            
            logger.info(f"Scan completed: {len(analyzed_devices)} devices found in {scan_duration:.2f}s")
            return result
            
        except Exception as e:
            logger.error(f"Comprehensive scan failed: {e}")
            return {"error": str(e), "scan_id": scan_id}

    async def scan_arp_table(self) -> Dict:
        """Scan system ARP table for connected devices"""
        devices = {}
        
        try:
            # Get ARP table entries
            if os.name == 'nt':  # Windows
                result = subprocess.run(['arp', '-a'], capture_output=True, text=True)
            else:  # Linux/macOS
                result = subprocess.run(['arp', '-a'], capture_output=True, text=True)
            
            if result.returncode == 0:
                lines = result.stdout.strip().split('\n')
                for line in lines:
                    device = self.parse_arp_entry(line)
                    if device:
                        mac = device['mac_address']
                        devices[mac] = device
            
            logger.info(f"ARP scan found {len(devices)} devices")
            
        except Exception as e:
            logger.error(f"ARP scan failed: {e}")
        
        return devices

    def parse_arp_entry(self, line: str) -> Optional[Dict]:
        """Parse ARP table entry"""
        try:
            # Different ARP output formats for different systems
            if '(' in line and ')' in line:  # macOS/Linux format
                parts = line.split()
                if len(parts) >= 4:
                    hostname = parts[0] if not parts[0].startswith('?') else 'unknown'
                    ip = parts[1].strip('()')
                    mac = parts[3]
                    
                    if self.is_valid_mac(mac):
                        return {
                            'mac_address': mac.upper(),
                            'ip_address': ip,
                            'hostname': hostname,
                            'discovery_method': 'arp'
                        }
            else:  # Windows format
                parts = line.split()
                if len(parts) >= 3:
                    ip = parts[0]
                    mac = parts[1]
                    
                    if self.is_valid_mac(mac):
                        return {
                            'mac_address': mac.upper().replace('-', ':'),
                            'ip_address': ip,
                            'hostname': 'unknown',
                            'discovery_method': 'arp'
                        }
        
        except Exception as e:
            logger.debug(f"Failed to parse ARP entry '{line}': {e}")
        
        return None

    async def scan_network_range(self) -> Dict:
        """Scan local network range for active devices"""
        devices = {}
        
        try:
            # Get local network range
            network_range = self.get_local_network_range()
            if not network_range:
                return devices
            
            logger.info(f"Scanning network range: {network_range}")
            
            # Ping sweep
            base_ip = '.'.join(network_range.split('.')[:-1])
            tasks = []
            
            for i in range(1, 255):
                ip = f"{base_ip}.{i}"
                tasks.append(self.ping_host(ip))
            
            # Execute ping tasks concurrently
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            for i, result in enumerate(results):
                if isinstance(result, dict) and result.get('alive'):
                    ip = f"{base_ip}.{i+1}"
                    mac = await self.get_mac_for_ip(ip)
                    
                    if mac:
                        devices[mac] = {
                            'mac_address': mac,
                            'ip_address': ip,
                            'hostname': result.get('hostname', 'unknown'),
                            'response_time': result.get('response_time', 0),
                            'discovery_method': 'ping'
                        }
            
            logger.info(f"Network range scan found {len(devices)} devices")
            
        except Exception as e:
            logger.error(f"Network range scan failed: {e}")
        
        return devices

    async def ping_host(self, ip: str) -> Dict:
        """Ping a single host"""
        try:
            if os.name == 'nt':  # Windows
                cmd = ['ping', '-n', '1', '-w', '1000', ip]
            else:  # Linux/macOS
                cmd = ['ping', '-c', '1', '-W', '1', ip]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=2)
            
            if result.returncode == 0:
                # Extract response time
                response_time = self.extract_ping_time(result.stdout)
                
                # Try to resolve hostname
                try:
                    hostname = socket.gethostbyaddr(ip)[0]
                except:
                    hostname = 'unknown'
                
                return {
                    'alive': True,
                    'response_time': response_time,
                    'hostname': hostname
                }
        
        except Exception as e:
            logger.debug(f"Ping failed for {ip}: {e}")
        
        return {'alive': False}

    def extract_ping_time(self, ping_output: str) -> float:
        """Extract ping response time from ping output"""
        try:
            for line in ping_output.split('\n'):
                if 'time=' in line:
                    time_part = line.split('time=')[1].split()[0]
                    return float(time_part.replace('ms', ''))
        except:
            pass
        return 0.0

    async def get_mac_for_ip(self, ip: str) -> Optional[str]:
        """Get MAC address for an IP using ARP"""
        try:
            if os.name == 'nt':  # Windows
                result = subprocess.run(['arp', '-a', ip], capture_output=True, text=True)
            else:  # Linux/macOS
                result = subprocess.run(['arp', ip], capture_output=True, text=True)
            
            if result.returncode == 0:
                lines = result.stdout.strip().split('\n')
                for line in lines:
                    if ip in line:
                        # Extract MAC address
                        parts = line.split()
                        for part in parts:
                            if self.is_valid_mac(part):
                                return part.upper().replace('-', ':')
        
        except Exception as e:
            logger.debug(f"Failed to get MAC for {ip}: {e}")
        
        return None

    async def scan_mdns(self) -> Dict:
        """Scan for devices using mDNS/Bonjour"""
        devices = {}
        
        try:
            # Use zeroconf for mDNS discovery
            from zeroconf import ServiceBrowser, Zeroconf
            
            class MDNSListener:
                def __init__(self, devices_dict):
                    self.devices = devices_dict
                
                def add_service(self, zeroconf, type, name):
                    info = zeroconf.get_service_info(type, name)
                    if info:
                        # Extract device information
                        ip = socket.inet_ntoa(info.addresses[0]) if info.addresses else None
                        
                        if ip:
                            device = {
                                'ip_address': ip,
                                'hostname': name.split('.')[0],
                                'service_type': type,
                                'port': info.port,
                                'discovery_method': 'mdns',
                                'services': [type]
                            }
                            
                            # Try to get MAC address
                            mac = await self.get_mac_for_ip(ip)
                            if mac:
                                device['mac_address'] = mac
                                self.devices[mac] = device
            
            # Common service types to search for
            service_types = [
                "_http._tcp.local.",
                "_https._tcp.local.",
                "_ssh._tcp.local.",
                "_ftp._tcp.local.",
                "_printer._tcp.local.",
                "_airplay._tcp.local.",
                "_chromecast._tcp.local.",
                "_homekit._tcp.local."
            ]
            
            zeroconf = Zeroconf()
            listener = MDNSListener(devices)
            
            browsers = []
            for service_type in service_types:
                browser = ServiceBrowser(zeroconf, service_type, listener)
                browsers.append(browser)
            
            # Wait for discovery
            await asyncio.sleep(3)
            
            # Cleanup
            for browser in browsers:
                browser.cancel()
            zeroconf.close()
            
            logger.info(f"mDNS scan found {len(devices)} services")
            
        except ImportError:
            logger.warning("zeroconf not available, skipping mDNS scan")
        except Exception as e:
            logger.error(f"mDNS scan failed: {e}")
        
        return devices

    async def scan_ssdp(self) -> Dict:
        """Scan for UPnP devices using SSDP"""
        devices = {}
        
        try:
            # SSDP multicast discovery
            SSDP_ADDR = "239.255.255.250"
            SSDP_PORT = 1900
            
            msg = (
                'M-SEARCH * HTTP/1.1\r\n'
                'HOST: 239.255.255.250:1900\r\n'
                'MAN: "ssdp:discover"\r\n'
                'ST: upnp:rootdevice\r\n'
                'MX: 3\r\n\r\n'
            )
            
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            sock.settimeout(5)
            
            # Send discovery message
            sock.sendto(msg.encode(), (SSDP_ADDR, SSDP_PORT))
            
            # Collect responses
            responses = []
            try:
                while True:
                    data, addr = sock.recvfrom(8192)
                    responses.append((data.decode(), addr[0]))
            except socket.timeout:
                pass
            
            sock.close()
            
            # Parse responses
            for response, ip in responses:
                device = self.parse_ssdp_response(response, ip)
                if device:
                    mac = await self.get_mac_for_ip(ip)
                    if mac:
                        device['mac_address'] = mac
                        devices[mac] = device
            
            logger.info(f"SSDP scan found {len(devices)} UPnP devices")
            
        except Exception as e:
            logger.error(f"SSDP scan failed: {e}")
        
        return devices

    def parse_ssdp_response(self, response: str, ip: str) -> Optional[Dict]:
        """Parse SSDP response"""
        try:
            lines = response.split('\r\n')
            headers = {}
            
            for line in lines[1:]:  # Skip status line
                if ':' in line:
                    key, value = line.split(':', 1)
                    headers[key.strip().lower()] = value.strip()
            
            device_type = 'unknown'
            if 'st' in headers:
                st = headers['st']
                if 'mediarenderer' in st.lower():
                    device_type = 'media_player'
                elif 'mediaserver' in st.lower():
                    device_type = 'media_server'
                elif 'internetgateway' in st.lower():
                    device_type = 'router'
                elif 'printer' in st.lower():
                    device_type = 'printer'
            
            return {
                'ip_address': ip,
                'device_type': device_type,
                'discovery_method': 'ssdp',
                'upnp_st': headers.get('st', ''),
                'upnp_location': headers.get('location', ''),
                'upnp_server': headers.get('server', ''),
                'services': ['upnp']
            }
            
        except Exception as e:
            logger.debug(f"Failed to parse SSDP response: {e}")
        
        return None

    async def scan_wifi(self) -> Dict:
        """Scan for WiFi devices and signal information"""
        devices = {}
        
        try:
            # Platform-specific WiFi scanning
            if os.name == 'nt':  # Windows
                result = subprocess.run(['netsh', 'wlan', 'show', 'profile'], 
                                      capture_output=True, text=True)
            else:  # Linux
                # Try different WiFi tools
                wifi_tools = ['iwlist', 'nmcli', 'iw']
                result = None
                
                for tool in wifi_tools:
                    try:
                        if tool == 'iwlist':
                            result = subprocess.run([tool, 'scan'], 
                                                  capture_output=True, text=True)
                        elif tool == 'nmcli':
                            result = subprocess.run([tool, 'dev', 'wifi'], 
                                                  capture_output=True, text=True)
                        elif tool == 'iw':
                            result = subprocess.run([tool, 'dev', 'wlan0', 'scan'], 
                                                  capture_output=True, text=True)
                        
                        if result and result.returncode == 0:
                            break
                    except FileNotFoundError:
                        continue
            
            if result and result.returncode == 0:
                wifi_devices = self.parse_wifi_scan(result.stdout)
                devices.update(wifi_devices)
            
            logger.info(f"WiFi scan found {len(devices)} devices")
            
        except Exception as e:
            logger.error(f"WiFi scan failed: {e}")
        
        return devices

    def parse_wifi_scan(self, wifi_output: str) -> Dict:
        """Parse WiFi scan output"""
        devices = {}
        
        try:
            # Simple parsing for demonstration
            # In production, would need more sophisticated parsing
            lines = wifi_output.split('\n')
            current_device = {}
            
            for line in lines:
                line = line.strip()
                
                if 'Address:' in line or 'BSSID:' in line:
                    if current_device and 'mac_address' in current_device:
                        mac = current_device['mac_address']
                        devices[mac] = current_device
                    
                    mac = line.split()[-1]
                    if self.is_valid_mac(mac):
                        current_device = {
                            'mac_address': mac.upper(),
                            'discovery_method': 'wifi',
                            'device_type': 'wifi_device'
                        }
                
                elif 'ESSID:' in line or 'SSID:' in line:
                    essid = line.split(':', 1)[1].strip().strip('"')
                    if essid and current_device:
                        current_device['ssid'] = essid
                
                elif 'Quality=' in line or 'Signal:' in line:
                    # Extract signal strength
                    if 'Signal:' in line:
                        signal_part = line.split('Signal:')[1].split()[0]
                        try:
                            rssi = int(signal_part.replace('dBm', ''))
                            if current_device:
                                current_device['rssi'] = rssi
                        except:
                            pass
            
            # Add last device
            if current_device and 'mac_address' in current_device:
                mac = current_device['mac_address']
                devices[mac] = current_device
                
        except Exception as e:
            logger.error(f"WiFi scan parsing failed: {e}")
        
        return devices

    def merge_device_data(self, target: Dict, source: Dict, method: str):
        """Merge device data from different discovery methods"""
        for mac, device_data in source.items():
            if mac in target:
                # Merge additional information
                target[mac].update(device_data)
                
                # Combine discovery methods
                methods = target[mac].get('discovery_methods', [])
                if method not in methods:
                    methods.append(method)
                target[mac]['discovery_methods'] = methods
                
                # Combine services
                services = target[mac].get('services', [])
                new_services = device_data.get('services', [])
                for service in new_services:
                    if service not in services:
                        services.append(service)
                target[mac]['services'] = services
            else:
                # New device
                device_data['discovery_methods'] = [method]
                target[mac] = device_data

    async def analyze_devices(self, devices: Dict) -> Dict:
        """Perform enhanced analysis on discovered devices"""
        analyzed_devices = {}
        
        for mac, device in devices.items():
            # Get vendor information
            vendor = await self.get_vendor_info(mac)
            device['vendor'] = vendor
            
            # Classify device type
            device_type = self.classify_device_type(device)
            device['device_type'] = device_type
            
            # Determine trust level
            trust_level = self.determine_trust_level(device)
            device['trust_level'] = trust_level
            
            # Calculate device score
            device_score = self.calculate_device_score(device)
            device['device_score'] = device_score
            
            # Add timestamps
            device['first_seen'] = datetime.now().isoformat()
            device['last_seen'] = datetime.now().isoformat()
            
            analyzed_devices[mac] = device
        
        return analyzed_devices

    async def get_vendor_info(self, mac: str) -> str:
        """Get vendor information from MAC address"""
        if mac in self.vendor_cache:
            return self.vendor_cache[mac]
        
        try:
            # Extract OUI (first 3 octets)
            oui = mac.replace(':', '').replace('-', '')[:6].upper()
            
            # Try online lookup first
            vendor = await self.lookup_vendor_online(oui)
            
            if not vendor:
                # Fallback to local OUI database
                vendor = self.lookup_vendor_local(oui)
            
            if not vendor:
                vendor = 'Unknown'
            
            self.vendor_cache[mac] = vendor
            return vendor
            
        except Exception as e:
            logger.debug(f"Vendor lookup failed for {mac}: {e}")
            return 'Unknown'

    async def lookup_vendor_online(self, oui: str) -> Optional[str]:
        """Lookup vendor online"""
        try:
            # Use IEEE OUI database API
            url = f"https://api.macvendors.com/{oui}"
            
            async with asyncio.timeout(3):
                response = requests.get(url, timeout=2)
                if response.status_code == 200:
                    return response.text.strip()
        
        except Exception as e:
            logger.debug(f"Online vendor lookup failed: {e}")
        
        return None

    def lookup_vendor_local(self, oui: str) -> Optional[str]:
        """Lookup vendor in local database"""
        # Common vendor prefixes for demonstration
        vendor_map = {
            '001122': 'Cisco Systems',
            '00:50:56': 'VMware',
            '08:00:27': 'Oracle VirtualBox',
            '00:0C:29': 'VMware',
            '00:15:5D': 'Microsoft Corporation',
            '00:1B:21': 'Intel Corporate',
            '00:25:90': 'Samsung Electronics',
            '28:16:AD': 'Samsung Electronics',
            'E4:CE:8F': 'Apple Inc',
            'AC:DE:48': 'Apple Inc',
            '00:26:BB': 'Apple Inc'
        }
        
        return vendor_map.get(oui)

    def classify_device_type(self, device: Dict) -> str:
        """Classify device type based on available information"""
        # Check explicit device type from discovery
        if 'device_type' in device and device['device_type'] != 'unknown':
            return device['device_type']
        
        # Classify based on services
        services = device.get('services', [])
        hostname = device.get('hostname', '').lower()
        vendor = device.get('vendor', '').lower()
        
        # Router/Gateway detection
        if any('gateway' in s for s in services) or 'router' in hostname:
            return 'router'
        
        # Printer detection
        if any('printer' in s for s in services) or 'printer' in hostname:
            return 'printer'
        
        # Media device detection
        if any('media' in s for s in services) or any(name in hostname for name in ['apple-tv', 'chromecast', 'roku']):
            return 'media_player'
        
        # Smart home devices
        if any(name in hostname for name in ['philips-hue', 'nest', 'echo', 'alexa']):
            return 'smart_home'
        
        # Computer detection
        if any(name in hostname for name in ['desktop', 'laptop', 'pc', 'mac']):
            return 'computer'
        
        # Mobile device detection
        if any(name in vendor for name in ['apple', 'samsung', 'google']):
            return 'mobile_device'
        
        return 'unknown'

    def determine_trust_level(self, device: Dict) -> str:
        """Determine trust level for device"""
        mac = device.get('mac_address', '')
        
        # Check manual trust assignments
        if mac in self.trusted_devices:
            return 'trusted'
        if mac in self.suspicious_devices:
            return 'suspicious'
        
        # Auto-classification based on device characteristics
        vendor = device.get('vendor', '').lower()
        device_type = device.get('device_type', '')
        
        # Trust known vendors for certain device types
        trusted_vendors = ['apple', 'samsung', 'cisco', 'hp', 'canon', 'epson']
        if any(tv in vendor for tv in trusted_vendors):
            if device_type in ['computer', 'printer', 'router']:
                return 'trusted'
        
        # Guest devices (mobile, unknown)
        if device_type in ['mobile_device', 'unknown']:
            return 'guest'
        
        return 'unknown'

    def calculate_device_score(self, device: Dict) -> float:
        """Calculate overall device trustworthiness score"""
        score = 0.5  # Base score
        
        # Trust level impact
        trust_level = device.get('trust_level', 'unknown')
        trust_scores = {
            'trusted': 0.4,
            'guest': 0.1,
            'unknown': 0.0,
            'suspicious': -0.3
        }
        score += trust_scores.get(trust_level, 0)
        
        # Vendor reputation
        vendor = device.get('vendor', '').lower()
        if any(tv in vendor for tv in ['apple', 'cisco', 'hp']):
            score += 0.2
        elif vendor == 'unknown':
            score -= 0.1
        
        # Discovery method reliability
        methods = device.get('discovery_methods', [])
        if 'arp' in methods:
            score += 0.1
        if 'mdns' in methods:
            score += 0.1
        
        # Signal strength (if available)
        rssi = device.get('rssi', None)
        if rssi:
            if rssi > -50:
                score += 0.1
            elif rssi < -80:
                score -= 0.1
        
        return max(0.0, min(1.0, score))

    async def store_scan_results(self, scan_id: str, devices: Dict):
        """Store scan results in database"""
        try:
            conn = psycopg2.connect(**self.db_config)
            cursor = conn.cursor()
            
            scan_timestamp = datetime.now()
            
            for mac, device in devices.items():
                # Upsert device
                cursor.execute("""
                    INSERT INTO network_devices 
                    (mac_address, ip_address, hostname, vendor, device_type, 
                     first_seen, last_seen, rssi, trust_level, capabilities, 
                     services, metadata)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (mac_address) DO UPDATE SET
                        ip_address = EXCLUDED.ip_address,
                        hostname = EXCLUDED.hostname,
                        vendor = EXCLUDED.vendor,
                        device_type = EXCLUDED.device_type,
                        last_seen = EXCLUDED.last_seen,
                        rssi = EXCLUDED.rssi,
                        trust_level = EXCLUDED.trust_level,
                        capabilities = EXCLUDED.capabilities,
                        services = EXCLUDED.services,
                        metadata = EXCLUDED.metadata,
                        is_online = true,
                        updated_at = CURRENT_TIMESTAMP
                """, (
                    mac,
                    device.get('ip_address'),
                    device.get('hostname'),
                    device.get('vendor'),
                    device.get('device_type'),
                    device.get('first_seen'),
                    device.get('last_seen'),
                    device.get('rssi'),
                    device.get('trust_level'),
                    device.get('capabilities', []),
                    device.get('services', []),
                    json.dumps({
                        'discovery_methods': device.get('discovery_methods', []),
                        'device_score': device.get('device_score', 0),
                        'scan_id': scan_id
                    })
                ))
                
                # Insert scan history
                cursor.execute("""
                    INSERT INTO device_scan_history 
                    (scan_id, mac_address, ip_address, rssi, scan_timestamp, 
                     scan_method, additional_data)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (
                    scan_id,
                    mac,
                    device.get('ip_address'),
                    device.get('rssi'),
                    scan_timestamp,
                    ','.join(device.get('discovery_methods', [])),
                    json.dumps(device)
                ))
            
            conn.commit()
            cursor.close()
            conn.close()
            
            logger.info(f"Stored {len(devices)} devices to database")
            
        except Exception as e:
            logger.error(f"Failed to store scan results: {e}")

    def calculate_trust_summary(self, devices: Dict) -> Dict:
        """Calculate trust level summary"""
        summary = {
            'trusted': 0,
            'guest': 0,
            'unknown': 0,
            'suspicious': 0
        }
        
        for device in devices.values():
            trust_level = device.get('trust_level', 'unknown')
            if trust_level in summary:
                summary[trust_level] += 1
        
        return summary

    def get_local_network_range(self) -> Optional[str]:
        """Get local network range for scanning"""
        try:
            # Get default gateway
            if os.name == 'nt':  # Windows
                result = subprocess.run(['ipconfig'], capture_output=True, text=True)
                # Parse Windows output (simplified)
                for line in result.stdout.split('\n'):
                    if 'Default Gateway' in line:
                        gateway = line.split(':')[-1].strip()
                        if gateway and gateway != '':
                            return gateway
            else:  # Linux/macOS
                result = subprocess.run(['ip', 'route', 'show', 'default'], 
                                      capture_output=True, text=True)
                if result.returncode == 0:
                    lines = result.stdout.strip().split('\n')
                    for line in lines:
                        if 'default via' in line:
                            gateway = line.split()[2]
                            return gateway
        
        except Exception as e:
            logger.debug(f"Failed to get network range: {e}")
        
        # Fallback to common ranges
        return "192.168.1.1"

    def is_valid_mac(self, mac: str) -> bool:
        """Validate MAC address format"""
        import re
        mac_pattern = re.compile(r'^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$')
        return bool(mac_pattern.match(mac))

    async def get_device_history(self, mac_address: str, hours: int = 24) -> Dict:
        """Get scan history for a specific device"""
        try:
            conn = psycopg2.connect(**self.db_config)
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            cutoff_time = datetime.now() - timedelta(hours=hours)
            
            cursor.execute("""
                SELECT * FROM device_scan_history 
                WHERE mac_address = %s AND scan_timestamp > %s
                ORDER BY scan_timestamp DESC
            """, (mac_address, cutoff_time))
            
            history = [dict(record) for record in cursor.fetchall()]
            
            cursor.close()
            conn.close()
            
            return {
                "mac_address": mac_address,
                "history_count": len(history),
                "time_window_hours": hours,
                "history": history
            }
            
        except Exception as e:
            logger.error(f"Failed to get device history: {e}")
            return {"error": str(e)}

    async def mark_device_offline(self, mac_address: str):
        """Mark device as offline"""
        try:
            conn = psycopg2.connect(**self.db_config)
            cursor = conn.cursor()
            
            cursor.execute("""
                UPDATE network_devices 
                SET is_online = false, updated_at = CURRENT_TIMESTAMP
                WHERE mac_address = %s
            """, (mac_address,))
            
            conn.commit()
            cursor.close()
            conn.close()
            
            logger.info(f"Marked device {mac_address} as offline")
            
        except Exception as e:
            logger.error(f"Failed to mark device offline: {e}")

    async def set_device_trust_level(self, mac_address: str, trust_level: str) -> Dict:
        """Set trust level for a device"""
        try:
            valid_levels = ['trusted', 'guest', 'unknown', 'suspicious']
            if trust_level not in valid_levels:
                return {"error": f"Invalid trust level. Must be one of: {valid_levels}"}
            
            # Update in memory
            if trust_level == 'trusted':
                self.trusted_devices.add(mac_address)
                self.suspicious_devices.discard(mac_address)
            elif trust_level == 'suspicious':
                self.suspicious_devices.add(mac_address)
                self.trusted_devices.discard(mac_address)
            else:
                self.trusted_devices.discard(mac_address)
                self.suspicious_devices.discard(mac_address)
            
            # Update in database
            conn = psycopg2.connect(**self.db_config)
            cursor = conn.cursor()
            
            cursor.execute("""
                UPDATE network_devices 
                SET trust_level = %s, updated_at = CURRENT_TIMESTAMP
                WHERE mac_address = %s
            """, (trust_level, mac_address))
            
            conn.commit()
            cursor.close()
            conn.close()
            
            return {
                "mac_address": mac_address,
                "trust_level": trust_level,
                "status": "updated"
            }
            
        except Exception as e:
            logger.error(f"Failed to set device trust level: {e}")
            return {"error": str(e)}

# Main execution
if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='SmartBlueprint Pro Device Scanner')
    parser.add_argument('--scan', action='store_true', help='Perform comprehensive scan')
    parser.add_argument('--continuous', action='store_true', help='Run continuous scanning')
    parser.add_argument('--interval', type=int, default=300, help='Scan interval in seconds')
    
    args = parser.parse_args()
    
    scanner = DeviceScanner()
    
    async def main():
        if args.scan:
            result = await scanner.comprehensive_scan()
            print(json.dumps(result, indent=2))
        elif args.continuous:
            logger.info(f"Starting continuous scanning with {args.interval}s intervals")
            while True:
                await scanner.comprehensive_scan()
                await asyncio.sleep(args.interval)
        else:
            print("Use --scan for single scan or --continuous for continuous scanning")
    
    asyncio.run(main())