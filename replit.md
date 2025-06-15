# Smart Home Device Mapping Platform

## Overview

This is a full-stack web application for smart home device mapping and network optimization. The platform provides real-time visualization of IoT devices on interactive floorplans, analyzes signal strength patterns, and offers intelligent recommendations for improving network coverage. Built with React, Express, and PostgreSQL, it features a modern component-based architecture with real-time WebSocket communication.

## System Architecture

### Frontend Architecture
- **React 18** with TypeScript for the user interface
- **Vite** as the build tool and development server
- **Tailwind CSS** with shadcn/ui components for styling
- **TanStack Query** for server state management and caching
- **Wouter** for client-side routing
- **WebSocket** integration for real-time device updates

### Backend Architecture
- **Express.js** server with TypeScript
- **WebSocket Server** for real-time communication
- **Drizzle ORM** for database operations
- **Zod** for runtime type validation
- **PostgreSQL** as the primary database (configured for Neon)

### Database Design
- **devices** table: Stores device information including position, signal strength, and status
- **floorplans** table: Contains floor plan data and room boundaries
- **anomalies** table: Tracks network issues and signal problems
- **recommendations** table: Stores optimization suggestions

## Key Components

### Real-time Device Mapping
- Interactive floorplan canvas with device visualization
- Signal strength heatmap overlay
- Device positioning using RSSI-based algorithms
- Live device status updates via WebSocket

### Device Discovery & Management
- Automated network scanning for smart home devices
- Manual device registration and configuration
- Device type classification (smart TV, thermostats, speakers, etc.)
- Signal strength monitoring and offline detection

### Network Analysis & Optimization
- Coverage analysis with heatmap visualization
- Anomaly detection for signal drops and connectivity issues
- Intelligent placement recommendations for WiFi extenders
- Performance metrics and improvement scoring

### User Interface
- Responsive sidebar with device management tools
- Tabbed interface for mapping vs analytics views
- Modal dialogs for device configuration
- Toast notifications for user feedback

## Data Flow

1. **Device Detection**: Network scanning identifies smart home devices
2. **Signal Processing**: RSSI data is collected and processed for positioning
3. **Real-time Updates**: WebSocket pushes live device status changes
4. **Coverage Analysis**: Algorithms analyze signal patterns and identify weak spots
5. **Recommendations**: System generates optimization suggestions
6. **User Interaction**: Interface allows manual device management and configuration

## External Dependencies

### Core Technologies
- **@neondatabase/serverless**: PostgreSQL database driver
- **drizzle-orm**: Type-safe ORM with PostgreSQL dialect
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Accessible UI component primitives
- **class-variance-authority**: Component styling variants

### Development Tools
- **vite**: Fast build tool with hot reload
- **typescript**: Type safety and developer experience
- **tailwindcss**: Utility-first CSS framework
- **tsx**: TypeScript execution for development

### Real-time Communication
- **ws**: WebSocket server implementation
- Custom WebSocket hook for client-side connection management

## Deployment Strategy

### Development Environment
- Vite dev server on port 5000 with hot reload
- PostgreSQL database via Neon serverless
- Environment variables for database configuration
- Development-specific error overlays and debugging tools

### Production Build
- Vite builds optimized client bundle
- esbuild compiles server code for Node.js
- Static assets served from Express
- WebSocket server integrated with HTTP server

### Environment Configuration
- Database URL via environment variables
- Drizzle migrations in `./migrations` directory
- Build outputs to `./dist` for deployment
- Development vs production mode detection

## Advanced Features Roadmap

### ML Location Fingerprinting & Anomaly Detection
**User Experience Flow:**
1. User enables "Advanced Analytics" in settings
2. System collects RSSI patterns from discovered devices over time
3. ML model automatically learns room-specific signal fingerprints
4. Anomaly detection alerts users to unusual device behavior or signal drops
5. Predictive alerts notify users before devices fail

### Multi-Room Mapping & Auto Room Detection
**User Experience Flow:**
1. User uploads floorplan or draws rooms using interactive tools
2. System automatically detects room boundaries using signal clustering
3. Device placement optimization suggestions per room
4. Room-specific coverage heatmaps and analytics
5. Cross-room interference analysis and mitigation

### Smart Home Platform Integration
**User Experience Flow:**
1. User connects accounts (Philips Hue, Nest, Alexa) via OAuth
2. System imports device configurations and states automatically
3. Real-time synchronization of device status and controls
4. Unified dashboard showing all connected platforms
5. Cross-platform automation and optimization suggestions

### Predictive Analytics & Maintenance
**User Experience Flow:**
1. System monitors device performance patterns continuously
2. ML models predict failure probability based on signal degradation
3. Automated maintenance reminders and replacement suggestions
4. Performance trend analysis with actionable insights
5. Preventive optimization recommendations

## Changelog

```
Changelog:
- June 15, 2025. Initial smart home sensing platform with real device discovery
- June 15, 2025. Added advanced features roadmap for ML analytics and integrations
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```