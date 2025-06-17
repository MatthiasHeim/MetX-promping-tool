# MetX Prompting Tool - Detailed Task Breakdown

## 📋 **Project Specifications**
- **Tech Stack**: React + TypeScript
- **UI Components**: shadcn/ui
- **Testing**: Vitest
- **Backend**: Supabase (PostgreSQL + Storage + Auth)
- **LLM Models**: GPT-4.1, o3, GPT-4o
- **Deployment**: Vercel
- **Authentication**: Required (login screen, user tracking)

---

## 🏗️ **Phase 1: Project Setup & Infrastructure** (Week 1)

### Development Environment Setup
- [ ] **DEV-001**: Initialize React + TypeScript + Vite project
- [ ] **DEV-002**: Configure shadcn/ui components library
- [ ] **DEV-003**: Set up Vitest testing framework
- [ ] **DEV-004**: Configure ESLint + Prettier for TypeScript
- [ ] **DEV-005**: Set up Tailwind CSS with shadcn configuration
- [ ] **DEV-006**: Initialize Git workflow and CI/CD for Vercel

### Supabase Backend Setup
- [ ] **SUP-001**: Create Supabase project with authentication enabled
- [ ] **SUP-002**: Configure Supabase Auth for email/password login
- [ ] **SUP-003**: Set up database schema:
  ```sql
  -- Users table (handled by Supabase Auth)
  -- prompts table
  CREATE TABLE prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    template_text TEXT NOT NULL,
    json_prefix TEXT,
    json_suffix TEXT,
    use_placeholder BOOLEAN DEFAULT false,
    version INTEGER DEFAULT 1,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );
  
  -- models table
  CREATE TABLE models (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    provider TEXT DEFAULT 'openai',
    price_per_1k_tokens DECIMAL(10,6)
  );
  
  -- user_inputs table
  CREATE TABLE user_inputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    text TEXT NOT NULL,
    input_image_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  );
  
  -- generation_results table
  CREATE TABLE generation_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_input_id UUID REFERENCES user_inputs(id),
    prompt_id UUID REFERENCES prompts(id),
    model_id TEXT REFERENCES models(id),
    user_id UUID REFERENCES auth.users(id),
    raw_json JSONB,
    final_json JSONB,
    cost_chf DECIMAL(10,4),
    latency_ms INTEGER,
    output_image_url TEXT,
    manual_score INTEGER CHECK (manual_score >= 1 AND manual_score <= 5),
    manual_comment TEXT,
    auto_score DECIMAL(3,2),
    auto_rationale TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  );
  ```
- [ ] **SUP-004**: Set up Row Level Security (RLS) policies for user data isolation
- [ ] **SUP-005**: Create storage buckets with proper permissions:
  - [ ] `input_images/` bucket
  - [ ] `output_images/` bucket
- [ ] **SUP-006**: Seed initial data:
  - [ ] Default prompt templates from existing MetX prompts
  - [ ] Model configurations (GPT-4.1, o3, GPT-4o)

### API Integration Setup
- [ ] **API-001**: Configure OpenAI SDK for TypeScript
- [ ] **API-002**: Set up environment variables for API keys
- [ ] **API-003**: Create Supabase client configuration
- [ ] **API-004**: Set up cost calculation utilities for each model

---

## 🔐 **Phase 2: Authentication & User Management** (Week 2)

### Authentication System
- [ ] **AUTH-001**: Create login/signup UI components using shadcn
- [ ] **AUTH-002**: Implement Supabase Auth integration
- [ ] **AUTH-003**: Create protected route wrapper component
- [ ] **AUTH-004**: Build user session management
- [ ] **AUTH-005**: Add logout functionality
- [ ] **AUTH-006**: Create user profile management
- [ ] **AUTH-007**: Implement password reset flow

### User Tracking & Audit
- [ ] **AUD-001**: Add user tracking to all prompt modifications
- [ ] **AUD-002**: Track user actions in generation pipeline
- [ ] **AUD-003**: Create audit log table and tracking system
- [ ] **AUD-004**: Build admin view for user activity (if needed)

---

## 🔄 **Phase 3: Core Generation Pipeline** (Week 3-4)

### LLM Integration & Processing
- [ ] **GEN-001**: Create TypeScript interfaces for all model responses
- [ ] **GEN-002**: Implement OpenAI client with support for:
  - [ ] GPT-4.1 integration
  - [ ] o3 model integration  
  - [ ] GPT-4o integration
