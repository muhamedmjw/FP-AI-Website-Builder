"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Copy, Check } from "lucide-react";
import { useLanguage } from "@/client/lib/language-context";
import { t } from "@/shared/constants/translations";

type Props = { isOpen: boolean; onClose: () => void };

type Tip = {
  title: string;
  body: string;
};

type Example = {
  label: string;
  prompt: string;
};

type ActivePanel = "guideline" | "example";

function getTips(lang: "en" | "ar" | "ku"): Tip[] {
  return [
    {
      title: t("promptGuideTip1Title", lang),
      body: t("promptGuideTip1Body", lang),
    },
    {
      title: t("promptGuideTip2Title", lang),
      body: t("promptGuideTip2Body", lang),
    },
    {
      title: t("promptGuideTip3Title", lang),
      body: t("promptGuideTip3Body", lang),
    },
    {
      title: t("promptGuideTip4Title", lang),
      body: t("promptGuideTip4Body", lang),
    },
    {
      title: t("promptGuideTip5Title", lang),
      body: t("promptGuideTip5Body", lang),
    },
    {
      title: t("promptGuideTip6Title", lang),
      body: t("promptGuideTip6Body", lang),
    },
  ];
}

function getExamples(lang: "en" | "ar" | "ku"): Example[] {
  const labels: Record<string, Record<string, string>> = {
    en: {
      ex1: "Example 1 - Fine Dining",
      ex2: "Example 2 - SaaS Product",
      ex3: "Example 3 - Personal Portfolio",
      ex4: "Example 4 - Fitness Studio",
      ex5: "Example 5 - Kurdish Magazine",
      ex6: "Example 6 - Kurdish Language Teacher",
      ex7: "Example 7 - Kurdistan Tourism",
      ex8: "Example 8 - Kurdish Bookstore",
      ex9: "Example 9 - Luxury Perfume Store",
      ex10: "Example 10 - Saudi Architect",
      ex11: "Example 11 - Luxury Arabic Restaurant",
      ex12: "Example 12 - Tech Startup",
    },
    ar: {
      ex1: "مثال ١ - مطعم فاخر",
      ex2: "مثال ٢ - منتج SaaS",
      ex3: "مثال ٣ - معرض أعمال شخصي",
      ex4: "مثال ٤ - استوديو لياقة",
      ex5: "مثال ٥ - مجلة كردية",
      ex6: "مثال ٦ - مدرس لغة كردية",
      ex7: "مثال ٧ - سياحة كردستان",
      ex8: "مثال ٨ - مكتبة كردية",
      ex9: "مثال ٩ - متجر عطور فاخر",
      ex10: "مثال ١٠ - معماري سعودي",
      ex11: "مثال ١١ - مطعم عربي فاخر",
      ex12: "مثال ١٢ - شركة ناشئة تقنية",
    },
    ku: {
      ex1: "نموونە ١ - خواردنگەی فاخر",
      ex2: "نموونە ٢ - بەرهەمی SaaS",
      ex3: "نموونە ٣ - پۆرتفۆلیۆی کەسی",
      ex4: "نموونە ٤ - ستودیۆی وەرزشی",
      ex5: "نموونە ٥ - مەگەزینێکی کوردی",
      ex6: "نموونە ٦ - مامۆستای زمانی کوردی",
      ex7: "نموونە ٧ - گەشتیاری کوردستان",
      ex8: "نموونە ٨ - کتێبخانەی کوردی",
      ex9: "نموونە ٩ - فرۆشگای بەرگەنی",
      ex10: "نموونە ١٠ - تەلارسازێکی سعودی",
      ex11: "نموونە ١١ - خوانەکی عەرەبیی فاخر",
      ex12: "نموونە ١٢ - کۆمپانیای تەکنەلۆژی",
    },
  };

  const l = labels[lang] || labels.en;

  return [
    {
      label: l.ex1,
      prompt: `Build a luxury fine dining restaurant website for "Maison Noir" in Paris.
Dark background (#0a0a0a), gold accents (#d4af37), Cinzel serif headings,
Cormorant Garamond body text. Sections: sticky nav with logo + 5 links,
full-viewport hero with a large centered headline and a gold outlined
reservation button (pill shape, 1.25rem padding), About section with
split layout (text left, chef portrait right), Menu section with
elegant dotted-line price rows grouped by category (Entrees, Plats,
Desserts), a full-bleed gallery of 6 food photos in a 3-column masonry grid,
a Reservations form (name, date, time, party size, special requests),
and footer with address + social icons evenly spaced. Scroll fade-in
on every section. Mobile hamburger nav.`,
    },
    {
      label: l.ex2,
      prompt: `Create a SaaS landing page for "Flowsync" - a team workflow tool.
Light background, purple (#6d28d9) primary, split-screen hero: left side
has headline "Ship faster as a team", 2-line subheading, and two pill
buttons (filled purple "Start free trial" + ghost "Watch demo"), right side
has a browser-mockup screenshot placeholder. Then: a logo strip of 6
trusted-by companies, a 3-column features grid with icon + title + 2-line
description per card, a 2-column pricing section (Free vs Pro) with feature
checklist and CTA buttons, a 4-item testimonials row with avatar + quote
+ name/role, FAQ accordion (5 items), and a full-width CTA band
(purple gradient bg, white text, centered button). Subtle scroll
fade-up animations. Sticky nav with logo, 4 links, and sign-in button.`,
    },
    {
      label: l.ex3,
      prompt: `Design a minimal personal portfolio for a UI/UX designer named "Yasmin Al-Rashid".
Off-white background (#fafaf8), dark ink text (#1c1c1c), sage green accent
(#2d6a4f), Instrument Serif headings + Outfit body. Sections: sticky minimal
nav (name left, 3 links right), full-height hero with large serif headline
"Designing with intention" + one-line bio + "View work" link with animated
underline, an About section (2-col: paragraph left, skills tag cloud right),
a Work section listing 6 projects as numbered rows (project name + category
+ arrow) that animate on hover with a left-indent, a single full-bleed
quote strip between Work and Contact, a Testimonials block with 3 short
client quotes, and a clean Contact section with email + social links.
Use subtle fade-in and slide-up animation only. Mobile layout should keep
the same minimalist style with generous spacing and readable type.`,
    },
    {
      label: l.ex4,
      prompt: `Build a high-energy website for "Pulse Forge" - a boutique fitness studio.
Use a dark charcoal base (#111315), electric coral accent (#ff5a5f), and
cool cyan secondary accent (#22d3ee). Typography: Bebas Neue for headlines,
Manrope for body. Structure: sticky nav with logo, Schedule, Trainers,
Membership, Testimonials, Contact, and a prominent "Book a Class" CTA;
hero with bold headline, short motivation line, and two buttons (filled coral
"Book a Class" + outline "View Schedule"); class schedule grid by day/time;
trainer cards with circular photos and specialty tags; pricing cards for
Starter, Unlimited, and Premium plans; transformation testimonials with
before/after placeholders; FAQ accordion; and a location/contact footer
with map placeholder. Add hover lift on cards, smooth section reveals,
and a sticky mobile bottom CTA button for booking.`,
    },
    {
      label: l.ex5,
      prompt: `ماگەزینێکی ئۆنلاینی کوردی دروست بکە بەناوی "ڕوپێلی کوردی" - بڵاوکراوەیەکی دیجیتاڵ بۆ ئەدەب و کولتوور و هەواڵی کوردی.

دیزاین: شێوازی ڕۆژنامەیی/مەگەزینە نەخشین وەک The New York Times یان Longreads. پاشخەنی کرێمی ناسک (#FAFAF8)، کارتی ناوەڕۆکی سپی تەڕ (#FFFFFF)، تێکستی ڕەش (#1A1A1A) بۆ خوێندنەوەیەکی ئاسان. ڕەنگی ئاکسنتی کەم - تەنها بەرگەنی (#722F37) بۆ لینک و هایلایت.

فۆنتەکان - فۆنتی کلاسیکی کوردی:
- سەردێڕەکان/لۆگۆ: فۆنتی "ڕابەر" (یان "نالی") - سەریفێکی کوردیی کلاسیک بە کەرڤی جوان، وەزن ٧٠٠، قەبارەی گەورە (٣ ڕەم بۆ سەردێڕی سەرەکی، ٢ ڕەم بۆ سەردێڕی بەشەکان)
- ناوەڕۆکی وتار: فۆنتی "سەرچیا" (یان "Droid Arabic Naskh") - فۆنتی خوێندنەوەی کوردیی دێرین، وەزن ٤٠٠، بەرزی دێڕ ١.٨، قەبارەی فۆنت ١.١٢٥ ڕەم بۆ خوێندنەوەیەکی ئاسوودە
- هەردووک فۆنت پشتگیری تەواوی پیتەکانی کوردی (سۆرانی) دەکەن

ناوەڕۆک:
- ناڤباری چەسپاوی سادە: لۆگۆی "ڕوپێلی کوردی" بە فۆنتی ڕابەر لەلای چەپ، لینکی ناڤگەیشن (سەرەکی، وتار، ئەدەب، مێژوو، پەیوەندی) لەلای ڕاست، هێڵی خوارەوەی ڕوون
- بەشی هیرۆ: یەک وتاری هایلایت لەگەڵ وێنەی گەورە، تاگی بەشی بەرگەنی، سەردێڕ بە فۆنتی گەورەی ڕابەر، پوختە بە فۆنتی سەرچیا، ناوی نووسەر و بەروار لەخوارەوە
- تۆڕی وتارەکان: شێوازی ٢ ستون لەگەڵ کارتی وتار کە وێنەی بچووک، بەش، سەردێڕ، ٢ دێڕ پوختە، کاتی خوێندنەوە نیشان دەدات
- لاپەڕەی وتاری تاک: ستونی ناوەڕۆکی ناوەڕاست بە پانی کەم (زۆرترین ٦٨٠ پیکسل)، سەردێڕی گەورە، ناوی نووسەر لەگەڵ وێنە، بەرواری بڵاوکردنەوە، وێنەی هایلایت بە پانی تەواو، ناوەڕۆکی وتار بە فۆنتی سەرچیا لەگەڵ بەرزی دێڕی بەرفراوان، پیتی یەکەمی پاراگراف گەورە بێت (drop cap)
- لاتەنیشت: لیستی وتارە باوەکان، بۆکسی تۆمارکردن بۆ نەیوزلێتەر، هەوری بەشەکان
- فوتر: سادە لەگەڵ مافی بڵاوکردنەوە، لینکی تۆڕە کۆمەڵایەتییەکان، دوگمەی گەڕانەوە بۆ سەرەوە

بەشەکان: سەرەکی، وتار، ئەدەب، مێژوو، پەیوەندی

ئەنیمەیشن: فێد-ئینی ناسک لەکاتی سکرۆڵ بۆ وتارەکان، ئەنیمەیشنی هێڵی ناوەڕاست بۆ لینکەکان (نەگۆڕینی ڕەنگ)، هەستکردنی نەرم لەسەر کارتی وتارەکان (transform: translateY(-4px))، شریتی پێشکەوتنی خوێندنەوە لەسەرەوەی لاپەڕەی وتارەکان.

مۆبایل: مێنیوی هەمبەرگەر، شێوازی ستونی تاک، هەمان فۆنتی کلاسیکی بەڵام بە قەبارەی گونجاو.`,
    },
    {
      label: l.ex6,
      prompt: `لەپەرەیەکی کەسی بۆ مامۆستایەکی زمانی کوردی بەناوی "مامۆستا هیمن ئەحمەد" دروست بکە.
دیزاینی مینیمەڵ بە پاشخەنی سپی تەڕ (#FFFFFF) و ڕەنگی سەوزی دارچێن (#2D5016) وەک ڕەنگی سەرەکی، فۆنتی (Vazirmatn) بۆ کوردی و (Inter) بۆ ئینگلیزی. بەشەکان: ناڤباری چەسپاو لەگەڵ ناو و لینکی خوێندن و پەیوەندی، هیرۆی پڕشنگدار لەگەڵ وێنەی مامۆستا و دەستەوێژی باوەڕپێکراو، بەشی خزمەتگوزاری (فێربوونی ئۆنلاین، وانەی ڕووبەڕوو، بەڕێوەبردنی قوتابخانە)، خشتەی نرخەکان بۆ قۆناغی جیاواز، بەشی پێداچوونەوە لە قوتابیانی پێشوو، بڵاگ بۆ وتارەکانی زمانی کوردی، فۆرمی پەیوەندی لەگەڵ تەلەفۆن و تێلێگرام. ئەنیمەیشنی تایپینگ بۆ دەستەوێژی هیرۆ، کاردی خزمەتگوزاریەکان شێوەی 3D دەگۆڕن لەکاتی هاڤەر.`,
    },
    {
      label: l.ex7,
      prompt: `وێبسایتێکی گەشتیاری دروست بکە بۆ "سەرزەمینی کوردستان" - کۆمپانیایەکی گەشتیاریی ناوخۆیی.
دیزاینی تەنەکەیی لەگەڵ پاشخەنی شینەوەیی ئاسمانی (#0EA5E9) و ڕەنگی کەوەی کوردی (#D4A574)، فۆنتی کوردی (Amiri) بۆ ناوەڕۆکی کولتووری و (Montserrat) بۆ سەردێڕەکان. بەشەکان: ناڤباری چەسپاو لەگەڵ لۆگۆ و گەڕان و دوگمەی "تۆمارکردنی گەشت"، هیرۆی پەراوێزخۆراو لەگەڵ وێنەی شارۆچکەی هەولێری دێرین و دەستەوێژی بەهێز، بەشەکانی گەشتەکان (سۆلاف، ئەحمەد ئاوا، چەمچەماڵ، ڕەواندز) بە کاردی وێنەیی بەردار، بەشی حەوانەوەکان و نرخی حەوانەوە بە پلەبەندی ئەستێرە، گالێری وێنەی سروشتی کوردستان لەگەڵ مێژووی هەر شوێنێک، فۆرمی تۆمارکردنی گەشت لەگەڵ هەڵبژاردەی ڕێکخستن. ئەنیمەیشنی پارالاکس بۆ هیرۆ، کاردی گەشتەکان شەپۆڵێکی ناسک دەگرن لەکاتی هاڤەر، گالێریەکە بە شێوەی مەزنەگلای ئەستێرەیی کارا بێت.`,
    },
    {
      label: l.ex8,
      prompt: `وێبسایتێک بۆ کتێبخانەیەکی کوردی بەناوی "کتێبخانەی گەشەپێدان" لە سلێمانی دروست بکە.
دیزاینی کلاسیکی مۆدێرن لەگەڵ پاشخەنی ڕەنگی ئامێزی دار (#3D2914) و ڕەنگی زێڕی ناسک (#C9A227) وەک ئاکسنت، فۆنتی کوردی (Noto Kufi Arabic) بۆ سەردێڕەکان و (Noto Sans Arabic) بۆ ناوەڕۆک. بەشەکان: ناڤباری چەسپاو لەگەڵ لۆگۆی کتێبخانە و ئایکۆنی سەبەتە، هیرۆی گەورە لەگەڵ وێنەی کتێبخانەکە و دەستەوێژی "خوێندنەوە ڕێگای ڕووناکیە"، بەشی پێشنیازکراوەکان بە کاردی کتێب لەگەڵ بەرگ و ناو و نرخ و دوگمەی "زیادکردن بۆ سەبەتە"، بەشی پۆلێنبەندی (کتێبی کوردی، ئەدەبی جیهانی، کتێبی منداڵان، دەرچوون)، بەشی نووسەرانی کوردی بە گالێری وێنە، بەشی ئۆنلاین بۆ داواکردنی کتێب، فۆرمی پەیوەندی. ئەنیمەیشنی فێد-ئین بۆ کاردی کتێبەکان، ئێفێکتی لێکدانەوەی 3D لەکاتی هاڤەر، سکرۆڵی ناسک لە گشت بەشەکان.`,
    },
    {
      label: l.ex9,
      prompt: `أنشئ موقعًا إلكترونيًا لمتجر عطور فاخر باسم "ورد الجزيرة" في الرياض.
تصميم فاخر بخلفية سوداء أنيقة (#0D0D0D) مع لمسات ذهبية (#D4AF37) ونبيذي غامق (#722F37)، خط عربي (Amiri) للعناوين و(Cormorant Garamond) للنصوص. الأقسام: شريط تنقل ثابت مع شعار المتجر وأيقونة سلة التسوق، بطل كامل الشاشة بعبارة "عبق الأصالة" مع فيديو خلفي هادئ لزجاجات العطور، قسم المجموعات الفاخرة ببطاقات عرض ثلاثية الأبعاد تدور عند التمرير، معرض منتجات بشبكة متناسقة مع تأثير تكبير ناعم عند المرور، قسم قصة العلامة التجارية مع صور تاريخية، قسم آراء العملاء بشكل بطاقات منزلقة، نشرة إخبارية للاشتراك مع تأثير كتابة نص تلقائي، تذييل مع روابط التواصل الاجتماعي وخريطة الموقع. حركات انتقالية سلسة بين الأقسام، تأثير جزيئات ذهبية عائمة في الخلفية، تأثير بريق على عناوين المنتجات.`,
    },
    {
      label: l.ex10,
      prompt: `صمم موقعًا شخصيًا لمعماري سعودي باسم "المهندس فيصل العمران".
تصميم معماري م minimalista مع خلفية بيضاء نقية (#FAFAFA) ولون ترابي دافئ (#8B7355) كون أساسي، خط عربي (Tajawal) للعناوين و(IBM Plex Sans Arabic) للنصوص. الأقسام: شريط تنقل مخفي يظهر عند التمرير مع الشعار، بطل بانورامي بصورة مشروع معماري كبير مع طبقة تدرج داكنة وعبارة "نصمم المساحات التي تعيش فيها الأحلام"، قسم المحفظة بعرض مشاريع معمارية بتصميم شبكة متناسقة مع فلترة حسب النوع (سكني، تجاري، ثقافي)، صفحات تفصيلية للمشاريع مع معرض صور متجاوب، قسم الخدمات (تصميم داخلي، إشراف، استشارات)، قسم الجوائز والاعترافات بشكل شريط متحرك، نموذج تواصل أنيق مع خريطة تفاعلية. حركات Parallax عميقة للصور المعمارية، تأثير Reveal تدريجي للنصوص، تأثير خط زمني متحرك لعرض مراحل المشاريع، تأثير تكبير ناعم للصور عند التمرير.`,
    },
    {
      label: l.ex11,
      prompt: `أنشئ موقعًا لمطعم عربي فاخر باسم "أصالة" في دبي.
تصميم عصري يجمع بين الأصالة والمعاصرة مع خلفية أخضر زيتوني غامق (#2C3E2C) وذهبي فاخر (#C9B037) وبرتقالي ترابي (#D4A574)، خط عربي (Aref Ruqaa) للعناوين و(Almarai) للنصوص. الأقسام: شريط تنقل ثابت مع شعار المطعم وزر حجز طاولة بارز، بطل فيديو بانورامي لأطباق المطعم مع تأثير تلاشي نصوص، قائمة طعام تفاعلية بتصنيفات (مقبلات، أطباق رئيسية، حلويات) مع صور للأطباق وتأثير hover يكشف المكونات، قسم عن المطعم بصورة الشيف التنفيذي وقصة المطعم، قسم المناسبات الخاصة مع معرض صور لحفلات الزفاف والاجتماعات، نموذج حجز طاولة متكامل مع اختيار التاريخ والوقت وعدد الأشخاص، قسم موقع المطعم مع خريطة تفاعلية ومواقف السيارات، تذييل مع روابط وسائل التواصل ونموذج اشتراك في النشرة البريدية. حركات سلسة عند التمرير، تأثير particles من التوابل العربية تطفو في الخلفية، تأثير shimmer على الأزرار الذهبية، تأثير bounce ناعم على أيقونات المقبلات.`,
    },
    {
      label: l.ex12,
      prompt: `أنشئ موقعًا لشركة ناشئة في مجال الذكاء الاصطناعي باسم "عقل" في القاهرة.
تصميم تقني مستقبلي بخلفية داكنة (#0F172A) مع تدرجات أرجوانية نيون (#8B5CF6) وزرقاء كهربائية (#06B6D4)، خط عربي (Cairo) للعناوين و(Inter) للنصوص. الأقسام: شريط تنقل شفاف يتحول للون الثابت عند التمرير مع شعار متحرك، بطل تفاعلي ثلاثي الأبعاد يعرض نموذج AI يدور مع فأرة المستخدم، قسم المنتج مع بطاقات مائلة تظهر مميزات الذكاء الاصطناعي، قسم الإحصائيات بأرقام متحركة تنCount up عند الظهور، قسم العملاء بشعارات الشركات الشريكة مع تأثير Infinite scroll، قسم الفريق مع صور شخصية دائرية وتأثير tilt عند المرور، قسم المدونة بآخر الأخبار التقنية، نموذج طلب تجربة مجانية مع validation حي، تذييل مع روابط التواصل ونموذج النشرة البريدية. حركات GSAP متقدمة، تأثير grid من النقاط المضيئة في الخلفية، تأثير glitch ناعم على العناوين الرئيسية، تأثير glow على الأزرار، particles interactivية تتفاعل مع حركة الماوس.`,
    },
  ];
}

