ALTER TABLE public.file_versions
ADD COLUMN IF NOT EXISTS label text;

CREATE INDEX IF NOT EXISTS file_versions_website_label_idx
  ON public.file_versions(website_id, label)
  WHERE label IS NOT NULL;
