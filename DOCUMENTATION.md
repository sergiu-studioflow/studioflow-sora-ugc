# Sora UGC Studio — Full System Documentation

**Version:** 1.0.0
**Last Updated:** 2026-03-17
**Status:** Production (Vercel)
**URL:** https://studioflow-sora-ugc.vercel.app

---

## Overview

Sora UGC Studio is a production web application for AI-powered UGC (User-Generated Content) video generation. Users describe a creative direction, define a character, upload a product image, and the system generates a hyper-realistic video of a person showcasing the product — all within a single 3-panel interface.

**Pipeline:**
```
User Input → Claude (prompt craft) → Kie AI (first frame) → Sora 2 (video) → Video Output
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | Next.js 16.1.6 + React 19 | SSR, API routes, app router |
| Styling | Tailwind v4 + Radix UI | Dark-mode UI with design tokens |
| Auth | Better Auth + Resend | Magic Link email authentication |
| Database | Neon PostgreSQL + Drizzle ORM | Serverless Postgres, type-safe queries |
| Prompt Gen | Anthropic SDK (Claude Sonnet 4.5) | Structured Sora prompt generation |
| Frame Gen | Kie AI (Nano Banana Pro) | AI-composed first frame with product |
| Video Gen | OpenAI Sora 2 / Sora 2 Pro | Video generation from prompt + frame |
| Image Processing | Sharp | Resize frames to exact Sora dimensions |
| File Storage | Vercel Blob | Product images, frames, videos |
| Deploy | Vercel (Hobby plan) | Auto-deploy from GitHub main branch |

---

## Architecture

### 3-Panel Layout

```
┌──────────────┬───────────────────────┬──────────────────┐
│  Left Panel  │   Middle Panel        │  Right Panel     │
│  (320px)     │   (flex-1)            │  (380px)         │
│              │                       │                  │
│  Creative    │  Scene Description    │  Progress        │
│  Direction   │  (editable)           │  Stepper         │
│              │                       │  (5 steps)       │
│  Character   │  Dialogue             │                  │
│  Details     │  (editable)           │  Progress Bar    │
│              │                       │                  │
│  Appearance  │  Compliance Notes     │  Video Player    │
│  Fields      │  (editable)           │  (when ready)    │
│              │                       │                  │
│  Product     │  Negative Prompt      │  Download        │
│  Upload      │  (editable)           │  Button          │
│              │                       │                  │
│  Aspect/     │  Reference Frame      │  Error State     │
│  Duration    │  Preview              │                  │
│              │                       │                  │
│  [Generate]  │  [Direct to Sora]     │                  │
└──────────────┴───────────────────────┴──────────────────┘
```

### Data Flow

```
1. User fills form (left panel)
   ↓
2. "Generate Script" button
   ↓
3. POST /api/generate
   ├── Creates DB record (status: generating_prompt)
   ├── Claude generates structured prompt (sceneDescription, dialogue, compliance, negativePrompt)
   ├── Kie AI generates composed first frame (person holding product)
   │   ├── Creates async task via Kie API
   │   ├── Polls for completion (3s intervals, 90s max)
   │   ├── Downloads generated image
   │   ├── Resizes to exact Sora dimensions (720x1280 or 1280x720) with Sharp
   │   └── Persists to Vercel Blob
   └── Updates DB (status: prompt_ready)
   ↓
4. Middle panel populates with editable prompt sections + frame preview
   ↓
5. User optionally edits prompt, then clicks "Direct to Sora"
   ↓
6. POST /api/generate/[id]/send-to-sora
   ├── Reassembles fullPrompt from (potentially edited) fields
   ├── Submits to Sora API with prompt + reference frame
   └── Updates DB (status: creating_video, soraJobId stored)
   ↓
7. Client polls GET /api/generate/[id] every 3 seconds
   ├── Server checks Sora API status on each poll
   ├── On completion: downloads video → Vercel Blob → updates DB
   └── Returns progress percentage to client
   ↓
