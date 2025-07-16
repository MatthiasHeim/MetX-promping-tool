# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MetX is a React+TypeScript application that serves as an AI-powered prompting tool for Meteomatics employees. It generates MetX dashboard JSON configurations using various AI models (GPT-4.1, o3, GPT-4o). The tool is designed for internal testing and prompt optimization before deploying to customer-facing applications.

## Development Commands

### Core Commands
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check
```

### Testing Commands
```bash
# Run specific test file
npm test -- auth.test.ts

# Run tests matching pattern
npm test -- --grep "authentication"

# Run tests with coverage for specific file
npm test -- --coverage src/services/auth/AuthService.test.ts
```

## Architecture Overview

### Core Application Flow
1. **Authentication** (`src/services/auth/AuthService.ts`) - Handles user login/signup via Supabase
2. **Generation Pipeline** (`src/services/generation/GenerationService.ts`) - Orchestrates AI model execution
3. **Prompt Management** (`src/services/prompts/PromptService.ts`) - Manages prompt templates with versioning
4. **Result Evaluation** (`src/services/evaluation/EvaluationService.ts`) - Automated scoring of generated outputs
5. **Database Layer** (`src/types/database.ts`) - Supabase schema definitions

### Key Components Structure
- **App.tsx** - Main application container with routing logic and state management
- **OverviewPage.tsx** - Dashboard overview with project context and navigation
- **GenerationForm.tsx** - Primary interface for creating AI generations
- **GenerationsView.tsx** - Historical view of all generations
- **PromptVersionHistory.tsx** - Version control interface for prompts

### Service Layer Architecture
- **AuthService** - Authentication and user management
- **GenerationService** - Core generation pipeline with cost calculation and error handling
- **OpenRouterService** - OpenRouter API integration for all models
- **PromptService** - CRUD operations for prompts with versioning
- **EvaluationService** - Automated quality assessment
- **ModelService** - Model configuration management

### Data Flow
1. User creates input via GenerationForm
2. Input stored in Supabase via UserInputService
3. GenerationService processes prompt template and executes parallel model calls
4. Results stored with automatic evaluation via EvaluationService
5. Results displayed with manual rating capability
6. All operations logged for analysis

## Key Technical Patterns

### Prompt Template System
- Templates use `{{user_input}}` placeholders
- JSON prefix/suffix wrapping for complete MetX configurations
- Template validation with real-time feedback
- Version control with rollback capabilities

### Cost Management
- Real-time cost estimation before generation
- Guardrails to prevent expensive requests
- Per-model cost tracking and reporting
- Budget thresholds and warnings

### Error Handling
- Comprehensive error categorization (timeout, rate_limit, auth, invalid_response)
- Retry logic for transient failures
- Graceful degradation for partial failures
- Detailed error logging for debugging

### State Management
- React hooks for local state
- Supabase for persistent storage
- Real-time updates via Supabase subscriptions
- Form validation with immediate feedback

## Database Schema

### Core Tables
- **prompts** - Prompt templates with versioning
- **prompt_versions** - Historical prompt versions
- **models** - AI model configurations
- **user_inputs** - User requests and uploaded images
- **generation_results** - AI outputs with evaluation metrics
- **audit_logs** - Activity tracking

### Evaluation Metrics
- **parameter_completeness_score** - How well required parameters are included
- **structure_quality_score** - JSON structure validity
- **layer_count_score** - Appropriate number of weather layers
- **cost_efficiency_score** - Cost vs quality ratio
- **performance_score** - Latency considerations

## Environment Configuration

### Required Environment Variables
```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI Configuration
VITE_OPENAI_API_KEY=your_openai_api_key

# Development Mode
VITE_DEV_MODE=true
```

## Testing Strategy

The project maintains 93% test coverage with comprehensive unit and integration tests:

- **Service Tests** - Mock external APIs, test business logic
- **Component Tests** - React Testing Library for UI interactions
- **Integration Tests** - End-to-end workflows
- **Type Safety** - Full TypeScript coverage

### Test File Conventions
- `*.test.ts` - Unit tests for services
- `*.test.tsx` - Component tests
- `setup.ts` - Test environment configuration

## MetX JSON Structure

The application generates JSON configurations for MetX dashboards using a three-part system:
1. **Static Prefix** - Dashboard structure with placeholders
2. **Dynamic Layers** - AI-generated weather data layers
3. **Static Suffix** - Closing JSON structure

Templates are located in `examples/templates/` and documentation in `docs/`.

## Common Development Patterns

### Adding New AI Models
1. Update `models` table in Supabase
2. Configure provider in GenerationService
3. Add provider-specific service if needed
4. Update model selection UI

### Creating New Prompt Templates
1. Use Prompt Editor with validation
2. Include `{{user_input}}` placeholder
3. Test with multiple models
4. Version control automatically handled

### Adding Evaluation Criteria
1. Extend `generation_results` table schema
2. Update EvaluationService logic
3. Add UI display in EvaluationDisplay component
4. Include in automated scoring

## Performance Considerations

- **Parallel Generation** - Multiple models execute simultaneously
- **Cost Optimization** - Token estimation and budget controls
- **Caching** - Supabase handles query optimization
- **Bundle Size** - Vite optimizes production builds

## Security Guidelines

- **API Keys** - Never commit to repository, use environment variables
- **Authentication** - Supabase RLS policies enforce access control
- **Input Validation** - All user inputs validated before processing
- **Error Handling** - Sensitive information never exposed in error messages