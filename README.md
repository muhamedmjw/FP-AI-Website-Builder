# AI-Powered Multi-Language Website Builder

A full-stack web application that generates complete websites from natural language prompts using AI, with multi-language support (English, Arabic, Kurdish) and RTL layout handling.

---

## Built With

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Auth_%7C_DB_%7C_Storage-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-Deployment-000?style=for-the-badge&logo=vercel)

---

## Features

- **AI-powered website generation** — describe what you want in plain language and get a full HTML website back.
- **Pre-generation clarification questions** — the AI asks about design preferences, color schemes, target audience, and desired features before generating.
- **Live split-screen preview** — resizable panels let you chat on the left and preview the generated website on the right in real time.
- **Multi-language interface and output** — supports English, Arabic, and Kurdish with full RTL layout for Arabic and Kurdish.
- **Conversation history** — all chats are saved with rename and delete support via an interactive sidebar.
- **Guest mode** — unlimited prompts with no account needed; guest sessions are local and temporary.
- **Registered user benefits** — cloud-saved conversations, ZIP download of generated websites, and access to advanced AI models.
- **Profile management** — update your display name, email address, and profile avatar from the sidebar settings modal.

---

## Project Structure

```
├── src/
│   ├── middleware.ts                      # Next.js middleware — auth session refresh & route protection
│   ├── app/                               # Next.js App Router pages and layouts
│   │   ├── layout.tsx                     # Root layout (font, theme script, metadata)
│   │   ├── globals.css                    # Global Tailwind CSS styles
│   │   ├── (auth)/                        # Auth route group (signin, signup, login, register)
│   │   │   ├── layout.tsx                 # Shared auth layout with PageShell wrapper
│   │   │   ├── signin/page.tsx            # Sign-in page
│   │   │   ├── signup/page.tsx            # Sign-up page
│   │   │   ├── login/page.tsx             # Redirect → /signin
│   │   │   └── register/page.tsx          # Redirect → /signup
│   │   ├── (workspace)/                   # Workspace route group (home, chat, builder)
│   │   │   ├── layout.tsx                 # App shell with sidebar for authenticated users
│   │   │   ├── page.tsx                   # Home page (guest or authenticated)
│   │   │   └── chat/
│   │   │       ├── page.tsx               # Redirect → /
│   │   │       └── [chatId]/page.tsx      # Chat page with builder split view
│   │   ├── account/page.tsx               # Account landing page (unauthenticated)
│   │   └── api/                           # API route handlers
│   │       ├── chat/send/route.ts         # POST — send a chat message
│   │       └── guest/zip/route.ts         # POST — generate guest ZIP download
│   ├── client/                            # Client-side code (React components, hooks, utilities)
│   │   ├── components/                    # Reusable UI components
│   │   │   ├── auth-session-sync.tsx      # Syncs Supabase auth state on the client
│   │   │   ├── forms/                     # Form building blocks (heading, input, link, shell)
│   │   │   └── ui/                        # Generic UI primitives (gradient mesh, button)
│   │   ├── features/                      # Feature-scoped components
│   │   │   ├── builder/                   # Builder split view, resize handle, ZIP card
│   │   │   ├── chat/                      # Chat panel, chat bubble, chat input
│   │   │   ├── preview/                   # Live HTML preview iframe panel
│   │   │   └── sidebar/                   # Sidebar, chat list, header, footer, new-chat button
│   │   ├── views/                         # Top-level page view components
│   │   │   ├── home.tsx                   # Authenticated home (prompt input)
│   │   │   ├── guest-home.tsx             # Guest home (prompt + auth gate)
│   │   │   ├── account.tsx                # Account landing view
│   │   │   ├── login-page.tsx             # Login form component
│   │   │   └── signup-page.tsx            # Signup form component
│   │   └── lib/                           # Client utilities and API helpers
│   │       ├── api/                       # API call wrappers
│   │       │   ├── chat-api.ts            # Chat message send helper
│   │       │   └── export-api.ts          # ZIP/HTML export helpers (placeholder)
│   │       ├── supabase-browser.ts        # Supabase browser client singleton
│   │       ├── guest-chat-handoff.ts      # Guest-to-auth session persistence
│   │       └── zip-download.ts            # ZIP download trigger utility
│   ├── server/                            # Server-only code (services, Supabase admin)
│   │   ├── services/                      # Business logic services
│   │   │   ├── website-service.ts         # Website CRUD and HTML retrieval
│   │   │   ├── ai-service.ts             # AI provider communication (placeholder)
│   │   │   └── zip-service.ts            # ZIP archive generation (placeholder)
│   │   ├── prompts/                       # AI prompt templates
│   │   │   ├── system-prompt.ts           # System instruction for the AI
│   │   │   └── prompt-builder.ts          # Builds the messages array for AI calls
│   │   └── supabase/
│   │       └── server-client.ts           # Supabase server client factory
│   └── shared/                            # Code shared between client and server
│       ├── services/                      # Shared data-access services
│       │   ├── chat-service.ts            # Chat and message CRUD
│       │   └── user-service.ts            # User profile helpers
│       ├── types/
│       │   └── database.ts                # TypeScript types for DB tables
│       ├── constants/                     # App-wide constants
│       │   ├── limits.ts                  # Guest prompts, file size, session limits
│       │   ├── languages.ts               # Supported languages and RTL config
│       │   └── ai.ts                      # AI model names and config
│       └── utils/
│           └── auth-errors.ts             # Auth error classification helpers
├── schema.sql                             # Supabase database schema
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
├── eslint.config.mjs
└── README.md
```

