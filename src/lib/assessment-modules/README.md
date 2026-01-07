# Assessment Modules Configuration

## Overview

Assessment Module configurations work in two layers:

### 1. Templates (Code)
**Location:** `src/lib/assessment-modules/config/templates.ts`

These are reusable presets that define default configurations for different AM types. They're TypeScript objects stored in code, not in the database.

**Purpose:**
- Provide starting points when creating new AMs
- Ensure consistency across similar AM types
- Make it easy to create new AMs without configuring everything from scratch

**Example:**
```typescript
{
  id: 'definition-quiz',
  name: 'Definition Quiz',
  question_type: 'definition',
  default_config: {
    question_count: 5,
    difficulty: 'medium',
    evaluation_rubric: { ... }
  }
}
```

### 2. Instance Config (Database)
**Location:** `assessment_modules.config` JSONB column

Each individual Assessment Module stores its own configuration in the database. This is what actually gets used when:
- Generating questions
- Evaluating answers
- Determining behavior (time limits, retakes, etc.)

## How It Works

```
┌─────────────────────────────────────────────────────────┐
│ 1. Admin Creates AM                                      │
│    - Selects template (optional)                        │
│    - Customizes config                                   │
│    - Saves to database                                   │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│ 2. Config Stored in Database                            │
│    assessment_modules table:                             │
│    {                                                     │
│      id: uuid,                                          │
│      title: "Quiz on Chapter 1",                        │
│      question_type: "definition",                        │
│      config: {                                           │
│        question_count: 5,                                │
│        difficulty: "medium",                             │
│        evaluation_rubric: {...},                         │
│        ...                                               │
│      }                                                   │
│    }                                                     │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Student Starts Assessment                            │
│    - System reads config from database                  │
│    - Uses config to:                                     │
│      • Query RAG (using rag_context_count)              │
│      • Generate questions (using question_prompt)        │
│      • Evaluate answers (using evaluation_rubric)       │
│      • Control behavior (time limits, retakes, etc.)    │
└─────────────────────────────────────────────────────────┘
```

## Current Implementation

### Creating an AM
When you create an AM through the UI (`/admin/assessment-modules/new`):
1. You select a `question_type` (definition, socratic, etc.)
2. You can optionally customize the config
3. The config is saved to the database as JSONB

**Current code flow:**
```typescript
// In new/page.tsx
const config = {
  question_prompt: questionPrompt || undefined,
  question_count: questionCount,
  difficulty: 'medium',
  allow_multiple_attempts: true,
};

// Saved to database via API
await fetch('/admin/assessment-modules/api', {
  method: 'POST',
  body: JSON.stringify({ config, ... })
});
```

### Using Templates (Not Yet Integrated)
The templates I created are available but **not yet integrated** into the UI. To use them:

```typescript
import { getDefaultConfigForType } from '@/lib/assessment-modules/config';

// Get default config for a question type
const defaultConfig = getDefaultConfigForType('definition');
// Returns: { question_count: 5, difficulty: 'medium', ... }
```

## Next Steps

To fully integrate templates:

1. **Update the AM creation form** to:
   - Show available templates when selecting question_type
   - Pre-fill config fields from selected template
   - Allow customization

2. **When generating questions**, read config from database:
   ```typescript
   const module = await supabase
     .from('assessment_modules')
     .select('config, question_type')
     .eq('id', moduleId)
     .single();
   
   // Use module.config to generate questions
   ```

3. **When evaluating answers**, use the rubric from config:
   ```typescript
   const rubric = module.config.evaluation_rubric;
   // Score answer based on rubric
   ```

## Config Structure

See `src/lib/assessment-modules/config/types.ts` for the full TypeScript interface.

Key fields:
- `question_prompt`: Custom LLM prompt for question generation
- `question_count`: Number of questions to generate
- `difficulty`: 'easy' | 'medium' | 'hard'
- `evaluation_rubric`: Scoring weights for different criteria
- `rag_context_count`: How many RAG chunks to use
- `allow_multiple_attempts`: Can students retake?
- `time_limit_minutes`: Optional time limit
- `provide_immediate_feedback`: Show feedback right away?
- `show_correct_answers_after`: When to reveal answers

