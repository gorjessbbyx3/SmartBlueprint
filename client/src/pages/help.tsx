import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  HelpCircle,
  Book,
  Lightbulb,
  Search,
  Home,
  Shield,
  Smartphone,
  Wifi,
  Users,
  Bell,
  Map,
  Settings,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Zap,
  Target,
  Brain,
  DoorOpen,
  Footprints
} from "lucide-react";

interface HelpSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  content: React.ReactNode;
}

interface FAQ {
  question: string;
  answer: string;
  category: string;
}

const faqs: FAQ[] = [
  {
    question: "How does SmartBlueprint detect when I'm home?",
    answer: "SmartBlueprint uses multiple detection methods: 1) Bluetooth scanning detects your phone/wearables, 2) WiFi signal analysis tracks device connections, 3) Signal disruption detection notices when your body blocks WiFi signals. When your registered devices are detected, the system knows you're home.",
    category: "detection"
  },
  {
    question: "Do I need special hardware?",
    answer: "No! SmartBlueprint works with your existing WiFi router and a Raspberry Pi. The Pi's built-in Bluetooth and WiFi are used for detection. You can optionally add more sensors (old phones/tablets) for better coverage.",
    category: "hardware"
  },
  {
    question: "How do I register my phone?",
    answer: "Go to Device Management (/devices), find your phone in the discovered devices list, and click 'Mark as Trusted'. Assign it to your resident profile. Alternatively, the AI will prompt you when it detects a new device repeatedly.",
    category: "setup"
  },
  {
    question: "What's the difference between security modes?",
    answer: "Disarmed: No alerts triggered. Armed Home: Alerts for unknown devices/movement, but resident activity is allowed. Armed Away: Full alerts - any movement triggers alarm. Armed Night: Similar to Armed Home but with different sensitivity settings.",
    category: "security"
  },
  {
    question: "How accurate is the presence detection?",
    answer: "With Bluetooth detection, accuracy is very high (95%+) when your phone is detected. WiFi signal disruption adds another layer with ~80% accuracy. Multi-device triangulation improves location estimation within rooms. The more calibration points you add, the more accurate it becomes.",
    category: "detection"
  },
  {
    question: "Why does it take time to detect when I leave?",
    answer: "By default, the system waits 5 minutes before declaring someone departed (to avoid false alarms from brief signal drops). However, with Smart Departure Detection enabled, it can detect you leaving immediately when you walk towards a door and your signal fades.",
    category: "detection"
  },
  {
    question: "Can I use this without a Raspberry Pi?",
    answer: "Yes! The system works on any Linux machine, Mac, or Windows. However, Bluetooth scanning works best on Linux/Pi. On other platforms, it runs in simulation mode for development/testing.",
    category: "hardware"
  },
  {
    question: "How do I calibrate my home layout?",
    answer: "Start a calibration session from the Setup page or API. Walk around your home with your phone, marking locations as you go. Label each point (room name, door, etc.). The more points you mark, the better the system learns your home's WiFi signature.",
    category: "setup"
  },
  {
    question: "What happens if my phone runs out of battery?",
    answer: "If your primary device goes offline, the system will eventually mark you as departed (after the timeout). Consider registering multiple devices (phone + smartwatch) for redundancy.",
    category: "detection"
  },
  {
    question: "How do I add other family members?",
    answer: "Go to Security Dashboard → Residents section → Add Resident. Enter their name and details. Then have them connect their phone to WiFi and register it as their trusted device.",
    category: "setup"
  }
];

const quickStartSteps = [
  {
    step: 1,
    title: "Add Residents",
    description: "Register each household member in the Security Dashboard",
    icon: <Users className="h-6 w-6" />,
    path: "/",
    details: "Click 'Add Resident' and enter names for everyone who lives in your home."
  },
  {
    step: 2,
    title: "Register Devices",
    description: "Mark your phones/tablets as trusted devices",
    icon: <Smartphone className="h-6 w-6" />,
    path: "/devices",
    details: "Find each person's phone in the device list and assign it to their profile."
  },
  {
    step: 3,
    title: "Calibrate Your Home",
    description: "Walk through your home to teach the system your layout",
    icon: <Map className="h-6 w-6" />,
    path: "/setup",
    details: "Mark rooms, exits (doors), and key locations for better tracking."
  },
  {
    step: 4,
    title: "Set Security Mode",
    description: "Choose how the system should respond to activity",
    icon: <Shield className="h-6 w-6" />,
    path: "/",
    details: "Start with 'Disarmed' to learn the system, then try 'Armed Home'."
  },
  {
    step: 5,
    title: "Configure Notifications",
    description: "Set up alerts for security events",
    icon: <Bell className="h-6 w-6" />,
    path: "/",
    details: "Add email, SMS, or webhook notifications for intrusion alerts."
  }
];

