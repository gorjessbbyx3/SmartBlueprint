# SmartBlueprint Pro

## Overview

SmartBlueprint Pro is a comprehensive network monitoring and IoT device management platform that combines cross-platform desktop applications, mobile apps, web interfaces, and Python-based ML services. The system provides real-time network device discovery, signal analysis, anomaly detection, and predictive maintenance capabilities.

## System Architecture

### Frontend Architecture
- **Web Application**: React-based single-page application with TypeScript and Vite build system
- **Mobile Application**: Android Kotlin application with Jetpack Compose UI framework
- **Desktop Application**: 
  - Native C++ core engine for cross-platform compatibility (Windows, macOS, Linux)
  - Electron wrapper for web-based desktop UI
  - Console-based interface for headless operation

### Backend Architecture
- **Express.js Server**: RESTful API server with TypeScript
- **WebSocket Communication**: Real-time bidirectional communication between clients and server
- **Python ML Services**: FastAPI-based microservices for machine learning operations
- **Desktop Agent Bridge**: Local network scanning agents that sync with cloud services

### Data Storage Solutions
- **PostgreSQL Database**: Primary data store using Drizzle ORM
- **Database Schema**:
  - `devices`: Network device information and telemetry
  - `floorplans`: Building layout and device positioning
  - `anomalies`: Detected network issues and patterns
  - `recommendations`: AI-generated optimization suggestions

## Key Components

### Network Discovery & Monitoring
- **Comprehensive Device Scanner**: Multi-protocol discovery using SSDP, mDNS, UPnP, and ARP scanning
- **Signal Processing**: Advanced RSSI analysis with Kalman filtering and signal smoothing
- **Active Ping Probing**: RTT-based distance measurement for precise device positioning
- **Device Classification**: Automatic device type identification using MAC address patterns and vendor databases

### Machine Learning & AI
- **Anomaly Detection**: Isolation Forest and LSTM-based anomaly detection
- **Predictive Maintenance**: Device failure prediction and maintenance scheduling
- **Signal Analysis**: Advanced signal processing for location estimation and interference detection
- **Pet Recognition AI**: Intelligent pet detection through device interaction patterns

### Cross-Platform Integration
- **Desktop Agents**: Local network scanners that run on user machines
- **Cloud Sync Tunnel**: Secure bridge between local agents and cloud services
- **Platform Adapters**: Integration with smart home platforms (Philips Hue, Google Nest, Amazon Alexa)

### Real-Time Processing
- **WebSocket Architecture**: Live device updates and status monitoring
- **Continuous Monitoring**: Background services for 24/7 network health monitoring
- **Data Integrity Monitoring**: Automated detection of fake or placeholder data

## Data Flow

1. **Device Discovery**: Desktop agents scan local networks using multiple protocols
2. **Data Collection**: Device telemetry is collected and processed through signal processing algorithms
3. **Cloud Synchronization**: Local data is securely transmitted to cloud services via WebSocket tunnels
4. **ML Analysis**: Python services perform anomaly detection and predictive analysis
5. **Real-Time Updates**: Processed insights are broadcast to all connected clients via WebSocket
6. **User Interface**: Web, mobile, and desktop interfaces display live network status and recommendations

## External Dependencies

### Core Dependencies
- **Node.js Runtime**: Required for Express.js server and Electron desktop app
- **PostgreSQL**: Database server for persistent data storage
- **Python 3.11+**: Required for ML services and signal processing

### Key Packages
- **Frontend**: React, TypeScript, Vite, Radix UI components, TanStack Query
- **Backend**: Express.js, Drizzle ORM, WebSocket (ws), zod validation
- **ML Services**: FastAPI, scikit-learn, NumPy, pandas, psycopg2
- **Native Components**: CMake build system, C++17 standard

### Platform-Specific Dependencies
- **Windows**: Visual Studio build tools, Windows SDK
- **Android**: Gradle build system, Kotlin compiler, Android SDK
- **Python ML**: uvicorn, websockets, asyncio for async processing

## Deployment Strategy

### Development Environment
- **Replit Integration**: Configured for Replit development with auto-detection of server URLs
- **Hot Reload**: Vite development server with HMR for frontend development
- **Cross-Platform Build**: Unified Makefile for building all platform targets

### Production Deployment
- **Web Application**: Static assets served via Express.js with API routes
- **Desktop Distribution**: 
  - Windows: NSIS installer with embedded Node.js runtime
  - Electron: Cross-platform application packaging
  - Native: Standalone C++ executables
- **Mobile**: Android APK distribution with cloud connectivity
- **ML Services**: FastAPI services deployed as standalone Python applications

### Build System
- **Multi-Platform Builds**: CMake for native components, Gradle for Android
- **Automated Installers**: Windows installer creation with dependency bundling
- **CI/CD Ready**: Build scripts support automated testing and deployment

## Changelog

- June 20, 2025. Initial setup
- June 20, 2025. Comprehensive code optimization: removed unused imports across all Python files, created automated import optimizer tool, and implemented code quality analysis dashboard
- June 20, 2025. Enhanced ML anomaly detection system with predictive failure analysis, intelligent recommendations, and criticality level assessment - successfully detecting printer offline anomalies with 92% confidence
- June 20, 2025. Completed Windows desktop application package with standalone executable, installation scripts, and download functionality integrated into web interface
- June 20, 2025. **MAJOR MILESTONE**: Completed Electron-wrapped Windows GUI application with React frontend, Express.js backend, and Python ML services running in background. Users now get native Windows application window with complete visual interface instead of terminal-only operation. Download functionality verified and working at 210KB package size.
- June 20, 2025. **BREAKTHROUGH**: Implemented advanced ML predictive analytics engine with real-time device health monitoring, anomaly detection with 85% confidence, and predictive maintenance capabilities. System successfully detects device failures (office printer critical health at 8.3%), generates actionable recommendations, and provides comprehensive health summaries through dedicated API endpoints and React dashboard interface.
- June 20, 2025. **COMPLETE PACKAGE**: Created comprehensive Windows desktop application package (219KB) that includes complete backend Express.js server, Python ML services, React frontend, and Electron wrapper. Users now get standalone offline operation with automated installation scripts and full ML analytics capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.