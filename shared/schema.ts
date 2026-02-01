import { pgTable, text, serial, integer, boolean, real, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const devices = pgTable("devices", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  macAddress: text("mac_address").notNull().unique(),
  deviceType: text("device_type").notNull(), // "smart_tv", "hue_bridge", "thermostat", etc.
  protocol: text("protocol").notNull(), // "wifi", "zigbee", "bluetooth"
  rssi: real("rssi").notNull(),
  x: real("x"),
  y: real("y"),
  isOnline: boolean("is_online").default(true),
  lastSeen: timestamp("last_seen").defaultNow(),
  telemetryData: jsonb("telemetry_data"), // Additional sensor data
});

export const floorplans = pgTable("floorplans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  scale: text("scale").default("1:200"),
  width: real("width").notNull(),
  height: real("height").notNull(),
  data: jsonb("data").notNull(), // SVG path data or room boundaries
  imageUrl: text("image_url"), // For uploaded blueprints
  sketchElements: text("sketch_elements"), // JSON string of drawing elements
});

export const anomalies = pgTable("anomalies", {
  id: serial("id").primaryKey(),
  deviceId: integer("device_id").references(() => devices.id),
  type: text("type").notNull(), // "signal_drop", "offline", "unusual_pattern"
  severity: text("severity").notNull(), // "low", "medium", "high"
  description: text("description").notNull(),
  detected: timestamp("detected").defaultNow(),
  resolved: boolean("resolved").default(false),
});

export const recommendations = pgTable("recommendations", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // "wifi_extender", "device_relocation", "new_device"
  description: text("description").notNull(),
  x: real("x"),
  y: real("y"),
  priority: integer("priority").default(1),
  applied: boolean("applied").default(false),
  improvementScore: real("improvement_score"), // Expected coverage improvement percentage
});

export const platformIntegrations = pgTable("platform_integrations", {
  id: serial("id").primaryKey(),
  platform: text("platform").notNull(), // "philips_hue", "nest", "alexa"
  userId: text("user_id").notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  tokenExpiry: timestamp("token_expiry"),
  bridgeIp: text("bridge_ip"), // For Philips Hue local bridge
  platformUserId: text("platform_user_id"), // Platform-specific user ID
  isActive: boolean("is_active").default(true),
  lastSync: timestamp("last_sync").defaultNow(),
  config: jsonb("config"), // Platform-specific configuration
});

export const platformDevices = pgTable("platform_devices", {
  id: serial("id").primaryKey(),
  integrationId: integer("integration_id").references(() => platformIntegrations.id),
  deviceId: integer("device_id").references(() => devices.id),
  platformDeviceId: text("platform_device_id").notNull(),
  deviceName: text("device_name").notNull(),
  deviceType: text("device_type").notNull(), // "light", "thermostat", "speaker", "sensor"
  capabilities: jsonb("capabilities"), // Device-specific capabilities
  state: jsonb("state"), // Current device state
  lastUpdated: timestamp("last_updated").defaultNow(),
  isControllable: boolean("is_controllable").default(true),
});

export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  floorplanId: integer("floorplan_id").references(() => floorplans.id),
  name: text("name").notNull(),
  boundaries: text("boundaries").notNull(), // JSON string of boundary coordinates
  roomType: text("room_type").notNull(), // living_room, bedroom, kitchen, etc.
  detectedAutomatically: boolean("detected_automatically").default(false),
  createdAt: timestamp("created_at").defaultNow()
});

export const deviceTelemetry = pgTable("device_telemetry", {
  id: serial("id").primaryKey(),
  deviceId: integer("device_id").references(() => devices.id),
  rssi: integer("rssi").notNull(),
  signalQuality: integer("signal_quality"),
  packetLoss: real("packet_loss").default(0),
  latency: integer("latency"),
  temperature: real("temperature"),
  batteryLevel: integer("battery_level"),
  timestamp: timestamp("timestamp").defaultNow()
});

export const mlModels = pgTable("ml_models", {
  id: serial("id").primaryKey(),
  modelType: text("model_type").notNull(), // fingerprinting, anomaly_detection, predictive_maintenance
  version: text("version").notNull(),
  trainingData: text("training_data"), // JSON metadata about training
  accuracy: real("accuracy"),
  isActive: boolean("is_active").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  lastTrainedAt: timestamp("last_trained_at")
});

// Removed duplicate - using the one above with more complete schema