8. Right panel shows video player (status: video_ready)
```

---

## Project Structure

```
.Portals/studioflow-sora-ugc/
├── src/
│   ├── app/
│   │   ├── layout.tsx                    # Root layout (Geist fonts, theme)
│   │   ├── globals.css                   # Tailwind v4 + CSS tokens
│   │   ├── page.tsx                      # Redirects / → /create
│   │   ├── login/page.tsx                # Magic link auth page
│   │   ├── create/page.tsx               # Main 3-panel studio (protected)
│   │   └── api/
│   │       ├── auth/[...all]/route.ts    # Better Auth handler
│   │       ├── generate/route.ts         # POST: Claude prompt + Kie frame
│   │       ├── generate/[id]/route.ts    # GET: poll status, download video
│   │       ├── generate/[id]/send-to-sora/route.ts  # POST: submit to Sora
│   │       ├── generate/[id]/events/route.ts  # GET: SSE progress stream
│   │       ├── upload/route.ts           # POST: client-side Blob upload handler
│   │       ├── archetypes/route.ts       # GET: list character archetypes
│   │       ├── history/route.ts          # GET: past generations
│   │       └── health/route.ts           # GET: health check
│   ├── components/
│   │   ├── studio/
│   │   │   ├── studio-layout.tsx         # 3-panel grid + state management
│   │   │   ├── left-panel.tsx            # Input form + upload
│   │   │   ├── middle-panel.tsx          # Prompt preview/editor + frame
│   │   │   └── right-panel.tsx           # Progress stepper + video player
│   │   ├── shared/
│   │   │   ├── status-badge.tsx          # Colored status indicator
│   │   │   └── empty-state.tsx           # Empty state placeholder
│   │   ├── ui/                           # Radix UI components
│   │   ├── theme-provider.tsx            # Dark/light/system theme
│   │   └── theme-toggle.tsx              # Theme switcher
│   ├── lib/
│   │   ├── db/
│   │   │   ├── index.ts                  # Drizzle client
│   │   │   └── schema.ts                 # All tables (6 tables)
│   │   ├── auth.ts                       # Better Auth config + requireAuth()
│   │   ├── auth-client.ts                # Client-side auth instance
│   │   ├── claude.ts                     # Claude prompt generation
│   │   ├── sora.ts                       # Sora API wrapper
│   │   ├── image-gen.ts                  # Kie AI frame generation + Sharp resize
│   │   ├── types.ts                      # TypeScript types + status enums
│   │   ├── utils.ts                      # cn(), formatDate(), getStatusColor()
│   │   └── prompts/
│   │       └── system-prompt.ts          # Claude system prompt (visual realism rules)
│   └── middleware.ts                     # Edge auth guard
├── scripts/
│   └── seed.ts                           # Seed archetypes + app config
├── drizzle/                              # Migrations
├── package.json
├── drizzle.config.ts
├── next.config.ts
└── tsconfig.json
```

---

## Database Schema

### Tables

#### `generations` (core job table)
| Column | Type | Purpose |
|--------|------|---------|
| id | uuid PK | |
| userId | uuid FK → users | Owner |
| archetypeId | uuid FK → archetypes | Optional selected archetype |
| creativeDirection | text | User's simple description |
| characterDescription | text | Free-text character override |
| ageRange, gender | text | Character demographics |
| makeup, expression, hair, clothing | text | Appearance fields |
| productImageUrl | text | Vercel Blob URL of uploaded product |
| aspectRatio | text | "9:16", "16:9", "720p" |
| duration | integer | 4, 8, or 12 seconds |
| sceneDescription | text | Claude-generated scene description |
| dialogue | text | Claude-generated voiceover script |
| complianceNotes | text | Claude-generated compliance notes |
| negativePrompt | text | Claude-generated negative prompt |
| fullPrompt | text | Assembled prompt sent to Sora |
| soraJobId | text | OpenAI Sora job identifier |
| soraModel | text | "sora-2" or "sora-2-pro" |
| status | text | Status lifecycle (see below) |
| videoUrl | text | Vercel Blob URL of final video |
| thumbnailUrl | text | Vercel Blob URL of AI-generated frame |
| estimatedCost | text | e.g. "$2.40" |
| errorMessage | text | Error details if failed |
| createdAt, updatedAt | timestamptz | Timestamps |

#### `archetypes` (character library)
| Column | Type | Purpose |
|--------|------|---------|
| id | uuid PK | |
| name | text | e.g. "Wellness Mom", "Tech Bro" |
| ageRange | text | e.g. "25-34" |
| gender | text | "female", "male", "non-binary" |
| profile | text | Personality description |
| defaultMakeup | text | Default makeup for archetype |
| defaultExpression | text | Default expression |
| defaultHair | text | Default hair style |
| defaultClothing | text | Default outfit |
| isActive | boolean | Show in archetype selector |

### Status Lifecycle
```
draft → generating_prompt → prompt_ready → creating_video → video_ready
                                                            ↘ error