export default function PromptGuideModal({ isOpen, onClose }: Props) {
  const { language } = useLanguage();
  const [activePanel, setActivePanel] = useState<ActivePanel>("guideline");
  const [selectedExampleIndex, setSelectedExampleIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  async function handleCopyPrompt() {
    const prompt = getExamples(language)[selectedExampleIndex]?.prompt;
    if (prompt) {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  const selectedExample = getExamples(language)[selectedExampleIndex] ?? getExamples(language)[0];

  function handleOverlayClick(event: React.MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label="Prompt writing guide"
    >
      <div
        className="flex h-[80vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-(--app-card-border) bg-(--app-panel) shadow-(--app-shadow-lg)"
        onClick={(event) => event.stopPropagation()}
      >
        <aside dir={language === 'ar' || language === 'ku' ? 'rtl' : 'ltr'} className="w-56 shrink-0 border-r border-(--app-border) bg-(--app-panel-soft) p-4">
          <p className={`mb-3 text-xs uppercase tracking-widest text-(--app-text-muted) ${language === 'ar' ? 'text-right' : ''}`}>
            {t("promptGuideGuidelines", language)}
          </p>
          <button
            type="button"
            onClick={() => setActivePanel("guideline")}
            className={`mt-3 w-full rounded-xl px-3 py-2.5 text-sm font-medium transition ${language === 'ar' ? 'text-right' : ''} ${
              activePanel === "guideline"
                ? "bg-(--app-hover-bg-strong) text-(--app-text-heading)"
                : "text-(--app-text-secondary) hover:bg-(--app-hover-bg)"
            }`}
          >
            {t("promptGuideViewAll", language)}
          </button>

          <div className="my-4 border-t border-(--app-border)" />

          <p className={`mb-3 text-xs uppercase tracking-widest text-(--app-text-muted) ${language === 'ar' ? 'text-right' : ''}`}>
            {t("promptGuideExamples", language)}
          </p>
          <div className="space-y-2">
            {getExamples(language).map((example, index) => {
              const isActive = activePanel === "example" && index === selectedExampleIndex;

              return (
                <button
                  key={example.label}
                  type="button"
                  onClick={() => {
                    setActivePanel("example");
                    setSelectedExampleIndex(index);
                  }}
                  className={`w-full truncate rounded-xl px-3 py-2.5 text-sm font-medium transition ${language === 'ar' ? 'text-right' : ''} ${
                    isActive
                      ? "bg-(--app-hover-bg-strong) text-(--app-text-heading)"
                      : "text-(--app-text-secondary) hover:bg-(--app-hover-bg)"
                  }`}
                  title={example.label}
                >
                  {example.label}
                </button>
              );
            })}
          </div>
        </aside>

        <section dir={language === 'ar' || language === 'ku' ? 'rtl' : 'ltr'} className="flex-1 overflow-y-auto p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              {activePanel === "guideline" ? (
                <>
                  <h2 className="mb-1 text-lg font-semibold text-(--app-text-heading)">
                    {t("promptGuideHowToWrite", language)}
                  </h2>
                  <p className="text-sm text-(--app-text-secondary)">
                    {t("promptGuideChecklist", language)}
                  </p>
                </>
              ) : (
                <>
                  <h2 className="mb-1 text-lg font-semibold text-(--app-text-heading)">
                    {selectedExample.label}
                  </h2>
                  <p className="text-sm text-(--app-text-secondary)">
                    {t("promptGuideTemplate", language)}
                  </p>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-(--app-card-border) bg-(--app-card-bg) text-(--app-text-secondary) transition hover:text-(--app-text-heading)"
              aria-label={t("promptGuideClose", language)}
              title={t("promptGuideCloseBtn", language)}
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>

          {activePanel === "guideline" ? (
            <div className="space-y-0">
              {getTips(language).map((tip, index) => (
                <article
                  key={tip.title}
                  className="rounded-xl p-4"
                >
                  <p className="mb-1 text-xs font-medium uppercase tracking-wider text-(--app-text-muted)">
                    {t("promptGuideLabel", language)} {index + 1}
                  </p>
                  <h3 className="mb-1 text-sm font-semibold text-(--app-text-heading)">
                    {tip.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-(--app-text-secondary)">
                    {tip.body}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <div className="relative">
              <button
                type="button"
                onClick={handleCopyPrompt}
                className={`absolute bottom-3 ${selectedExampleIndex >= 4 ? 'left-3' : 'right-3'} z-10 flex h-8 w-8 items-center justify-center rounded-lg border border-(--app-card-border) bg-(--app-card-bg) text-(--app-text-secondary) transition hover:text-(--app-text-heading) hover:bg-(--app-panel-soft)`}
                aria-label={copied ? t("promptGuideCopied", language) : t("promptGuideCopy", language)}
                title={copied ? t("promptGuideCopied", language) : t("promptGuideCopy", language)}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
              <div dir={selectedExampleIndex >= 4 ? 'rtl' : 'ltr'} className={`whitespace-pre-wrap rounded-xl border border-(--app-input-border) bg-(--app-input-bg) p-4 pb-12 text-sm leading-relaxed text-(--app-input-text) ${selectedExampleIndex >= 4 ? 'text-right' : ''}`}>
                {selectedExample.prompt}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>,
    document.body
  );
}

