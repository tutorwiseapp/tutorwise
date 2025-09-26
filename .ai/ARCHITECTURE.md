# Tutorwise System Architecture

## 🏗️ **High-Level Architecture**

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend        │    │   Databases     │
│   (Vercel)      │    │   (Railway)      │    │                 │
├─────────────────┤    ├──────────────────┤    ├─────────────────┤
│ Next.js 14+     │◄──►│ FastAPI/Python   │◄──►│ Supabase        │
│ TypeScript      │    │ Gunicorn Workers │    │ PostgreSQL      │
│ Tailwind CSS    │    │ Redis Cache      │    │                 │
│ React 18        │    │ Health Checks    │    │ Neo4j Aura      │
└─────────────────┘    └──────────────────┘    │ Graph Database  │
         │                       │              └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌──────────────────┐
                    │   External       │
                    │   Services       │
                    ├──────────────────┤
                    │ Stripe Payments  │
                    │ Email Service    │
                    │ File Storage     │
                    └──────────────────┘
```

## 🎯 **Core Architecture Principles**

### **1. Separation of Concerns**
- **Frontend**: User interface, client-side logic, state management
- **Backend**: Business logic, data processing, external integrations
- **Database**: Data persistence, relationships, caching

### **2. Scalability by Design**
- **Horizontal scaling**: Multiple backend workers via Railway
- **Caching layers**: Redis for session/temporary data
- **Database optimization**: Proper indexing and query optimization
- **CDN integration**: Static asset distribution via Vercel

### **3. Security First**
- **Authentication**: Supabase Auth with JWT tokens
- **Authorization**: Role-based access control (RBAC)
- **Data encryption**: HTTPS everywhere, encrypted database connections
- **Input validation**: Server-side validation for all inputs

## 🌐 **Frontend Architecture**

### **Next.js App Router Structure**
```
src/app/
├── (auth)/              # Authentication route group
│   ├── login/           # Login page
│   ├── signup/          # Registration page
│   └── callback/        # Auth callback handling
├── (dashboard)/         # Protected dashboard routes [PLANNED]
│   ├── student/         # Student-specific pages
│   ├── tutor/           # Tutor-specific pages
│   └── agent/           # Agent-specific pages
├── api/                 # API routes (Next.js API)
│   ├── auth/            # Authentication endpoints
│   ├── payments/        # Stripe integration
│   └── system-test/     # Health check endpoints
├── components/          # Reusable components
└── monitoring/          # TestAssured platform
```

### **State Management Strategy**
- **Local State**: React `useState` for component-specific state
- **Context**: React Context for shared authentication state
- **Server State**: Direct API calls with proper error handling
- **Form State**: Native form handling with validation

### **Styling Architecture**
- **Primary**: Tailwind CSS for utility-first styling
- **Component-Specific**: CSS Modules for encapsulated styles
- **Design System**: Consistent UI components in `/components/ui/`
- **Responsive**: Mobile-first responsive design approach

## ⚙️ **Backend Architecture**

### **Railway Backend Services**
```
tutorwise-railway-backend/
├── app/
│   ├── main.py              # FastAPI application entry
│   ├── api/                 # API route handlers
│   │   ├── auth.py          # Authentication endpoints
│   │   ├── health.py        # Health check endpoints
│   │   └── users.py         # User management
│   ├── models/              # Data models
│   ├── services/            # Business logic
│   └── utils/               # Utility functions
├── tests/                   # Backend testing
│   ├── unit/               # Unit tests
│   ├── integration/        # Integration tests
│   └── e2e/                # End-to-end tests (empty, ready for setup)
└── requirements.txt         # Python dependencies
```

### **Worker Configuration**
- **Gunicorn**: WSGI server with multiple workers
- **FastAPI**: Modern Python web framework
- **Redis**: Caching and session storage
- **Health Monitoring**: Automated health checks

## 🗄️ **Database Architecture**

### **Supabase (Primary Database)**
```sql
-- Core Tables
profiles (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE,
  role VARCHAR CHECK (role IN ('student', 'tutor', 'agent')),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Future Tables (Planned)
tutors (
  id UUID PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id),
  verification_status VARCHAR,
  hourly_rate DECIMAL
);

bookings (
  id UUID PRIMARY KEY,
  tutor_id UUID REFERENCES tutors(id),
  student_id UUID REFERENCES profiles(id),
  scheduled_at TIMESTAMP,
  status VARCHAR
);
```

### **Neo4j Graph Database**
```cypher
// Relationship-focused data
// Tutor-Student connections
// Subject expertise mapping
// Learning path relationships
// Recommendation engine data
```

### **Redis Cache**
- **Session storage**: User sessions and temporary data
- **Rate limiting**: API rate limiting counters
- **Health monitoring**: System status cache
- **Background jobs**: Task queue management

## 💳 **Payment Processing Architecture**

### **Stripe Integration**
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend/API    │    │   Stripe        │
├─────────────────┤    ├──────────────────┤    ├─────────────────┤
│ Stripe Elements │────│ Payment Intents  │────│ Payment         │
│ Checkout Form   │    │ Webhook Handler  │    │ Processing      │
│ Payment Status  │    │ Order Management │    │ Connect         │
└─────────────────┘    └──────────────────┘    │ Accounts        │
                                               └─────────────────┘
```

