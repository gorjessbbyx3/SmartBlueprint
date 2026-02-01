import { storage } from './storage';
import {
  NotificationChannel,
  SecurityEvent,
  Resident
} from '../shared/schema';
import { IntrusionAlert } from './intrusion-detection';

export interface NotificationPayload {
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  data?: Record<string, any>;
}

export interface NotificationResult {
  channelId: number;
  channelType: string;
  success: boolean;
  error?: string;
  timestamp: Date;
}

export class NotificationService {
  private static instance: NotificationService;
  private webhookTimeout = 10000; // 10 seconds

  static getInstance(): NotificationService {
    if (!this.instance) {
      this.instance = new NotificationService();
    }
    return this.instance;
  }

  // Send notifications for an intrusion alert
  async sendIntrusionAlert(alert: IntrusionAlert): Promise<NotificationResult[]> {
    const channels = await this.getChannelsForIntrusion();

    const payload: NotificationPayload = {
      title: this.getAlertTitle(alert),
      message: alert.description,
      priority: alert.severity === 'critical' ? 'urgent' : alert.severity === 'alert' ? 'high' : 'normal',
      data: {
        alertId: alert.id,
        alertType: alert.alertType,
        deviceId: alert.deviceId,
        timestamp: alert.timestamp.toISOString(),
      },
    };

    return this.sendToChannels(channels, payload);
  }

  // Send notifications for a security event
  async sendSecurityEventNotification(event: SecurityEvent): Promise<NotificationResult[]> {
    const channels = await this.getChannelsForEvent(event);

    const payload: NotificationPayload = {
      title: this.getEventTitle(event),
      message: event.description,
      priority: event.severity === 'critical' ? 'urgent' :
                event.severity === 'alert' ? 'high' : 'normal',
      data: {
        eventId: event.id,
        eventType: event.eventType,
        timestamp: event.createdAt?.toISOString(),
      },
    };

    return this.sendToChannels(channels, payload);
  }

  // Send a custom notification to specific residents
  async sendCustomNotification(
    residentIds: number[],
    payload: NotificationPayload
  ): Promise<NotificationResult[]> {
    const allResults: NotificationResult[] = [];

    for (const residentId of residentIds) {
      const channels = await storage.getNotificationChannels(residentId);
      const enabledChannels = channels.filter(c => c.isEnabled);
      const results = await this.sendToChannels(enabledChannels, payload);
      allResults.push(...results);
    }

    return allResults;
  }

  // Send to all notification channels
  private async sendToChannels(
    channels: NotificationChannel[],
    payload: NotificationPayload
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    for (const channel of channels) {
      try {
        let success = false;

        switch (channel.channelType) {
          case 'email':
            success = await this.sendEmail(channel.destination, payload);
            break;
          case 'sms':
            success = await this.sendSMS(channel.destination, payload);
            break;
          case 'push':
            success = await this.sendPushNotification(channel.destination, payload);
            break;
          case 'webhook':
            success = await this.sendWebhook(channel.destination, payload);
            break;
          default:
            console.warn(`[Notification] Unknown channel type: ${channel.channelType}`);
        }

        results.push({
          channelId: channel.id,
          channelType: channel.channelType,
          success,
          timestamp: new Date(),
        });
      } catch (error) {
        console.error(`[Notification] Error sending to channel ${channel.id}:`, error);
        results.push({
          channelId: channel.id,
          channelType: channel.channelType,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date(),
        });
      }
    }

    return results;
  }

  // Email notification
  private async sendEmail(destination: string, payload: NotificationPayload): Promise<boolean> {
    // In production, integrate with email service (SendGrid, AWS SES, etc.)
    console.log(`[Notification] EMAIL to ${destination}`);
    console.log(`  Subject: ${payload.title}`);
    console.log(`  Body: ${payload.message}`);
    console.log(`  Priority: ${payload.priority}`);

    // Simulate email sending
    // In production, use something like:
    // await sendgrid.send({ to: destination, subject: payload.title, text: payload.message });

    // For now, we'll log and return success
    // Replace with actual email integration:
    /*
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    await sgMail.send({
      to: destination,
      from: 'alerts@smartblueprint.app',
      subject: `[SmartBlueprint] ${payload.title}`,
      text: payload.message,
      html: this.formatEmailHtml(payload),
    });
    */

    return true;
  }

  // SMS notification
  private async sendSMS(destination: string, payload: NotificationPayload): Promise<boolean> {
    // In production, integrate with SMS service (Twilio, etc.)
    console.log(`[Notification] SMS to ${destination}`);
    console.log(`  Message: ${payload.title}: ${payload.message}`);

    // Simulate SMS sending
    // In production, use something like:
    /*
    const twilio = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
    await twilio.messages.create({
      body: `${payload.title}: ${payload.message}`,
      from: process.env.TWILIO_PHONE,
      to: destination,
    });
    */

    return true;
  }

