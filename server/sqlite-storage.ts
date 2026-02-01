/**
 * SQLite Storage Implementation for Raspberry Pi
 *
 * Provides persistent storage using SQLite, which is ideal for:
 * - Single-device deployments (Raspberry Pi)
 * - Simple backup (just copy the .db file)
 * - No separate database server needed
 * - Low memory footprint
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import {
  type Device,
  type InsertDevice,
  type Floorplan,
  type InsertFloorplan,
  type Anomaly,
  type InsertAnomaly,
  type Recommendation,
  type InsertRecommendation,
  type Room,
  type InsertRoom,
  type DeviceTelemetry,
  type InsertDeviceTelemetry,
  type MlModel,
  type InsertMlModel,
  type PlatformIntegration,
  type InsertPlatformIntegration,
  type PlatformDevice,
  type InsertPlatformDevice,
  type PredictiveAlert,
  type InsertPredictiveAlert,
  type FusionResult,
  type InsertFusionResult,
  type Resident,
  type InsertResident,
  type ResidentDevice,
  type InsertResidentDevice,
  type SecuritySettings,
  type InsertSecuritySettings,
  type SecurityEvent,
  type InsertSecurityEvent,
  type NotificationChannel,
  type InsertNotificationChannel,
  type PresenceHistory,
  type InsertPresenceHistory
} from "@shared/schema";
import { IStorage } from './storage';

export class SQLiteStorage implements IStorage {
  private db: Database.Database;

  constructor(dbPath?: string) {
    // Default to data directory
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const finalPath = dbPath || path.join(dataDir, 'smartblueprint.db');
    console.log(`[SQLiteStorage] Opening database at: ${finalPath}`);

    this.db = new Database(finalPath);
    this.db.pragma('journal_mode = WAL'); // Better performance for concurrent reads
    this.db.pragma('foreign_keys = ON');

    this.initializeTables();
    this.initializeDefaultData();
  }

  private initializeTables(): void {
    // Devices table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS devices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        mac_address TEXT NOT NULL UNIQUE,
        device_type TEXT NOT NULL,
        protocol TEXT NOT NULL,
        rssi REAL NOT NULL,
        x REAL,
        y REAL,
        is_online INTEGER DEFAULT 1,
        last_seen TEXT DEFAULT CURRENT_TIMESTAMP,
        telemetry_data TEXT
      )
    `);

    // Floorplans table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS floorplans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        scale TEXT DEFAULT '1:200',
        width REAL NOT NULL,
        height REAL NOT NULL,
        data TEXT NOT NULL,
        image_url TEXT,
        sketch_elements TEXT
      )
    `);

    // Anomalies table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS anomalies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id INTEGER REFERENCES devices(id),
        type TEXT NOT NULL,
        severity TEXT NOT NULL,
        description TEXT NOT NULL,
        detected TEXT DEFAULT CURRENT_TIMESTAMP,
        resolved INTEGER DEFAULT 0
      )
    `);

    // Recommendations table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS recommendations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        description TEXT NOT NULL,
        x REAL,
        y REAL,
        priority INTEGER DEFAULT 1,
        applied INTEGER DEFAULT 0,
        improvement_score REAL
      )
    `);

    // Rooms table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS rooms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        floorplan_id INTEGER REFERENCES floorplans(id),
        name TEXT NOT NULL,
        boundaries TEXT NOT NULL,
        room_type TEXT NOT NULL,
        detected_automatically INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Device telemetry table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS device_telemetry (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id INTEGER REFERENCES devices(id),
        rssi INTEGER NOT NULL,
        signal_quality INTEGER,
        packet_loss REAL DEFAULT 0,
        latency INTEGER,
        temperature REAL,
        battery_level INTEGER,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ML models table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ml_models (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        model_type TEXT NOT NULL,
        version TEXT NOT NULL,
        training_data TEXT,
        accuracy REAL,
        is_active INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        last_trained_at TEXT
      )
    `);

    // Platform integrations table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS platform_integrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        platform TEXT NOT NULL,
        user_id TEXT NOT NULL,
        access_token TEXT NOT NULL,
        refresh_token TEXT,
        token_expiry TEXT,
        bridge_ip TEXT,
        platform_user_id TEXT,
        is_active INTEGER DEFAULT 1,
        last_sync TEXT DEFAULT CURRENT_TIMESTAMP,
        config TEXT
      )
    `);

    // Platform devices table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS platform_devices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        integration_id INTEGER REFERENCES platform_integrations(id),
        device_id INTEGER REFERENCES devices(id),
        platform_device_id TEXT NOT NULL,
        device_name TEXT NOT NULL,
        device_type TEXT NOT NULL,
        capabilities TEXT,
        state TEXT,
        last_updated TEXT DEFAULT CURRENT_TIMESTAMP,
        is_controllable INTEGER DEFAULT 1
      )
    `);

    // Predictive alerts table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS predictive_alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id INTEGER REFERENCES devices(id),
        alert_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        prediction TEXT NOT NULL,
        probability_score REAL NOT NULL,
        recommended_action TEXT,
        is_resolved INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Fusion results table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS fusion_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room TEXT NOT NULL,
        confidence_score REAL NOT NULL,
        alert_type TEXT NOT NULL,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        metadata TEXT
      )
    `);

    // Security system tables
    // Residents table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS residents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        pin TEXT,
        role TEXT NOT NULL DEFAULT 'resident',
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        last_seen TEXT
      )
    `);

    // Resident devices table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS resident_devices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resident_id INTEGER REFERENCES residents(id),
        device_id INTEGER REFERENCES devices(id),
        mac_address TEXT NOT NULL,
        device_name TEXT NOT NULL,
        device_type TEXT NOT NULL,
        is_primary INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Security settings table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS security_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        security_mode TEXT NOT NULL DEFAULT 'disarmed',
        auto_arm_enabled INTEGER DEFAULT 0,
        auto_arm_delay INTEGER DEFAULT 300,
        entry_delay INTEGER DEFAULT 30,
        exit_delay INTEGER DEFAULT 60,
        silent_alarm INTEGER DEFAULT 0,
        last_mode_change TEXT DEFAULT CURRENT_TIMESTAMP,
        changed_by INTEGER REFERENCES residents(id),
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Security events table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS security_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        description TEXT NOT NULL,
        device_id INTEGER REFERENCES devices(id),
        resident_id INTEGER REFERENCES residents(id),
        room_id INTEGER REFERENCES rooms(id),
        metadata TEXT,
        is_acknowledged INTEGER DEFAULT 0,
        acknowledged_by INTEGER REFERENCES residents(id),
        acknowledged_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Notification channels table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS notification_channels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resident_id INTEGER REFERENCES residents(id),
        channel_type TEXT NOT NULL,
        destination TEXT NOT NULL,
        is_enabled INTEGER DEFAULT 1,
        notify_on_intrusion INTEGER DEFAULT 1,
        notify_on_mode_change INTEGER DEFAULT 0,
        notify_on_device_offline INTEGER DEFAULT 0,
        notify_on_resident_activity INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Presence history table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS presence_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resident_id INTEGER REFERENCES residents(id),
        event_type TEXT NOT NULL,
        detected_via TEXT,
        device_id INTEGER REFERENCES devices(id),
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('[SQLiteStorage] All tables initialized');
  }

  private initializeDefaultData(): void {
    // Check if default floorplan exists
    const floorplanCount = this.db.prepare('SELECT COUNT(*) as count FROM floorplans').get() as { count: number };
    if (floorplanCount.count === 0) {
      this.db.prepare(`
        INSERT INTO floorplans (name, scale, width, height, data)
        VALUES (?, ?, ?, ?, ?)
      `).run('Default Floor Plan', '1:200', 800, 600, JSON.stringify({
        rooms: [{ name: 'Main Area', x: 50, y: 50, width: 700, height: 500 }],
        doors: [],
        windows: []
      }));
      console.log('[SQLiteStorage] Default floorplan created');
    }

    // Initialize security settings if not exists
    const settingsCount = this.db.prepare('SELECT COUNT(*) as count FROM security_settings').get() as { count: number };
    if (settingsCount.count === 0) {
      this.db.prepare(`
        INSERT INTO security_settings (security_mode, auto_arm_enabled, auto_arm_delay, entry_delay, exit_delay, silent_alarm)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run('disarmed', 0, 300, 30, 60, 0);
      console.log('[SQLiteStorage] Default security settings created');
    }
  }

  // Helper to convert row to proper types
  private parseDate(dateStr: string | null): Date | null {
    return dateStr ? new Date(dateStr) : null;
  }

  private toBoolean(val: number | null): boolean {
    return val === 1;
  }

  private parseJson<T>(jsonStr: string | null): T | null {
    if (!jsonStr) return null;
    try {
      return JSON.parse(jsonStr) as T;
    } catch {
      return null;
    }
  }

  // ============================================
  // DEVICE OPERATIONS
  // ============================================

  async getDevices(): Promise<Device[]> {
    const rows = this.db.prepare('SELECT * FROM devices').all() as any[];
    return rows.map(row => this.mapDevice(row));
  }

  async getDevice(id: number): Promise<Device | undefined> {
    const row = this.db.prepare('SELECT * FROM devices WHERE id = ?').get(id) as any;
    return row ? this.mapDevice(row) : undefined;
  }

  async createDevice(device: InsertDevice): Promise<Device> {
    const result = this.db.prepare(`
      INSERT INTO devices (name, mac_address, device_type, protocol, rssi, x, y, is_online, telemetry_data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      device.name,
      device.macAddress,
      device.deviceType,
      device.protocol,
      device.rssi,
      device.x ?? null,
      device.y ?? null,
      device.isOnline ? 1 : 0,
      device.telemetryData ? JSON.stringify(device.telemetryData) : null
    );

    return (await this.getDevice(result.lastInsertRowid as number))!;
  }

  async updateDevice(id: number, updates: Partial<InsertDevice>): Promise<Device | undefined> {
    const device = await this.getDevice(id);
    if (!device) return undefined;

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.macAddress !== undefined) { fields.push('mac_address = ?'); values.push(updates.macAddress); }
    if (updates.deviceType !== undefined) { fields.push('device_type = ?'); values.push(updates.deviceType); }
    if (updates.protocol !== undefined) { fields.push('protocol = ?'); values.push(updates.protocol); }
    if (updates.rssi !== undefined) { fields.push('rssi = ?'); values.push(updates.rssi); }
    if (updates.x !== undefined) { fields.push('x = ?'); values.push(updates.x); }
    if (updates.y !== undefined) { fields.push('y = ?'); values.push(updates.y); }
    if (updates.isOnline !== undefined) { fields.push('is_online = ?'); values.push(updates.isOnline ? 1 : 0); }
    if (updates.telemetryData !== undefined) { fields.push('telemetry_data = ?'); values.push(JSON.stringify(updates.telemetryData)); }

    fields.push('last_seen = ?');
    values.push(new Date().toISOString());
    values.push(id);

    this.db.prepare(`UPDATE devices SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return this.getDevice(id);
  }

  async deleteDevice(id: number): Promise<boolean> {
    const result = this.db.prepare('DELETE FROM devices WHERE id = ?').run(id);
    return result.changes > 0;
  }

  async updateDeviceRSSI(macAddress: string, rssi: number): Promise<void> {
    this.db.prepare(`
      UPDATE devices SET rssi = ?, last_seen = ? WHERE mac_address = ?
    `).run(rssi, new Date().toISOString(), macAddress);
  }

  private mapDevice(row: any): Device {
    return {
      id: row.id,
      name: row.name,
      macAddress: row.mac_address,
      deviceType: row.device_type,
      protocol: row.protocol,
      rssi: row.rssi,
      x: row.x,
      y: row.y,
      isOnline: this.toBoolean(row.is_online),
      lastSeen: this.parseDate(row.last_seen),
      telemetryData: this.parseJson(row.telemetry_data)
    };
  }

  // ============================================
  // FLOORPLAN OPERATIONS
  // ============================================

  async getFloorplans(): Promise<Floorplan[]> {
    const rows = this.db.prepare('SELECT * FROM floorplans').all() as any[];
    return rows.map(row => this.mapFloorplan(row));
  }

  async getFloorplan(id: number): Promise<Floorplan | undefined> {
    const row = this.db.prepare('SELECT * FROM floorplans WHERE id = ?').get(id) as any;
    return row ? this.mapFloorplan(row) : undefined;
  }

  async createFloorplan(floorplan: InsertFloorplan): Promise<Floorplan> {
    const result = this.db.prepare(`
      INSERT INTO floorplans (name, scale, width, height, data, image_url, sketch_elements)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      floorplan.name,
      floorplan.scale ?? '1:200',
      floorplan.width,
      floorplan.height,
      JSON.stringify(floorplan.data),
      floorplan.imageUrl ?? null,
      floorplan.sketchElements ?? null
    );

    return (await this.getFloorplan(result.lastInsertRowid as number))!;
  }

  async updateFloorplan(id: number, updates: Partial<InsertFloorplan>): Promise<Floorplan | undefined> {
    const floorplan = await this.getFloorplan(id);
    if (!floorplan) return undefined;

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.scale !== undefined) { fields.push('scale = ?'); values.push(updates.scale); }
    if (updates.width !== undefined) { fields.push('width = ?'); values.push(updates.width); }
    if (updates.height !== undefined) { fields.push('height = ?'); values.push(updates.height); }
    if (updates.data !== undefined) { fields.push('data = ?'); values.push(JSON.stringify(updates.data)); }
    if (updates.imageUrl !== undefined) { fields.push('image_url = ?'); values.push(updates.imageUrl); }
    if (updates.sketchElements !== undefined) { fields.push('sketch_elements = ?'); values.push(updates.sketchElements); }

    if (fields.length === 0) return floorplan;

    values.push(id);
    this.db.prepare(`UPDATE floorplans SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return this.getFloorplan(id);
  }

  private mapFloorplan(row: any): Floorplan {
    return {
      id: row.id,
      name: row.name,
      scale: row.scale,
      width: row.width,
      height: row.height,
      data: this.parseJson(row.data),
      imageUrl: row.image_url,
      sketchElements: row.sketch_elements
    };
  }

  // ============================================
  // ANOMALY OPERATIONS
  // ============================================

  async getAnomalies(): Promise<Anomaly[]> {
    const rows = this.db.prepare('SELECT * FROM anomalies ORDER BY detected DESC').all() as any[];
    return rows.map(row => this.mapAnomaly(row));
  }

  async createAnomaly(anomaly: InsertAnomaly): Promise<Anomaly> {
    const result = this.db.prepare(`
      INSERT INTO anomalies (device_id, type, severity, description, resolved)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      anomaly.deviceId ?? null,
      anomaly.type,
      anomaly.severity,
      anomaly.description,
      anomaly.resolved ? 1 : 0
    );

    const row = this.db.prepare('SELECT * FROM anomalies WHERE id = ?').get(result.lastInsertRowid) as any;
    return this.mapAnomaly(row);
  }

  async resolveAnomaly(id: number): Promise<boolean> {
    const result = this.db.prepare('UPDATE anomalies SET resolved = 1 WHERE id = ?').run(id);
    return result.changes > 0;
  }

  private mapAnomaly(row: any): Anomaly {
    return {
      id: row.id,
      deviceId: row.device_id,
      type: row.type,
      severity: row.severity,
      description: row.description,
      detected: this.parseDate(row.detected),
      resolved: this.toBoolean(row.resolved)
    };
  }

  // ============================================
  // RECOMMENDATION OPERATIONS
  // ============================================

  async getRecommendations(): Promise<Recommendation[]> {
    const rows = this.db.prepare('SELECT * FROM recommendations ORDER BY priority DESC').all() as any[];
    return rows.map(row => this.mapRecommendation(row));
  }

  async createRecommendation(rec: InsertRecommendation): Promise<Recommendation> {
    const result = this.db.prepare(`
      INSERT INTO recommendations (type, description, x, y, priority, applied, improvement_score)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      rec.type,
      rec.description,
      rec.x ?? null,
      rec.y ?? null,
      rec.priority ?? 1,
      rec.applied ? 1 : 0,
      rec.improvementScore ?? null
    );

    const row = this.db.prepare('SELECT * FROM recommendations WHERE id = ?').get(result.lastInsertRowid) as any;
    return this.mapRecommendation(row);
  }

  async applyRecommendation(id: number): Promise<boolean> {
    const result = this.db.prepare('UPDATE recommendations SET applied = 1 WHERE id = ?').run(id);
    return result.changes > 0;
  }

  private mapRecommendation(row: any): Recommendation {
    return {
      id: row.id,
      type: row.type,
      description: row.description,
      x: row.x,
      y: row.y,
      priority: row.priority,
      applied: this.toBoolean(row.applied),
      improvementScore: row.improvement_score
    };
  }

  // ============================================
  // ROOM OPERATIONS
  // ============================================

  async getRooms(floorplanId?: number): Promise<Room[]> {
    let query = 'SELECT * FROM rooms';
    const params: any[] = [];
    if (floorplanId) {
      query += ' WHERE floorplan_id = ?';
      params.push(floorplanId);
    }
    const rows = this.db.prepare(query).all(...params) as any[];
    return rows.map(row => this.mapRoom(row));
  }

  async getRoom(id: number): Promise<Room | undefined> {
    const row = this.db.prepare('SELECT * FROM rooms WHERE id = ?').get(id) as any;
    return row ? this.mapRoom(row) : undefined;
  }

  async createRoom(room: InsertRoom): Promise<Room> {
    const result = this.db.prepare(`
      INSERT INTO rooms (floorplan_id, name, boundaries, room_type, detected_automatically)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      room.floorplanId ?? null,
      room.name,
      room.boundaries,
      room.roomType,
      room.detectedAutomatically ? 1 : 0
    );

    return (await this.getRoom(result.lastInsertRowid as number))!;
  }

  async updateRoom(id: number, updates: Partial<InsertRoom>): Promise<Room | undefined> {
    const room = await this.getRoom(id);
    if (!room) return undefined;

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.boundaries !== undefined) { fields.push('boundaries = ?'); values.push(updates.boundaries); }
    if (updates.roomType !== undefined) { fields.push('room_type = ?'); values.push(updates.roomType); }
    if (updates.floorplanId !== undefined) { fields.push('floorplan_id = ?'); values.push(updates.floorplanId); }

    if (fields.length === 0) return room;

    values.push(id);
    this.db.prepare(`UPDATE rooms SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return this.getRoom(id);
  }

  async deleteRoom(id: number): Promise<boolean> {
    const result = this.db.prepare('DELETE FROM rooms WHERE id = ?').run(id);
    return result.changes > 0;
  }

  private mapRoom(row: any): Room {
    return {
      id: row.id,
      floorplanId: row.floorplan_id,
      name: row.name,
      boundaries: row.boundaries,
      roomType: row.room_type,
      detectedAutomatically: this.toBoolean(row.detected_automatically),
      createdAt: this.parseDate(row.created_at)
    };
  }

  // ============================================
  // DEVICE TELEMETRY OPERATIONS
  // ============================================

  async getDeviceTelemetry(deviceId: number, limit = 100): Promise<DeviceTelemetry[]> {
    const rows = this.db.prepare(`
      SELECT * FROM device_telemetry WHERE device_id = ? ORDER BY timestamp DESC LIMIT ?
    `).all(deviceId, limit) as any[];
    return rows.map(row => this.mapDeviceTelemetry(row));
  }

  async addDeviceTelemetry(telemetry: InsertDeviceTelemetry): Promise<DeviceTelemetry> {
    const result = this.db.prepare(`
      INSERT INTO device_telemetry (device_id, rssi, signal_quality, packet_loss, latency, temperature, battery_level)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      telemetry.deviceId ?? null,
      telemetry.rssi,
      telemetry.signalQuality ?? null,
      telemetry.packetLoss ?? 0,
      telemetry.latency ?? null,
      telemetry.temperature ?? null,
      telemetry.batteryLevel ?? null
    );

    const row = this.db.prepare('SELECT * FROM device_telemetry WHERE id = ?').get(result.lastInsertRowid) as any;
    return this.mapDeviceTelemetry(row);
  }

  async getLatestTelemetry(deviceId: number): Promise<DeviceTelemetry | undefined> {
    const row = this.db.prepare(`
      SELECT * FROM device_telemetry WHERE device_id = ? ORDER BY timestamp DESC LIMIT 1
    `).get(deviceId) as any;
    return row ? this.mapDeviceTelemetry(row) : undefined;
  }

  private mapDeviceTelemetry(row: any): DeviceTelemetry {
    return {
      id: row.id,
      deviceId: row.device_id,
      rssi: row.rssi,
      signalQuality: row.signal_quality,
      packetLoss: row.packet_loss,
      latency: row.latency,
      temperature: row.temperature,
      batteryLevel: row.battery_level,
      timestamp: this.parseDate(row.timestamp)
    };
  }

  // ============================================
  // ML MODEL OPERATIONS
  // ============================================

  async getMlModels(modelType?: string): Promise<MlModel[]> {
    let query = 'SELECT * FROM ml_models';
    const params: any[] = [];
    if (modelType) {
      query += ' WHERE model_type = ?';
      params.push(modelType);
    }
    const rows = this.db.prepare(query).all(...params) as any[];
    return rows.map(row => this.mapMlModel(row));
  }

  async getActiveMlModel(modelType: string): Promise<MlModel | undefined> {
    const row = this.db.prepare(`
      SELECT * FROM ml_models WHERE model_type = ? AND is_active = 1 LIMIT 1
    `).get(modelType) as any;
    return row ? this.mapMlModel(row) : undefined;
  }

  async createMlModel(model: InsertMlModel): Promise<MlModel> {
    const result = this.db.prepare(`
      INSERT INTO ml_models (model_type, version, training_data, accuracy, is_active, last_trained_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      model.modelType,
      model.version,
      model.trainingData ?? null,
      model.accuracy ?? null,
      model.isActive ? 1 : 0,
      new Date().toISOString()
    );

    const row = this.db.prepare('SELECT * FROM ml_models WHERE id = ?').get(result.lastInsertRowid) as any;
    return this.mapMlModel(row);
  }

  async updateMlModel(id: number, updates: Partial<InsertMlModel>): Promise<MlModel | undefined> {
    const model = this.db.prepare('SELECT * FROM ml_models WHERE id = ?').get(id) as any;
    if (!model) return undefined;

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.version !== undefined) {
      fields.push('version = ?');
      values.push(updates.version);
      fields.push('last_trained_at = ?');
      values.push(new Date().toISOString());
    }
    if (updates.trainingData !== undefined) { fields.push('training_data = ?'); values.push(updates.trainingData); }
    if (updates.accuracy !== undefined) { fields.push('accuracy = ?'); values.push(updates.accuracy); }
    if (updates.isActive !== undefined) { fields.push('is_active = ?'); values.push(updates.isActive ? 1 : 0); }

    if (fields.length === 0) return this.mapMlModel(model);

    values.push(id);
    this.db.prepare(`UPDATE ml_models SET ${fields.join(', ')} WHERE id = ?`).run(...values);

    const updatedRow = this.db.prepare('SELECT * FROM ml_models WHERE id = ?').get(id) as any;
    return this.mapMlModel(updatedRow);
  }

  async setActiveModel(id: number, modelType: string): Promise<boolean> {
    // Deactivate all models of this type
    this.db.prepare('UPDATE ml_models SET is_active = 0 WHERE model_type = ?').run(modelType);
    // Activate the specified model
    const result = this.db.prepare('UPDATE ml_models SET is_active = 1 WHERE id = ? AND model_type = ?').run(id, modelType);
    return result.changes > 0;
  }

  private mapMlModel(row: any): MlModel {
    return {
      id: row.id,
      modelType: row.model_type,
      version: row.version,
      trainingData: row.training_data,
      accuracy: row.accuracy,
      isActive: this.toBoolean(row.is_active),
      createdAt: this.parseDate(row.created_at),
      lastTrainedAt: this.parseDate(row.last_trained_at)
    };
  }

  // ============================================
  // PLATFORM INTEGRATION OPERATIONS
  // ============================================

  async getPlatformIntegrations(): Promise<PlatformIntegration[]> {
    const rows = this.db.prepare('SELECT * FROM platform_integrations WHERE is_active = 1').all() as any[];
    return rows.map(row => this.mapPlatformIntegration(row));
  }

  async getAllPlatformIntegrations(): Promise<PlatformIntegration[]> {
    const rows = this.db.prepare('SELECT * FROM platform_integrations').all() as any[];
    return rows.map(row => this.mapPlatformIntegration(row));
  }

  async getPlatformIntegration(platform: string): Promise<PlatformIntegration | undefined> {
    const row = this.db.prepare('SELECT * FROM platform_integrations WHERE platform = ?').get(platform) as any;
    return row ? this.mapPlatformIntegration(row) : undefined;
  }

  async createPlatformIntegration(integration: InsertPlatformIntegration): Promise<PlatformIntegration> {
    const result = this.db.prepare(`
      INSERT INTO platform_integrations (platform, user_id, access_token, refresh_token, token_expiry, bridge_ip, platform_user_id, is_active, config)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      integration.platform,
      integration.userId,
      integration.accessToken,
      integration.refreshToken ?? null,
      integration.tokenExpiry ? new Date(integration.tokenExpiry).toISOString() : null,
      integration.bridgeIp ?? null,
      integration.platformUserId ?? null,
      integration.isActive !== false ? 1 : 0,
      integration.config ? JSON.stringify(integration.config) : null
    );

    const row = this.db.prepare('SELECT * FROM platform_integrations WHERE id = ?').get(result.lastInsertRowid) as any;
    return this.mapPlatformIntegration(row);
  }

  async addPlatformIntegration(integration: InsertPlatformIntegration): Promise<PlatformIntegration> {
    return this.createPlatformIntegration(integration);
  }

  async updatePlatformIntegration(id: number, updates: Partial<InsertPlatformIntegration>): Promise<PlatformIntegration | undefined> {
    const integration = this.db.prepare('SELECT * FROM platform_integrations WHERE id = ?').get(id) as any;
    if (!integration) return undefined;

    const fields: string[] = ['last_sync = ?'];
    const values: any[] = [new Date().toISOString()];

    if (updates.accessToken !== undefined) { fields.push('access_token = ?'); values.push(updates.accessToken); }
    if (updates.refreshToken !== undefined) { fields.push('refresh_token = ?'); values.push(updates.refreshToken); }
    if (updates.tokenExpiry !== undefined) { fields.push('token_expiry = ?'); values.push(new Date(updates.tokenExpiry).toISOString()); }
    if (updates.isActive !== undefined) { fields.push('is_active = ?'); values.push(updates.isActive ? 1 : 0); }
    if (updates.config !== undefined) { fields.push('config = ?'); values.push(JSON.stringify(updates.config)); }

    values.push(id);
    this.db.prepare(`UPDATE platform_integrations SET ${fields.join(', ')} WHERE id = ?`).run(...values);

    const updatedRow = this.db.prepare('SELECT * FROM platform_integrations WHERE id = ?').get(id) as any;
    return this.mapPlatformIntegration(updatedRow);
  }

  async removePlatformIntegration(platform: string): Promise<boolean> {
    const integration = await this.getPlatformIntegration(platform);
    if (!integration) return false;

    // Delete associated platform devices
    this.db.prepare('DELETE FROM platform_devices WHERE integration_id = ?').run(integration.id);
    // Delete the integration
    const result = this.db.prepare('DELETE FROM platform_integrations WHERE platform = ?').run(platform);
    return result.changes > 0;
  }

  private mapPlatformIntegration(row: any): PlatformIntegration {
    return {
      id: row.id,
      platform: row.platform,
      userId: row.user_id,
      accessToken: row.access_token,
      refreshToken: row.refresh_token,
      tokenExpiry: this.parseDate(row.token_expiry),
      bridgeIp: row.bridge_ip,
      platformUserId: row.platform_user_id,
      isActive: this.toBoolean(row.is_active),
      lastSync: this.parseDate(row.last_sync),
      config: this.parseJson(row.config)
    };
  }

  // ============================================
  // PLATFORM DEVICE OPERATIONS
  // ============================================

  async getPlatformDevices(integrationId?: number): Promise<PlatformDevice[]> {
    let query = 'SELECT * FROM platform_devices';
    const params: any[] = [];
    if (integrationId) {
      query += ' WHERE integration_id = ?';
      params.push(integrationId);
    }
    const rows = this.db.prepare(query).all(...params) as any[];
    return rows.map(row => this.mapPlatformDevice(row));
  }

  async addPlatformDevice(device: InsertPlatformDevice): Promise<PlatformDevice> {
    const result = this.db.prepare(`
      INSERT INTO platform_devices (integration_id, device_id, platform_device_id, device_name, device_type, capabilities, state, is_controllable)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      device.integrationId ?? null,
      device.deviceId ?? null,
      device.platformDeviceId,
      device.deviceName,
      device.deviceType,
      device.capabilities ? JSON.stringify(device.capabilities) : null,
      device.state ? JSON.stringify(device.state) : null,
      device.isControllable !== false ? 1 : 0
    );

    const row = this.db.prepare('SELECT * FROM platform_devices WHERE id = ?').get(result.lastInsertRowid) as any;
    return this.mapPlatformDevice(row);
  }

  async updatePlatformDevice(id: number, updates: Partial<InsertPlatformDevice>): Promise<PlatformDevice | undefined> {
    const device = this.db.prepare('SELECT * FROM platform_devices WHERE id = ?').get(id) as any;
    if (!device) return undefined;

    const fields: string[] = ['last_updated = ?'];
    const values: any[] = [new Date().toISOString()];

    if (updates.deviceName !== undefined) { fields.push('device_name = ?'); values.push(updates.deviceName); }
    if (updates.state !== undefined) { fields.push('state = ?'); values.push(JSON.stringify(updates.state)); }
    if (updates.capabilities !== undefined) { fields.push('capabilities = ?'); values.push(JSON.stringify(updates.capabilities)); }

    values.push(id);
    this.db.prepare(`UPDATE platform_devices SET ${fields.join(', ')} WHERE id = ?`).run(...values);

    const updatedRow = this.db.prepare('SELECT * FROM platform_devices WHERE id = ?').get(id) as any;
    return this.mapPlatformDevice(updatedRow);
  }

  private mapPlatformDevice(row: any): PlatformDevice {
    return {
      id: row.id,
      integrationId: row.integration_id,
      deviceId: row.device_id,
      platformDeviceId: row.platform_device_id,
      deviceName: row.device_name,
      deviceType: row.device_type,
      capabilities: this.parseJson(row.capabilities),
      state: this.parseJson(row.state),
      lastUpdated: this.parseDate(row.last_updated),
      isControllable: this.toBoolean(row.is_controllable)
    };
  }

  // ============================================
  // PREDICTIVE ALERT OPERATIONS
  // ============================================

  async getPredictiveAlerts(deviceId?: number): Promise<PredictiveAlert[]> {
    let query = 'SELECT * FROM predictive_alerts ORDER BY created_at DESC';
    const params: any[] = [];
    if (deviceId) {
      query = 'SELECT * FROM predictive_alerts WHERE device_id = ? ORDER BY created_at DESC';
      params.push(deviceId);
    }
    const rows = this.db.prepare(query).all(...params) as any[];
    return rows.map(row => this.mapPredictiveAlert(row));
  }

  async createPredictiveAlert(alert: InsertPredictiveAlert): Promise<PredictiveAlert> {
    const result = this.db.prepare(`
      INSERT INTO predictive_alerts (device_id, alert_type, severity, prediction, probability_score, recommended_action, is_resolved)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      alert.deviceId ?? null,
      alert.alertType,
      alert.severity,
      alert.prediction,
      alert.probabilityScore,
      alert.recommendedAction ?? null,
      alert.isResolved ? 1 : 0
    );

    const row = this.db.prepare('SELECT * FROM predictive_alerts WHERE id = ?').get(result.lastInsertRowid) as any;
    return this.mapPredictiveAlert(row);
  }

  async resolvePredictiveAlert(id: number): Promise<boolean> {
    const result = this.db.prepare('UPDATE predictive_alerts SET is_resolved = 1 WHERE id = ?').run(id);
    return result.changes > 0;
  }

  private mapPredictiveAlert(row: any): PredictiveAlert {
    return {
      id: row.id,
      deviceId: row.device_id,
      alertType: row.alert_type,
      severity: row.severity,
      prediction: row.prediction,
      probabilityScore: row.probability_score,
      recommendedAction: row.recommended_action,
      isResolved: this.toBoolean(row.is_resolved),
      createdAt: this.parseDate(row.created_at)
    };
  }

  // ============================================
  // FUSION RESULT OPERATIONS
  // ============================================

  async getFusionResults(): Promise<FusionResult[]> {
    const rows = this.db.prepare('SELECT * FROM fusion_results ORDER BY timestamp DESC').all() as any[];
    return rows.map(row => this.mapFusionResult(row));
  }

  async createFusionResult(result: InsertFusionResult): Promise<FusionResult> {
    const insertResult = this.db.prepare(`
      INSERT INTO fusion_results (room, confidence_score, alert_type, metadata)
      VALUES (?, ?, ?, ?)
    `).run(
      result.room,
      result.confidenceScore,
      result.alertType,
      result.metadata ? JSON.stringify(result.metadata) : null
    );

    const row = this.db.prepare('SELECT * FROM fusion_results WHERE id = ?').get(insertResult.lastInsertRowid) as any;
    return this.mapFusionResult(row);
  }

  private mapFusionResult(row: any): FusionResult {
    return {
      id: row.id,
      room: row.room,
      confidenceScore: row.confidence_score,
      alertType: row.alert_type,
      timestamp: this.parseDate(row.timestamp),
      metadata: this.parseJson(row.metadata)
    };
  }

  // ============================================
  // RESIDENT OPERATIONS
  // ============================================

  async getResidents(): Promise<Resident[]> {
    const rows = this.db.prepare('SELECT * FROM residents WHERE is_active = 1').all() as any[];
    return rows.map(row => this.mapResident(row));
  }

  async getResident(id: number): Promise<Resident | undefined> {
    const row = this.db.prepare('SELECT * FROM residents WHERE id = ?').get(id) as any;
    return row ? this.mapResident(row) : undefined;
  }

  async createResident(resident: InsertResident): Promise<Resident> {
    const result = this.db.prepare(`
      INSERT INTO residents (name, email, phone, pin, role, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      resident.name,
      resident.email ?? null,
      resident.phone ?? null,
      resident.pin ?? null,
      resident.role ?? 'resident',
      resident.isActive !== false ? 1 : 0
    );

    return (await this.getResident(result.lastInsertRowid as number))!;
  }

  async updateResident(id: number, updates: Partial<InsertResident>): Promise<Resident | undefined> {
    const resident = await this.getResident(id);
    if (!resident) return undefined;

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.email !== undefined) { fields.push('email = ?'); values.push(updates.email); }
    if (updates.phone !== undefined) { fields.push('phone = ?'); values.push(updates.phone); }
    if (updates.pin !== undefined) { fields.push('pin = ?'); values.push(updates.pin); }
    if (updates.role !== undefined) { fields.push('role = ?'); values.push(updates.role); }
    if (updates.isActive !== undefined) { fields.push('is_active = ?'); values.push(updates.isActive ? 1 : 0); }

    if (fields.length === 0) return resident;

    values.push(id);
    this.db.prepare(`UPDATE residents SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return this.getResident(id);
  }

  async deleteResident(id: number): Promise<boolean> {
    const result = this.db.prepare('UPDATE residents SET is_active = 0 WHERE id = ?').run(id);
    return result.changes > 0;
  }

  private mapResident(row: any): Resident {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      pin: row.pin,
      role: row.role,
      isActive: this.toBoolean(row.is_active),
      createdAt: this.parseDate(row.created_at),
      lastSeen: this.parseDate(row.last_seen)
    };
  }

  // ============================================
  // RESIDENT DEVICE OPERATIONS
  // ============================================

  async getResidentDevices(residentId?: number): Promise<ResidentDevice[]> {
    let query = 'SELECT * FROM resident_devices WHERE is_active = 1';
    const params: any[] = [];
    if (residentId) {
      query += ' AND resident_id = ?';
      params.push(residentId);
    }
    const rows = this.db.prepare(query).all(...params) as any[];
    return rows.map(row => this.mapResidentDevice(row));
  }

  async getResidentDeviceByMac(macAddress: string): Promise<ResidentDevice | undefined> {
    const row = this.db.prepare('SELECT * FROM resident_devices WHERE mac_address = ? AND is_active = 1').get(macAddress) as any;
    return row ? this.mapResidentDevice(row) : undefined;
  }

  async createResidentDevice(device: InsertResidentDevice): Promise<ResidentDevice> {
    const result = this.db.prepare(`
      INSERT INTO resident_devices (resident_id, device_id, mac_address, device_name, device_type, is_primary, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      device.residentId ?? null,
      device.deviceId ?? null,
      device.macAddress,
      device.deviceName,
      device.deviceType,
      device.isPrimary ? 1 : 0,
      device.isActive !== false ? 1 : 0
    );

    const row = this.db.prepare('SELECT * FROM resident_devices WHERE id = ?').get(result.lastInsertRowid) as any;
    return this.mapResidentDevice(row);
  }

  async updateResidentDevice(id: number, updates: Partial<InsertResidentDevice>): Promise<ResidentDevice | undefined> {
    const device = this.db.prepare('SELECT * FROM resident_devices WHERE id = ?').get(id) as any;
    if (!device) return undefined;

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.deviceName !== undefined) { fields.push('device_name = ?'); values.push(updates.deviceName); }
    if (updates.deviceType !== undefined) { fields.push('device_type = ?'); values.push(updates.deviceType); }
    if (updates.isPrimary !== undefined) { fields.push('is_primary = ?'); values.push(updates.isPrimary ? 1 : 0); }
    if (updates.isActive !== undefined) { fields.push('is_active = ?'); values.push(updates.isActive ? 1 : 0); }

    if (fields.length === 0) return this.mapResidentDevice(device);

    values.push(id);
    this.db.prepare(`UPDATE resident_devices SET ${fields.join(', ')} WHERE id = ?`).run(...values);

    const updatedRow = this.db.prepare('SELECT * FROM resident_devices WHERE id = ?').get(id) as any;
    return this.mapResidentDevice(updatedRow);
  }

  async deleteResidentDevice(id: number): Promise<boolean> {
    const result = this.db.prepare('UPDATE resident_devices SET is_active = 0 WHERE id = ?').run(id);
    return result.changes > 0;
  }

  private mapResidentDevice(row: any): ResidentDevice {
    return {
      id: row.id,
      residentId: row.resident_id,
      deviceId: row.device_id,
      macAddress: row.mac_address,
      deviceName: row.device_name,
      deviceType: row.device_type,
      isPrimary: this.toBoolean(row.is_primary),
      isActive: this.toBoolean(row.is_active),
      createdAt: this.parseDate(row.created_at)
    };
  }

  // ============================================
  // SECURITY SETTINGS OPERATIONS
  // ============================================

  async getSecuritySettings(): Promise<SecuritySettings | undefined> {
    const row = this.db.prepare('SELECT * FROM security_settings LIMIT 1').get() as any;
    return row ? this.mapSecuritySettings(row) : undefined;
  }

  async updateSecuritySettings(updates: Partial<InsertSecuritySettings>): Promise<SecuritySettings> {
    let settings = await this.getSecuritySettings();

    if (!settings) {
      // Create default settings if none exist
      this.db.prepare(`
        INSERT INTO security_settings (security_mode, auto_arm_enabled, auto_arm_delay, entry_delay, exit_delay, silent_alarm)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run('disarmed', 0, 300, 30, 60, 0);
      settings = await this.getSecuritySettings();
    }

    const fields: string[] = ['updated_at = ?'];
    const values: any[] = [new Date().toISOString()];

    if (updates.securityMode !== undefined) {
      fields.push('security_mode = ?');
      values.push(updates.securityMode);
      fields.push('last_mode_change = ?');
      values.push(new Date().toISOString());
    }
    if (updates.autoArmEnabled !== undefined) { fields.push('auto_arm_enabled = ?'); values.push(updates.autoArmEnabled ? 1 : 0); }
    if (updates.autoArmDelay !== undefined) { fields.push('auto_arm_delay = ?'); values.push(updates.autoArmDelay); }
    if (updates.entryDelay !== undefined) { fields.push('entry_delay = ?'); values.push(updates.entryDelay); }
    if (updates.exitDelay !== undefined) { fields.push('exit_delay = ?'); values.push(updates.exitDelay); }
    if (updates.silentAlarm !== undefined) { fields.push('silent_alarm = ?'); values.push(updates.silentAlarm ? 1 : 0); }
    if (updates.changedBy !== undefined) { fields.push('changed_by = ?'); values.push(updates.changedBy); }

    values.push(settings!.id);
    this.db.prepare(`UPDATE security_settings SET ${fields.join(', ')} WHERE id = ?`).run(...values);

    return (await this.getSecuritySettings())!;
  }

  private mapSecuritySettings(row: any): SecuritySettings {
    return {
      id: row.id,
      securityMode: row.security_mode,
      autoArmEnabled: this.toBoolean(row.auto_arm_enabled),
      autoArmDelay: row.auto_arm_delay,
      entryDelay: row.entry_delay,
      exitDelay: row.exit_delay,
      silentAlarm: this.toBoolean(row.silent_alarm),
      lastModeChange: this.parseDate(row.last_mode_change),
      changedBy: row.changed_by,
      updatedAt: this.parseDate(row.updated_at)
    };
  }

  // ============================================
  // SECURITY EVENT OPERATIONS
  // ============================================

  async getSecurityEvents(limit = 100): Promise<SecurityEvent[]> {
    const rows = this.db.prepare(`
      SELECT * FROM security_events ORDER BY created_at DESC LIMIT ?
    `).all(limit) as any[];
    return rows.map(row => this.mapSecurityEvent(row));
  }

  async getUnacknowledgedEvents(): Promise<SecurityEvent[]> {
    const rows = this.db.prepare(`
      SELECT * FROM security_events WHERE is_acknowledged = 0 ORDER BY created_at DESC
    `).all() as any[];
    return rows.map(row => this.mapSecurityEvent(row));
  }

  async createSecurityEvent(event: InsertSecurityEvent): Promise<SecurityEvent> {
    const result = this.db.prepare(`
      INSERT INTO security_events (event_type, severity, description, device_id, resident_id, room_id, metadata, is_acknowledged)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      event.eventType,
      event.severity,
      event.description,
      event.deviceId ?? null,
      event.residentId ?? null,
      event.roomId ?? null,
      event.metadata ? JSON.stringify(event.metadata) : null,
      event.isAcknowledged ? 1 : 0
    );

    const row = this.db.prepare('SELECT * FROM security_events WHERE id = ?').get(result.lastInsertRowid) as any;
    return this.mapSecurityEvent(row);
  }

  async acknowledgeSecurityEvent(id: number, acknowledgedBy: number): Promise<boolean> {
    const result = this.db.prepare(`
      UPDATE security_events SET is_acknowledged = 1, acknowledged_by = ?, acknowledged_at = ? WHERE id = ?
    `).run(acknowledgedBy, new Date().toISOString(), id);
    return result.changes > 0;
  }

  private mapSecurityEvent(row: any): SecurityEvent {
    return {
      id: row.id,
      eventType: row.event_type,
      severity: row.severity,
      description: row.description,
      deviceId: row.device_id,
      residentId: row.resident_id,
      roomId: row.room_id,
      metadata: this.parseJson(row.metadata),
      isAcknowledged: this.toBoolean(row.is_acknowledged),
      acknowledgedBy: row.acknowledged_by,
      acknowledgedAt: this.parseDate(row.acknowledged_at),
      createdAt: this.parseDate(row.created_at)
    };
  }

  // ============================================
  // NOTIFICATION CHANNEL OPERATIONS
  // ============================================

  async getNotificationChannels(residentId?: number): Promise<NotificationChannel[]> {
    let query = 'SELECT * FROM notification_channels';
    const params: any[] = [];
    if (residentId) {
      query += ' WHERE resident_id = ?';
      params.push(residentId);
    }
    const rows = this.db.prepare(query).all(...params) as any[];
    return rows.map(row => this.mapNotificationChannel(row));
  }

  async createNotificationChannel(channel: InsertNotificationChannel): Promise<NotificationChannel> {
    const result = this.db.prepare(`
      INSERT INTO notification_channels (resident_id, channel_type, destination, is_enabled, notify_on_intrusion, notify_on_mode_change, notify_on_device_offline, notify_on_resident_activity)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      channel.residentId ?? null,
      channel.channelType,
      channel.destination,
      channel.isEnabled !== false ? 1 : 0,
      channel.notifyOnIntrusion !== false ? 1 : 0,
      channel.notifyOnModeChange ? 1 : 0,
      channel.notifyOnDeviceOffline ? 1 : 0,
      channel.notifyOnResidentActivity ? 1 : 0
    );

    const row = this.db.prepare('SELECT * FROM notification_channels WHERE id = ?').get(result.lastInsertRowid) as any;
    return this.mapNotificationChannel(row);
  }

  async updateNotificationChannel(id: number, updates: Partial<InsertNotificationChannel>): Promise<NotificationChannel | undefined> {
    const channel = this.db.prepare('SELECT * FROM notification_channels WHERE id = ?').get(id) as any;
    if (!channel) return undefined;

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.destination !== undefined) { fields.push('destination = ?'); values.push(updates.destination); }
    if (updates.isEnabled !== undefined) { fields.push('is_enabled = ?'); values.push(updates.isEnabled ? 1 : 0); }
    if (updates.notifyOnIntrusion !== undefined) { fields.push('notify_on_intrusion = ?'); values.push(updates.notifyOnIntrusion ? 1 : 0); }
    if (updates.notifyOnModeChange !== undefined) { fields.push('notify_on_mode_change = ?'); values.push(updates.notifyOnModeChange ? 1 : 0); }
    if (updates.notifyOnDeviceOffline !== undefined) { fields.push('notify_on_device_offline = ?'); values.push(updates.notifyOnDeviceOffline ? 1 : 0); }
    if (updates.notifyOnResidentActivity !== undefined) { fields.push('notify_on_resident_activity = ?'); values.push(updates.notifyOnResidentActivity ? 1 : 0); }

    if (fields.length === 0) return this.mapNotificationChannel(channel);

    values.push(id);
    this.db.prepare(`UPDATE notification_channels SET ${fields.join(', ')} WHERE id = ?`).run(...values);

    const updatedRow = this.db.prepare('SELECT * FROM notification_channels WHERE id = ?').get(id) as any;
    return this.mapNotificationChannel(updatedRow);
  }

  async deleteNotificationChannel(id: number): Promise<boolean> {
    const result = this.db.prepare('DELETE FROM notification_channels WHERE id = ?').run(id);
    return result.changes > 0;
  }

  private mapNotificationChannel(row: any): NotificationChannel {
    return {
      id: row.id,
      residentId: row.resident_id,
      channelType: row.channel_type,
      destination: row.destination,
      isEnabled: this.toBoolean(row.is_enabled),
      notifyOnIntrusion: this.toBoolean(row.notify_on_intrusion),
      notifyOnModeChange: this.toBoolean(row.notify_on_mode_change),
      notifyOnDeviceOffline: this.toBoolean(row.notify_on_device_offline),
      notifyOnResidentActivity: this.toBoolean(row.notify_on_resident_activity),
      createdAt: this.parseDate(row.created_at)
    };
  }

  // ============================================
  // PRESENCE HISTORY OPERATIONS
  // ============================================

  async getPresenceHistory(residentId?: number, limit = 100): Promise<PresenceHistory[]> {
    let query = 'SELECT * FROM presence_history';
    const params: any[] = [];
    if (residentId) {
      query += ' WHERE resident_id = ?';
      params.push(residentId);
    }
    query += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(limit);

    const rows = this.db.prepare(query).all(...params) as any[];
    return rows.map(row => this.mapPresenceHistory(row));
  }

  async createPresenceHistory(entry: InsertPresenceHistory): Promise<PresenceHistory> {
    const result = this.db.prepare(`
      INSERT INTO presence_history (resident_id, event_type, detected_via, device_id)
      VALUES (?, ?, ?, ?)
    `).run(
      entry.residentId ?? null,
      entry.eventType,
      entry.detectedVia ?? null,
      entry.deviceId ?? null
    );

    // Update resident's lastSeen
    if (entry.residentId) {
      this.db.prepare('UPDATE residents SET last_seen = ? WHERE id = ?')
        .run(new Date().toISOString(), entry.residentId);
    }

    const row = this.db.prepare('SELECT * FROM presence_history WHERE id = ?').get(result.lastInsertRowid) as any;
    return this.mapPresenceHistory(row);
  }

  async getResidentsAtHome(): Promise<Resident[]> {
    // Get residents whose last presence event was 'arrived'
    const rows = this.db.prepare(`
      SELECT r.* FROM residents r
      WHERE r.is_active = 1
      AND EXISTS (
        SELECT 1 FROM presence_history ph
        WHERE ph.resident_id = r.id
        AND ph.event_type = 'arrived'
        AND ph.id = (
          SELECT MAX(ph2.id) FROM presence_history ph2 WHERE ph2.resident_id = r.id
        )
      )
    `).all() as any[];
    return rows.map(row => this.mapResident(row));
  }

  private mapPresenceHistory(row: any): PresenceHistory {
    return {
      id: row.id,
      residentId: row.resident_id,
      eventType: row.event_type,
      detectedVia: row.detected_via,
      deviceId: row.device_id,
      timestamp: this.parseDate(row.timestamp)
    };
  }

  // ============================================
  // DATABASE MAINTENANCE
  // ============================================

  close(): void {
    this.db.close();
    console.log('[SQLiteStorage] Database closed');
  }

  backup(backupPath: string): void {
    this.db.backup(backupPath);
    console.log(`[SQLiteStorage] Database backed up to: ${backupPath}`);
  }
}
