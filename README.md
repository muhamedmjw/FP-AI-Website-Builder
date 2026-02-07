# AI Website Builder

A simple web app that lets users describe a business and generate a full website structure (sitemap, pages, sections, and code-ready output). Users can log in, create multiple chats, and revisit their history.

## Features
- Email/password authentication
- Multiple chats per user
- Chat history saved in the database
- AI-generated titles for chat history (planned)
- Website structure generation (planned)
- Supports Arabic/Kurdish/English output (planned)

## Tech Stack
- Next.js (App Router) + React + TypeScript
- Supabase (Auth + Database)
- AI provider (server-side only)

## Project Setup

### 1) Install dependencies
```bash
npm install
```

### 2) Create environment variables
Create `.env.local` and add:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

### 3) Create the database
1. Create a Supabase project.
2. Open the SQL Editor and run the contents of `schema.sql`.

### 4) Run the dev server
```bash
npm run dev
```

Open `http://localhost:3000`.

## Scripts
- `npm run dev` – start development server
- `npm run build` – build for production
- `npm run start` – run production build
- `npm run lint` – lint project

## Project Structure
```
src/
  app/            # Next.js App Router pages and layouts
schema.sql        # Supabase database schema
```

## Notes
- `.env.local` is not committed.
- `.env.local.example` is committed as a template.

## Roadmap
1. Auth UI (login/register)
2. Protected app layout
3. Chat list + chat view
4. AI prompt flow
5. Website output format (sitemap/pages/sections/code)
6. Arabic/Kurdish output support
