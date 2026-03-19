import { AI_CONFIG } from "@/shared/constants/ai";
import { AppLanguage, HistoryMessage } from "@/shared/types/database";
import { BASE_CSS } from "./base-css";
import { APP_KNOWLEDGE, SYSTEM_PROMPT } from "./system-prompt";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

function getLanguageLabel(language: AppLanguage): string {
  if (language === "ar") return "Arabic";
  if (language === "ku") return "Kurdish Sorani";
  return "English";
}

function mapHistoryToChatMessages(history: HistoryMessage[]): ChatMessage[] {
  return history
    .slice(-AI_CONFIG.MAX_HISTORY_TURNS)
    .filter((msg) => msg.role === "user" || msg.role === "assistant")
    .map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
}

function buildLanguageInstruction(
  websiteLanguageLabel: string,
  websiteLanguage: AppLanguage
): string {
  return `
WEBSITE CONTENT LANGUAGE: All text inside the generated HTML website
(headings, paragraphs, navigation, buttons, cards, testimonials, footer,
form labels) must be written in: ${websiteLanguageLabel} (${websiteLanguage}).

CONVERSATION LANGUAGE: This is completely separate from the website language.
Detect what language the user is writing in their chat message and reply
in THAT language. If the user writes in Kurdish Sorani, reply in Kurdish Sorani.
If they write in Arabic, reply in Arabic. If they write in English, reply in
English. Never use the website content language for your conversation replies.
`.trim();
}

function buildMessages(
  history: HistoryMessage[],
  systemMessage: string,
  modeSignal: string
): ChatMessage[] {
  return [
    {
      role: "system",
      content: `${systemMessage}\n\n${modeSignal}`.trim(),
    },
    ...mapHistoryToChatMessages(history),
  ];
}

export function buildClassifierMessages(userMessage: string): ChatMessage[] {
  const systemPrompt = `
You are an intent classifier. Analyze the user message and return ONLY
a JSON object with no extra text, no markdown, no explanation.

Classify the intent as one of:
- 'build'  -> user wants to create a brand new website from scratch
- 'edit'   -> user wants to change something on an existing website
- 'chat'   -> user is asking a question, making small talk, or saying something
             that is NOT a request to build or change a website

Also detect the language the user is writing in:
- 'en' for English
- 'ar' for Arabic
- 'ku' for Kurdish Sorani

IMPORTANT CLASSIFICATION RULES:
- Short confirmations like 'yes', 'ok', 'sure', 'go ahead', 'build it'
  when there is prior build context -> classify as 'build'
- Any request to visually change something (color, font, size, layout,
  add section, remove section) -> classify as 'edit' if a website exists,
  'build' if no website exists yet
- Questions about how to deploy, how the app works, what technology is used,
  how to edit files -> classify as 'chat'
- Gibberish, random characters, very short meaningless inputs -> classify as 'chat'

Respond with ONLY this JSON and nothing else:
{ "intent": "build" | "edit" | "chat", "detectedLanguage": "en" | "ar" | "ku" }
`.trim();

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ];
}

export function buildGenerationMessages(
  history: HistoryMessage[],
  websiteLanguage: AppLanguage,
  detectedUserLanguage: AppLanguage
): ChatMessage[] {
  const websiteLanguageLabel = getLanguageLabel(websiteLanguage);
  const userLanguageLabel = getLanguageLabel(detectedUserLanguage);
  const languageInstruction = buildLanguageInstruction(websiteLanguageLabel, websiteLanguage);

  const systemMessage = `
${SYSTEM_PROMPT}

${languageInstruction}
`.trim();

  const modeSignal = `
BUILD MODE - GENERATE A NEW WEBSITE:
- Return type "website" with one complete HTML document.
- The message field must be in ${userLanguageLabel} (${detectedUserLanguage}).
- Embed the complete BASE_CSS exactly inside a <style> tag.

BASE_CSS:
${BASE_CSS}
`.trim();

  return buildMessages(history, systemMessage, modeSignal);
}

export function buildEditMessages(
  history: HistoryMessage[],
  existingHtml: string,
  websiteLanguage: AppLanguage,
  detectedUserLanguage: AppLanguage
): ChatMessage[] {
  const websiteLanguageLabel = getLanguageLabel(websiteLanguage);
  const userLanguageLabel = getLanguageLabel(detectedUserLanguage);
  const languageInstruction = buildLanguageInstruction(websiteLanguageLabel, websiteLanguage);

  const systemMessage = `
${SYSTEM_PROMPT}

${languageInstruction}

CONVERSATION OUTPUT LANGUAGE FOR THIS TURN: ${userLanguageLabel} (${detectedUserLanguage}).
`.trim();

  const modeSignal = `
EDIT MODE - STRICT SURGICAL EDITING ONLY:
The current website HTML is provided below.

FIRST: Check if the user is asking to add a section. If that section
already exists in the HTML, DO NOT edit anything. Instead return:
{"type":"questions","message":"[Tell user in their language that the section
already exists and ask what they want to change about it]"}

SECOND: If making an edit, copy the existing HTML exactly.
Change ONLY the specific thing the user asked for.
Never change anything else. Return the complete updated HTML.

CURRENT HTML:
${existingHtml}
`.trim();

  return buildMessages(history, systemMessage, modeSignal);
}

export function buildChatMessages(
  history: HistoryMessage[],
  detectedUserLanguage: AppLanguage
): ChatMessage[] {
  const userLanguageLabel = getLanguageLabel(detectedUserLanguage);

  const systemPrompt = `
You are a friendly assistant inside an AI website builder app.

CRITICAL LANGUAGE RULE: You MUST reply in ${userLanguageLabel} (${detectedUserLanguage}).
If the user writes in Kurdish Sorani, reply in Kurdish Sorani.
If the user writes in Arabic, reply in Arabic.
If the user writes in English, reply in English.
Never reply in a different language than the one the user is using.

OUTPUT FORMAT - ALWAYS return raw JSON only, no markdown:
{ "type": "questions", "message": "your reply in the user language" }

YOUR PERSONALITY:
- Friendly, warm, casual - like a knowledgeable friend
- Short answers - never write essays
- Never sycophantic - don't say 'Great question!' or 'Absolutely!'
- Be honest if you don't know something

WHAT YOU KNOW ABOUT THIS APP:
${APP_KNOWLEDGE}

WHAT YOU CANNOT DO (be honest):
- Cannot connect to real backends or databases
- Cannot process real payments
- Cannot send real emails from contact forms
- Cannot access external URLs
- Cannot remember information between separate chat sessions
`.trim();

  return [{ role: "system", content: systemPrompt }, ...mapHistoryToChatMessages(history)];
}
