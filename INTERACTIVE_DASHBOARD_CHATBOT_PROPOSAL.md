# Interactive Dashboard Chatbot Implementation Proposal

## Executive Summary

This proposal outlines the implementation of an interactive chatbot feature for MetX that allows users to modify existing dashboards through conversational commands. Instead of creating dashboards from scratch, users can load an existing dashboard and perform targeted modifications like adding layers, adjusting parameters, or creating new map views.

## Current Architecture Analysis

### Existing Dashboard Handling Capabilities

MetX already has robust infrastructure for dashboard processing:

- **Dashboard Validation & Fixing** (`src/utils/dashboardValidator.ts`): Comprehensive validation of 13+ layer types with auto-fixing capabilities
- **Dashboard Processing Pipeline** (`src/utils/dashboardProcessing.ts`): Unified processing for generation, evaluation, and download workflows
- **JSON Construction System** (`src/utils/jsonConstruction.ts`): Template-based JSON assembly with prefix/suffix support
- **Generation Service** (`src/services/generation/GenerationService.ts`): Core AI generation pipeline with cost management and parallel execution

### Key Technical Assets

1. **Layer Type System**: Support for 13 different MetX layer types with full validation
2. **ID Management**: Automatic ID generation and relationship management
3. **Template System**: JSON prefix/suffix structure for complete dashboard construction
4. **Cost Management**: Token estimation and guardrails
5. **Real-time Validation**: Live feedback on dashboard structure and compliance

## Proposed Interactive Chatbot Architecture

### Core Concept

The interactive chatbot will operate on dashboard JSON using a simplified, phased approach:

**Phase 1: Tab Management**
1. **Dashboard State** - Work with existing dashboard JSON or start with empty dashboard template
2. **Tab Creation** - Parse natural language commands to create new tabs with specified weather layers
3. **Complete Upload** - Generate complete dashboard JSON and upload via single API endpoint
4. **Validation** - Ensure all modifications maintain MetX compatibility using existing pipeline

**Future Phases**
- **Tab Modification** - Update existing tabs with new layers or parameter changes
- **Advanced Operations** - Layer-level modifications, reordering, and complex multi-tab operations

### Architecture Components

#### 1. Dashboard Context Manager (`DashboardContextService`)

```typescript
interface DashboardContext {
  activeDashboard: any
  currentMap: number
  currentTab: number
  availableLayers: LayerSummary[]
  dashboardMetadata: DashboardMetadata
}

interface LayerSummary {
  id: string
  kind: string
  parameter: string
  description: string
  index: number
}
```

**Responsibilities:**
- Load and parse existing dashboard JSON
- Maintain current editing context (active tab/map)
- Track available layers and their properties
- Provide dashboard structure analysis

#### 2. Command Parser & Intent Recognition (`ChatbotCommandService`)

```typescript
interface ChatbotCommand {
  intent: CommandIntent
  target: CommandTarget
  parameters: CommandParameters
  context: DashboardContext
}

type CommandIntent = 
  | 'add-tab'           // Phase 1: Primary focus
  | 'modify-tab'        // Future: Update existing tabs
  | 'remove-tab'        // Future: Remove tabs
  | 'add-layer'         // Future: Add layers to existing tabs
  | 'modify-layer'      // Future: Modify layer parameters
  | 'set-colormap'      // Future: Change layer colormaps
  | 'adjust-opacity'    // Future: Adjust layer opacity

interface CommandTarget {
  type: 'tab' | 'dashboard'  // Phase 1: Focus on tab-level operations
  identifier?: string | number
  tabName?: string
  layerRequirements?: string[]  // What layers to include in new tab
}
```

**Capabilities:**
- Parse natural language commands into structured actions
- Understand context references ("the temperature layer", "map 2", "this layer")
- Handle complex multi-step commands
- Provide command suggestions based on current dashboard state

#### 3. Dashboard Modification Engine (`DashboardModificationService`)