- [ ] **GEN-003**: Build prompt template system with `{{output}}` placeholder
- [ ] **GEN-004**: Create JSON prefix/suffix concatenation logic
- [ ] **GEN-005**: Implement cost calculation per model:
  - [ ] GPT-4.1 pricing logic
  - [ ] o3 pricing logic
  - [ ] GPT-4o pricing logic
- [ ] **GEN-006**: Add latency measurement with high precision
- [ ] **GEN-007**: Build cost guardrail system (abort if > 0.20 CHF)
- [ ] **GEN-008**: Create parallel model execution with proper error handling
- [ ] **GEN-009**: Implement generation cancellation functionality

### Data Storage & Management
- [ ] **DAT-001**: Create TypeScript types for all database entities
- [ ] **DAT-002**: Build data access layer with Supabase client
- [ ] **DAT-003**: Implement secure file upload for input images
- [ ] **DAT-004**: Create generation results storage system
- [ ] **DAT-005**: Add data validation and sanitization

---

## 📝 **Phase 4: Prompt Management System** (Week 5)

### Prompt Library & Versioning
- [ ] **PRM-001**: Build prompt library interface with shadcn components
- [ ] **PRM-002**: Create rich text prompt editor with syntax highlighting
- [ ] **PRM-003**: Implement version control system:
  - [ ] Version history tracking
  - [ ] Diff visualization
  - [ ] Rollback functionality
- [ ] **PRM-004**: Add prompt validation and testing
- [ ] **PRM-005**: Create prompt search and filtering system
- [ ] **PRM-006**: Import existing MetX prompt templates
- [ ] **PRM-007**: Build prompt sharing and collaboration features

---

## 🎨 **Phase 5: User Interface Development** (Week 6)

### Main Application UI
- [ ] **UI-001**: Create main layout with navigation using shadcn
- [ ] **UI-002**: Build input screen components:
  - [ ] Text input with rich text editor
  - [ ] Image upload with drag & drop
  - [ ] Model selection with checkboxes
  - [ ] Prompt selector dropdown
- [ ] **UI-003**: Design generation progress interface:
  - [ ] Real-time progress indicators per model
  - [ ] Cancellation controls
  - [ ] Cost tracking display
- [ ] **UI-004**: Build results view with responsive cards:
  - [ ] JSON viewer with syntax highlighting
  - [ ] Download functionality
  - [ ] Metrics display (cost, latency)
- [ ] **UI-005**: Create rating interface:
  - [ ] 1-5 star rating component
  - [ ] Comment text area
  - [ ] Submit/edit functionality

### Welcome & Onboarding
- [ ] **UI-006**: Design welcome screen with workflow explanation
- [ ] **UI-007**: Create interactive tutorial/onboarding
- [ ] **UI-008**: Add comprehensive tooltips throughout the app
- [ ] **UI-009**: Build help documentation system

---

## 🤖 **Phase 6: Automated Evaluation System** (Week 7)

### AI-Powered Evaluation
- [ ] **EVL-001**: Design evaluation criteria for weather parameter completeness
- [ ] **EVL-002**: Build image comparison system:
  - [ ] Input image analysis (if provided)
  - [ ] Output image analysis (user uploaded)
  - [ ] Visual comparison logic
- [ ] **EVL-003**: Create prompt-to-output validation:
  - [ ] Parse user request for weather parameters
  - [ ] Analyze generated JSON for requested parameters
  - [ ] Check parameter completeness
- [ ] **EVL-004**: Implement evaluation scoring algorithm:
  - [ ] Completeness score (0-1)
  - [ ] Accuracy score based on image comparison
  - [ ] Overall composite score
- [ ] **EVL-005**: Build evaluation rationale generation
- [ ] **EVL-006**: Create evaluation results display interface
- [ ] **EVL-007**: Add manual evaluation override capabilities

---

## 🧪 **Phase 7: Testing & Quality Assurance** (Week 8)

### Automated Testing with Vitest
- [ ] **TEST-001**: Set up Vitest configuration for React + TypeScript
- [ ] **TEST-002**: Write unit tests for utility functions:
  - [ ] Cost calculation functions
  - [ ] JSON processing utilities
  - [ ] Validation functions