export const predictiveAlerts = pgTable("predictive_alerts", {
  id: serial("id").primaryKey(),
  deviceId: integer("device_id").references(() => devices.id),
  alertType: text("alert_type").notNull(), // failure_prediction, maintenance_due, performance_degradation
  severity: text("severity").notNull(), // low, medium, high, critical
  prediction: text("prediction").notNull(), // JSON with prediction details
  probabilityScore: real("probability_score").notNull(),
  recommendedAction: text("recommended_action"),
  isResolved: boolean("is_resolved").default(false),
  createdAt: timestamp("created_at").defaultNow()
});

export const fusionResults = pgTable("fusion_results", {
  id: serial("id").primaryKey(),
  room: text("room").notNull(),
  confidenceScore: real("confidence_score").notNull(),
  alertType: text("alert_type").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  metadata: jsonb("metadata") // Additional fusion data
});

// ============================================
// SECURITY SYSTEM TABLES
// ============================================

// Authorized residents who live in the home
export const residents = pgTable("residents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  pin: text("pin"), // Optional PIN for arming/disarming
  role: text("role").notNull().default("resident"), // "owner", "resident", "guest"
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  lastSeen: timestamp("last_seen"),
});

// Devices associated with each resident (phones, wearables, etc.)
export const residentDevices = pgTable("resident_devices", {
  id: serial("id").primaryKey(),
  residentId: integer("resident_id").references(() => residents.id),
  deviceId: integer("device_id").references(() => devices.id),
  macAddress: text("mac_address").notNull(),
  deviceName: text("device_name").notNull(),
  deviceType: text("device_type").notNull(), // "phone", "watch", "laptop", etc.
  isPrimary: boolean("is_primary").default(false), // Primary device for presence detection
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Security system settings
export const securitySettings = pgTable("security_settings", {
  id: serial("id").primaryKey(),
  securityMode: text("security_mode").notNull().default("disarmed"), // "disarmed", "armed_home", "armed_away", "armed_night"
  autoArmEnabled: boolean("auto_arm_enabled").default(false),
  autoArmDelay: integer("auto_arm_delay").default(300), // Seconds to wait before auto-arming
  entryDelay: integer("entry_delay").default(30), // Seconds before triggering alarm on entry
  exitDelay: integer("exit_delay").default(60), // Seconds to exit after arming
  silentAlarm: boolean("silent_alarm").default(false),
  lastModeChange: timestamp("last_mode_change").defaultNow(),
  changedBy: integer("changed_by").references(() => residents.id),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Security events log (intrusions, mode changes, alerts)
export const securityEvents = pgTable("security_events", {
  id: serial("id").primaryKey(),
  eventType: text("event_type").notNull(), // "intrusion_detected", "mode_change", "resident_arrived", "resident_left", "unknown_device", "alarm_triggered"
  severity: text("severity").notNull(), // "info", "warning", "alert", "critical"
  description: text("description").notNull(),
  deviceId: integer("device_id").references(() => devices.id),
  residentId: integer("resident_id").references(() => residents.id),
  roomId: integer("room_id").references(() => rooms.id),
  metadata: jsonb("metadata"), // Additional event data
  isAcknowledged: boolean("is_acknowledged").default(false),
  acknowledgedBy: integer("acknowledged_by").references(() => residents.id),
  acknowledgedAt: timestamp("acknowledged_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Notification channels configuration
export const notificationChannels = pgTable("notification_channels", {
  id: serial("id").primaryKey(),
  residentId: integer("resident_id").references(() => residents.id),
  channelType: text("channel_type").notNull(), // "email", "sms", "push", "webhook"
  destination: text("destination").notNull(), // email address, phone number, webhook URL
  isEnabled: boolean("is_enabled").default(true),
  notifyOnIntrusion: boolean("notify_on_intrusion").default(true),
  notifyOnModeChange: boolean("notify_on_mode_change").default(false),
  notifyOnDeviceOffline: boolean("notify_on_device_offline").default(false),
  notifyOnResidentActivity: boolean("notify_on_resident_activity").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Presence history for tracking who was home when
export const presenceHistory = pgTable("presence_history", {
  id: serial("id").primaryKey(),
  residentId: integer("resident_id").references(() => residents.id),
  eventType: text("event_type").notNull(), // "arrived", "left"
  detectedVia: text("detected_via"), // "device_connected", "manual", "geofence"
  deviceId: integer("device_id").references(() => devices.id),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Platform integration schemas moved to end to avoid conflicts

export const insertDeviceSchema = createInsertSchema(devices).omit({
  id: true,
  lastSeen: true,
});

export const insertFloorplanSchema = createInsertSchema(floorplans).omit({
  id: true,
});

export const insertAnomalySchema = createInsertSchema(anomalies).omit({
  id: true,
  detected: true,
});

export const insertRecommendationSchema = createInsertSchema(recommendations).omit({
  id: true,
});

export const insertRoomSchema = createInsertSchema(rooms).omit({
  id: true,
  createdAt: true,
});

export const insertDeviceTelemetrySchema = createInsertSchema(deviceTelemetry).omit({
  id: true,
  timestamp: true,
});

export const insertMlModelSchema = createInsertSchema(mlModels).omit({
  id: true,
  createdAt: true,
  lastTrainedAt: true,
});

export const insertPlatformIntegrationSchemaNew = createInsertSchema(platformIntegrations).omit({
  id: true,
  lastSync: true,
});

export const insertPlatformDeviceSchemaNew = createInsertSchema(platformDevices).omit({
  id: true,
  lastUpdated: true,
});

export const insertPredictiveAlertSchema = createInsertSchema(predictiveAlerts).omit({
  id: true,
  createdAt: true,
});

export const insertFusionResultSchema = createInsertSchema(fusionResults).omit({
  id: true,
  timestamp: true,
});

// Security system insert schemas
export const insertResidentSchema = createInsertSchema(residents).omit({
  id: true,
  createdAt: true,
  lastSeen: true,
});

export const insertResidentDeviceSchema = createInsertSchema(residentDevices).omit({
  id: true,
  createdAt: true,
});

export const insertSecuritySettingsSchema = createInsertSchema(securitySettings).omit({
  id: true,
  lastModeChange: true,
  updatedAt: true,
});

export const insertSecurityEventSchema = createInsertSchema(securityEvents).omit({
  id: true,
  createdAt: true,
  acknowledgedAt: true,
});

export const insertNotificationChannelSchema = createInsertSchema(notificationChannels).omit({
  id: true,
  createdAt: true,
});

export const insertPresenceHistorySchema = createInsertSchema(presenceHistory).omit({
  id: true,
  timestamp: true,
});

export type Device = typeof devices.$inferSelect;
export type InsertDevice = z.infer<typeof insertDeviceSchema>;
export type Floorplan = typeof floorplans.$inferSelect;
export type InsertFloorplan = z.infer<typeof insertFloorplanSchema>;
export type Anomaly = typeof anomalies.$inferSelect;
export type InsertAnomaly = z.infer<typeof insertAnomalySchema>;
export type Recommendation = typeof recommendations.$inferSelect;
export type InsertRecommendation = z.infer<typeof insertRecommendationSchema>;
export type Room = typeof rooms.$inferSelect;
export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type DeviceTelemetry = typeof deviceTelemetry.$inferSelect;
export type InsertDeviceTelemetry = z.infer<typeof insertDeviceTelemetrySchema>;
export type MlModel = typeof mlModels.$inferSelect;
export type InsertMlModel = z.infer<typeof insertMlModelSchema>;
export type PlatformIntegration = typeof platformIntegrations.$inferSelect;
export type InsertPlatformIntegration = z.infer<typeof insertPlatformIntegrationSchemaNew>;
export type PlatformDevice = typeof platformDevices.$inferSelect;
export type InsertPlatformDevice = z.infer<typeof insertPlatformDeviceSchemaNew>;
export type PredictiveAlert = typeof predictiveAlerts.$inferSelect;
export type InsertPredictiveAlert = z.infer<typeof insertPredictiveAlertSchema>;
export type FusionResult = typeof fusionResults.$inferSelect;
export type InsertFusionResult = z.infer<typeof insertFusionResultSchema>;

// Security system types
export type Resident = typeof residents.$inferSelect;
export type InsertResident = z.infer<typeof insertResidentSchema>;
export type ResidentDevice = typeof residentDevices.$inferSelect;
export type InsertResidentDevice = z.infer<typeof insertResidentDeviceSchema>;
export type SecuritySettings = typeof securitySettings.$inferSelect;
export type InsertSecuritySettings = z.infer<typeof insertSecuritySettingsSchema>;
export type SecurityEvent = typeof securityEvents.$inferSelect;
export type InsertSecurityEvent = z.infer<typeof insertSecurityEventSchema>;
export type NotificationChannel = typeof notificationChannels.$inferSelect;
export type InsertNotificationChannel = z.infer<typeof insertNotificationChannelSchema>;
export type PresenceHistory = typeof presenceHistory.$inferSelect;
export type InsertPresenceHistory = z.infer<typeof insertPresenceHistorySchema>;
