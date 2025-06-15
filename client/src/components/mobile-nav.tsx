import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, X, Home, Activity, Settings, Wifi, Map } from 'lucide-react';
import { Link } from 'wouter';

interface MobileNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function MobileNav({ activeTab, onTabChange }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { id: 'mapping', label: 'Device Map', icon: Map },
    { id: 'analytics', label: 'Analytics', icon: Activity },
    { id: 'devices', label: 'Devices', icon: Wifi },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile hamburger button */}
      <div className="mobile-nav fixed top-4 left-4 z-50">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsOpen(!isOpen)}
          className="touch-friendly bg-white shadow-md"
        >
          {isOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </Button>
      </div>

      {/* Mobile slide-out menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="mobile-nav fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Side menu */}
          <div className="mobile-nav fixed top-0 left-0 h-full w-64 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out">
            <div className="p-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">SmartBlueprint Pro</h2>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsOpen(false)}
                  className="touch-friendly"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <nav className="space-y-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Button
                      key={item.id}
                      variant={activeTab === item.id ? "default" : "ghost"}
                      className="w-full justify-start touch-friendly"
                      onClick={() => {
                        onTabChange(item.id);
                        setIsOpen(false);
                      }}
                    >
                      <Icon className="w-4 h-4 mr-3" />
                      {item.label}
                    </Button>
                  );
                })}
              </nav>

              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="text-xs text-gray-500 space-y-1">
                  <div>24/7 AI Monitoring Active</div>
                  <div>ML Analytics: 92% Accuracy</div>
                  <div>Real-time Device Discovery</div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export function MobileBottomNav({ activeTab, onTabChange }: MobileNavProps) {
  const navItems = [
    { id: 'mapping', label: 'Map', icon: Map },
    { id: 'analytics', label: 'Analytics', icon: Activity },
    { id: 'devices', label: 'Devices', icon: Wifi },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="mobile-nav fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Button
              key={item.id}
              variant="ghost"
              size="sm"
              className={`flex-1 flex-col h-12 touch-friendly ${
                activeTab === item.id ? 'text-primary bg-primary/10' : 'text-gray-600'
              }`}
              onClick={() => onTabChange(item.id)}
            >
              <Icon className="w-4 h-4 mb-1" />
              <span className="text-xs">{item.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}