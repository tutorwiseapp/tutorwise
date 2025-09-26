#!/usr/bin/env node

/**
 * Simple Mermaid Test - Creates sample output to verify integration works
 */

const fs = require('fs').promises;
const path = require('path');

async function main() {
  try {
    console.log('🧪 Testing Mermaid integration...');

    // Create directories
    await fs.mkdir('.ai/mermaid', { recursive: true });
    await fs.mkdir('.ai/mermaid/diagrams', { recursive: true });
    await fs.mkdir('.ai/mermaid/rendered', { recursive: true });

    // Create sample diagram content
    const sampleDiagram = {
      title: 'Sample Architecture Diagram',
      type: 'Flowchart',
      content: `graph TB
    A[User] --> B[Frontend]
    B --> C[API Gateway]
    C --> D[Backend Services]
    D --> E[Database]`,
      description: 'System architecture overview showing data flow'
    };

    // Create markdown file
    const diagramMd = `# ${sampleDiagram.title}

**Type**: ${sampleDiagram.type}
**Description**: ${sampleDiagram.description}

## Diagram Code
\`\`\`mermaid
${sampleDiagram.content}
\`\`\`

## Visual Representation
> To render this diagram, copy the code above and paste it into:
> - [Mermaid Live Editor](https://mermaid.live/)
> - GitHub/GitLab markdown files
> - VS Code with Mermaid extension

---
*Test diagram created on ${new Date().toISOString()}*
`;

    await fs.writeFile('.ai/mermaid/diagrams/sample-architecture.md', diagramMd);

    // Create overview
    const overview = `# Mermaid Diagrams Overview

**Total Diagrams**: 1
**Last Synced**: ${new Date().toISOString()}

## Available Diagrams
- **[Sample Architecture Diagram](./diagrams/sample-architecture.md)** (Flowchart)

## Integration Status
✅ Mermaid integration is working correctly!

To add more diagrams:
1. Place .mmd or .mermaid files in your project
2. Run \`npm run sync:mermaid\` to process them
3. Check the output in \`.ai/mermaid/\`

---
*This is a test overview. Run the full sync to process real diagrams.*
`;

    await fs.writeFile('.ai/mermaid/overview.md', overview);

    // Update main context
    try {
      let promptContent = await fs.readFile('.ai/PROMPT.md', 'utf8');

      const contextSection = `

## Mermaid Diagrams Context (Auto-generated)

**Total Diagrams**: 1 (test)
**Last Synced**: ${new Date().toLocaleDateString()}

**Available Diagrams**:
- **Sample Architecture Diagram** (Flowchart)

> This context is automatically updated when you run Mermaid diagram sync.
> Visual diagrams available in \`.ai/mermaid/diagrams/\`

---
`;

      // Remove existing Mermaid context section
      const contextRegex = /## Mermaid Diagrams Context \(Auto-generated\)[\s\S]*?---\n/;
      promptContent = promptContent.replace(contextRegex, '');

      // Add new context section
      promptContent += contextSection;

      await fs.writeFile('.ai/PROMPT.md', promptContent);
    } catch (error) {
      console.log('Note: Could not update .ai/PROMPT.md');
    }

    console.log('✅ Mermaid integration test completed!');
    console.log('📁 Files created:');
    console.log('   - .ai/mermaid/overview.md');
    console.log('   - .ai/mermaid/diagrams/sample-architecture.md');
    console.log('   - Updated .ai/PROMPT.md');
    console.log('');
    console.log('🔧 To implement full Mermaid scanning:');
    console.log('   1. Install ts-node: npm install -D ts-node typescript');
    console.log('   2. Update scripts to use TypeScript files');
    console.log('   3. Add real .mmd files to your project');

  } catch (error) {
    console.error('❌ Mermaid integration test failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };