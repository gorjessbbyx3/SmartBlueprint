import React from 'react';
import { Loader2, Wifi, MapPin, Activity, Search } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingSpinner({ message = "Loading...", className = "" }: LoadingStateProps) {
  return (
    <div className={`flex items-center justify-center py-8 ${className}`}>
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-primary" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

export function DeviceScanningLoader() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center space-y-4">
        <div className="relative">
          <Wifi className="w-12 h-12 mx-auto text-primary animate-pulse" />
          <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping"></div>
        </div>
        <div>
          <h3 className="font-medium text-gray-900 mb-1">Scanning for devices</h3>
          <p className="text-sm text-gray-600">Discovering smart home devices on your network...</p>
        </div>
      </div>
    </div>
  );
}

export function FloorplanLoadingState() {
  return (
    <div className="canvas-responsive bg-gray-50 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="relative">
          <MapPin className="w-10 h-10 mx-auto text-primary animate-bounce" />
        </div>
        <div>
          <h3 className="font-medium text-gray-900 mb-1">Loading floorplan</h3>
          <p className="text-sm text-gray-600">Preparing your smart home layout...</p>
        </div>
      </div>
    </div>
  );
}

export function AnalyticsLoadingState() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 p-6">
      <div className="xl:col-span-2">
        <Card>
          <CardHeader>
            <div className="skeleton h-6 w-48"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="skeleton h-64 w-full"></div>
              <div className="flex gap-2">
                <div className="skeleton h-8 w-16"></div>
                <div className="skeleton h-8 w-16"></div>
                <div className="skeleton h-8 w-16"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="xl:col-span-1">
        <Card>
          <CardHeader>
            <div className="skeleton h-6 w-32"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="skeleton h-4 w-4 rounded-full mt-1"></div>
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-4 w-24"></div>
                    <div className="skeleton h-3 w-full"></div>
                    <div className="skeleton h-3 w-16"></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function SidebarLoadingState() {
  return (
    <div className="p-4 space-y-4">
      <div className="skeleton h-16 w-full"></div>
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-2">
            <div className="skeleton h-8 w-8 rounded-full"></div>
            <div className="flex-1 space-y-1">
              <div className="skeleton h-4 w-24"></div>
              <div className="skeleton h-3 w-16"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DeviceCardSkeleton() {
  return (
    <div className="p-3 border rounded-lg space-y-2">
      <div className="flex items-center gap-2">
        <div className="skeleton h-3 w-3 rounded-full"></div>
        <div className="skeleton h-4 w-20"></div>
      </div>
      <div className="skeleton h-3 w-16"></div>
      <div className="skeleton h-3 w-12"></div>
    </div>
  );
}

interface ProgressLoadingProps {
  progress: number;
  message: string;
  detail?: string;
}

export function ProgressLoading({ progress, message, detail }: ProgressLoadingProps) {
  return (
    <div className="text-center py-8 space-y-4">
      <Activity className="w-8 h-8 mx-auto text-primary animate-pulse" />
      <div>
        <h3 className="font-medium text-gray-900 mb-1">{message}</h3>
        {detail && <p className="text-sm text-gray-600">{detail}</p>}
      </div>
      <div className="w-full max-w-xs mx-auto">
        <div className="bg-gray-200 rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          ></div>
        </div>
        <p className="text-xs text-gray-500 mt-1">{progress.toFixed(0)}% complete</p>
      </div>
    </div>
  );
}

export function SearchLoadingState({ query }: { query: string }) {
  return (
    <div className="flex items-center justify-center py-6">
      <div className="text-center">
        <Search className="w-6 h-6 mx-auto mb-2 text-primary animate-pulse" />
        <p className="text-sm text-gray-600">Searching for "{query}"...</p>
      </div>
    </div>
  );
}

interface InlineLoadingProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function InlineLoading({ size = 'md', className = '' }: InlineLoadingProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5', 
    lg: 'w-6 h-6'
  };

  return (
    <Loader2 className={`animate-spin ${sizeClasses[size]} ${className}`} />
  );
}