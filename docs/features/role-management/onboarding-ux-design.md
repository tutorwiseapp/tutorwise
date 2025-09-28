# Onboarding UX Design Guide

## Document Information
- **Created**: September 29, 2025
- **Version**: 1.0
- **Status**: Draft
- **Related Documents**:
  - `user-onboarding-flow-specification.md` - Technical requirements
  - `role-management.md` - Core role system

## Design Philosophy

### Core Principles

#### 1. Progressive Disclosure
- **Start Simple**: Begin with essential questions only
- **Layer Complexity**: Add detail as user progresses
- **Optional Depth**: Allow users to skip non-critical information
- **Smart Defaults**: Pre-populate reasonable options

#### 2. Conversational Interface
- **Human Tone**: Use friendly, encouraging language
- **Question Format**: Frame as conversations, not forms
- **Contextual Help**: Provide explanations without overwhelming
- **Positive Reinforcement**: Celebrate progress and completion

#### 3. Visual Hierarchy
- **Clear Progress**: Always show where user is in the flow
- **Focused Attention**: One primary action per screen
- **Breathing Room**: Generous white space and padding
- **Consistent Patterns**: Reusable visual elements throughout

## User Experience Flows

### Entry Points

#### 1. Homepage CTA
```
┌─────────────────────────────────────────────────────────┐
│                    TUTORWISE                            │
│                                                         │
│        Find your perfect tutor. Start learning.        │
│                                                         │
│  ┌─────────────────┐    ┌─────────────────┐            │
│  │   Find a Tutor  │    │  Become a Tutor │            │
│  │       👨‍🎓        │    │       👩‍🏫        │            │
│  └─────────────────┘    └─────────────────┘            │
│                                                         │
│              Already have an account? Log in            │
└─────────────────────────────────────────────────────────┘
```

#### 2. Role Switcher Dropdown
```
┌─────────────────┐
│   Agent    ▼   │ ← Current role
├─────────────────┤
│ Switch to:      │
│ • Student       │
│ • Tutor         │
├─────────────────┤
│ Become:         │
│ + Student       │ ← Triggers onboarding
│ + Tutor         │
└─────────────────┘
```

### Step-by-Step Wireframes

#### Welcome Screen
```
┌─────────────────────────────────────────────────────────┐
│  ←                   TUTORWISE                      ✕   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│              🎯 Welcome to Tutorwise!                   │
│                                                         │
│         You're about to become a Student               │
│                                                         │
│              This quick setup will help us:            │
│                                                         │
│              ✓ Find perfect tutors for you             │
│              ✓ Personalize your experience             │
│              ✓ Save you time in your search            │
│                                                         │
│                                                         │
│  ┌─────────────────┐              ┌─────────────────┐   │
│  │   Let's Start   │              │    Skip Setup   │   │
│  │       💫        │              │                 │   │
│  └─────────────────┘              └─────────────────┘   │
│                                                         │
│           Takes about 3 minutes • Save anytime         │
└─────────────────────────────────────────────────────────┘
```

#### Step 1: Subject Selection
```
┌─────────────────────────────────────────────────────────┐
│  ←      What would you like to learn?             ✕    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ 🔍 Search subjects... (Math, Science, English...)  │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                         │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐       │
│  │📊   │ │🧪   │ │📚   │ │🌍   │ │💻   │ │🎨   │       │
│  │Math │ │Sci  │ │Eng  │ │Hist │ │Code │ │Art  │       │
│  │ ✓   │ │     │ │ ✓   │ │     │ │     │ │     │       │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘       │
│                                                         │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐       │
│  │🗣️   │ │🎵   │ │⚽   │ │💼   │ │🔬   │ │➕   │       │
│  │Lang │ │Music│ │Sport│ │Biz  │ │Lab  │ │More │       │
│  │     │ │     │ │     │ │     │ │     │ │     │       │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘       │
│                                                         │
│  💡 You can learn multiple subjects with different     │
│      tutors. Select all that interest you!             │
│                                                         │
│  ████▓▓▓▓▓ 1 of 5                                      │
│                                                         │
│  [← Back]                              [Continue →]    │
└─────────────────────────────────────────────────────────┘
```

