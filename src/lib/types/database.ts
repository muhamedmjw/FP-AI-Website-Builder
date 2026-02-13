/**
 * Shared TypeScript types for the application.
 *
 * These map directly to the database tables defined in schema.sql.
 * Keep this file in sync with any schema changes.
 */

// --- Enums (mirror the Postgres enums) ---

export type AppLanguage = "en" | "ar" | "ku";

export type HistoryRole = "user" | "assistant" | "system";

export type SectionType =
  | "hero"
  | "about"
  | "services"
  | "pricing"
  | "contact"
  | "custom";

// --- Table row types ---

export type User = {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
  updated_at: string;
};

export type Chat = {
  id: string;
  user_id: string;
  title: string;
  model_name: string | null;
  created_at: string;
  updated_at: string;
};

export type HistoryMessage = {
  id: string;
  chat_id: string;
  role: HistoryRole;
  content: string;
  created_at: string;
};

export type Website = {
  id: string;
  chat_id: string;
  business_prompt: string;
  language: AppLanguage;
  created_at: string;
  updated_at: string;
};

export type Page = {
  id: string;
  website_id: string;
  title: string;
  slug: string;
  page_order: number;
  created_at: string;
};

export type Section = {
  id: string;
  page_id: string;
  type: SectionType;
  heading: string | null;
  body: string | null;
  section_order: number;
  created_at: string;
};

export type FileRecord = {
  id: string;
  website_id: string;
  file_name: string;
  content: string;
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