const featureTutorials = [
  {
    id: "presence",
    title: "Presence Detection",
    icon: <Footprints className="h-5 w-5" />,
    difficulty: "Beginner",
    steps: [
      "The system automatically detects when registered devices connect to your network",
      "Bluetooth scanning runs every 15 seconds looking for your phone",
      "When detected, you'll see 'X people at home' on the dashboard",
      "WiFi signal disruption adds another layer - your body affects signal strength",
      "The confidence score shows how certain the system is about detection"
    ]
  },
  {
    id: "ai-learning",
    title: "AI Device Learning",
    icon: <Brain className="h-5 w-5" />,
    difficulty: "Beginner",
    steps: [
      "When a new device is seen 2+ times, a prompt appears asking who owns it",
      "The AI may suggest an owner based on the device name (e.g., 'Jane's iPhone')",
      "Select the correct resident or mark as Visitor/IoT/Ignore",
      "Once identified, the device is permanently associated with that person",
      "The system learns arrival/departure patterns over time"
    ]
  },
  {
    id: "smart-departure",
    title: "Smart Departure Detection",
    icon: <DoorOpen className="h-5 w-5" />,
    difficulty: "Intermediate",
    steps: [
      "Configure exit zones (front door, back door, garage) in settings",
      "The system tracks device movement towards these exits",
      "When signal starts fading near an exit, departure is predicted",
      "No more waiting 5 minutes - departure is detected instantly",
      "Works best with home walk-through calibration completed"
    ]
  },
  {
    id: "calibration",
    title: "Home Walk-Through Calibration",
    icon: <Target className="h-5 w-5" />,
    difficulty: "Intermediate",
    steps: [
      "Start a calibration session from Setup or via API",
      "Walk to each room and tap 'Mark Location'",
      "Label the point: 'Living Room', 'Kitchen', 'Front Door', etc.",
      "The system records WiFi signal readings at each spot",
      "Mark at least your main rooms and all exit points",
      "Complete calibration when done - the system builds a signal map"
    ]
  },
  {
    id: "intrusion",
    title: "Intrusion Detection",
    icon: <AlertTriangle className="h-5 w-5" />,
    difficulty: "Advanced",
    steps: [
      "Works when system is Armed (Away, Home, or Night mode)",
      "If movement is detected but no resident devices are present: ALERT!",
      "Entry delay gives you time to disarm when arriving home",
      "Exit delay gives you time to leave after arming",
      "Alerts are sent via configured notification channels",
      "Acknowledge alerts from the dashboard or mobile"
    ]
  },
  {
    id: "triangulation",
    title: "Multi-Device Triangulation",
    icon: <Wifi className="h-5 w-5" />,
    difficulty: "Advanced",
    steps: [
      "Place old phones/tablets around your home as sensors",
      "Connect them to WiFi and keep them powered on",
      "Add them as sensors via Settings or API",
      "The system uses signal strength from multiple points",
      "This enables room-level location tracking",
      "Movement is detected when signal patterns change"
    ]
  }
];