```

| Status | Description |
|--------|------------|
| `draft` | Initial state, form not submitted |
| `generating_prompt` | Claude is generating the structured prompt |
| `prompt_ready` | Prompt generated, user can review/edit |
| `creating_video` | Sora is generating the video |
| `video_ready` | Video complete, available for playback/download |
| `error` | Any step failed (error message stored) |

---

## API Reference

### POST `/api/generate`
Creates a new generation and generates the prompt + first frame.

**Request Body:**
```json
{
  "creativeDirection": "busy mum showing teeth whitening product",
  "ageRange": "25-34",
  "gender": "female",
  "profile": "busy mum of young kids",
  "makeup": "natural makeup",
  "expression": "warm, genuine smile",
  "hair": "hair tied up casually",
  "clothing": "comfortable home clothing",
  "productImageUrl": "https://blob.vercel-storage.com/references/...",
  "aspectRatio": "9:16",
  "duration": 8,
  "archetypeId": "optional-uuid"
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "sceneDescription": "...",
  "dialogue": "...",
  "complianceNotes": "...",
  "negativePrompt": "...",
  "fullPrompt": "...",
  "estimatedCost": "$2.40",
  "referenceFrameUrl": "https://blob.vercel-storage.com/frames/...",
  "frameError": null,
  "status": "prompt_ready"
}
```

### POST `/api/generate/[id]/send-to-sora`
Sends the (optionally edited) prompt to Sora for video generation.

**Request Body:**
```json
{
  "sceneDescription": "edited scene...",
  "dialogue": "edited dialogue...",
  "complianceNotes": "...",
  "negativePrompt": "edited constraints..."
}
```

**Response (200):**
```json
{
  "ok": true,
  "jobId": "video_69b87bc7..."
}
```

### GET `/api/generate/[id]`
Polls generation status. If `creating_video`, checks Sora API directly.

**Response (200):**
```json
{
  "id": "uuid",
  "status": "creating_video",
  "progress": 45,
  "videoUrl": "",
  "estimatedCost": "$2.40"
}
```

When complete:
```json
{
  "id": "uuid",
  "status": "video_ready",
  "videoUrl": "https://blob.vercel-storage.com/videos/...",
  "progress": 100
}
```

### POST `/api/upload`
Client-side Vercel Blob upload handler. Used by `@vercel/blob/client`'s `upload()` function.

- Max file size: 10MB
- Accepted types: image/png, jpeg, jpg, webp, gif
- Requires authentication

### GET `/api/archetypes`
Returns all active character archetypes.

### GET `/api/history`
Returns last 50 generations for the authenticated user.

---

## AI Integration Details

### Claude (Prompt Generation)

**Model:** Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`)
**Max tokens:** 4096
**Temperature:** 0.7

**System Prompt Structure:**
1. **Role:** Expert UGC video prompt engineer for Sora
2. **Visual Realism Rules (11 rules):**
   - Handheld iPhone realism (micro-shake, tilt drift)
   - Skin texture (visible pores, no beauty filters)
   - Autofocus simulation (subtle rack focus)
   - Breathing bounce (gentle vertical movement)
   - Natural lighting (no studio setups)
   - Background clutter (real environment details)
   - Audio cues in visual (lip sync, ambient movement)
   - Wardrobe realism (wrinkles, non-pristine clothes)
   - Natural hand gestures
   - Emotional authenticity
   - Product interaction (holding naturally)
3. **Psychology Frameworks:** Loss aversion, transformation, secret discovery, social proof, obstacle-to-win, relatability
4. **Compliance Rules:** No medical/financial guarantees, "consistent use" language
5. **Output Format:** JSON with `sceneDescription`, `dialogue`, `complianceNotes`, `negativePrompt`

### Kie AI (Frame Generation)

**Model:** Nano Banana Pro (Gemini 3.0 Pro Image under the hood)
**API:** `https://api.kie.ai/api/v1/jobs`

**Flow:**
1. `POST /createTask` with prompt + product image URL + aspect ratio
2. Poll `GET /recordInfo?taskId=...` every 3s (max 90s)
3. On success, download from `resultUrls[0]`
4. Resize to exact Sora dimensions (720x1280 or 1280x720) using Sharp
5. Upload resized frame to Vercel Blob

**Frame Prompt Template:**
- Photorealistic iPhone selfie perspective
- Person holding product from reference image
- Character details (age, gender, profile, appearance)
- Scene context from Claude's output
- Critical rules: exact product packaging, natural skin, no beauty filters

### Sora (Video Generation)

