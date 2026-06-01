# Plan: Switch to Anthropic as Primary Provider

## Overview
Transition the application to use Anthropic (Claude) as the primary AI provider while keeping OpenAI code in the codebase for potential future use. The main changes involve making OpenAI optional and updating default provider selections.

## Current State

### Provider Usage Analysis

1. **Document Processing (Already using Anthropic)**
   - Location: `src/server/api/routers/document.ts` (line 45)
   - Status: ✅ Already defaults to `ModelProvider.claude_4_sonnet`
   - No changes needed

2. **Summarization Features (Provider-agnostic)**
   - Files: `generate-abstract.ts`, `generate-chunk.ts`, `generate-metadata.ts`
   - Status: ✅ These accept `ModelProvider` parameter and switch between providers
   - Uses the model provider set when document is created (which is already Anthropic)
   - No changes needed

3. **Chat Feature (Using OpenAI)**
   - Location: `src/server/api/routers/chat.ts` (line 13)
   - Current: Hard-coded to `openai("gpt-4o-mini")`
   - Status: ⚠️ Needs to be changed to Anthropic

4. **Environment Configuration (OpenAI required)**
   - Location: `src/create-env.mjs` (lines 14-15)
   - Current: Both `OPENAI_API_KEY` and `ANTHROPIC_API_KEY` are required
   - Status: ⚠️ Need to make `OPENAI_API_KEY` optional

5. **Model Definitions**
   - Location: `src/features/summarize/models.ts`
   - Status: ✅ Defines both providers, no changes needed
   - Note: Keep both `anthropicFirst` and `openaiFirst` exports

## Changes Required

### 1. Make OPENAI_API_KEY Optional in Environment Config

**File:** `src/create-env.mjs`

**Changes:**
- Line 14: Change `OPENAI_API_KEY: z.string().min(1)` to `OPENAI_API_KEY: z.string().min(1).optional()`
- This prevents build failures when OpenAI key is not provided
- The key can still be provided if needed in the future

### 2. Update Chat Router to Use Anthropic

**File:** `src/server/api/routers/chat.ts`

**Changes:**
- Line 1: Add import for Anthropic: `import { anthropic } from "@ai-sdk/anthropic";`
- Line 12-13: Replace the model initialization:
  ```typescript
  // OLD:
  const model = env.USE_TEST_PROVIDERS === "false" ? openai("gpt-4o-mini") : mockChatModel;
  
  // NEW:
  const model = env.USE_TEST_PROVIDERS === "false" ? anthropic("claude-haiku-4-5") : mockChatModel;
  ```
- Keep the OpenAI import in place (don't remove it) for potential future use
- The model string should match what's used in `models.ts` (line 6)

### 3. Add Safety Guard for Missing OpenAI Key (Optional but Recommended)

**File:** `src/features/summarize/models.ts`

**Changes:**
- Add a conditional check around `openaiFirst` export to handle missing API key gracefully
- This prevents runtime errors if OpenAI is accidentally invoked without a key
- Keep the export available for code that references it

**Approach:**
```typescript
// Add a check that returns a helpful error if OpenAI is used without a key
// Or provide a fallback that redirects to Anthropic
// This is defensive programming for the transition period
```

## Files to Modify

1. `src/create-env.mjs` - Make OpenAI key optional
2. `src/server/api/routers/chat.ts` - Switch to Anthropic model
3. `src/features/summarize/models.ts` - (Optional) Add safety guard

## Files to Keep Unchanged

- `src/server/api/routers/document.ts` - Already using Anthropic
- `src/features/summarize/generate-abstract.ts` - Provider-agnostic
- `src/features/summarize/generate-chunk.ts` - Provider-agnostic
- `src/features/summarize/generate-metadata.ts` - Provider-agnostic
- `src/services/llm/cost.ts` - Keep all cost calculations
- `prisma/schema.prisma` - Keep all ModelProvider enum values