  // Push notification (for mobile apps)
  private async sendPushNotification(destination: string, payload: NotificationPayload): Promise<boolean> {
    // In production, integrate with push service (Firebase, etc.)
    console.log(`[Notification] PUSH to ${destination}`);
    console.log(`  Title: ${payload.title}`);
    console.log(`  Body: ${payload.message}`);

    // Simulate push notification
    // In production, use something like:
    /*
    const admin = require('firebase-admin');
    await admin.messaging().send({
      token: destination,
      notification: {
        title: payload.title,
        body: payload.message,
      },
      data: payload.data,
      android: {
        priority: payload.priority === 'urgent' ? 'high' : 'normal',
      },
      apns: {
        payload: {
          aps: {
            sound: payload.priority === 'urgent' ? 'alarm.caf' : 'default',
          },
        },
      },
    });
    */

    return true;
  }

  // Webhook notification
  private async sendWebhook(destination: string, payload: NotificationPayload): Promise<boolean> {
    console.log(`[Notification] WEBHOOK to ${destination}`);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.webhookTimeout);

      const response = await fetch(destination, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'SmartBlueprint-Security/1.0',
        },
        body: JSON.stringify({
          event: 'security_alert',
          title: payload.title,
          message: payload.message,
          priority: payload.priority,
          data: payload.data,
          timestamp: new Date().toISOString(),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(`[Notification] Webhook failed with status ${response.status}`);
        return false;
      }

      console.log(`[Notification] Webhook successful: ${response.status}`);
      return true;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('[Notification] Webhook timeout');
      } else {
        console.error('[Notification] Webhook error:', error);
      }
      return false;
    }
  }

  // Helper methods

  private async getChannelsForIntrusion(): Promise<NotificationChannel[]> {
    const channels = await storage.getNotificationChannels();
    return channels.filter(c => c.isEnabled && c.notifyOnIntrusion);
  }

  private async getChannelsForEvent(event: SecurityEvent): Promise<NotificationChannel[]> {
    const channels = await storage.getNotificationChannels();

    return channels.filter(c => {
      if (!c.isEnabled) return false;

      switch (event.eventType) {
        case 'intrusion_detected':
        case 'alarm_triggered':
        case 'unknown_device':
          return c.notifyOnIntrusion;
        case 'mode_change':
          return c.notifyOnModeChange;
        case 'resident_arrived':
        case 'resident_left':
          return c.notifyOnResidentActivity;
        default:
          return false;
      }
    });
  }

  private getAlertTitle(alert: IntrusionAlert): string {
    switch (alert.alertType) {
      case 'intrusion':
        return 'INTRUSION DETECTED';
      case 'unknown_device':
        return 'Unknown Device Detected';
      case 'perimeter_breach':
        return 'PERIMETER BREACH';
      case 'suspicious_activity':
        return 'Suspicious Activity';
      default:
        return 'Security Alert';
    }
  }

  private getEventTitle(event: SecurityEvent): string {
    switch (event.eventType) {
      case 'intrusion_detected':
        return 'INTRUSION DETECTED';
      case 'mode_change':
        return 'Security Mode Changed';
      case 'resident_arrived':
        return 'Resident Arrived';
      case 'resident_left':
        return 'Resident Left';
      case 'unknown_device':
        return 'Unknown Device';
      case 'alarm_triggered':
        return 'ALARM TRIGGERED';
      default:
        return 'Security Event';
    }
  }

  private formatEmailHtml(payload: NotificationPayload): string {
    const priorityColor = payload.priority === 'urgent' ? '#dc2626' :
                          payload.priority === 'high' ? '#ea580c' : '#2563eb';

    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { background: ${priorityColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
    .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">${payload.title}</h1>
    </div>
    <div class="content">
      <p>${payload.message}</p>
      ${payload.data ? `<p><small>Event ID: ${payload.data.alertId || payload.data.eventId}</small></p>` : ''}
    </div>
    <div class="footer">
      <p>SmartBlueprint Pro Security System</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  // Test notification channels
  async testChannel(channelId: number): Promise<NotificationResult> {
    const channels = await storage.getNotificationChannels();
    const channel = channels.find(c => c.id === channelId);

    if (!channel) {
      return {
        channelId,
        channelType: 'unknown',
        success: false,
        error: 'Channel not found',
        timestamp: new Date(),
      };
    }

    const testPayload: NotificationPayload = {
      title: 'Test Notification',
      message: 'This is a test notification from SmartBlueprint Pro Security System.',
      priority: 'normal',
      data: { test: true },
    };

    const results = await this.sendToChannels([channel], testPayload);
    return results[0];
  }
}

export const notificationService = NotificationService.getInstance();