**Model:** Sora 2 (`sora-2`) or Sora 2 Pro (`sora-2-pro`)
**API:** `https://api.openai.com/v1/videos`

**Parameters:**
- `prompt`: Full assembled prompt from Claude
- `size`: "720x1280" (9:16) or "1280x720" (16:9)
- `seconds`: "4", "8", or "12"
- `input_reference`: `{ image_url: "..." }` — AI-generated first frame

**CRITICAL:** Reference image MUST match exact video dimensions. Frame is resized to 720x1280 or 1280x720 before submission.

**Polling:** `GET /v1/videos/{id}` — statuses: queued → in_progress → completed/failed
**Download:** `GET /v1/videos/{id}/content` with Bearer token → video stream → Vercel Blob

**Cost:** $0.30/sec (sora-2) or $0.50/sec (sora-2-pro)

---

## State Management

Client-side state uses React's `useReducer` with 4 action types:

```typescript
type StudioState = {
  // Form inputs (10 fields)
  creativeDirection: string;
  archetypeId: string;
  ageRange: string;
  gender: string;
  profile: string;
  makeup: string;
  expression: string;
  hair: string;
  clothing: string;
  productImageUrl: string;
  productImagePreview: string;
  aspectRatio: string;       // "9:16" | "16:9" | "720p"
  duration: number;          // 4 | 8 | 12

  // Generation outputs (12 fields)
  generationId: string | null;
  status: GenerationStatus;
  sceneDescription: string;
  dialogue: string;
  complianceNotes: string;
  negativePrompt: string;
  fullPrompt: string;
  estimatedCost: string;
  videoUrl: string;
  errorMessage: string;
  progress: number;
  referenceFrameUrl: string;
  frameError: string;
};

type Action =
  | { type: "SET_FIELD"; field: keyof StudioState; value: string | number }
  | { type: "SET_ARCHETYPE"; payload: Partial<StudioState> }
  | { type: "SET_GENERATION"; payload: Partial<StudioState> }
  | { type: "RESET" };
```

---

## Authentication

**Method:** Magic Link (email-only, no passwords)
**Provider:** Better Auth + Resend
**Session:** HTTP-only cookie (`better-auth.session_token` or `__Secure-better-auth.session_token` on HTTPS)

**Flow:**
1. Middleware checks for session cookie (edge-compatible, no DB call)
2. Unauthenticated → redirect to `/login`
3. User enters email → `authClient.signIn.magicLink({ email })`
4. Better Auth sends magic link via Resend (from: `noreply@portal.studio-flow.co`)
5. User clicks link → session created → redirect to `/create`
6. First login auto-provisions user as `admin` in `users` table

---

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...                    # Neon PostgreSQL connection string

# Auth
BETTER_AUTH_SECRET=...                           # 32+ character secret
BETTER_AUTH_URL=https://studioflow-sora-ugc.vercel.app
NEXT_PUBLIC_APP_URL=https://studioflow-sora-ugc.vercel.app

# Email
RESEND_API_KEY=re_...                            # Resend API key for magic link emails

# AI Services
ANTHROPIC_API_KEY=sk-ant-...                     # Claude prompt generation
OPENAI_API_KEY=sk-...                            # Sora video generation
KIE_API_KEY=...                                  # Kie AI frame generation

# Storage
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...         # Vercel Blob storage

