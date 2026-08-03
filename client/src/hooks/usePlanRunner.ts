import { useState } from 'react';

interface PlanStep {
  tool: string;
  args: Record<string, any>;
}

interface Plan {
  steps: PlanStep[];
  explanation: string;
  risk_level: 'low' | 'medium' | 'high';
  estimated_duration: string;
}

interface PlanResponse {
  type: string;
  plan?: Plan;
  response?: string;
  outputs?: any[];
  error?: string;
  timestamp: string;
}

export function usePlanRunner() {
  const [pendingPlan, setPendingPlan] = useState<Plan | null>(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [executingPlan, setExecutingPlan] = useState(false);

  const sendChatMessage = async (message: string, usePlanner = false): Promise<PlanResponse> => {
    const response = await fetch('/api/agent/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message, 
        studioId: "e5dc81e8-7073-4041-8814-affb60f4ef6c", 
        userId: "admin" 
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Convert the new API format to the expected format
    const result: PlanResponse = {
      type: "agent_response",
      response: data.response,
      status: "success",
      timestamp: new Date().toISOString()
    };

    return result;
  };

  const executePlan = async (plan: Plan): Promise<PlanResponse> => {
    setExecutingPlan(true);
    try {
      const response = await fetch('/api/crm/agent/execute-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } finally {
      setExecutingPlan(false);
      setShowPlanModal(false);
      setPendingPlan(null);
    }
  };

  const cancelPlan = () => {
    setShowPlanModal(false);
    setPendingPlan(null);
  };

  return {
    pendingPlan,
    showPlanModal,
    executingPlan,
    sendChatMessage,
    executePlan,
    cancelPlan
  };
}