/**
 * Filename: apps/web/src/app/(admin)/admin/resources/components/ContentTemplates.tsx
 * Purpose: Reusable content templates for article creation
 * Created: 2026-02-02
 * Updated: 2026-02-02 - Use HubComplexModal for consistency
 *
 * Provides:
 * - Pre-defined article structures
 * - Quick start templates for common content types
 * - One-click template application
 */
'use client';

import React, { useState } from 'react';
import HubComplexModal from '@/app/components/hub/modal/HubComplexModal/HubComplexModal';
import Button from '@/app/components/ui/actions/Button';
import styles from './ContentTemplates.module.css';

interface ContentTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  content: string;
}

interface ContentTemplatesProps {
  onSelect: (template: ContentTemplate) => void;
  onClose: () => void;
}

const TEMPLATES: ContentTemplate[] = [
  {
    id: 'how-to-guide',
    name: 'How-To Guide',
    description: 'Step-by-step instructions for completing a task',
    category: 'for-tutors',
    content: `# How to [Task Name]

Learn how to [brief description of what this guide covers].

## Prerequisites

Before you begin, make sure you have:

- Requirement 1
- Requirement 2
- Requirement 3

## Step 1: [First Step Title]

[Detailed explanation of the first step]

## Step 2: [Second Step Title]

[Detailed explanation of the second step]

## Step 3: [Third Step Title]

[Detailed explanation of the third step]

## Tips for Success

- Tip 1
- Tip 2
- Tip 3

## Common Issues

### Issue 1
[Solution to common issue 1]

### Issue 2
[Solution to common issue 2]

## Conclusion

[Summarize what the reader has learned and next steps]

---

*Need more help? [Contact our support team](/contact)*`,
  },
  {
    id: 'getting-started',
    name: 'Getting Started',
    description: 'Introduction guide for new users',
    category: 'getting-started',
    content: `# Getting Started with [Feature/Product Name]

Welcome to [Feature/Product Name]! This guide will help you get up and running quickly.

## What is [Feature/Product Name]?

[Brief explanation of the feature or product and its benefits]

## Quick Start

### 1. Create Your Account

[Instructions for account creation or setup]

### 2. Set Up Your Profile

[Instructions for profile setup]

### 3. Explore Key Features

[Overview of main features with brief descriptions]

## Key Features

### Feature 1
[Description of feature 1]

### Feature 2
[Description of feature 2]

### Feature 3
[Description of feature 3]

## Best Practices

1. **Do this first** - Explanation
2. **Then do this** - Explanation
3. **Finally** - Explanation

## Next Steps

Now that you're set up, here are some recommended next steps:

- [Link to related guide 1](/resources/guide-1)
- [Link to related guide 2](/resources/guide-2)
- [Link to related guide 3](/resources/guide-3)

---

*Have questions? Check out our [FAQ](/resources/faq) or [contact support](/contact).*`,
  },
  {
    id: 'faq-article',
    name: 'FAQ Article',
    description: 'Frequently asked questions format',
    category: 'faqs',
    content: `# [Topic] FAQ

Find answers to the most common questions about [topic].

## General Questions

### What is [topic]?

[Answer to the question]

### Why should I use [topic]?

[Answer with benefits and value proposition]

### Who is [topic] for?

[Answer describing target audience]

## Getting Started

### How do I get started with [topic]?

[Step-by-step answer]

### What do I need to use [topic]?

[List of requirements or prerequisites]

## Features & Usage

### How do I [common task 1]?

[Detailed answer with steps if needed]

### How do I [common task 2]?

[Detailed answer with steps if needed]

### Can I [common question about capabilities]?

[Yes/No with explanation]

## Troubleshooting

### Why isn't [feature] working?

[Common causes and solutions]

### I'm having issues with [common problem]. What should I do?

[Troubleshooting steps]

## Still Have Questions?

If you couldn't find the answer you're looking for:

- Browse our [Help Centre](/resources)
- Contact our [support team](/contact)
- Join our [community forum](/community)`,
  },
  {
    id: 'product-update',
    name: 'Product Update',
    description: 'Announce new features or changes',
    category: 'product-updates',
    content: `# [Feature Name]: [Brief Description]

We're excited to announce [feature name], now available for all users!

## What's New

[2-3 sentence overview of the update and why it matters]

## Key Highlights

### [Highlight 1]
[Description of first major improvement]

### [Highlight 2]
[Description of second major improvement]

### [Highlight 3]
[Description of third major improvement]

## How It Works

[Explanation of how users can access and use the new feature]

### Step 1
[First step to use the feature]

### Step 2
[Second step]

### Step 3
[Third step]

## Why We Built This

[Brief explanation of user feedback or problems that led to this feature]

## What's Next

We're continuing to improve [area] with upcoming features including:

- Upcoming feature 1
- Upcoming feature 2
- Upcoming feature 3

## Your Feedback Matters

We'd love to hear what you think! Share your feedback:

- Email us at feedback@tutorwise.com
- Use the feedback button in the app
- Reply to this article in the comments

---

*[Feature] is available now for all users. [Log in](/login) to try it out!*`,
  },
  {
    id: 'best-practices',
    name: 'Best Practices',
    description: 'Expert tips and recommendations',
    category: 'best-practices',
    content: `# Best Practices for [Topic]

Follow these proven strategies to [achieve goal] and [benefit].

## Why This Matters

[Explain why following these best practices is important]

## The Fundamentals

### 1. [First Best Practice]

**Why:** [Explanation of why this matters]

**How:** [Actionable steps to implement]

**Example:**
> [Real example or case study]

### 2. [Second Best Practice]

**Why:** [Explanation of why this matters]

**How:** [Actionable steps to implement]

**Example:**
> [Real example or case study]

### 3. [Third Best Practice]

**Why:** [Explanation of why this matters]

**How:** [Actionable steps to implement]

**Example:**
> [Real example or case study]

## Advanced Tips

Once you've mastered the fundamentals, try these advanced strategies:

- Advanced tip 1
- Advanced tip 2
- Advanced tip 3

## Common Mistakes to Avoid

**Mistake 1:** [Description]
**Instead:** [What to do]

**Mistake 2:** [Description]
**Instead:** [What to do]

**Mistake 3:** [Description]
**Instead:** [What to do]

## Checklist

Use this checklist to ensure you're following best practices:

- [ ] Item 1
- [ ] Item 2
- [ ] Item 3
- [ ] Item 4
- [ ] Item 5

## Resources

- [Related guide 1](/resources/guide-1)
- [Related guide 2](/resources/guide-2)
- [External resource](https://example.com)

---

*Want more tips? Subscribe to our [newsletter](/subscribe) for weekly insights.*`,
  },
  {
    id: 'success-story',
    name: 'Success Story',
    description: 'Case study or customer story format',
    category: 'success-stories',
    content: `# How [Customer/Tutor Name] Achieved [Result] with Tutorwise

[One-sentence summary of the success story]

## The Challenge

[Describe the initial situation and challenges faced]

- Challenge 1
- Challenge 2
- Challenge 3

## The Solution

[Explain how they used Tutorwise to address the challenges]

### What They Did

1. **Step 1:** [Action taken]
2. **Step 2:** [Action taken]
3. **Step 3:** [Action taken]

### Key Features Used

- Feature 1: [How it helped]
- Feature 2: [How it helped]
- Feature 3: [How it helped]

## The Results

After [time period], [Customer/Tutor Name] achieved:

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| [Metric 1] | [Value] | [Value] | [%] |
| [Metric 2] | [Value] | [Value] | [%] |
| [Metric 3] | [Value] | [Value] | [%] |

## In Their Words

> "[Testimonial quote from the customer about their experience with Tutorwise]"
>
> — [Name], [Title/Role]

## Key Takeaways

What you can learn from this success story:

1. **Takeaway 1:** [Explanation]
2. **Takeaway 2:** [Explanation]
3. **Takeaway 3:** [Explanation]

## Start Your Success Story

Ready to achieve similar results? Here's how to get started:

- [Getting started guide](/resources/getting-started)
- [Book a demo](/demo)
- [Sign up free](/signup)

---

*Do you have a success story to share? [Contact us](/contact) — we'd love to feature you!*`,
  },
];

