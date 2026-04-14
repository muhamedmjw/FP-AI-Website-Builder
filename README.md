# AI Website Builder

A full-stack web app that turns natural-language prompts into complete, editable websites.

The app supports English, Arabic, and Kurdish (including RTL), lets users iterate in chat, preview results live, save version history, export ZIPs, and deploy generated sites to Netlify.

---

## Tech Stack

- Next.js 16 (App Router)
- React 19 + TypeScript 5
- Tailwind CSS 4
- Supabase (Auth + Postgres + RLS)
- DeepSeek API (AI generation)

---

## Key Features

- AI website generation from plain-language prompts
- Unsplash-powered image URL enrichment for generated websites (optional)
- Clarification flow before full generation when needed
- Split chat and live preview workflow
- Multi-language UI/output: English, Arabic, Kurdish
- RTL-aware experience for Arabic and Kurdish
- Authenticated workspaces with persistent chat history
- Version history (list, restore, label)
- ZIP export of generated websites
- One-click deploy of generated website artifacts to Netlify
- Guest mode with a limit of 3 prompts per day (cookie + DB tracked)

---

## Project Structure

```text
src/
  app/
    (auth)/                       # signin / signup pages
    (workspace)/                  # authenticated workspace layout
    account/                      # account settings page
    api/
      chat/send/                  # authenticated chat + AI generation
      chat/abort/                 # cancel in-progress generation
      chat/delete/                # delete/archive chats
      guest/chat/                 # guest AI generation (daily limit)
      guest/usage/                # guest usage quota endpoint
      guest/zip/                  # ZIP export for guest sessions
      website/deploy/             # deploy to Netlify
      website/restore/            # restore a saved version
      website/save/               # persist generated HTML
      website/upload-image/       # user image uploads
      website/user-images/        # list uploaded images
      website/version-label/      # label a version
      website/versions/           # list version history
  client/
    components/                   # shared UI components
    features/                     # feature-specific components & hooks
    lib/                          # client utilities & API helpers
    views/                        # page-level view components
  server/
    prompts/                      # system prompt builders & language rules
    services/
      ai-client.ts                # OpenAI client, retry loop, error helpers
      ai-response-parser.ts       # response/classifier parsing, HTML validation
      ai-service.ts               # AI orchestration (generation, guest mode)
      chat-title-service.ts       # localized chat title generation
      chat-send-service.ts        # chat send orchestration
      generation-manager.ts       # in-flight generation tracking
      website-image-enrichment.ts # Unsplash stock image injection
    supabase/                     # Supabase server client helpers
  shared/
    constants/
      translations/               # per-language translation files
        en.ts                     # English translations
        ar.ts                     # Arabic translations
        ku.ts                     # Kurdish Sorani translations
        index.ts                  # barrel re-export + t() helper
      ai.ts                       # AI model constants
      limits.ts                   # prompt & attachment limits
    services/                     # shared data-access services
    types/                        # TypeScript type definitions
    utils/                        # shared utility functions
schema.sql
```

---

## API Routes

| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/api/chat/send` | Send authenticated chat prompts and persist history |
| POST | `/api/chat/abort` | Cancel an in-progress AI generation |
| DELETE | `/api/chat/delete` | Delete or archive a chat |
| POST | `/api/guest/chat` | Guest chat generation with daily limit |
| GET | `/api/guest/usage` | Check guest usage quota |
| POST | `/api/guest/zip` | ZIP export for guest users |
| POST | `/api/website/save` | Save generated HTML for a chat website |
| GET | `/api/website/versions` | Fetch website version history |
| POST | `/api/website/restore` | Restore a selected version |
| PATCH | `/api/website/version-label` | Apply/update version labels |
| POST | `/api/website/deploy` | Deploy generated site to Netlify |
| POST | `/api/website/upload-image` | Upload user images for AI context |
| GET | `/api/website/user-images` | List uploaded images for a chat |

---

## Prerequisites

- Node.js 20+
- npm
- A Supabase project
- A DeepSeek API key
- A Netlify personal access token (optional, only for deploy feature)

---

## Getting Started

1. Clone and install dependencies:

```bash
git clone https://github.com/muhamedmjw/Final-Project.git
cd Final-Project
npm install
```

2. Create your environment file:

```bash
cp .env.example .env
```

PowerShell alternative:

```powershell
Copy-Item .env.example .env
```

3. Fill `.env` using the variables in the next section.

4. Set up the database:

- Open your Supabase project
- Go to the SQL Editor
- Paste and run the entire contents of `schema.sql`
- That's it - everything is consolidated in one file

5. Start development server:

```bash
npm run dev
```

App URL: `http://localhost:3000`

---

## Environment Variables

Use a root `.env` file.

| Variable | Required | Used For |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase URL for browser/server clients |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key for app clients |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Guest usage tracking and server-side guest route access |
| `DEEPSEEK_API_KEY` | Yes | AI calls through DeepSeek official API |
| `DEEPSEEK_MODEL_PRIMARY` | No | Server primary model override |
| `DEEPSEEK_MODEL_FALLBACK` | No | Server fallback model override |
| `NEXT_PUBLIC_DEEPSEEK_MODEL_PRIMARY` | No | Client-side display model override |
| `UNSPLASH_ACCESS_KEY` | No | Enables Unsplash API enrichment to replace placeholder image URLs in generated HTML ([Unsplash API](https://unsplash.com/documentation)) |
| `NETLIFY_API_TOKEN` | No | Required only for `/api/website/deploy` |

Example:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

DEEPSEEK_API_KEY=
DEEPSEEK_MODEL_PRIMARY=deepseek-chat
DEEPSEEK_MODEL_FALLBACK=deepseek-reasoner
NEXT_PUBLIC_DEEPSEEK_MODEL_PRIMARY=deepseek-chat

UNSPLASH_ACCESS_KEY=

NETLIFY_API_TOKEN=
```

---

## Database Notes

- Schema is consolidated in `schema.sql`
- RLS policies are included
- `file_versions` and `deploys` tables support version history and deployment flows

---

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Run production server |
| `npm run lint` | Run ESLint |

---

## Deployment

### Deploy This App

- Frontend/app hosting: Vercel (recommended)
- Database/auth: Supabase
- Add environment variables in your hosting provider settings

### Deploy Generated Websites

- The app deploys generated website artifacts through Netlify API
- Requires `NETLIFY_API_TOKEN` in app environment

---

## Troubleshooting

- If PowerShell blocks `npm` scripts (`npm.ps1` execution policy), run commands with `npm.cmd` instead.
- If guest chat fails, verify `SUPABASE_SERVICE_ROLE_KEY` is set correctly.
- If deploy fails, verify `NETLIFY_API_TOKEN` and token permissions.

---

## Authors

- Mohammed Mustafa Jamal
- Aso Yaseen Mohammed
- Supervisor: Mr. Godar J. Ibrahim

Salahaddin University - Erbil