#### Step 2: Skill Level Assessment
```
┌─────────────────────────────────────────────────────────┐
│  ←        What's your current level?              ✕    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📊 Math                                                │
│  ●────●────●────○────○ Intermediate                    │
│  Beginner      Advanced                                 │
│                                                         │
│  📚 English                                             │
│  ●────●────●────●────○ Advanced                        │
│  Beginner             Expert                            │
│                                                         │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ 💡 Don't worry about being "behind" - great        │ │
│  │    tutors help you progress from exactly where     │ │
│  │    you are today!                                  │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                         │
│                                                         │
│  ████████▓▓ 2 of 5                                     │
│                                                         │
│  [← Back]                              [Continue →]    │
└─────────────────────────────────────────────────────────┘
```

#### Step 3: Learning Goals
```
┌─────────────────────────────────────────────────────────┐
│  ←           What's your goal?                    ✕    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Select all that apply:                                 │
│                                                         │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ 🎯 Exam Preparation                            ✓   │ │
│  │    Get ready for tests, finals, or certifications  │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                         │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ 📈 Skill Development                               │ │
│  │    Build stronger foundation in subject areas      │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                         │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ 💼 Career Advancement                              │ │
│  │    Learn skills for job opportunities              │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                         │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ 🎯 Personal Interest                           ✓   │ │
│  │    Learn for fun and personal growth               │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                         │
│  ████████████▓ 3 of 5                                  │
│                                                         │
│  [← Back]                              [Continue →]    │
└─────────────────────────────────────────────────────────┘
```

#### Step 4: Budget & Schedule
```
┌─────────────────────────────────────────────────────────┐
│  ←        Budget & Schedule Preferences           ✕    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  💰 Budget Range (per hour)                            │
│  ●────●────●────○────○                                 │
│  £15      £25      £35      £45      £55+              │
│                                                         │
│  Most tutors in your subjects: £20-30/hour             │
│                                                         │
│  ────────────────────────────────────────────────────── │
│                                                         │
│  📅 When can you learn?                                │
│                                                         │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ │
│  │ Mon │ │ Tue │ │ Wed │ │ Thu │ │ Fri │ │ Sat │ │ Sun │ │
│  │  ✓  │ │  ✓  │ │     │ │  ✓  │ │     │ │  ✓  │ │     │ │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ │
│                                                         │
│  Preferred times:                                       │
│  □ Morning (8-12)  ✓ Afternoon (12-6)  □ Evening (6+)  │
│                                                         │
│  📍 Session format:                                     │
│  ✓ Online    □ In-person    □ Both                     │
│                                                         │
│  ████████████████▓ 4 of 5                              │
│                                                         │
│  [← Back]                              [Continue →]    │
└─────────────────────────────────────────────────────────┘
```

#### Step 5: Profile Enhancement
```
┌─────────────────────────────────────────────────────────┐
│  ←          Almost done! Profile setup            ✕    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Help tutors understand you better (optional):         │
│                                                         │
│  ┌─────────────────┐                                   │
│  │                 │  📸 Add Photo                      │
│  │       👤        │  Help tutors recognize you         │
│  │                 │  [Choose File]                     │
│  └─────────────────┘                                   │
│                                                         │
│  📝 Tell us about yourself:                            │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ I'm a university student studying psychology and    │ │
│  │ looking to improve my statistics and research       │ │
│  │ methods skills...                                   │ │
│  │                                                     │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                         │
│  🎯 Learning style preference:                         │
│  □ Visual (diagrams, charts)    ✓ Hands-on practice    │
│  □ Reading/writing              □ Auditory discussion   │
│                                                         │
│  ████████████████████ 5 of 5                           │
│                                                         │
│  [← Back]           [Skip]           [Complete Setup]   │
└─────────────────────────────────────────────────────────┘
```

