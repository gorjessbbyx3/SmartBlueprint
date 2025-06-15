import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Recommendation } from "@shared/schema";

interface RecommendationPanelProps {
  recommendations: Recommendation[];
  onClose: () => void;
}

export default function RecommendationPanel({
  recommendations,
  onClose,
}: RecommendationPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const applyMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/recommendations/${id}/apply`),
    onSuccess: () => {
      toast({
        title: "Recommendation applied",
        description: "The recommendation has been implemented",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/recommendations"] });
    },
    onError: () => {
      toast({
        title: "Failed to apply",
        description: "Could not apply the recommendation",
        variant: "destructive",
      });
    },
  });

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case "wifi_extender":
        return "fas fa-wifi";
      case "device_relocation":
        return "fas fa-arrows-alt";
      case "new_device":
        return "fas fa-plus-circle";
      default:
        return "fas fa-lightbulb";
    }
  };

  const getRecommendationColor = (type: string) => {
    switch (type) {
      case "wifi_extender":
        return "bg-purple-50 border-purple-200";
      case "device_relocation":
        return "bg-blue-50 border-blue-200";
      case "new_device":
        return "bg-green-50 border-green-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case "wifi_extender":
        return "text-purple-600";
      case "device_relocation":
        return "text-blue-600";
      case "new_device":
        return "text-green-600";
      default:
        return "text-gray-600";
    }
  };

  const getButtonColor = (type: string) => {
    switch (type) {
      case "wifi_extender":
        return "bg-purple-600 hover:bg-purple-700";
      case "device_relocation":
        return "bg-blue-600 hover:bg-blue-700";
      case "new_device":
        return "bg-green-600 hover:bg-green-700";
      default:
        return "bg-gray-600 hover:bg-gray-700";
    }
  };

  return (
    <Card className="fixed top-4 right-4 max-w-sm z-40 shadow-lg">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-gray-900 flex items-center">
            <i className="fas fa-magic mr-2 text-purple-600"></i>
            Smart Recommendations
          </h4>
          <Button variant="ghost" size="sm" onClick={onClose} className="p-1">
            <i className="fas fa-times text-gray-400"></i>
          </Button>
        </div>
        
        <div className="space-y-3">
          {recommendations.filter(r => !r.applied).map((recommendation) => (
            <div
              key={recommendation.id}
              className={`border rounded-lg p-3 ${getRecommendationColor(recommendation.type)}`}
            >
              <div className="flex items-start space-x-2">
                <i className={`${getRecommendationIcon(recommendation.type)} ${getIconColor(recommendation.type)} mt-0.5`}></i>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    {recommendation.type === "wifi_extender" && "Wi-Fi Extender Placement"}
                    {recommendation.type === "device_relocation" && "Device Relocation"}
                    {recommendation.type === "new_device" && "Add New Device"}
                  </p>
                  <p className="text-xs text-gray-600 mb-2">
                    {recommendation.description}
                    {recommendation.improvementScore && (
                      <span className="ml-1 font-medium">
                        (+{recommendation.improvementScore}% coverage)
                      </span>
                    )}
                  </p>
                  {recommendation.x && recommendation.y && (
                    <p className="text-xs text-gray-500 mb-2">
                      Position: ({Math.round(recommendation.x)}, {Math.round(recommendation.y)})
                    </p>
                  )}
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      className={`text-white ${getButtonColor(recommendation.type)}`}
                      onClick={() => applyMutation.mutate(recommendation.id)}
                      disabled={applyMutation.isPending}
                    >
                      {applyMutation.isPending ? "Applying..." : "Apply"}
                    </Button>
                    <Button size="sm" variant="outline">
                      Dismiss
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {recommendations.filter(r => !r.applied).length === 0 && (
            <div className="text-center text-gray-500 text-sm py-4">
              <i className="fas fa-check-circle text-green-500 mb-2 block text-lg"></i>
              No recommendations at this time
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
