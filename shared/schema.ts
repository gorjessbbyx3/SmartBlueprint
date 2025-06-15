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

export type Device = typeof devices.$inferSelect;
export type InsertDevice = z.infer<typeof insertDeviceSchema>;
export type Floorplan = typeof floorplans.$inferSelect;
export type InsertFloorplan = z.infer<typeof insertFloorplanSchema>;
export type Anomaly = typeof anomalies.$inferSelect;
export type InsertAnomaly = z.infer<typeof insertAnomalySchema>;
export type Recommendation = typeof recommendations.$inferSelect;
export type InsertRecommendation = z.infer<typeof insertRecommendationSchema>;