```typescript
interface ModificationResult {
  success: boolean
  updatedDashboard: any
  validation: ValidationResult
  changes: ChangeDescription[]
  warnings: string[]
}

interface ChangeDescription {
  action: string
  target: string
  details: string
  reversible: boolean
}
```

**Key Functions (Phase 1):**
- **Tab Creation**: Generate new tabs with specified weather layers using AI
- **Dashboard Assembly**: Combine new tabs with existing dashboard structure
- **Complete Validation**: Ensure entire dashboard meets MetX requirements
- **Single API Upload**: Upload complete dashboard JSON via unified endpoint

**Future Functions:**
- **Tab Modification**: Update existing tabs with new layers or parameters
- **Advanced Operations**: Layer-level modifications, reordering, batch operations
- **Undo/Redo**: Maintain change history for reversibility

#### 4. Enhanced Generation Service Integration

Extend existing `GenerationService` to support targeted generation:

```typescript
interface TargetedGenerationRequest {
  dashboardContext: DashboardContext
  modification: ChatbotCommand
  constraints: GenerationConstraints
}

interface GenerationConstraints {
  preserveExisting: boolean
  layerTypes: string[]
  parameterRanges: Record<string, any>
  costLimit: number
}
```

### Command Examples & Implementation

#### Example 1: "Create a new tab with precipitation and wind data for Europe"

**Processing Flow:**
1. Parse intent: `add-tab` with requirements `precipitation, wind, Europe`
2. Generate complete tab structure using existing AI pipeline
3. Insert tab into dashboard (or create new dashboard if none exists)
4. Apply proper ID relationships and indexing
5. Validate complete dashboard structure
6. Upload complete dashboard via single API

**Implementation:**
```typescript
async handleAddTab(command: ChatbotCommand): Promise<ModificationResult> {
  const { activeDashboard } = command.context
  const baseDashboard = activeDashboard || this.createEmptyDashboard()
  
  // Generate tab with layers using existing AI pipeline
  const tabPrompt = `Create a weather tab with ${command.parameters.layerRequirements.join(', ')} for ${command.parameters.region}`
  const generatedTab = await this.generateTabWithLayers(tabPrompt, command.context)
  
  // Insert tab into dashboard
  baseDashboard.tabs.push(generatedTab)
  
  // Validate and fix complete dashboard
  const { dashboard: validatedDashboard, validation } = validateAndFixDashboard(baseDashboard)
  
  // Upload complete dashboard
  const uploadResult = await this.uploadDashboard(validatedDashboard)
  
  return {
    success: validation.isValid && uploadResult.success,
    updatedDashboard: validatedDashboard,
    validation: validation,
    changes: [{
      action: 'Added tab',
      target: `Dashboard`,
      details: `Added tab "${generatedTab.name}" with ${generatedTab.maps[0].layers.length} layers`,
      reversible: true
    }]
  }
}
```

#### Example 2: "Add a tab showing lightning and storm data"

**Processing Flow:**
1. Parse intent: `add-tab` with requirements `lightning, storm data`
2. Generate tab with appropriate lightning and pressure layers
3. Insert into existing dashboard structure
4. Validate complete dashboard and upload

#### Example 3: Starting with empty dashboard

**Scenario**: User has no active dashboard
**Command**: "Create a precipitation map for Switzerland"

**Processing Flow:**
1. Detect no active dashboard context
2. Create empty dashboard template
3. Generate first tab with precipitation layers for Switzerland
4. Validate and upload complete dashboard

### API Architecture

#### Single API Endpoint Strategy

To maintain simplicity and leverage existing MetX infrastructure, the chatbot will use a **single API endpoint** for all dashboard operations:

```typescript
// Primary endpoint for complete dashboard operations
POST /api/dashboard/upload

interface DashboardUploadRequest {
  dashboard: any;  // Complete MetX JSON dashboard
  metadata?: {
    source: 'chatbot' | 'manual';
    operation: 'create' | 'add-tab' | 'modify-tab';
    session_id?: string;
    user_command?: string;
    modifications?: string[];
  }
}

interface DashboardUploadResponse {
  success: boolean;
  dashboard_id: string;
  validation: {
    passed: boolean;
    errors: string[];
    warnings: string[];
    fixes_applied: string[];
  };
  download_url?: string;  // For immediate download if needed
}
```

