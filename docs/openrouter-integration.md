# OpenRouter Integration

This document describes the OpenRouter integration that enables access to Gemini 2.5 and Claude Sonnet 4.0 thinking models in the MetX application.

## Overview

The OpenRouter integration allows the MetX application to use models from multiple providers through a single API endpoint. This implementation adds support for:

- **Gemini 2.5 Flash** - Google's latest fast multimodal model
- **Gemini 2.5 Pro** - Google's flagship model with enhanced capabilities
- **Claude 3.5 Sonnet (Thinking)** - Anthropic's reasoning-enhanced model

## Setup

1. **Get an OpenRouter API Key**
   - Visit [OpenRouter.ai](https://openrouter.ai/) and create an account
   - Generate an API key from your dashboard
   - Add the key to your `.env` file:
     ```
     VITE_OPENROUTER_API_KEY=your_openrouter_api_key_here
     ```

2. **Environment Configuration**
   - Copy the example environment file: `cp env.example .env`
   - Set your OpenRouter API key in the `.env` file
   - The application will automatically detect and use models from both OpenAI and OpenRouter

## Available Models

The following models have been added to the database:

### Gemini 2.5 Flash
- **Model ID**: `google/gemini-2.5-flash`
- **Provider**: `openrouter`
- **Pricing**: $0.00075 per 1K tokens
- **Capabilities**: Fast text generation, image understanding, JSON output
- **Best for**: Quick responses, cost-effective generation

### Gemini 2.5 Pro
- **Model ID**: `google/gemini-2.5-pro`
- **Provider**: `openrouter`
- **Pricing**: $0.003 per 1K tokens
- **Capabilities**: Advanced text generation, image understanding, JSON output, superior reasoning
- **Best for**: Complex tasks requiring high-quality output

### Claude 3.5 Sonnet (Thinking)
- **Model ID**: `anthropic/claude-3.5-sonnet-20241022:beta`
- **Provider**: `openrouter`
- **Pricing**: $0.015 per 1K tokens
- **Capabilities**: Advanced reasoning, text generation, JSON output, step-by-step thinking
- **Best for**: Complex reasoning tasks, analysis, detailed explanations

## Architecture

### Services

1. **OpenRouterService** (`src/services/generation/OpenRouterService.ts`)
   - Handles communication with the OpenRouter API
   - Provides the same interface as OpenAIService
   - Supports parallel generation across multiple models
   - Includes proper error handling and cost calculation

2. **GenerationService** (Updated)
   - Routes requests to appropriate service based on model provider
   - Combines results from both OpenAI and OpenRouter models
   - Maintains existing functionality for cost estimation and progress tracking

### Database Changes

- Added new models to the `models` table with `openrouter` provider
- Models are automatically available in the application UI
- Cost calculation works seamlessly across providers

## Usage

### Single Model Generation

```typescript
import { GenerationService } from './services/generation/GenerationService'

const model = {
  id: 'google/gemini-2.5-pro',
  name: 'Gemini 2.5 Pro',
  provider: 'openrouter',
  price_per_1k_tokens: 0.003000
}

const result = await GenerationService.executeGeneration(
  'Generate weather layers for London',
  model
)
```

### Multi-Provider Parallel Generation

```typescript
const models = [
  // OpenAI models
  { id: 'gpt-4o', provider: 'openai', ... },
  { id: 'o3', provider: 'openai', ... },
  // OpenRouter models
  { id: 'google/gemini-2.5-flash', provider: 'openrouter', ... },
  { id: 'google/gemini-2.5-pro', provider: 'openrouter', ... },
  { id: 'anthropic/claude-3.5-sonnet-20241022:beta', provider: 'openrouter', ... }
]

const results = await GenerationService.executeParallelGeneration(
  'Generate comprehensive weather dashboard',
  models,
  imageUrl, // optional
  onProgress // optional callback
)
```

## Features

### Cost Management
- Accurate cost calculation for OpenRouter models
- Cost guardrails work across all providers
- Real-time cost estimation before generation

### Error Handling
- Provider-specific error handling
- Automatic retry logic for transient errors
- Detailed error classification (timeout, rate limit, auth, etc.)

### Progress Tracking
- Real-time progress updates during parallel generation
- Support for progress callbacks
- Combined progress tracking across providers

### Image Support
- Both Gemini and Claude models support image input
- Same interface as existing OpenAI vision models
- Automatic image token estimation in cost calculations

## Benefits

1. **Model Diversity**: Access to cutting-edge models from Google and Anthropic
2. **Cost Optimization**: Choose the most cost-effective model for each task
3. **Performance**: Gemini 2.5 Flash offers fast generation at low cost, Gemini 2.5 Pro provides superior quality
4. **Reasoning**: Claude Sonnet provides advanced reasoning capabilities
5. **Reliability**: Fallback options if one provider has issues

## Migration

Existing code continues to work without changes. The new models are simply available as additional options in the model selection interface.

## Troubleshooting

### API Key Issues
- Ensure `VITE_OPENROUTER_API_KEY` is set in your `.env` file
- Verify the API key is valid at [OpenRouter.ai](https://openrouter.ai/)
- Check browser console for authentication errors

### Model Availability
- OpenRouter model availability can vary
- Check [OpenRouter's model list](https://openrouter.ai/models) for current status
- Some models may have usage limits or require approval

### JSON Parsing Issues
- OpenRouter models may return JSON in different formats than OpenAI models
- **Comma-separated objects**: Some models return `{...},{...},{...}` instead of `[{...},{...},{...}]`
- The application automatically detects and wraps comma-separated JSON objects in arrays
- If you see "SyntaxError: Unexpected non-whitespace character after JSON" errors, the app will handle this automatically
- The app includes robust fallback handling for JSON parsing failures
- If you see "Failed to parse as valid JSON" errors, check the browser console for detailed error logs
- The app will automatically fall back to using raw layer data when prefix/suffix combination fails

### Response Format Differences
- OpenRouter models use `response_format: { type: 'json_object' }` instead of structured schemas
- Some models may not support structured outputs - the app handles this gracefully
- Array responses are automatically detected and processed correctly

### Cost Monitoring
- Monitor your OpenRouter usage at their dashboard
- Set up billing alerts to avoid unexpected charges
- Use cost guardrails in the application to control spending

## Next Steps

1. Test the integration with your OpenRouter API key
2. Experiment with the new models to understand their capabilities
3. Compare results across different providers
4. Adjust cost thresholds based on your usage patterns 