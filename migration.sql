-- Migration: Clean up unused columns and add missing indexes
-- Run this in Supabase SQL Editor after deploying the updated TypeScript types.

-- Remove dead columns
ALTER TABLE public.websites DROP COLUMN IF EXISTS generated_html;
ALTER TABLE public.websites DROP COLUMN IF EXISTS page_count;
ALTER TABLE public.history DROP COLUMN IF EXISTS tokens_used;

-- Add missing indexes (hit on every page load)
CREATE INDEX IF NOT EXISTS files_website_file_name_idx
  ON public.files(website_id, file_name);

CREATE INDEX IF NOT EXISTS ai_generations_status_created_idx
  ON public.ai_generations(status, created_at);