#### Workflow Implementation

**For New Users (No Active Dashboard):**
1. User command: "Create a precipitation map for Switzerland"
2. Chatbot creates empty dashboard template
3. Generates first tab with precipitation layers
4. Uploads complete dashboard via single API
5. Returns dashboard_id and download_url to user

**For Existing Dashboard Users:**
1. User uploads/pastes existing dashboard JSON
2. User command: "Add a tab with wind and temperature data"
3. Chatbot generates new tab and inserts into existing dashboard
4. Uploads complete modified dashboard via single API
5. Returns updated dashboard for download

**Benefits of Single API Approach:**
- **Simplicity**: One endpoint to implement and maintain
- **Reliability**: Complete validation before any changes are applied
- **Consistency**: Same validation pipeline for all dashboard sources
- **Atomic Operations**: All changes applied together or not at all
- **Easy Integration**: Works with existing MetX upload infrastructure

### User Interface Integration

#### Enhanced GenerationForm Component

Extend existing `GenerationForm` to include:

```typescript
interface InteractiveModeProps {
  dashboardFile?: File
  onDashboardLoad?: (dashboard: any) => void
  chatMode?: boolean
}
```

**New UI Elements:**
- Dashboard file upload/paste area
- Interactive chat interface for commands
- Live dashboard structure viewer
- Change history panel with undo/redo
- Command suggestion system

#### Dashboard Context Panel

New component showing:
- Current dashboard structure (tabs, maps, layers)
- Active editing context
- Available modification options
- Recent changes with rollback capability

### Technical Implementation Details

#### Phase 1: Tab Creation System (Week 1-2)

1. **Dashboard State Management**
   - Dashboard loading from file/JSON or empty template creation
   - Basic dashboard structure analysis
   - State management for current dashboard

2. **Tab Generation Pipeline**
   - Command parser for tab creation requests
   - Integration with existing AI generation service
   - Complete tab structure generation (maps, layers, layouts)

#### Phase 2: API Integration & Validation (Week 3-4)

1. **Single API Implementation**
   - Complete dashboard upload/download endpoint
   - Dashboard validation pipeline integration
   - Error handling and user feedback

2. **Enhanced Tab Generation**
   - Context-aware tab creation based on existing dashboard
   - Smart layer selection and parameter optimization
   - Regional and temporal context understanding

#### Phase 3: User Experience & Future Expansion (Week 5-6)

1. **Interactive UI**
   - Chat interface for tab creation commands
   - Dashboard structure visualization
   - Tab preview and validation feedback

2. **Foundation for Future Features**
   - Extensible command parser for future tab modification
   - Session management for dashboard editing
   - Command history and suggestions

### Database Schema Extensions

Add new tables to support interactive features:

```sql
-- Store dashboard modification sessions
CREATE TABLE dashboard_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  original_dashboard JSONB NOT NULL,
  current_dashboard JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Track individual modifications
CREATE TABLE dashboard_modifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES dashboard_sessions(id),
  command_text TEXT NOT NULL,
  modification_type TEXT NOT NULL,
  changes JSONB NOT NULL,
  success BOOLEAN NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Cost Management

Interactive tab creation will use existing cost guardrails:

- **Tab Generation**: ~500-1500 tokens per tab ($0.005-0.015)
- **Dashboard Validation**: Minimal cost (validation only)
- **Simple Tab Commands**: 300-800 tokens ($0.003-0.008)
- **Session Budget**: Default $0.25 per interactive session (focused on tab operations)

### Testing Strategy

1. **Unit Tests**: Command parsing, modification engine, validation
2. **Integration Tests**: End-to-end command processing
3. **Dashboard Compatibility**: Test with existing MetX dashboards
4. **Performance Tests**: Large dashboard handling, response times

## Development Estimate & Pricing

### Effort Breakdown

| Phase | Component | Estimated Hours | Complexity |
|-------|-----------|----------------|------------|
| 1 | Dashboard State Management | 12 hours | Medium |
| 1 | Tab Generation Pipeline | 16 hours | Medium |
| 1 | Command Parser (Tab Focus) | 14 hours | Medium |
| 2 | Single API Integration | 16 hours | Medium |
| 2 | Complete Dashboard Validation | 8 hours | Low |
| 2 | AI Tab Generation Enhancement | 12 hours | Medium |
| 3 | Interactive UI Components | 16 hours | Medium |
| 3 | Dashboard Preview System | 12 hours | Medium |
| 3 | Session Management | 8 hours | Low |
| - | Testing & Documentation | 12 hours | Low |
| - | Integration & Polish | 6 hours | Low |

**Total Estimated Hours**: 132 hours

### Cost Calculation

**Base Development Rate**: CHF 150/hour (senior full-stack development)

**Core Development**: 132 hours × CHF 150 = **CHF 19,800**

**Risk Buffer** (15% for technical complexity): CHF 2,970

**Total Project Cost**: **CHF 22,770**

### Delivery Timeline

- **Week 1-2**: Tab creation system and command parsing
- **Week 3-4**: API integration and validation pipeline
- **Week 5**: UI/UX and testing
- **Week 6**: Final integration and delivery

**Total Timeline**: 6 weeks

## Value Proposition

### For Meteomatics

1. **Differentiated Product**: First interactive dashboard modification system in weather visualization
2. **User Efficiency**: 80% faster dashboard iterations vs. recreation
3. **Lower Learning Curve**: Natural language interface vs. JSON editing
4. **Quality Assurance**: Built-in validation prevents upload failures

### For End Users

1. **Rapid Prototyping**: Quickly test different layer combinations
2. **Contextual Modifications**: Make targeted changes without losing work
3. **Learning Tool**: Understand dashboard structure through interaction
4. **Professional Workflow**: Undo/redo, change tracking, session management

## Risk Assessment

### Technical Risks (Low-Medium)

- **Command Parsing Accuracy**: Mitigated by extensive testing and fallback prompts
- **Dashboard Compatibility**: Mitigated by existing validation infrastructure
- **Performance**: Mitigated by incremental updates and caching

### Business Risks (Low)

- **User Adoption**: Interactive features typically see high engagement
- **Maintenance Overhead**: Built on existing stable infrastructure

## Phased Expansion Strategy

This simplified approach provides a solid foundation for future enhancements:

### Phase 1 Deliverables (This Proposal)
- **Tab Creation**: Natural language commands to add new tabs with weather layers
- **Empty Dashboard Support**: Start from scratch or add to existing dashboards
- **Single API**: Simple upload/download of complete dashboard JSON
- **Full Validation**: Leverage existing MetX compatibility infrastructure

### Future Expansion Phases
- **Phase 2**: Tab modification ("update the precipitation tab with new layers")
- **Phase 3**: Layer-level operations ("change the colormap of the temperature layer")
- **Phase 4**: Advanced operations (batch changes, layer reordering, parameter optimization)
- **Phase 5**: Real-time collaboration and multi-user editing

### Migration Path
The single API approach provides flexibility to add granular endpoints later without breaking existing functionality. The command parser and modification engine are designed to be extensible.

## Conclusion

This simplified interactive dashboard chatbot focuses on the most valuable user workflow - **quickly creating new weather visualization tabs** - while maintaining implementation simplicity and cost effectiveness.

**Key Benefits**:
- **Immediate Value**: Users can rapidly create weather tabs through conversation
- **Low Risk**: Builds on proven MetX infrastructure with minimal new complexity
- **Expandable**: Strong foundation for advanced features in future phases
- **Highly Cost Effective**: 55% cost reduction vs. complex parsing implementation

**Recommended Investment**: CHF 22,770 additional to base package
**Timeline**: 6 weeks delivery
**Expected ROI**: High user engagement with focused, proven use case

This approach positions MetX to be first-to-market with conversational weather dashboard creation while minimizing technical risk and maximizing early user value.