// Master exports for the new theme-based architecture
export { 
  detectLanguage, 
  LANGUAGE_RULES,
  detectCategory,
  getThemeForCategory,
  buildSystemPrompt,
} from './index';
export type { 
  Category, 
  SystemPromptResult,
  WebsiteTheme, 
  ThemeFont, 
  ThemeColors, 
  LayoutType 
} from './index';

// Legacy exports for backward compatibility
export { PERSONALITY } from "./personality";
export { OUTPUT_FORMAT } from "./output-format";
export { APP_KNOWLEDGE } from "./app-knowledge";
export { THEMES } from "./design/themes";
export { DESIGN_SYSTEM } from "./design/design-system";
export { MOBILE_RULES } from "./design/mobile";
export { RTL_RULES } from "./design/rtl";
export { IMAGE_RULES } from "./content/images";
export { WEBSITE_STRUCTURE } from "./content/structure";
export { BUILD_MODE } from "./modes/build";
export { EDIT_MODE } from "./modes/edit";
export { CHAT_MODE } from "./modes/chat";