### **Payment Flow**
1. **Frontend**: Stripe Elements capture payment method
2. **Backend**: Create payment intent via Stripe API
3. **Stripe**: Process payment and send webhook
4. **Backend**: Handle webhook, update order status
5. **Frontend**: Display payment confirmation

## 🧪 **Testing Architecture**

### **TestAssured Platform**
```
Testing Strategy:
├── Unit Tests
│   ├── Frontend (Jest + React Testing Library)
│   └── Backend (pytest)
├── Integration Tests
│   ├── API endpoint testing
│   └── Database integration testing
├── End-to-End Tests
│   ├── User flow testing (Playwright)
│   └── Cross-browser testing
├── Health Monitoring
│   ├── Real-time service status
│   └── Performance monitoring
└── Visual Testing
    ├── Screenshot comparison
    └── UI regression detection
```

### **Quality Assurance**
- **Code Coverage**: 80% backend, 70% frontend minimum
- **Linting**: ESLint (frontend), Ruff (backend)
- **Type Checking**: TypeScript strict mode
- **Security Scanning**: Automated dependency scanning

## 🚀 **Deployment Architecture**

### **Production Environment**
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Vercel        │    │   Railway        │    │   Cloud         │
│   (Frontend)    │    │   (Backend)      │    │   Services      │
├─────────────────┤    ├──────────────────┤    ├─────────────────┤
│ Next.js App     │    │ FastAPI Server   │    │ Supabase        │
│ Static Assets   │    │ Redis Cache      │    │ Neo4j Aura      │
│ Edge Functions  │    │ Health Checks    │    │ Stripe          │
│ Analytics       │    │ Multi-Worker     │    │ Email Service   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### **CI/CD Pipeline**
1. **Code Push**: GitHub repository
2. **Vercel**: Automatic frontend deployment
3. **Railway**: Automatic backend deployment
4. **Testing**: Automated test execution
5. **Monitoring**: Health check validation

## 🔐 **Security Architecture**

### **Authentication Flow**
```
1. User Login → Supabase Auth
2. JWT Token ← Supabase Auth
3. Token Validation → Frontend/Backend
4. Role-Based Access → Route Protection
5. Session Management → Redis Cache
```

### **Security Layers**
- **Transport**: HTTPS/TLS encryption
- **Authentication**: JWT-based with Supabase
- **Authorization**: Role-based access control
- **Input Validation**: Server-side validation
- **Rate Limiting**: API endpoint protection
- **CORS**: Cross-origin request security

## 📊 **Monitoring & Observability**

### **Health Monitoring**
- **Frontend**: TestAssured health dashboard
- **Backend**: Custom health check endpoints
- **Database**: Connection monitoring
- **External Services**: API status monitoring

### **Performance Tracking**
- **Frontend**: Vercel Analytics, Core Web Vitals
- **Backend**: Response time monitoring
- **Database**: Query performance analysis
- **User Experience**: Error tracking and reporting

## 🔄 **Data Flow Architecture**

### **User Registration Flow**
```
1. Frontend Form → Supabase Auth
2. Supabase Auth → Create User Account
3. Webhook → Backend Profile Creation
4. Backend → Neo4j Relationship Setup
5. Frontend → Dashboard Redirect
```

### **Booking Flow (Planned)**
```
1. Student Search → Tutor Database Query
2. Booking Request → Backend Validation
3. Payment Processing → Stripe API
4. Confirmation → Email Notifications
5. Calendar Update → Calendar Integration
```

## 🎯 **Scalability Considerations**

### **Current Capacity**
- **Frontend**: Vercel edge network (global CDN)
- **Backend**: Railway multi-worker deployment
- **Database**: Supabase managed PostgreSQL
- **Cache**: Redis for session management

### **Growth Strategy**
- **Database Sharding**: Horizontal partitioning for large datasets
- **Microservices**: Service decomposition as features grow
- **CDN Enhancement**: Advanced caching strategies
- **Background Jobs**: Async processing for heavy operations

## 📈 **Future Architecture Enhancements**

### **Phase 1** (Next 3 months)
- Role-based dashboard implementation
- Advanced payment processing
- Real-time messaging system
- Mobile app architecture planning

### **Phase 2** (3-6 months)
- Microservices extraction
- Advanced analytics platform
- AI/ML recommendation engine
- Multi-tenant architecture

### **Phase 3** (6+ months)
- Multi-region deployment
- Advanced security enhancements
- Enterprise-grade monitoring
- Third-party integration platform

---

*This architecture document should be updated as the system evolves*
*Last Updated: 2025-09-25*
*Next Review: 2025-10-25*