# Optional
SEED_BRAND_NAME=Sora UGC Studio                  # Brand name for health check
RESEND_FROM_EMAIL=noreply@portal.studio-flow.co  # Sender email
RESEND_FROM_NAME=StudioFlow                      # Sender display name
```

---

## Infrastructure

### Neon PostgreSQL
- **Project:** `wandering-dew-79235767`
- **Region:** US West 2
- **Tables:** 9 (4 auth + 5 app)

### Vercel
- **Project:** `studioflow-sora-ugc`
- **Plan:** Hobby (60s serverless timeout, 4.5MB payload limit)
- **Blob Store:** `store_8UTRwzA6TtxNYhmy`
- **Auto-deploy:** Push to `main` → Vercel builds and deploys

### GitHub
- **Repo:** `sergiu-studioflow/studioflow-sora-ugc`

---

## Key Design Decisions & Lessons Learned

### 1. Client-Side Blob Upload (not server-side)
**Problem:** Vercel Hobby plan limits serverless function payloads to 4.5MB. Product images exceed this.
**Solution:** Use `@vercel/blob/client`'s `upload()` function. Browser uploads directly to Blob storage; server only generates an upload token via `handleUpload()`.

### 2. Client-Driven Polling (not server-side background)
**Problem:** Vercel Hobby plan has 60-second serverless timeout. Sora videos take 2-5 minutes.
**Solution:** Client polls `GET /api/generate/[id]` every 3 seconds. Each request checks Sora API status within the 60s window. No background jobs needed.

### 3. AI-Generated First Frame (not raw product image)
**Problem:** Sora's `input_reference` treats the image as the video's first frame. A raw product image produces a video that just shows the product, not a person holding it.
**Solution:** Kie AI (Nano Banana Pro) generates a composed frame showing a person (matching character description) holding the product. This frame becomes Sora's starting point, ensuring the product appears naturally in the video.

### 4. Frame Resize to Exact Sora Dimensions
**Problem:** Sora rejects reference images that don't match the requested video resolution exactly ("Inpaint image must match the requested width and height").
**Solution:** After downloading the Kie AI frame, resize it with Sharp to exactly 720x1280 (9:16) or 1280x720 (16:9) before uploading to Vercel Blob.

### 5. Product Upload Before Generate Button
**Problem:** Product upload was positioned below the Generate button. Users clicked Generate before uploading, resulting in empty `productImageUrl` → no frame generation → no product in video.
**Solution:** Moved Product Reference upload section above the Generate Script button. Added visual status badges (green "Uploaded" / red "Upload failed") and disabled Generate while uploading.

### 6. Frame Error Visibility
**Problem:** Frame generation errors were caught silently (`try/catch` with console.error only). Users had no idea why the product wasn't appearing in videos.
**Solution:** Surface `frameError` in the API response and show yellow warning in the middle panel when frame generation fails.

### 7. Video Persistence to Vercel Blob
**Problem:** Sora video URLs are temporary and require authentication to access.
**Solution:** On poll completion, download video from Sora API (with Bearer token) and re-upload to Vercel Blob for permanent public access.

---

## Cost Breakdown

| Service | Cost per Generation | Notes |
|---------|-------------------|-------|
| Claude (prompt) | ~$0.01-0.03 | Sonnet 4.5, ~2K tokens |
| Kie AI (frame) | ~$0.04-0.08 | Nano Banana Pro, 1K resolution |
| Sora (video) | $1.20-3.60 | $0.30/sec × 4-12 seconds |
| Vercel Blob | ~$0.001 | Storage + bandwidth |
| **Total** | **~$1.25-3.70** | Per video generation |

The approval gate (user reviews prompt before clicking "Direct to Sora") acts as the cost control point. Estimated cost is displayed before submission.

---

## Seed Data

The `scripts/seed.ts` populates 15 archetypes:

| Archetype | Age | Gender | Profile |
|-----------|-----|--------|---------|
| Wellness Mom | 28-35 | female | Health-conscious mother |
| Fitness Bro | 22-30 | male | Gym enthusiast |
| Skincare Minimalist | 25-32 | female | Less-is-more beauty |
| Tech Early Adopter | 25-35 | male | Gadget reviewer |
| Eco-Conscious Student | 19-24 | non-binary | Sustainability focused |
| Beauty Influencer | 20-28 | female | Makeup & skincare creator |
| Dad Who Tries | 30-40 | male | Relatable father figure |
| Night Shift Nurse | 25-35 | female | Healthcare worker |
| College Athlete | 18-23 | male | Sports performance |
| New Grad Professional | 22-27 | female | Career starter |
| Retired Adventurer | 55-65 | male | Active lifestyle senior |
| Busy Executive | 35-45 | female | Corporate leader |
| Creative Freelancer | 24-32 | non-binary | Artist/designer |
| Suburban Neighbor | 30-45 | male | Approachable everyman |
| Teen Trendsetter | 16-19 | female | Gen Z taste-maker |

---

## Security

- **Auth:** All API routes (except /health, /archetypes) require valid session via `requireAuth()`
- **Middleware:** Edge-level cookie check redirects unauthenticated users
- **Uploads:** Server validates file type and size before generating upload token
- **Credentials:** All API keys stored as Vercel environment variables, never in code
- **Auto-provisioning:** First Magic Link login creates user as admin (intended for small team use)

---

## Future Enhancements (Planned)

- History page with generation gallery
- Video comparison (side-by-side different prompts)
- Batch generation (multiple archetypes at once)
- Brand preset system (save product + brand guidelines)
- A/B testing integration
- Cost tracking dashboard
- Team/organization support with role-based access
- Webhook notifications on video completion
- Re-generation with prompt tweaks
- Video editing/trimming post-generation
