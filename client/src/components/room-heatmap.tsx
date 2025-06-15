import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, SkipBack, SkipForward, Clock, Activity } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useWebSocket } from '@/hooks/use-websocket';
import type { FusionResult } from '@shared/schema';

interface RoomHeatmapProps {
  className?: string;
  enableTimelinePlayback?: boolean;
  overlayFloorplan?: boolean;
}

interface RoomConfidence {
  room: string;
  confidenceScore: number;
  alertType: string;
  timestamp: Date;
  interpretation: string;
  color: string;
}

interface HeatmapData {
  rooms: RoomConfidence[];
  timestamp: Date;
}

const ROOM_LAYOUT = [
  { name: 'Living Room', x: 0, y: 0, width: 2, height: 2 },
  { name: 'Kitchen', x: 2, y: 0, width: 1, height: 1 },
  { name: 'Hallway', x: 2, y: 1, width: 1, height: 1 },
  { name: 'Bedroom 1', x: 0, y: 2, width: 1, height: 1 },
  { name: 'Bedroom 2', x: 1, y: 2, width: 1, height: 1 },
  { name: 'Bathroom', x: 2, y: 2, width: 1, height: 1 },
  { name: 'Garage', x: 3, y: 0, width: 1, height: 2 },
];

function getHeatmapColor(confidenceScore: number): { color: string; interpretation: string } {
  if (confidenceScore >= 0.8) {
    return { color: 'bg-red-500', interpretation: 'Active movement detected' };
  } else if (confidenceScore >= 0.5) {
    return { color: 'bg-orange-400', interpretation: 'Motion detected' };
  } else if (confidenceScore >= 0.2) {
    return { color: 'bg-yellow-300', interpretation: 'Low activity' };
  } else if (confidenceScore > 0) {
    return { color: 'bg-green-400', interpretation: 'Quiet / idle' };
  } else {
    return { color: 'bg-gray-300', interpretation: 'No data' };
  }
}

