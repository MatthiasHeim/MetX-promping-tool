# Prompt Versioning Implementation

## Overview

This document outlines the implementation of prompt versioning functionality in the MetX application. The system allows users to version prompts automatically when changes are made, view version history, and rollback to previous versions.

## Database Schema Changes

### New Table: `prompt_versions`
- Stores all versions of each prompt
- Automatically created when prompts are updated
- Tracks which version is currently active

```sql
CREATE TABLE prompt_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    template_text TEXT NOT NULL,
    json_prefix TEXT,
    json_suffix TEXT,
    use_placeholder BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT false,
    UNIQUE(prompt_id, version_number)
);
```

### Updated Table: `prompts`
- Added `current_version` field to track the current version
- Added `is_active` field for consistency

## Automatic Versioning

### Database Trigger
- Automatically creates new versions when prompt content changes
- Triggered on INSERT and UPDATE operations
- Only creates versions when versioned fields change (name, description, template_text, etc.)

### Version Creation Logic
1. When a prompt is updated, check if versioned fields have changed
2. If changes detected:
   - Increment version number
   - Deactivate all previous versions
   - Create new version record with `is_active = true`

## API Enhancements

### PromptService New Methods

#### `getPromptVersions(promptId: string): Promise<PromptVersion[]>`
- Fetches all versions for a specific prompt
- Returns versions ordered by version number (newest first)

#### `getPromptVersion(promptId: string, versionNumber: number): Promise<PromptVersion | null>`
- Fetches a specific version of a prompt
- Returns null if version not found

#### `rollbackPromptToVersion(promptId: string, versionNumber: number): Promise<Prompt>`
- Rolls back a prompt to a specific version
- Uses PostgreSQL function for atomic operation
- Updates the main prompt record with version data

#### `getCurrentVersion(promptId: string): Promise<number>`
- Gets the current active version number for a prompt

#### `fetchPromptsWithVersions(): Promise<Prompt[]>`
- Fetches prompts with their version information

## UI Components

### PromptVersionHistory Component
- Modal dialog showing version history
- Displays all versions with details
- Allows expanding to see full version content
- Provides rollback functionality with confirmation

**Features:**
- Version list with active version highlighting
- Expandable details for each version
- Rollback buttons with loading states
- Date formatting and user-friendly display

### GenerationsView Enhancements
- Added prompt version filter dropdown
- Shows version numbers in generation cards
- Version history button with clock icon
- Integration with PromptVersionHistory component

**New Filtering:**
- Filter by specific prompt versions
- Dynamic version options based on selected prompt
- Automatic reset of version filter when prompt changes

## User Experience

### Viewing Version History
1. Navigate to "All Generations" tab
2. Click the clock icon next to a prompt name
3. View all versions with creation dates
4. Expand versions to see full details
5. Click "Rollback" to revert to a previous version

### Filtering by Version
1. Select a prompt from the filter dropdown
2. Version filter becomes enabled
3. Choose specific version or leave as "All Versions"
4. Results filtered to show only generations using that version

### Automatic Version Creation
- Versions are created automatically when editing prompts
- No user action required
- Version numbers increment automatically
- Previous versions remain accessible

## Database Migration

The implementation includes a comprehensive migration that:
- Creates the `prompt_versions` table
- Adds new columns to existing `prompts` table
- Creates triggers and functions for automatic versioning
- Sets up proper indexes for performance
- Migrates existing prompts to have initial versions
- Establishes proper RLS policies

## Benefits

1. **Version Control**: Complete history of prompt changes
2. **Rollback Capability**: Easy reversion to working versions
3. **Filtering**: Filter generations by prompt versions
4. **Automatic**: No manual effort required for versioning
5. **Audit Trail**: Full history of prompt evolution
6. **Performance**: Optimized with proper indexes

## Testing

Comprehensive test suite covering:
- Version creation and retrieval
- Rollback functionality
- Error handling
- Database operations
- UI interactions

## Implementation Details

### Database Functions
- `create_prompt_version()`: Trigger function for automatic versioning
- `rollback_prompt_to_version()`: Function for atomic rollback operations

### Performance Optimizations
- Indexes on `prompt_id` and `is_active` fields
- Efficient queries using proper joins
- Minimal data transfer for version lists

### Security
- RLS policies for proper access control
- Validation of version existence before rollback
- Protection against unauthorized access

## Future Enhancements

Potential improvements for future versions:
1. Version comparison (diff view)
2. Branch-based versioning
3. Version labels/tags
4. Collaborative editing with conflict resolution
5. Version export/import functionality 