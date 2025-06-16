import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface AIActionRequest {
  action: string;
  context: any;
  userIntent: string;
  timestamp: Date;
}

interface AIActionResponse {
  success: boolean;
  message: string;
  data?: any;
  suggestions?: string[];
}

export function useAIActions() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastAction, setLastAction] = useState<AIActionRequest | null>(null);
  const { toast } = useToast();

  const executeAIAction = useCallback(async (
    action: string,
    context: any = {},
    userIntent: string
  ): Promise<AIActionResponse> => {
    setIsProcessing(true);
    
    const actionRequest: AIActionRequest = {
      action,
      context,
      userIntent,
      timestamp: new Date()
    };
    
    setLastAction(actionRequest);

    try {
      // Show AI thinking notification
      toast({
        title: "AI Processing",
        description: `Understanding your request: "${userIntent}"`,
        duration: 2000,
      });

      // Send to AI action processor
      const response = await fetch('/api/ai/process-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(actionRequest),
      });

      if (!response.ok) {
        throw new Error('AI processing failed');
      }

      const result: AIActionResponse = await response.json();

      // Show AI response
      toast({
        title: result.success ? "AI Action Complete" : "AI Action Failed",
        description: result.message,
        variant: result.success ? "default" : "destructive",
        duration: 4000,
      });

      return result;

    } catch (error) {
      const errorMessage = "AI action processing failed. Falling back to direct action.";
      
      toast({
        title: "AI Processing Error",
        description: errorMessage,
        variant: "destructive",
        duration: 3000,
      });

      return {
        success: false,
        message: errorMessage,
      };
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  const createAIHandler = useCallback((
    directAction: () => void | Promise<void>,
    actionName: string,
    userIntent: string,
    context: any = {}
  ) => {
    return async () => {
      // Execute AI action first
      const aiResult = await executeAIAction(actionName, context, userIntent);
      
      // If AI action fails or is disabled, fall back to direct action
      if (!aiResult.success) {
        try {
          await directAction();
        } catch (error) {
          toast({
            title: "Action Failed",
            description: "Both AI and direct action failed.",
            variant: "destructive",
          });
        }
      }
    };
  }, [executeAIAction, toast]);

  return {
    executeAIAction,
    createAIHandler,
    isProcessing,
    lastAction,
  };
}