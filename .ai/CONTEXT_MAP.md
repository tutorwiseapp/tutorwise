# Tutorwise Context Map

## 📊 **Context Engineering System Overview**

This document maps how all context files work together to enable autonomous AI development.

```
.claude/
├── CLAUDE.md           # 🎯 Project overview & guidelines
├── ROADMAP.md          # 🚀 Development priorities & timeline
├── PATTERNS.md         # 🧩 Code patterns & conventions
├── ARCHITECTURE.md     # 🏗️ System design & infrastructure
└── CONTEXT_MAP.md      # 📊 This file - how everything connects
```

## 🔗 **How Context Files Interconnect**

### **CLAUDE.md** → Foundation
- **Purpose**: Project overview, tech stack, development preferences
- **Used For**: Understanding project scope, preferred technologies, development workflow
- **Connects To**: All other files reference this as the source of truth

### **ROADMAP.md** → Direction
- **Purpose**: Feature priorities, timelines, effort estimates
- **Used For**: Understanding what to build next, dependencies, technical requirements
- **Connects To**: PATTERNS.md (implementation approach), ARCHITECTURE.md (technical feasibility)

### **PATTERNS.md** → Implementation
- **Purpose**: Code conventions, component structures, best practices
- **Used For**: Writing consistent code that matches existing codebase
- **Connects To**: ARCHITECTURE.md (technical constraints), ROADMAP.md (feature requirements)

### **ARCHITECTURE.md** → Technical Design
- **Purpose**: System design, infrastructure, data flow, security
- **Used For**: Understanding technical constraints, making architectural decisions
- **Connects To**: PATTERNS.md (implementation details), ROADMAP.md (scalability planning)

## 🎯 **AI Decision Making Framework**

### **When Asked to Build a Feature:**

1. **Check ROADMAP.md** → Is this feature prioritized? What are the requirements?
2. **Review ARCHITECTURE.md** → What are the technical constraints and patterns?
3. **Apply PATTERNS.md** → How should this be implemented consistently?
4. **Reference CLAUDE.md** → What are the project preferences and guidelines?

### **Example: "Add role-based dashboards"**

```
ROADMAP.md → Priority P0, 5-7 days effort, depends on auth system
ARCHITECTURE.md → Use route groups, role detection, protected routes
PATTERNS.md → Follow component structure, use TypeScript interfaces
CLAUDE.md → Prefer Next.js patterns, use Supabase for auth
Result → Autonomous implementation with full context
```

## 📁 **Codebase Context Sources**

### **Live Codebase Analysis**
```javascript
// AI automatically analyzes:
package.json          → Available dependencies, scripts, project setup
src/app/              → Route structure, existing patterns
src/components/       → UI components, styling approach
types/                → TypeScript definitions, data models
.env.example          → Environment variables, external services
```

### **Pattern Recognition**
```javascript
// AI learns from existing code:
- Component naming conventions
- State management approaches
- API integration patterns
- Error handling strategies
- Styling methodologies
- Testing approaches
```

## 🔄 **Context Update Cycle**

### **Continuous Learning**
1. **New code written** → Patterns updated
2. **Architecture changes** → ARCHITECTURE.md updated
3. **Priorities shift** → ROADMAP.md updated
4. **Project evolution** → CLAUDE.md updated

### **Context Validation**
- **Weekly reviews** → Ensure context files stay current
- **Feature completion** → Update patterns and architecture
- **Major changes** → Comprehensive context refresh

## 🚀 **E2E Testing Context**

### **Current State Assessment**
```
Frontend E2E: ✅ Playwright installed and configured
Backend E2E:  📁 Empty folder ready for setup
Integration:  ✅ Existing test structure

Recommendation: Set up unified E2E testing approach
```

### **E2E Testing Strategy**
```
tests/
├── e2e/                    # 🎭 Playwright end-to-end tests
│   ├── auth.spec.ts        # Authentication flows
│   ├── dashboard.spec.ts   # Role-based dashboard testing
│   ├── payments.spec.ts    # Stripe payment flows
│   └── booking.spec.ts     # Booking system workflows
├── integration/            # 🔗 API integration tests
└── unit/                   # 🧪 Component unit tests
```

## 🎯 **Autonomous Development Benefits**

### **Before Context Engineering**
```
User: "Add user dashboards"
AI: "What kind of dashboard? What data? What styling?"
```

### **After Context Engineering**
```
User: "Add user dashboards"
AI: *Reads context, understands requirements, implements immediately*
- Checks ROADMAP.md for role-based dashboard specs
- Follows PATTERNS.md for component structure
- Uses ARCHITECTURE.md for route protection
- Applies CLAUDE.md preferences
```

### **Development Speed Impact**
- **Requirements gathering**: 90% reduced
- **Pattern consistency**: 100% maintained
- **Architectural alignment**: Automatic
- **Feature completeness**: Higher quality

## 📊 **Context Metrics**

### **Context Coverage**
- **Project Overview**: ✅ Complete (CLAUDE.md)
- **Development Roadmap**: ✅ Complete (ROADMAP.md)
- **Code Patterns**: ✅ Complete (PATTERNS.md)
- **System Architecture**: ✅ Complete (ARCHITECTURE.md)
- **Testing Strategy**: 🟡 Partial (needs E2E setup)

### **Context Quality Indicators**
- **Specificity**: High - Detailed patterns and conventions
- **Completeness**: High - Covers all major areas
- **Currency**: Fresh - Recently created/updated
- **Actionability**: High - Enables autonomous development

## 🔮 **Future Context Enhancements**

### **Planned Additions**
- **API_DOCS.md** → Comprehensive API documentation
- **DEPLOYMENT.md** → Deployment procedures and environments
- **MONITORING.md** → Observability and alerting setup
- **SECURITY.md** → Security policies and procedures

### **Context Evolution**
As the project grows, context files will:
- **Expand** → More detailed patterns and conventions
- **Specialize** → Domain-specific context files
- **Integrate** → Better cross-referencing between files
- **Automate** → Self-updating context from code analysis

---

## 💡 **Using This Context System**

### **For AI Development**
1. **Always start** with context file review
2. **Follow established patterns** from PATTERNS.md
3. **Respect architectural constraints** from ARCHITECTURE.md
4. **Align with roadmap priorities** from ROADMAP.md
5. **Maintain project consistency** with CLAUDE.md

### **For Human Developers**
1. **Read context files** before starting new features
2. **Update patterns** when introducing new approaches
3. **Review architecture** for major system changes
4. **Keep roadmap current** with changing priorities

---

*This context map ensures consistent, autonomous, and high-quality development*
*Last Updated: 2025-09-25*