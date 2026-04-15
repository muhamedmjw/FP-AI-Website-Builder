/**
 * Shared TypeScript types for the application.
 *
 * These map directly to the database tables defined in schema.sql.
 * Keep this file in sync with any schema changes.
 */

// --- Enums (mirror the Postgres enums) ---

export type AppLanguage = "en" | "ar" | "ku";

export type HistoryRole = "user" | "assistant" | "system";

// --- Table row types ---

export type User = {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Chat = {
  id: string;
  user_id: string;
  title: string;
  model_name: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type HistoryMessage = {
  id: string;
  chat_id: string;
  role: HistoryRole;
  content: string;
  image_file_ids?: string[] | null;
  created_at: string;
};

export type Website = {
  id: string;
  chat_id: string;
  business_prompt: string;
  language: AppLanguage;
  is_public?: boolean;
  created_at: string;
  updated_at: string;
};

export type FileRecord = {
  id: string;
  website_id: string;
  file_name: string;
  content: string;
  version: number;
  mime_type: string | null;
  is_user_upload: boolean;
  created_at: string;
};

export type UserImage = {
  fileId: string;
  fileName: string;
  dataUri: string;
  mimeType: string;
};

export type FileVersionRecord = {
  id: string;
  file_id: string;
  website_id: string;
  version: number;
  content: string;
  label: string | null;
  created_at: string;
};

export type GuestUsage = {
  id: string;
  guest_token: string;
  prompts_used_today: number;
  usage_date: string;
  last_prompt_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DeployRecord = {
  id: string;
  user_id: string;
  website_id: string;
  netlify_site_id: string | null;
  netlify_deploy_id: string | null;
  deploy_url: string | null;
  status: string;
  created_at: string;
};