- [ ] **TEST-003**: Create component tests for UI elements:
  - [ ] Form components
  - [ ] Rating components
  - [ ] Results display components
- [ ] **TEST-004**: Build integration tests:
  - [ ] Authentication flow
  - [ ] Generation pipeline
  - [ ] Data persistence
- [ ] **TEST-005**: Add end-to-end tests for critical user journeys
- [ ] **TEST-006**: Performance testing (60s latency target validation)
- [ ] **TEST-007**: Security testing for auth and data access

### Quality Assurance
- [ ] **QA-001**: Cross-browser compatibility testing
- [ ] **QA-002**: Mobile responsiveness validation
- [ ] **QA-003**: Accessibility testing (WCAG compliance)
- [ ] **QA-004**: User acceptance testing with Meteomatics team
- [ ] **QA-005**: Load testing for concurrent users
- [ ] **QA-006**: Error handling and edge case validation

---

## 🚀 **Phase 8: Deployment & Launch** (Week 9)

### Vercel Deployment Setup
- [ ] **DEP-001**: Configure Vercel project with proper environment variables
- [ ] **DEP-002**: Set up preview deployments for PR reviews
- [ ] **DEP-003**: Configure custom domain (if required)
- [ ] **DEP-004**: Set up monitoring and analytics
- [ ] **DEP-005**: Configure error tracking (Sentry integration)

### Launch Preparation
- [ ] **LCH-001**: Create production deployment checklist
- [ ] **LCH-002**: Prepare user documentation and guides
- [ ] **LCH-003**: Set up user feedback collection system
- [ ] **LCH-004**: Create admin dashboard for monitoring usage
- [ ] **LCH-005**: Conduct soft launch with internal team
- [ ] **LCH-006**: Gather feedback and implement final iterations
- [ ] **LCH-007**: Full launch to Meteomatics employees

---

## 🔄 **Post-Launch: Maintenance & Iteration** (Ongoing)

### Monitoring & Optimization
- [ ] **MAIN-001**: Monitor API usage and costs
- [ ] **MAIN-002**: Track user engagement metrics
- [ ] **MAIN-003**: Analyze evaluation accuracy and improve algorithms
- [ ] **MAIN-004**: Regular security updates and maintenance
- [ ] **MAIN-005**: User feedback implementation
- [ ] **MAIN-006**: Performance optimization based on usage patterns

---

## 📊 **Success Metrics Tracking**

### Key Performance Indicators
- [ ] **MET-001**: Set up analytics for success metrics:
  - [ ] % users completing generation without help (target: ≥90%)
  - [ ] Median time from input to usable JSON (target: <60s)
  - [ ] Average cost per generation (target: ≤0.10 CHF)
  - [ ] % generations receiving manual ratings (target: ≥70%)
- [ ] **MET-002**: Create dashboard for metric visualization
- [ ] **MET-003**: Set up automated reporting for stakeholders

---

## ⚠️ **Risk Mitigation Tasks**

### Technical Risks
- [ ] **RISK-001**: Implement model fallback system for API failures
- [ ] **RISK-002**: Add request queuing for high load scenarios
- [ ] **RISK-003**: Create backup and disaster recovery procedures
- [ ] **RISK-004**: Monitor and alert on cost/usage thresholds
- [ ] **RISK-005**: Implement rate limiting and abuse prevention

### User Experience Risks
- [ ] **RISK-006**: Create comprehensive error messaging system
- [ ] **RISK-007**: Build offline capability for basic features
- [ ] **RISK-008**: Add progressive loading for large datasets
- [ ] **RISK-009**: Implement user data export functionality

---

## 🛠️ **Development Best Practices**

### Code Quality
- [ ] **DEV-007**: Set up pre-commit hooks for code quality
- [ ] **DEV-008**: Configure automated dependency updates
- [ ] **DEV-009**: Implement proper TypeScript strict mode
- [ ] **DEV-010**: Add comprehensive JSDoc documentation
- [ ] **DEV-011**: Create component storybook for UI documentation

### Security
- [ ] **SEC-001**: Implement proper input sanitization
- [ ] **SEC-002**: Add CSRF protection
- [ ] **SEC-003**: Configure secure headers
- [ ] **SEC-004**: Regular security audits
- [ ] **SEC-005**: Implement API rate limiting 