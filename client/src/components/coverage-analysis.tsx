import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CoverageAnalysisProps {
  showHeatmap: boolean;
  onToggleHeatmap: (show: boolean) => void;
}

export default function CoverageAnalysis({ showHeatmap, onToggleHeatmap }: CoverageAnalysisProps) {
  const { toast } = useToast();

  const { data: coverageData, refetch } = useQuery({
    queryKey: ["/api/coverage/analyze"],
    queryFn: async () => {
      const response = await apiRequest("POST", "/api/coverage/analyze");
      return response.json();
    },
  });

  const optimizeMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/coverage/analyze"),
    onSuccess: async (response) => {
      const data = await response.json();
      toast({
        title: "Optimization complete",
        description: `Found ${data.recommendations?.length || 0} optimization opportunities`,
      });
      refetch();
    },
    onError: () => {
      toast({
        title: "Optimization failed",
        description: "Failed to analyze coverage",
        variant: "destructive",
      });
    },
  });

  const coverageScore = coverageData?.coverageScore || 82;

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
          <i className="fas fa-wifi mr-2 text-primary"></i>
          Coverage Analysis
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-2">
              <Switch
                checked={showHeatmap}
                onCheckedChange={onToggleHeatmap}
              />
              <span className="text-xs text-gray-700">Show Heatmap</span>
            </label>
            <span className="text-xs text-gray-500">Live</span>
          </div>
          
          <div className="text-xs text-gray-600">
            <div className="flex justify-between mb-1">
              <span>Coverage Score:</span>
              <span className={`font-semibold ${coverageScore > 80 ? 'text-green-600' : coverageScore > 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                {coverageScore}%
              </span>
            </div>
            <Progress value={coverageScore} className="h-1.5" />
          </div>
          
          <Button
            className="w-full bg-orange-600 hover:bg-orange-700"
            onClick={() => optimizeMutation.mutate()}
            disabled={optimizeMutation.isPending}
          >
            <i className={`fas ${optimizeMutation.isPending ? 'fa-spinner fa-spin' : 'fa-magic'} mr-2`}></i>
            {optimizeMutation.isPending ? "Analyzing..." : "Optimize Placement"}
          </Button>

          {coverageData?.weakSpots && (
            <div className="text-xs text-gray-600">
              <div className="flex justify-between mb-1">
                <span>Weak Spots Found:</span>
                <span className="font-semibold text-gray-900">{coverageData.weakSpots.length}</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
