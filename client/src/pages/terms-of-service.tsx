import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export default function TermsOfService() {
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
            <CardTitle className="text-2xl font-bold">Terms of Service</CardTitle>
            <p className="text-gray-600">SmartMap Pro by GorJess & Co.</p>
            <p className="text-sm text-gray-500">Last updated: June 15, 2025</p>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <div className="space-y-6">
              <section>
                <h3 className="text-lg font-semibold mb-3">1. Acceptance of Terms</h3>
                <p className="text-gray-700">
                  By accessing and using SmartMap Pro ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-3">2. Description of Service</h3>
                <p className="text-gray-700">
                  SmartMap Pro is a smart home device mapping and network optimization platform that provides real-time visualization of IoT devices, signal strength analysis, and intelligent recommendations for improving network coverage.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-3">3. User Responsibilities</h3>
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li>You are responsible for maintaining the confidentiality of your account and password</li>
                  <li>You agree to accept responsibility for all activities that occur under your account</li>
                  <li>You must ensure that all network devices you monitor are owned or authorized by you</li>
                  <li>You agree not to use the service for any unlawful purposes</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-3">4. Device Data and Network Access</h3>
                <p className="text-gray-700">
                  The Service scans and analyzes devices on your local network. By using this service, you acknowledge that:
                </p>
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li>You have authorization to monitor all devices detected by the service</li>
                  <li>The service collects device metadata including MAC addresses, IP addresses, and signal strength data</li>
                  <li>All device scanning is performed locally on your network</li>
                  <li>No unauthorized access to device contents or personal data is performed</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-3">5. Smart Home Platform Integration</h3>
                <p className="text-gray-700">
                  When connecting to third-party smart home platforms (Philips Hue, SmartThings, etc.), you agree that:
                </p>
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li>You provide authorization through official OAuth mechanisms</li>
                  <li>API access is limited to device telemetry and status information</li>
                  <li>No control commands are sent without explicit user authorization</li>
                  <li>Platform credentials are encrypted and stored securely</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-3">6. Limitation of Liability</h3>
                <p className="text-gray-700">
                  In no event shall GorJessCo be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses resulting from your use of the service.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-3">7. Service Availability</h3>
                <p className="text-gray-700">
                  We strive to maintain high availability but do not guarantee uninterrupted service. The service may be temporarily unavailable due to maintenance, updates, or technical issues.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-3">8. Intellectual Property</h3>
                <p className="text-gray-700">
                  The Service and its original content, features, and functionality are and will remain the exclusive property of GorJess & Co. and its licensors. The service is protected by copyright, trademark, and other laws.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-3">9. Termination</h3>
                <p className="text-gray-700">
                  We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever and without limitation.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-3">10. Changes to Terms</h3>
                <p className="text-gray-700">
                  We reserve the right to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days notice prior to any new terms taking effect.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-3">11. Contact Information</h3>
                <p className="text-gray-700">
                  If you have any questions about these Terms of Service, please contact us through the application support system.
                </p>
              </section>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}