---

## Getting Started

### Prerequisites

- **Node.js** 18+ and **npm**
- A [Supabase](https://supabase.com) account and project

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/muhamedmjw/Final-Project.git
cd Final-Project

# 2. Install dependencies
npm install

# 3. Create your environment file
cp .env.local.example .env.local
# Fill in the values (see Environment Variables below)

# 4. Run the database schema
# Open Supabase SQL Editor and paste the contents of schema.sql

# 5. Start the development server
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

Create a `.env.local` file in the project root with the following variables:

```env
# ── Supabase ──
NEXT_PUBLIC_SUPABASE_URL=          # Your Supabase project URL (https://xxx.supabase.co)
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # Supabase anon/public key
SUPABASE_SERVICE_ROLE_KEY=         # For server-side guest_usage and ai_generations writes

# ── AI Provider ──
AI_PROVIDER_API_KEY=               # OpenAI / Anthropic / Gemini key
AI_MODEL_GUEST=                    # e.g. gpt-4o-mini
AI_MODEL_REGISTERED=               # e.g. gpt-4o
```

---

## Database Setup

1. Open the **SQL Editor** in your Supabase dashboard.
2. Paste the contents of `schema.sql` and run it.
3. **Row Level Security (RLS)** is enabled on all tables — users can only access their own data.
4. An **auto-trigger** creates a row in the `users` table whenever a new user signs up through Supabase Auth.

---

## Available Scripts

| Command         | Description                              |
| --------------- | ---------------------------------------- |
| `npm run dev`   | Start the development server             |
| `npm run build` | Create an optimised production build     |
| `npm run start` | Serve the production build locally       |
| `npm run lint`  | Run ESLint across the project            |

---

## Deployment

| Layer      | Platform   | Notes                                                       |
| ---------- | ---------- | ----------------------------------------------------------- |
| Frontend   | **Vercel** | Push to `main` branch for automatic deployments             |
| Backend    | **Supabase** | Auth, Postgres database, and storage are hosted on Supabase |

Set all environment variables in the **Vercel dashboard** under *Settings → Environment Variables* before deploying.

---

## Roadmap

- [x] Authentication (register, login, logout)
- [x] Chat interface and conversation history
- [x] Sidebar with rename/delete and profile settings
- [x] Guest mode with local session
- [ ] AI integration and website code generation
- [ ] Live preview panel with generated HTML
- [ ] Multi-language support (AR/KU RTL)
- [ ] ZIP download for registered users
- [ ] Language selector persisted per user

---

## Authors

- **Mohammed Mustafa Jamal**
- **Aso Yaseen Mohammed**
- **Supervisor:** Mr. Godar J. Ibrahim

Salahaddin University — Erbil
