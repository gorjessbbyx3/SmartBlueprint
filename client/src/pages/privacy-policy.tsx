import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="mb-6">
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Privacy Policy</CardTitle>
            <p className="text-gray-600">SmartBlueprint Pro by GorJess & Co.</p>
            <p className="text-sm text-gray-500">Last updated: June 15, 2025</p>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <div className="space-y-6">
              <section>
                <h3 className="text-lg font-semibold mb-3">1. Information We Collect</h3>
                <p className="text-gray-700">
                  SmartBlueprint Pro collects and processes the following types of information to provide network optimization services:
                </p>
                
                <h4 className="font-semibold mt-4 mb-2">Device Information</h4>
                <ul className="list-disc pl-6 text-gray-700 space-y-1">
                  <li>MAC addresses of network devices</li>
                  <li>IP addresses and device hostnames</li>
                  <li>Signal strength measurements (RSSI)</li>
                  <li>Device types and manufacturers</li>
                  <li>Network protocol information (WiFi, Zigbee, Bluetooth)</li>
                  <li>Device status and connectivity data</li>
                </ul>

                <h4 className="font-semibold mt-4 mb-2">Smart Home Platform Data</h4>
                <ul className="list-disc pl-6 text-gray-700 space-y-1">
                  <li>OAuth tokens for authorized platform access</li>
                  <li>Device telemetry data (power usage, temperature, battery levels)</li>
                  <li>Device configurations and settings</li>
                  <li>Platform-specific device identifiers</li>
                </ul>

                <h4 className="font-semibold mt-4 mb-2">Usage Information</h4>
                <ul className="list-disc pl-6 text-gray-700 space-y-1">
                  <li>Floor plan layouts and room configurations</li>
                  <li>Device placement and location data</li>
                  <li>Network coverage analysis results</li>
                  <li>Calibration and mapping data</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-3">2. How We Use Your Information</h3>
                <p className="text-gray-700">We use the collected information for the following purposes:</p>
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li>Provide real-time device mapping and visualization</li>
                  <li>Analyze network coverage and signal strength patterns</li>
                  <li>Generate intelligent placement recommendations</li>
                  <li>Detect network anomalies and performance issues</li>
                  <li>Monitor device health and predict maintenance needs</li>
                  <li>Improve service accuracy through machine learning</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-3">3. Data Storage and Processing</h3>
                <p className="text-gray-700">
                  All data processing occurs locally on your device and network:
                </p>
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li>Device scanning is performed entirely within your local network</li>
                  <li>No device data is transmitted to external servers</li>
                  <li>Smart home platform credentials are encrypted and stored locally</li>
                  <li>Machine learning models run locally for privacy protection</li>
                  <li>Floor plan and mapping data remains on your device</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-3">4. Third-Party Platform Integration</h3>
                <p className="text-gray-700">
                  When you connect to smart home platforms:
                </p>
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li>We use official OAuth authentication methods</li>
                  <li>Access is limited to read-only device information</li>
                  <li>Platform APIs are accessed directly from your device</li>
                  <li>No credentials are shared with third parties</li>
                  <li>You can revoke platform access at any time</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-3">5. Data Security</h3>
                <p className="text-gray-700">We implement comprehensive security measures:</p>
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li>All network communications use encrypted protocols</li>
                  <li>Smart home platform tokens are encrypted at rest</li>
                  <li>No sensitive data is transmitted over unencrypted connections</li>
                  <li>Access controls prevent unauthorized device monitoring</li>
                  <li>Regular security updates and vulnerability assessments</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-3">6. Data Retention</h3>
                <p className="text-gray-700">
                  Data retention follows these principles:
                </p>
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li>Device telemetry data is retained for 30 days for trend analysis</li>
                  <li>Historical performance data is aggregated and anonymized</li>
                  <li>Floor plan and calibration data is retained until manually deleted</li>
                  <li>Platform integration tokens expire according to platform policies</li>
                  <li>You can request data deletion at any time</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-3">7. Your Privacy Rights</h3>
                <p className="text-gray-700">You have the following rights regarding your data:</p>
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li>Access: View all data collected about your devices</li>
                  <li>Correction: Update or correct inaccurate device information</li>
                  <li>Deletion: Remove all stored data and disconnect platforms</li>
                  <li>Portability: Export your floor plans and configuration data</li>
                  <li>Restriction: Limit data processing for specific devices</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-3">8. Cookies and Local Storage</h3>
                <p className="text-gray-700">
                  The application uses browser storage for:
                </p>
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li>User preferences and interface settings</li>
                  <li>Session management and authentication state</li>
                  <li>Cached device data for improved performance</li>
                  <li>Floor plan configurations and room layouts</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-3">9. Children's Privacy</h3>
                <p className="text-gray-700">
                  SmartBlueprint Pro is not intended for use by children under 13. We do not knowingly collect personal information from children under 13. If you become aware that a child has provided us with personal information, please contact us.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-3">10. Changes to Privacy Policy</h3>
                <p className="text-gray-700">
                  We may update this Privacy Policy periodically. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-3">11. Contact Information</h3>
                <p className="text-gray-700">
                  If you have questions about this Privacy Policy or our data practices, please contact us through the application support system or via the settings menu.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-3">12. Compliance</h3>
                <p className="text-gray-700">
                  This privacy policy is designed to comply with applicable privacy laws including GDPR, CCPA, and other regional privacy regulations. Our local-first architecture ensures minimal data exposure and maximum user control.
                </p>
              </section>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}