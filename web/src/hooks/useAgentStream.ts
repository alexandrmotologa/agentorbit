import { useEffect, useState, useCallback, useRef } from 'react';

export interface AgentStep {
  id?: string;
  taskId: string;
  stepNumber: number;
  type: 'THOUGHT' | 'ACTION' | 'OBSERVATION' | 'FINAL_ANSWER' | 'SYSTEM' | 'ERROR' | 'WAITING_APPROVAL';
  thought?: string;
  toolName?: string;
  toolInput?: any;
  toolOutput?: string;
  finalAnswer?: string;
  timestamp: number;
}

export interface PendingApproval {
  id?: string;
  toolName: string;
  parameters: any;
  createdAt: number;
}

export function useAgentStream(taskId: string | null) {
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [status, setStatus] = useState<'idle' | 'running' | 'waiting_approval' | 'completed' | 'failed'>('idle');
  const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(null);
  const [finalAnswer, setFinalAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);

  // Load initial task state and steps from REST API
  useEffect(() => {
    if (!taskId) {
      setSteps([]);
      setStatus('idle');
      setPendingApproval(null);
      setFinalAnswer(null);
      return;
    }

    let isMounted = true;

    async function fetchTask() {
      try {
        const res = await fetch(`/api/tasks/${taskId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!isMounted) return;

        if (data.task) {
          setStatus(data.task.status);
          if (data.task.result) setFinalAnswer(data.task.result);
        }
        if (data.steps) {
          setSteps(data.steps);
        }
        if (data.pendingApproval) {
          setPendingApproval(data.pendingApproval);
        }
      } catch (err: any) {
        console.warn('Failed to prefetch task state:', err.message);
      }
    }

    fetchTask();

    // Connect Server-Sent Events stream
    const es = new EventSource(`/api/tasks/${taskId}/stream`);
    eventSourceRef.current = es;

    es.addEventListener('step', (event) => {
      try {
        const step: AgentStep = JSON.parse(event.data);
        setSteps((prev) => {
          // Prevent duplicates by stepNumber + type
          const exists = prev.some((p) => p.stepNumber === step.stepNumber && p.type === step.type);
          if (exists) return prev;
          return [...prev, step];
        });

        if (step.type === 'WAITING_APPROVAL') {
          setStatus('waiting_approval');
          setPendingApproval({
            toolName: step.toolName || 'Unknown Tool',
            parameters: step.toolInput,
            createdAt: step.timestamp,
          });
        } else if (step.type === 'FINAL_ANSWER') {
          setStatus('completed');
          setFinalAnswer(step.finalAnswer || step.thought || 'Task completed.');
          setPendingApproval(null);
        } else if (step.type === 'ERROR') {
          setStatus('failed');
          setError(step.thought || 'Execution failed.');
        } else {
          setStatus('running');
        }
      } catch (e: any) {
        console.error('Error parsing SSE step:', e);
      }
    });

    es.addEventListener('done', () => {
      es.close();
    });

    es.onerror = () => {
      // Reconnection handled automatically by browser EventSource
    };

    return () => {
      isMounted = false;
      es.close();
      eventSourceRef.current = null;
    };
  }, [taskId]);

  const submitApproval = useCallback(
    async (approved: boolean) => {
      if (!taskId) return;
      try {
        const res = await fetch(`/api/tasks/${taskId}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ approved }),
        });
        if (res.ok) {
          setPendingApproval(null);
          setStatus('running');
        }
      } catch (e: any) {
        console.error('Failed to submit approval:', e);
      }
    },
    [taskId]
  );

  return {
    steps,
    status,
    pendingApproval,
    finalAnswer,
    error,
    submitApproval,
  };
}
