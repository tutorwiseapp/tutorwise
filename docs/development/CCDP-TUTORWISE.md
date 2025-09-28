# Claude Code Development Process (CCDP) for Tutorwise
## Professional Documentation v1.0

---

## Table of Contents
1. [Overview](#overview)
2. [Tutorwise-Specific Customizations](#tutorwise-specific-customizations)
3. [The Four Stages](#the-four-stages)
4. [Infrastructure & Tools](#infrastructure--tools)
5. [Design System Integration](#design-system-integration)
6. [Quality Assurance](#quality-assurance)
7. [Documentation Standards](#documentation-standards)
8. [Lessons Learned](#lessons-learned)
9. [Implementation Guidelines](#implementation-guidelines)

---

## Overview

The **Claude Code Development Process (CCDP)** is Anthropic's methodology adapted specifically for Tutorwise's educational platform. This process emphasizes 100% AI-driven development with rapid prototyping, visual validation, and systematic iteration.

### Core Philosophy
- **100% AI-Driven**: Claude handles planning, design, coding, testing, and documentation
- **Rapid Iteration**: 5-10 prototypes per feature, frequent commits
- **Visual-First**: "Write code, screenshot, iterate" approach
- **Context Engineering**: Systematic use of CLAUDE.md and tracking files

---

## Tutorwise-Specific Customizations

### **Technology Stack Integration**
- **Frontend**: Next.js 13+ with App Router, TypeScript, Tailwind CSS
- **Backend**: Supabase PostgreSQL, Neo4j graph database
- **Authentication**: Supabase Auth with UserProfileContext
- **Payments**: Stripe integration with webhooks
- **Deployment**: Vercel (frontend) + Railway (backend services)

### **Business Context**
- **Multi-Role Platform**: Agents, Tutors (providers), Students (seekers)
- **Educational Focus**: Lesson management, referral systems, payments
- **Production Application**: Serving real users with real transactions

### **Design System**
- **CSS Variables**: Consistent spacing, colors, typography
- **Component Library**: Reusable UI components with module CSS
- **Responsive Design**: Mobile-first approach
- **Accessibility**: WCAG compliance requirements

---

## The Four Stages

### **1. EXPLORE**
**Objective**: Understand requirements, context, and existing architecture

#### **Tutorwise-Specific Actions:**
- **Codebase Analysis**: Use Glob/Grep tools to understand existing patterns
- **User Role Context**: Analyze multi-role implications (agent/tutor/student)
- **Integration Points**: Identify Supabase, Stripe, Neo4j touchpoints
- **Design Reference Study**: Thoroughly analyze provided mockups/references
- **Business Logic Review**: Understand educational platform workflows

#### **Tools & Files:**
- Read existing components in `src/app/components/`
- Review `src/app/contexts/UserProfileContext.tsx` for role management
- Analyze payment flows in `src/app/payments/`
- Study design patterns in existing CSS modules

#### **Deliverables:**
- Context understanding documented in session notes
- Existing pattern identification
- Integration requirements mapping

### **2. PLAN**
**Objective**: Design comprehensive solution with multiple variants

#### **Tutorwise-Specific Actions:**
- **Generate 5-10 Design Variants**: Different approaches to the same feature
- **Role-Aware Planning**: Consider all user roles and states
- **Component Architecture**: Plan integration with existing design system
- **Data Flow Design**: Map Supabase/Neo4j data requirements
- **Testing Strategy**: Define visual and functional testing approach

#### **Tools & Files:**
- Update `.claude/CLAUDE.md` with feature-specific guidelines
- Create `tasks.md` for iteration tracking
- Use `session.md` for progress documentation
- Plan component placement in existing directory structure

#### **Deliverables:**
- Multiple design prototypes
- Technical architecture plan
- Integration strategy
- Testing approach definition

### **3. CODE**
**Objective**: Implement systematically with rapid iteration

#### **Tutorwise-Specific Actions:**
- **Small Incremental Changes**: Frequent commits with focused changes
- **Visual Validation**: Screenshot after each significant change
- **TypeScript First**: Maintain type safety throughout
- **CSS Module Integration**: Follow existing styling patterns
- **Role Context Integration**: Properly integrate with UserProfileContext

#### **Implementation Standards:**
- **File Structure**: Follow Next.js 13+ app directory conventions
- **Component Patterns**: Use existing patterns from `src/app/components/`
- **Styling**: CSS modules with consistent variable usage
- **State Management**: Integrate with existing context providers
- **Error Handling**: Follow established error patterns

#### **Quality Checks:**
- TypeScript compilation success
- CSS specificity management
- Responsive design verification
- Cross-browser compatibility

### **4. COMMIT**
**Objective**: Validate, test, and deploy with confidence

#### **Tutorwise-Specific Actions:**
- **Multi-Role Testing**: Test across all user roles and states
- **Payment Flow Testing**: Verify Stripe integration integrity
- **Database Integration**: Confirm Supabase/Neo4j operations
- **Visual Regression**: Compare with design references
- **Performance Validation**: Ensure no degradation

#### **Testing Checklist:**
- [ ] All user roles tested (agent, tutor, student)
- [ ] Authentication states verified
- [ ] Payment flows unaffected
- [ ] Mobile responsiveness confirmed
- [ ] Accessibility standards met
- [ ] Cross-browser testing completed

#### **Deployment Process:**
- Vercel preview deployment review
- Production deployment
- Post-deployment monitoring
- User feedback collection

---

## Infrastructure & Tools

### **Development Environment**
- **Primary IDE**: VS Code with TypeScript support
- **Package Manager**: npm (following existing patterns)
- **Build Tool**: Next.js built-in webpack configuration
- **Development Server**: `npm run dev`

### **Database Management**
- **Supabase**: Primary database with Row Level Security
- **Neo4j**: Graph database for relationships
- **Redis**: Session management via Railway

### **Deployment Pipeline**
- **Vercel**: Automatic deployments from main branch
- **Railway**: Backend services deployment
- **Environment Variables**: Managed through platform dashboards

### **Monitoring & Analytics**
- **Vercel Analytics**: Performance monitoring
- **Supabase Dashboard**: Database monitoring
- **Error Tracking**: Built-in Next.js error boundaries

---

## Design System Integration

### **CSS Architecture**
```css
/* Variable Usage */
--space-1: 0.5rem;   /* 8px */
--space-2: 1rem;     /* 16px */
--border-radius-sm: 4px;
--border-radius-md: 8px;
--font-weight-medium: 500;
--font-weight-semibold: 600;
```

### **Component Conventions**
- **CSS Modules**: `ComponentName.module.css`
- **TypeScript**: All components fully typed
- **Props Interface**: `ComponentNameProps`
- **Export Pattern**: Default export for components

### **Responsive Design**
- **Mobile First**: Design for mobile, enhance for desktop
- **Breakpoints**: Follow Tailwind CSS conventions
- **Touch Targets**: Minimum 44px for interactive elements

### **Accessibility**
- **Semantic HTML**: Proper heading hierarchy, ARIA labels
- **Keyboard Navigation**: Tab order, focus management
- **Color Contrast**: WCAG AA compliance
- **Screen Reader**: Descriptive alt text, labels

---

## Quality Assurance

### **Code Quality**
- **TypeScript**: Strict mode enabled, no `any` types
- **ESLint**: Follow existing configuration
- **Prettier**: Consistent code formatting
- **Git Hooks**: Pre-commit quality checks

### **Testing Strategy**
- **Unit Tests**: Component logic testing
- **Integration Tests**: User flow testing
- **Visual Tests**: Screenshot comparisons
- **Accessibility Tests**: Automated a11y checking

### **Performance Standards**
- **Core Web Vitals**: LCP < 2.5s, FID < 100ms, CLS < 0.1
- **Bundle Size**: Monitor and optimize
- **Image Optimization**: Next.js Image component usage
- **Database Queries**: Optimize Supabase calls

---

## Documentation Standards

### **Code Documentation**
```typescript
/*
 * Filename: src/app/components/example/Component.tsx
 * Purpose: Brief description of component purpose
 * Change History:
 * C001 - YYYY-MM-DD : HH:MM - Initial creation
 * Last Modified: YYYY-MM-DD : HH:MM
 * Requirement ID: Feature identifier
 * Change Summary: Description of changes and impact
 */
```

### **CLAUDE.md Maintenance**
- **Update for each feature**: Add specific guidelines
- **Include patterns**: Code examples and conventions
- **Document decisions**: Architecture choices and rationale

### **Session Documentation**
- **Progress Tracking**: Use `session.md` for current work
- **Task Management**: Use `tasks.md` for iteration tracking
- **Handover Notes**: Use `handover.md` for context transfer

---

## Lessons Learned

### **Role Switching Implementation Analysis**
The role switching feature implementation (September 2025) revealed critical process improvements and serves as our primary case study for CCDP methodology.

#### **Original Requirements:**
- Integrate role switching into navigation following Airbnb design patterns
- Add "become" onboarding links for role expansion
- Hide current user's role from onboarding options
- Maintain visual consistency across navigation

#### **What Went Wrong - Detailed Analysis:**

##### **1. EXPLORE Phase Failures:**
- **Insufficient Design Research**: Did not thoroughly study provided Airbnb reference before implementation
- **Missed Context Clues**: User said "study this image" but we proceeded without deep analysis
- **No Architecture Analysis**: Failed to understand existing NavMenu integration requirements
- **Assumption-Based Development**: Assumed standalone component approach without validation

##### **2. PLAN Phase Failures:**
- **Single Solution Approach**: Implemented one approach instead of generating 5-10 variants
- **No Visual Mockups**: Jumped to code without wireframes or design specifications
- **Missing Integration Strategy**: Didn't plan how role switching would integrate with existing navigation
- **No CSS Architecture Planning**: Led to global style conflicts requiring multiple fixes

##### **3. CODE Phase Failures:**
- **Wrong Initial Approach**: Built standalone RoleSwitcher component that had to be completely redesigned
- **Fragmented Implementation**: Added features in isolation without considering holistic navigation experience
- **Reactive Problem Solving**: Fixed issues as they arose instead of systematic implementation
- **Multiple Redesign Cycles**: Required complete architectural changes mid-implementation

##### **4. COMMIT Phase Failures:**
- **Late Visual Validation**: Design problems discovered after implementation
- **Piecemeal Testing**: Fixed styling issues one by one instead of comprehensive validation
- **Multiple Correction Rounds**: Font inconsistencies, spacing issues, radius misalignment discovered late
- **Post-Implementation Fixes**: Role logic, conditional rendering, CSS specificity all fixed after "completion"

#### **Specific Technical Issues:**

##### **CSS Architecture Problems:**
- **Global Style Conflicts**: Navigation links affected by global `a` styles requiring `!important` overrides
- **Inconsistent Spacing**: Different padding/margin patterns across menu items
- **Font Weight Misalignment**: Become items used `semibold` while menu items used `medium`
- **Border Radius Inconsistency**: NavMenu used `16px` while cards used `8px`

##### **Component Design Issues:**
- **Wrong Component Placement**: Initially in Header, should have been in NavMenu from start
- **Tight Coupling**: Role switching logic scattered across multiple components
- **Missing Conditional Logic**: Didn't hide current role from onboarding options initially
- **Poor User Experience**: Multiple iterations needed to achieve Airbnb-like design

##### **State Management Issues:**
- **Context Integration Problems**: Improper integration with UserProfileContext
- **Role State Confusion**: Active role vs available roles logic implemented incorrectly initially

#### **Process Improvements - Specific Actions:**

##### **1. Enhanced EXPLORE Phase:**
```markdown
Required Actions for Future Features:
- [ ] Study ALL provided references thoroughly (spend 15+ minutes analyzing)
- [ ] Screenshot and annotate reference designs
- [ ] Map existing component relationships before planning
- [ ] Identify potential integration challenges upfront
- [ ] Document assumptions and validate with stakeholder
```

##### **2. Systematic PLAN Phase:**
```markdown
Required Deliverables:
- [ ] Generate 5-10 design variants (not just 1)
- [ ] Create visual mockups before coding
- [ ] Plan CSS architecture integration strategy
- [ ] Define component placement and relationships
- [ ] Map all user states and role combinations
- [ ] Update CLAUDE.md with feature-specific guidelines
```

##### **3. Disciplined CODE Phase:**
```markdown
Implementation Standards:
- [ ] Start with simplest working version
- [ ] Screenshot after each significant change
- [ ] Test integration points immediately
- [ ] Follow existing CSS patterns strictly
- [ ] Validate responsive design continuously
- [ ] Check all user role combinations during development
```

##### **4. Comprehensive COMMIT Phase:**
```markdown
Validation Checklist:
- [ ] Visual comparison with original design references
- [ ] Test all user roles (agent, tutor, student)
- [ ] Cross-browser compatibility check
- [ ] Mobile responsiveness validation
- [ ] CSS specificity conflict review
- [ ] Performance impact assessment
- [ ] Accessibility standards verification
```

#### **Key Methodological Insights:**

##### **1. Visual-First Development:**
- **Before**: Code-first approach led to design misalignment
- **After**: Always create visual mockups before implementation
- **Tool**: Use screenshot comparison for each iteration

##### **2. Reference Design Study:**
- **Before**: Glanced at Airbnb reference, missed key patterns
- **After**: Systematic analysis of reference designs with annotation
- **Process**: Screenshot, annotate, document patterns before coding

##### **3. Holistic Integration Planning:**
- **Before**: Focused on feature in isolation
- **After**: Consider entire user experience and navigation ecosystem
- **Approach**: Map all touchpoints and integration requirements

##### **4. Systematic Testing:**
- **Before**: Reactive testing when issues discovered
- **After**: Proactive testing across all user states during development
- **Method**: Test matrix covering all role combinations

#### **Success Factors from Final Implementation:**
- **Proper Integration**: Role switching integrated seamlessly into NavMenu
- **Context-Aware UI**: Current role hidden from onboarding options
- **Visual Consistency**: All navigation items using consistent fonts, spacing, and styling
- **User Experience**: Clean, Airbnb-style navigation that feels cohesive
- **Maintainable Code**: Well-organized CSS modules with clear hierarchy

#### **Anti-Patterns to Avoid:**
1. **Assumption-Driven Development**: Always validate approach before implementation
2. **Single Solution Fixation**: Generate multiple variants, choose best approach
3. **Late Visual Validation**: Screenshot and compare throughout development
4. **Isolated Feature Development**: Consider entire user experience ecosystem
5. **Reactive Problem Solving**: Plan for integration challenges upfront

#### **CCDP Application Success Metrics:**
- **Reduced Iterations**: Should achieve design goals in 1-2 cycles, not 5-6
- **Faster Implementation**: Proper planning reduces total development time
- **Higher Quality**: Fewer post-implementation fixes required
- **Better UX**: Users get cohesive experience from first implementation

---

## Implementation Guidelines

### **Starting a New Feature**

#### **1. EXPLORE Phase Checklist**
- [ ] Read CLAUDE.md for existing guidelines
- [ ] Analyze similar existing components
- [ ] Study provided design references thoroughly
- [ ] Map integration points with existing systems
- [ ] Document findings in session notes

#### **2. PLAN Phase Checklist**
- [ ] Generate 5-10 design variants
- [ ] Create technical architecture plan
- [ ] Define testing strategy
- [ ] Update CLAUDE.md with feature guidelines
- [ ] Plan integration with UserProfileContext

#### **3. CODE Phase Checklist**
- [ ] Implement in small increments
- [ ] Screenshot after each major change
- [ ] Follow existing TypeScript patterns
- [ ] Use CSS modules consistently
- [ ] Test across user roles frequently

#### **4. COMMIT Phase Checklist**
- [ ] Test all user role combinations
- [ ] Verify payment flow integrity
- [ ] Confirm responsive design
- [ ] Validate accessibility standards
- [ ] Deploy and monitor

### **Emergency Bug Fixes**
For critical issues, condensed CCDP:
1. **Quick EXPLORE**: Identify root cause
2. **Rapid PLAN**: Single fix approach
3. **Immediate CODE**: Minimal change implementation
4. **Fast COMMIT**: Focused testing and deployment

### **Feature Enhancement**
For existing feature improvements:
1. **EXPLORE**: Understand current implementation
2. **PLAN**: Consider backward compatibility
3. **CODE**: Incremental improvements
4. **COMMIT**: Regression testing focus

---

## Conclusion

This CCDP document represents our customization of Anthropic's methodology for Tutorwise's specific needs. It ensures consistent, high-quality development while maintaining the rapid iteration and AI-driven approach that makes CCDP effective.

**Remember**: The goal is not just to build features, but to build them efficiently, maintainably, and with excellent user experience across all roles in our educational platform.

---

**Document Version**: 1.0
**Last Updated**: 2025-01-24
**Next Review**: Quarterly or after major platform changes
**Maintained By**: Claude Development Team
**Approved By**: Michael Quan, Tutorwise Platform Owner