function formatTimestamp(timestamp: Date): string {
  return timestamp.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

export function RoomHeatmap({ 
  className = '', 
  enableTimelinePlayback = true,
  overlayFloorplan = true 
}: RoomHeatmapProps) {
  const [currentTimeIndex, setCurrentTimeIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [selectedTimeRange, setSelectedTimeRange] = useState(60); // minutes
  
  // Fetch fusion results for heatmap data
  const { data: fusionResults = [], refetch } = useQuery<FusionResult[]>({
    queryKey: ['/api/fusion-results'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // WebSocket for real-time updates
  const { lastMessage } = useWebSocket('/ws');

  // Process real-time fusion updates
  useEffect(() => {
    if (lastMessage?.type === 'fusion_update') {
      refetch();
    }
  }, [lastMessage, refetch]);

  // Process fusion results into timeline data
  const timelineData = useMemo((): HeatmapData[] => {
    if (!fusionResults.length) return [];

    // Group by time intervals (every 30 seconds)
    const grouped = new Map<string, FusionResult[]>();
    
    fusionResults.forEach(result => {
      const timestamp = new Date(result.timestamp!);
      const intervalKey = Math.floor(timestamp.getTime() / 30000) * 30000;
      const key = intervalKey.toString();
      
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(result);
    });

    // Convert to heatmap data
    return Array.from(grouped.entries())
      .map(([timeKey, results]) => {
        const timestamp = new Date(parseInt(timeKey));
        
        // Create room confidence map
        const roomMap = new Map<string, RoomConfidence>();
        
        // Initialize all rooms with zero confidence
        ROOM_LAYOUT.forEach(room => {
          const { color, interpretation } = getHeatmapColor(0);
          roomMap.set(room.name, {
            room: room.name,
            confidenceScore: 0,
            alertType: 'idle',
            timestamp,
            interpretation,
            color
          });
        });

        // Update with actual fusion results
        results.forEach(result => {
          const { color, interpretation } = getHeatmapColor(result.confidenceScore);
          roomMap.set(result.room, {
            room: result.room,
            confidenceScore: result.confidenceScore,
            alertType: result.alertType,
            timestamp,
            interpretation,
            color
          });
        });

        return {
          rooms: Array.from(roomMap.values()),
          timestamp
        };
      })
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }, [fusionResults]);

  // Current heatmap data
  const currentData = useMemo(() => {
    if (!timelineData.length) {
      // Generate default room layout with no activity
      const defaultRooms = ROOM_LAYOUT.map(room => {
        const { color, interpretation } = getHeatmapColor(0);
        return {
          room: room.name,
          confidenceScore: 0,
          alertType: 'idle',
          timestamp: new Date(),
          interpretation,
          color
        };
      });
      return { rooms: defaultRooms, timestamp: new Date() };
    }
    
    return timelineData[currentTimeIndex] || timelineData[timelineData.length - 1];
  }, [timelineData, currentTimeIndex]);

  // Playback controls
  useEffect(() => {
    if (!isPlaying || !timelineData.length) return;

    const interval = setInterval(() => {
      setCurrentTimeIndex(prev => {
        if (prev >= timelineData.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 1000 / playbackSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, timelineData.length]);

  const handlePlay = () => setIsPlaying(!isPlaying);
  const handleSkipBack = () => setCurrentTimeIndex(Math.max(0, currentTimeIndex - 10));
  const handleSkipForward = () => setCurrentTimeIndex(Math.min(timelineData.length - 1, currentTimeIndex + 10));
  const handleReset = () => {
    setCurrentTimeIndex(timelineData.length - 1);
    setIsPlaying(false);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">Signal Disturbance Heatmap</CardTitle>
          </div>
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatTimestamp(currentData.timestamp)}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Heatmap Grid */}
        <div className="relative">
          <div className="grid grid-cols-4 gap-2 aspect-square max-w-md mx-auto">
            {ROOM_LAYOUT.map((room) => {
              const roomData = currentData.rooms.find(r => r.room === room.name);
              const confidenceScore = roomData?.confidenceScore || 0;
              const { color, interpretation } = getHeatmapColor(confidenceScore);
              
              return (
                <div
                  key={room.name}
                  className={`
                    ${color} border border-gray-300 rounded-lg p-2 flex flex-col justify-between
                    transition-all duration-300 hover:scale-105 cursor-pointer
                    ${room.width === 2 ? 'col-span-2' : ''}
                    ${room.height === 2 ? 'row-span-2' : ''}
                  `}
                  style={{
                    gridColumn: room.width === 2 ? 'span 2' : 'auto',
                    gridRow: room.height === 2 ? 'span 2' : 'auto'
                  }}
                  title={`${room.name}: ${interpretation} (${(confidenceScore * 100).toFixed(1)}%)`}
                >
                  <div className="text-xs font-medium text-gray-800 text-center">
                    {room.name}
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-900">
                      {(confidenceScore * 100).toFixed(0)}%
                    </div>
                    <div className="text-xs text-gray-700">
                      {interpretation}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex justify-center">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            {[
              { range: '80-100%', color: 'bg-red-500', label: 'Active Movement' },
              { range: '50-79%', color: 'bg-orange-400', label: 'Motion Detected' },
              { range: '20-49%', color: 'bg-yellow-300', label: 'Low Activity' },
              { range: '0-19%', color: 'bg-green-400', label: 'Quiet/Idle' }
            ].map((item) => (
              <div key={item.range} className="flex items-center gap-2">
                <div className={`w-4 h-4 ${item.color} rounded border`}></div>
                <div>
                  <div className="font-medium">{item.range}</div>
                  <div className="text-xs text-gray-600">{item.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline Playback Controls */}
        {enableTimelinePlayback && timelineData.length > 1 && (
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm">Timeline Playback</h3>
              <div className="text-xs text-gray-500">
                {timelineData.length} data points
              </div>
            </div>
            
            {/* Timeline Slider */}
            <div className="space-y-2">
              <Slider
                value={[currentTimeIndex]}
                onValueChange={([value]) => setCurrentTimeIndex(value)}
                max={timelineData.length - 1}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>
                  {timelineData[0] ? formatTimestamp(timelineData[0].timestamp) : ''}
                </span>
                <span>
                  {timelineData[timelineData.length - 1] ? 
                    formatTimestamp(timelineData[timelineData.length - 1].timestamp) : ''}
                </span>
              </div>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" onClick={handleSkipBack}>
                <SkipBack className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handlePlay}>
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="sm" onClick={handleSkipForward}>
                <SkipForward className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleReset}>
                Live
              </Button>
            </div>

            {/* Speed Control */}
            <div className="flex items-center justify-center gap-2 text-sm">
              <span className="text-gray-600">Speed:</span>
              {[0.5, 1, 2, 4].map(speed => (
                <Button
                  key={speed}
                  variant={playbackSpeed === speed ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPlaybackSpeed(speed)}
                  className="px-2 py-1 text-xs"
                >
                  {speed}x
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Real-time Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
          {currentData.rooms
            .filter(room => room.confidenceScore > 0.1)
            .sort((a, b) => b.confidenceScore - a.confidenceScore)
            .slice(0, 4)
            .map((room) => (
              <div key={room.room} className="text-center">
                <div className="text-lg font-bold text-gray-900">
                  {(room.confidenceScore * 100).toFixed(0)}%
                </div>
                <div className="text-xs text-gray-600">{room.room}</div>
                <div className="text-xs text-gray-500">{room.alertType}</div>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}