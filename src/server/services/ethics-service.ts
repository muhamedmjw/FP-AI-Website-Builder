import { getDeepSeekClient, MODEL_CANDIDATES } from "./ai-client";

export type EthicalStatus = "pass" | "lock" | "age_verification";

/**
 * Classifies a prompt based on strict ethical and safety rules.
 * Supports English, Kurdish Sorani, and Arabic prompts.
 * 
 * Categories:
 * - lock: explicit NSFW, pornography, stripclubs, nightclubs, hate speech, offensive history (Hitler, Saddam), casinos, gambling, governmental/political.
 * - age_verification: alcohol, bars, tobacco, vape shops.
 * - pass: everything else (including food/restaurants serving pork, regular businesses, blogs, e-commerce, etc.)
 */
export async function checkEthicalCompliance(
  prompt: string
): Promise<EthicalStatus> {
  const promptLower = prompt.toLowerCase();
  
  // ── Instant failsafe: locked terms (English + Kurdish + Arabic) ──
  const lockPattern = new RegExp(
    [
      // English
      'porn', 'nsfw', 'stripclub', 'nightclub', 'hitler', 'saddam', 'casino', 'gambling', 'sex', 'nude',
      // Kurdish Sorani
      'پۆرنۆ', 'پۆرنۆگرافی', 'ستریپ کلوب', 'کلوبی شەو', 'هیتلەر', 'سەددام', 'کازینۆ', 'قومار',
      // Arabic
      'إباحي', 'إباحية', 'بورنو', 'نادي ليلي', 'ملهى ليلي', 'نادي تعري', 'هتلر', 'صدام', 'كازينو', 'قمار', 'مقامرة',
    ].join('|'),
    'i'
  );
  
  if (lockPattern.test(promptLower) || lockPattern.test(prompt)) {
    return "lock";
  }

  // ── Instant failsafe: age-restricted terms (English + Kurdish + Arabic) ──
  const agePattern = new RegExp(
    [
      // English
      'alcohol', 'beer', 'cocktail', 'wine', 'liquor', 'pub ', ' pub', 'bar ', ' bar', 'tobacco', 'cigar', 'vape', 'smoke',
      // Kurdish Sorani
      'مەی', 'بیرە', 'ئاڵکۆل', 'شەراب', 'ویسکی', 'بار', 'پاب', 'تووتن', 'جگەرە', 'ڤەیپ', 'نارگیلە',
      // Arabic
      'كحول', 'خمر', 'بيرة', 'نبيذ', 'ويسكي', 'مشروبات كحولية', 'حانة', 'تبغ', 'سيجار', 'فيب', 'شيشة', 'أرجيلة',
    ].join('|'),
    'i'
  );
  
  if (agePattern.test(promptLower) || agePattern.test(prompt)) {
    return "age_verification";
  }

  const messages = [
    {
      role: "system" as const,
      content: `You are an ethical and safety compliance classifier for an AI website builder.
You must analyze the user's prompt and categorize it into exactly one of the following JSON categories: "lock", "age_verification", or "pass".

IMPORTANT: The user's prompt may be in English, Kurdish Sorani, or Arabic. You MUST understand and classify the prompt regardless of the language it is written in.

Rules for categorization:
1. "lock":
   - Explicit NSFW, pornography, adult content.
   - Stripclubs, nightclubs, or similar adult entertainment venues.
   - Hate speech, offensive historical figures, or promotion of violence.
   - Casinos, betting, or gambling platforms.
   - Political campaigns, governmental styled websites, or political figures.
   - Illegal substances, illegal activities, or weapons.

2. "age_verification":
   - ANY mention of alcohol, beer, cocktails, wine, spirits, bars, pubs, or liquor stores.
   - ANY mention of tobacco, cigars, smoking, vape shops, or related 18+ restricted goods.
   - If the prompt combines food and alcohol (e.g., "pub and grill"), it MUST be "age_verification".

3. "pass":
   - Everything else not covered above.
   - Examples of "pass": normal businesses, e-commerce, portfolios, blogs, restaurants, cafes, etc.

You must reply with ONLY a valid JSON object matching this schema:
{
  "category": "lock" | "age_verification" | "pass"
}

Do not include any explanations, markdown formatting, or markdown blocks (no \`\`\`json). Just the raw JSON object.`,
    },
    {
      role: "user" as const,
      content: prompt,
    },
  ];

  for (const model of MODEL_CANDIDATES) {
    try {
      const response = await getDeepSeekClient().chat.completions.create({
        model,
        messages,
        max_tokens: 150,
        temperature: 0.0,
      });

      let rawText =
        typeof response.choices[0]?.message?.content === "string"
          ? response.choices[0].message.content
          : "";

      rawText = rawText.trim();
      if (rawText.startsWith("\`\`\`json")) {
        rawText = rawText.replace(/^\`\`\`json\n?/, "").replace(/\n?\`\`\`$/, "");
      } else if (rawText.startsWith("\`\`\`")) {
        rawText = rawText.replace(/^\`\`\`\n?/, "").replace(/\n?\`\`\`$/, "");
      }

      const parsed = JSON.parse(rawText);
      if (
        parsed &&
        (parsed.category === "pass" ||
          parsed.category === "lock" ||
          parsed.category === "age_verification")
      ) {
        return parsed.category as EthicalStatus;
      }
    } catch (e) {
      // Ignore JSON parse errors or API failures and try the next model
      continue;
    }
  }

  // If all models fail, default to pass to not break the user experience
  return "pass";
}
