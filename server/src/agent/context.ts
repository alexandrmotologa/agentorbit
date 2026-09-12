export interface ScratchpadStep {
  stepNumber: number;
  thought: string;
  action?: {
    tool: string;
    params: any;
  };
  observation?: string;
  timestamp: number;
}

export class AgentContextWindow {
  private steps: ScratchpadStep[] = [];
  private maxHistorySteps: number;

  constructor(maxHistorySteps: number = 8) {
    this.maxHistorySteps = maxHistorySteps;
  }

  addStep(step: ScratchpadStep): void {
    this.steps.push(step);
    if (this.steps.length > this.maxHistorySteps) {
      this.steps.shift();
    }
  }

  getSteps(): ScratchpadStep[] {
    return [...this.steps];
  }

  formatForPrompt(): string {
    if (this.steps.length === 0) {
      return 'No prior steps executed.';
    }

    return this.steps
      .map((s) => {
        let str = `Step ${s.stepNumber}:\nThought: ${s.thought}`;
        if (s.action) {
          str += `\nAction: ${s.action.tool}(${JSON.stringify(s.action.params)})`;
        }
        if (s.observation) {
          str += `\nObservation: ${s.observation}`;
        }
        return str;
      })
      .join('\n\n');
  }

  clear(): void {
    this.steps = [];
  }
}
