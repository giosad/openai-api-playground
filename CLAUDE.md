# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**OpenAI Playground Plus** - A Next.js web application that provides an interactive playground for testing multiple OpenAI APIs using the user's own API key. The API key is stored client-side in localStorage and never sent to any backend server.

**Live App**: https://openai-playground-plus.vercel.app

## Commands

```bash
# Development
npm run dev              # Start dev server on http://localhost:3000
npm run build            # Build production bundle
npm run start            # Start production server
npm run lint             # Run ESLint
npm run format           # Format code with Prettier
npm run lint-staged      # Run lint-staged (used by Husky pre-commit hook)
```

## Architecture

### Client-Side Only Design
- **No backend** - all API calls go directly from browser to OpenAI
- **API key storage**: Stored in browser's `localStorage` with key `OPENAI_API_KEY` (defined in `src/lib/constants.ts`)
- **OpenAI client**: Initialized in `src/lib/openai.ts` with `dangerouslyAllowBrowser: true`, API key set dynamically in `/home` layout

### Authentication Flow
1. Landing page (`src/app/page.tsx`) - user enters API key
2. Key saved to `localStorage` on submit
3. Router navigates to `/home/text`
4. Home layout (`src/app/home/layout.tsx`) checks for key in localStorage on mount
5. If no key found, redirects back to landing page
6. If key exists, sets `openai.apiKey = apiKey` for all API calls

### App Structure

**Route Organization** (Next.js App Router):
- `/` - Landing page with API key input
- `/home/text` - Text generation (Chat Completions)
- `/home/vision` - Vision API (images + text prompts)
- `/home/images` - Image generation and editing
- `/home/assistants` - Assistants API
- `/home/moderations` - Moderation API
- `/home/tokenizer` - Token counting utility

**Key Files**:
- `src/lib/openai.ts` - Singleton OpenAI client instance
- `src/lib/constants.ts` - App-wide constants
- `src/components/ui/` - shadcn/ui components (Button, Input, Select, etc.)
- `src/app/home/layout.tsx` - Protected layout with navbar and auth check

### Image Generation/Edit Implementation

The images page (`src/app/home/images/page.tsx`) supports both generation and editing:

**Model Support**:
- **GPT Image models** (`gpt-image-1.5`, `gpt-image-1`, `gpt-image-1-mini`, `chatgpt-image-latest`):
  - Sizes: `auto`, `1024x1024`, `1536x1024`, `1024x1536`
  - Image edit: requires image as **array** (even for single image)
  - No style parameter support
- **DALL-E 3**:
  - Sizes: `1024x1024`, `1792x1024`, `1024x1792`
  - Style parameter: `vivid` or `natural`
  - Image edit: **not supported**
- **DALL-E 2**:
  - Sizes: `256x256`, `512x512`, `1024x1024`
  - Image edit: requires image as **single file**

**Image Upload/Edit Flow**:
1. User can drag & drop or upload image via file input
2. File mimetype validation (must be `image/png`, `image/jpeg`, or `image/webp`)
3. If mimetype missing/wrong, infer from file extension and recreate File object
4. When image present: calls `openai.images.edit()` endpoint
5. When no image: calls `openai.images.generate()` endpoint
6. Size dropdown options change dynamically based on selected model

**Important**: The OpenAI SDK can lose file mimetypes when sending arrays. Always ensure files have correct mimetype set before passing to SDK.

### State Management

No global state library - each page manages its own state with React hooks:
- API responses stored in local component state
- Options (model, temperature, etc.) in component state
- User messages/conversations in component state arrays

### UI Components

Built with **shadcn/ui** (Radix UI primitives + Tailwind CSS):
- Uses `next-themes` for dark mode
- All components in `src/components/ui/`
- Custom SVG components in `src/components/svgs/`

## Important Patterns

### Adding New Models

When OpenAI releases new models, update model lists in the relevant page files:
- Text: `src/app/home/text/page.tsx` - `models` array
- Images: `src/app/home/images/page.tsx` - `models` array (also update size validation logic)
- Vision: `src/app/home/vision/page.tsx` - `models` array

### File Upload Handling

When implementing file uploads for OpenAI APIs:
1. Always validate file mimetype against API requirements
2. If mimetype is `application/octet-stream` or missing, infer from extension
3. Create new File object with correct mimetype: `new File([blob], filename, { type: mimetype })`
4. Check API docs for whether endpoint expects single file or array

### API Error Handling

All API pages follow this pattern:
```typescript
try {
  const response = await openai.someAPI.someMethod({ ... });
  setResults(response.data);
} catch (err: any) {
  setErrorMessage(err.message);
}
```

Display errors to users - don't silently fail.
