// cas/agents/tests/in-memory-developer-agent.js

class InMemoryDeveloperAgent {
  constructor() {
    this.todos = [];
    this.completedFeatures = [];
  }

  start() {}
  stop() {}

  updateFromTodos(todos, featureName) {
    this.todos.push({ featureName, todos });
  }

  markFeatureComplete(featureName, completedDate) {
    this.completedFeatures.push({ featureName, completedDate });
  }
}

module.exports = InMemoryDeveloperAgent;
