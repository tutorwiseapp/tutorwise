// cas/agents/tests/in-memory-developer-agent.ts

interface Todo {
  featureName: string;
  todos: any[];
}

interface CompletedFeature {
  featureName: string;
  completedDate: string;
}

class InMemoryDeveloperAgent {
  public todos: Todo[] = [];
  public completedFeatures: CompletedFeature[] = [];

  start(): void {}
  stop(): void {}

  updateFromTodos(todos: any[], featureName: string): void {
    this.todos.push({ featureName, todos });
  }

  markFeatureComplete(featureName: string, completedDate: string): void {
    this.completedFeatures.push({ featureName, completedDate });
  }
}

export default InMemoryDeveloperAgent;