#### Completion Screen
```
┌─────────────────────────────────────────────────────────┐
│                      TUTORWISE                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│                       🎉                               │
│              Welcome to Tutorwise!                     │
│                                                         │
│        Your personalized learning journey starts       │
│                      now!                              │
│                                                         │
│                 What's next?                           │
│                                                         │
│   ┌─────────────────────────────────────────────────┐   │
│   │ 👥 We found 12 tutors that match your needs    │   │
│   │                                                 │   │
│   │ Math: 5 tutors • English: 7 tutors            │   │
│   │                                                 │   │
│   │ [Browse Tutors]                                │   │
│   └─────────────────────────────────────────────────┘   │
│                                                         │
│   ┌─────────────────────────────────────────────────┐   │
│   │ 📚 Take a quick tour of your new dashboard      │   │
│   │                                                 │   │
│   │ [Start Tour]                                   │   │
│   └─────────────────────────────────────────────────┘   │
│                                                         │
│                                                         │
│              [Go to Dashboard]                          │
└─────────────────────────────────────────────────────────┘
```

## Design System Components

### Interactive Elements

#### 1. Subject Selection Grid
```scss
.subject-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 16px;
  padding: 24px;

  .subject-card {
    aspect-ratio: 1;
    border: 2px solid #e5e7eb;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      border-color: #3b82f6;
      background-color: #f8fafc;
    }

    &.selected {
      border-color: #3b82f6;
      background-color: #dbeafe;

      .checkmark {
        display: block;
      }
    }

    .icon {
      font-size: 24px;
      margin-bottom: 8px;
    }

    .label {
      font-size: 14px;
      font-weight: 500;
      color: #374151;
    }

    .checkmark {
      display: none;
      position: absolute;
      top: 8px;
      right: 8px;
      color: #3b82f6;
    }
  }
}
```

#### 2. Skill Level Sliders
```scss
.skill-slider {
  margin: 24px 0;

  .subject-label {
    display: flex;
    align-items: center;
    margin-bottom: 16px;
    font-weight: 500;
    color: #374151;

    .icon {
      margin-right: 8px;
      font-size: 18px;
    }
  }

  .slider-container {
    position: relative;
    height: 40px;
  }

  .slider {
    -webkit-appearance: none;
    width: 100%;
    height: 8px;
    border-radius: 4px;
    background: #e5e7eb;
    outline: none;

    &::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #3b82f6;
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
  }

  .level-labels {
    display: flex;
    justify-content: space-between;
    margin-top: 8px;
    font-size: 12px;
    color: #6b7280;
  }
}
```

#### 3. Progress Indicator
```scss
.progress-indicator {
  display: flex;
  align-items: center;
  margin: 32px 0;

  .progress-bar {
    flex: 1;
    height: 8px;
    background: #e5e7eb;
    border-radius: 4px;
    overflow: hidden;
    margin-right: 16px;

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #3b82f6, #1d4ed8);
      transition: width 0.3s ease;
    }
  }

  .progress-text {
    font-size: 14px;
    color: #6b7280;
    font-weight: 500;
    white-space: nowrap;
  }
}
```

### Responsive Design

#### Mobile Optimizations
```scss
@media (max-width: 768px) {
  .onboarding-container {
    padding: 16px;

    .subject-grid {
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;

      .subject-card {
        .icon {
          font-size: 20px;
        }
        .label {
          font-size: 12px;
        }
      }
    }

    .step-navigation {
      flex-direction: column;
      gap: 12px;

      .btn {
        width: 100%;
        order: 2;

        &.btn-primary {
          order: 1;
        }
      }
    }
  }
}
```

#### Tablet Adaptations
```scss
@media (min-width: 769px) and (max-width: 1024px) {
  .onboarding-container {
    max-width: 600px;
    margin: 0 auto;

    .subject-grid {
      grid-template-columns: repeat(4, 1fr);
    }
  }
}
```