const tips = [
  {
    category: "Detection",
    icon: <Zap className="h-4 w-4" />,
    tips: [
      "Keep Bluetooth enabled on your phone for best detection",
      "Register your smartwatch as a backup device",
      "Place the Pi centrally in your home for better coverage",
      "Calibrate during a quiet time when WiFi usage is stable"
    ]
  },
  {
    category: "Security",
    icon: <Shield className="h-4 w-4" />,
    tips: [
      "Start with 'Armed Home' mode to learn how alerts work",
      "Set a longer entry delay (30-60 sec) initially",
      "Test your notification channels with the test button",
      "Create a PIN for disarming from the mobile app"
    ]
  },
  {
    category: "Performance",
    icon: <Settings className="h-4 w-4" />,
    tips: [
      "More calibration points = better accuracy",
      "Mark all doors/exits for smart departure to work",
      "Use wired ethernet for the Pi if possible",
      "Check the Pi's Bluetooth range in your home"
    ]
  },
  {
    category: "Troubleshooting",
    icon: <HelpCircle className="h-4 w-4" />,
    tips: [
      "If detection is spotty, try restarting the Bluetooth service",
      "Check if your phone's MAC address changes (WiFi randomization)",
      "Some phones hide Bluetooth when locked - check settings",
      "Reduce scan interval if CPU usage is too high"
    ]
  }
];

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("quickstart");

  const filteredFaqs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTutorials = featureTutorials.filter(tutorial =>
    tutorial.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tutorial.steps.some(step => step.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <HelpCircle className="h-6 w-6 text-blue-600" />
                <h1 className="text-xl font-bold">Help & Documentation</h1>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search help topics, FAQs, tutorials..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="quickstart" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Quick Start
            </TabsTrigger>
            <TabsTrigger value="tutorials" className="flex items-center gap-2">
              <Book className="h-4 w-4" />
              Tutorials
            </TabsTrigger>
            <TabsTrigger value="faq" className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              FAQ
            </TabsTrigger>
            <TabsTrigger value="tips" className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Tips
            </TabsTrigger>
          </TabsList>

          {/* Quick Start Tab */}
          <TabsContent value="quickstart">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  Quick Start Guide
                </CardTitle>
                <CardDescription>
                  Get up and running in 5 easy steps
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {quickStartSteps.map((item, index) => (
                    <div
                      key={item.step}
                      className="flex gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                          {item.icon}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className="text-xs">
                            Step {item.step}
                          </Badge>
                          <h3 className="font-semibold">{item.title}</h3>
                        </div>
                        <p className="text-gray-600 mb-2">{item.description}</p>
                        <p className="text-sm text-gray-500">{item.details}</p>
                        <Link href={item.path}>
                          <Button variant="link" size="sm" className="px-0 mt-2">
                            Go to {item.title} →
                          </Button>
                        </Link>
                      </div>
                      {index < quickStartSteps.length - 1 && (
                        <div className="hidden md:block absolute left-10 mt-16 w-0.5 h-8 bg-gray-200" />
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-8 p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-green-800">You're all set!</h4>
                      <p className="text-sm text-green-700 mt-1">
                        After completing these steps, your home security system will be actively monitoring.
                        The AI will continue learning and improving over time.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tutorials Tab */}
          <TabsContent value="tutorials">
            <div className="grid md:grid-cols-2 gap-4">
              {(searchQuery ? filteredTutorials : featureTutorials).map((tutorial) => (
                <Card key={tutorial.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        {tutorial.icon}
                        {tutorial.title}
                      </CardTitle>
                      <Badge
                        variant={
                          tutorial.difficulty === "Beginner" ? "secondary" :
                          tutorial.difficulty === "Intermediate" ? "default" : "destructive"
                        }
                      >
                        {tutorial.difficulty}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ol className="space-y-2">
                      {tutorial.steps.map((step, index) => (
                        <li key={index} className="flex gap-2 text-sm">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium">
                            {index + 1}
                          </span>
                          <span className="text-gray-600">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </CardContent>
                </Card>
              ))}
            </div>

            {searchQuery && filteredTutorials.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Book className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No tutorials found matching "{searchQuery}"</p>
              </div>
            )}
          </TabsContent>

          {/* FAQ Tab */}
          <TabsContent value="faq">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-blue-500" />
                  Frequently Asked Questions
                </CardTitle>
                <CardDescription>
                  Common questions about SmartBlueprint Pro
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {(searchQuery ? filteredFaqs : faqs).map((faq, index) => (
                    <AccordionItem key={index} value={`faq-${index}`}>
                      <AccordionTrigger className="text-left">
                        <div className="flex items-start gap-2">
                          <Badge variant="outline" className="text-xs shrink-0">
                            {faq.category}
                          </Badge>
                          <span>{faq.question}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="text-gray-600">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>

                {searchQuery && filteredFaqs.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <HelpCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No FAQs found matching "{searchQuery}"</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tips Tab */}
          <TabsContent value="tips">
            <div className="grid md:grid-cols-2 gap-4">
              {tips.map((category) => (
                <Card key={category.category}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      {category.icon}
                      {category.category} Tips
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {category.tips.map((tip, index) => (
                        <li key={index} className="flex gap-2 text-sm">
                          <Lightbulb className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                          <span className="text-gray-600">{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pro Tips Section */}
            <Card className="mt-6 border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-800">
                  <Zap className="h-5 w-5" />
                  Pro Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="text-blue-900">
                <ul className="space-y-2">
                  <li className="flex gap-2">
                    <CheckCircle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                    <span>Register 2+ devices per person for redundancy</span>
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                    <span>Mark ALL doors as exit zones for instant departure detection</span>
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                    <span>Calibrate at different times of day for best results</span>
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                    <span>Old phones make great additional sensors - place in key rooms</span>
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                    <span>Use webhooks to integrate with smart home systems</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Links */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/">
            <Card className="hover:bg-gray-50 cursor-pointer transition-colors">
              <CardContent className="p-4 flex items-center gap-3">
                <Shield className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium">Security Dashboard</span>
              </CardContent>
            </Card>
          </Link>
          <Link href="/devices">
            <Card className="hover:bg-gray-50 cursor-pointer transition-colors">
              <CardContent className="p-4 flex items-center gap-3">
                <Smartphone className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium">Device Management</span>
              </CardContent>
            </Card>
          </Link>
          <Link href="/setup">
            <Card className="hover:bg-gray-50 cursor-pointer transition-colors">
              <CardContent className="p-4 flex items-center gap-3">
                <Settings className="h-5 w-5 text-gray-600" />
                <span className="text-sm font-medium">Setup & Calibration</span>
              </CardContent>
            </Card>
          </Link>
          <Link href="/analytics">
            <Card className="hover:bg-gray-50 cursor-pointer transition-colors">
              <CardContent className="p-4 flex items-center gap-3">
                <Home className="h-5 w-5 text-purple-600" />
                <span className="text-sm font-medium">Security Analytics</span>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Contact/Support */}
        <Card className="mt-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Need More Help?</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Check the Raspberry Pi setup guide or visit our GitHub for more resources
                </p>
              </div>
              <div className="flex gap-2">
                <a
                  href="https://github.com/gorjessbbyx3/SmartBlueprint/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm">
                    Report Issue
                  </Button>
                </a>
                <a
                  href="https://github.com/gorjessbbyx3/SmartBlueprint"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button size="sm">
                    GitHub
                  </Button>
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