export default function ContentTemplates({ onSelect, onClose }: ContentTemplatesProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<ContentTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTemplates = TEMPLATES.filter(
    (template) =>
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = () => {
    if (selectedTemplate) {
      onSelect(selectedTemplate);
    }
  };

  return (
    <HubComplexModal
      isOpen={true}
      onClose={onClose}
      title="Choose a Template"
      size="md"
      footer={
        <div className={styles.footer}>
          <Button variant="secondary" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSelect}
            disabled={!selectedTemplate}
          >
            Use Template
          </Button>
        </div>
      }
    >
      <div className={styles.content}>
        <div className={styles.search}>
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.templateGrid}>
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className={`${styles.templateCard} ${
                selectedTemplate?.id === template.id ? styles.selected : ''
              }`}
              onClick={() => setSelectedTemplate(template)}
            >
              <div className={styles.templateContent}>
                <h4 className={styles.templateName}>{template.name}</h4>
                <p className={styles.templateDescription}>{template.description}</p>
              </div>
              {selectedTemplate?.id === template.id && (
                <span className={styles.checkmark}>✓</span>
              )}
            </div>
          ))}
        </div>

        {selectedTemplate && (
          <div className={styles.preview}>
            <h4 className={styles.previewTitle}>Preview</h4>
            <div className={styles.previewContent}>
              <pre>{selectedTemplate.content.substring(0, 500)}...</pre>
            </div>
          </div>
        )}
      </div>
    </HubComplexModal>
  );
}