## Animation & Transitions

### Step Transitions
```scss
.step-transition {
  &-enter {
    opacity: 0;
    transform: translateX(30px);
  }

  &-enter-active {
    opacity: 1;
    transform: translateX(0);
    transition: all 0.3s ease-out;
  }

  &-exit {
    opacity: 1;
    transform: translateX(0);
  }

  &-exit-active {
    opacity: 0;
    transform: translateX(-30px);
    transition: all 0.3s ease-in;
  }
}
```

### Progress Animation
```scss
@keyframes progressFill {
  from {
    width: 0%;
  }
  to {
    width: var(--progress-width);
  }
}

.progress-fill {
  animation: progressFill 0.6s ease-out forwards;
}
```

### Success Celebration
```scss
@keyframes celebrate {
  0% {
    transform: scale(0.8);
    opacity: 0;
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.completion-icon {
  animation: celebrate 0.6s ease-out;
}
```

## Accessibility Guidelines

### Screen Reader Support
- All form elements have proper labels and descriptions
- Progress indicator announces current step
- Skip links provided for keyboard navigation
- Error messages clearly associated with form fields

### Keyboard Navigation
- Tab order follows logical flow through steps
- Enter key advances to next step when appropriate
- Escape key allows exit/cancel
- Arrow keys navigate within multi-option selections

### Color and Contrast
- All text meets WCAG AA contrast ratios (4.5:1 minimum)
- Interactive elements have focus indicators
- Selection states don't rely solely on color
- Icons paired with text labels where possible

### Touch Targets
- Minimum 44px touch targets on mobile
- Adequate spacing between interactive elements
- Swipe gestures for step navigation on mobile
- Large, clear call-to-action buttons

## Content Guidelines

### Voice and Tone
- **Encouraging**: "Great choice! Math tutors love working with determined students."
- **Supportive**: "Don't worry about your current level - every expert was once a beginner."
- **Clear**: "Select the subjects you'd like to learn" (not "Choose your academic focus areas")
- **Personal**: "What would you like to learn?" (not "Select learning objectives")

### Copy Principles
1. **Benefit-focused**: Explain what's in it for the user
2. **Progress-oriented**: Show advancement and completion
3. **Inclusive**: Avoid assumptions about background or ability
4. **Concise**: Respect user time with clear, brief explanations

### Error Messages
- **Helpful**: "Please select at least one subject to find tutors"
- **Actionable**: "Choose a budget range to see tutor recommendations"
- **Non-judgmental**: "This field helps us match you better" (not "Required field")

## Testing Guidelines

### Usability Testing
1. **Task Completion**: Can users complete onboarding without assistance?
2. **Comprehension**: Do users understand what each step is asking?
3. **Motivation**: Do users feel engaged throughout the process?
4. **Value Perception**: Do users see benefit in providing information?

### A/B Testing Opportunities
1. **Step Order**: Test different question sequences
2. **Progress Indicators**: Linear vs. circular progress display
3. **Skip Options**: Different skip button placement and messaging
4. **Visual Design**: Icon styles, color schemes, spacing variations

### Performance Metrics
- **Completion Rate**: Target >75% for essential steps
- **Time to Complete**: Target <5 minutes average
- **Drop-off Points**: Identify steps with highest abandonment
- **User Satisfaction**: Post-onboarding survey scores

## Implementation Notes

### Development Phases
1. **Core Flow**: Basic step navigation and data collection
2. **Enhanced UX**: Animations, transitions, and polish
3. **Advanced Features**: Smart defaults, adaptive questioning
4. **Optimization**: Performance tuning and A/B testing

### Technical Considerations
- Progressive Web App capabilities for offline completion
- Image optimization for fast loading on mobile
- Form validation that doesn't interrupt user flow
- Analytics integration for funnel optimization

This design guide provides the foundation for creating an engaging, accessible, and effective onboarding experience that converts users into active platform participants while gathering valuable data for personalization and matching.