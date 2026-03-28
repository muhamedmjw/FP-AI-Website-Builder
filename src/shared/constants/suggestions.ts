import type { AppLanguage } from "@/shared/types/database";

export type PromptSuggestion = {
  id: string;
  label: string;
  prompt: string;
};

const suggestionsByLanguage: Record<AppLanguage, PromptSuggestion[]> = {
  en: [
    {
      id: "restaurant",
      label: "Restaurant",
      prompt:
        "Build a modern restaurant website with a warm hero section, featured dishes, full menu categories, chef story, photo gallery, testimonials, and a contact/reservation form. Use inviting colors and elegant typography.",
    },
    {
      id: "portfolio",
      label: "Portfolio",
      prompt:
        "Create a clean personal portfolio website with an introduction hero, about section, featured projects grid, skills section, client testimonials, and contact links. Keep it minimal, professional, and visually balanced.",
    },
    {
      id: "landing-page",
      label: "Landing",
      prompt:
        "Design a high-converting startup landing page with a bold hero, clear value proposition, key features, social proof, pricing cards, FAQ accordion, and a prominent call-to-action section.",
    },
    {
      id: "clinic",
      label: "Clinic",
      prompt:
        "Build a medical clinic website with doctor profiles, specialties, appointment booking section, opening hours, insurance information, patient reviews, and emergency contact details. Make it trustworthy and clean.",
    },
    {
      id: "law-firm",
      label: "Law Firm",
      prompt:
        "Create a law firm website with a professional hero, practice areas, attorney bios, case results highlights, consultation form, and office location details. Use a serious and credible visual style.",
    },
    {
      id: "ecommerce",
      label: "E-Commerce",
      prompt:
        "Generate an e-commerce storefront homepage with featured products, product categories, promotional banner, customer reviews, newsletter signup, and a clear shopping-focused layout.",
    },
    {
      id: "gym",
      label: "Gym",
      prompt:
        "Create a fitness gym website with motivational hero text, class schedule, trainers section, membership plans, transformation testimonials, and a join-now contact form.",
    },
    {
      id: "blog",
      label: "Blog",
      prompt:
        "Build a modern blog homepage with featured article highlight, latest posts grid, categories, author card, newsletter signup, and a clean reading-first layout.",
    },
    {
      id: "real-estate",
      label: "Real Estate",
      prompt:
        "Design a real estate agency website with property listings, featured homes carousel, agent profiles, neighborhood highlights, mortgage callout, and inquiry form.",
    },
    {
      id: "wedding",
      label: "Wedding",
      prompt:
        "Create a romantic wedding event website with couple story, event timeline, venue details, RSVP form, photo gallery, gift registry section, and elegant typography.",
    },
    {
      id: "saas",
      label: "SaaS",
      prompt:
        "Build a SaaS product marketing site with headline hero, product screenshots, feature breakdown, integrations, pricing tiers, customer logos, and an onboarding call to action.",
    },
    {
      id: "ngo",
      label: "NGO",
      prompt:
        "Create a charity/NGO website with mission statement, impact statistics, active campaigns, volunteer signup, donation call-to-action, and success stories from beneficiaries.",
    },
  ],
  ar: [
    {
      id: "restaurant",
      label: "مطعم",
      prompt:
        "أنشئ موقع مطعم عصري يحتوي على قسم بطولي جذاب، أطباق مميزة، قوائم طعام مصنفة، قصة الشيف، معرض صور، آراء العملاء، ونموذج حجز/تواصل. استخدم ألواناً دافئة وخطوطاً أنيقة.",
    },
    {
      id: "portfolio",
      label: "أعمالي",
      prompt:
        "أنشئ موقع بورتفوليو شخصي نظيف مع مقدمة قوية، نبذة عني، شبكة للمشاريع المميزة، قسم المهارات، شهادات العملاء، وروابط للتواصل. اجعله احترافياً وبسيطاً.",
    },
    {
      id: "landing-page",
      label: "هبوط",
      prompt:
        "صمّم صفحة هبوط عالية التحويل لشركة ناشئة مع قسم بطولي قوي، عرض قيمة واضح، مزايا رئيسية، إثبات اجتماعي، بطاقات الأسعار، قسم الأسئلة الشائعة، ودعوة واضحة لاتخاذ الإجراء.",
    },
    {
      id: "clinic",
      label: "عيادة",
      prompt:
        "أنشئ موقع عيادة طبية يتضمن ملفات الأطباء، التخصصات، قسم حجز المواعيد، ساعات العمل، معلومات التأمين، تقييمات المرضى، ووسائل تواصل للطوارئ بأسلوب موثوق ونظيف.",
    },
    {
      id: "law-firm",
      label: "مكتب قانون",
      prompt:
        "أنشئ موقع مكتب محاماة مع واجهة احترافية، مجالات الممارسة، تعريف بالمحامين، أبرز نتائج القضايا، نموذج طلب استشارة، ومعلومات الموقع. اجعل التصميم رسمياً وموثوقاً.",
    },
    {
      id: "ecommerce",
      label: "متجر",
      prompt:
        "أنشئ واجهة متجر إلكتروني تتضمن منتجات مميزة، تصنيفات المنتجات، بانر عروض، تقييمات العملاء، اشتراك بالنشرة البريدية، وتصميم واضح يركز على الشراء.",
    },
    {
      id: "gym",
      label: "نادي رياضي",
      prompt:
        "أنشئ موقع نادي لياقة بدنية مع رسالة بطولية محفزة، جدول الحصص، قسم المدربين، خطط الاشتراك، قصص التحول، ونموذج انضمام سريع.",
    },
    {
      id: "blog",
      label: "مدونة",
      prompt:
        "أنشئ صفحة رئيسية لمدونة حديثة تتضمن مقالاً مميزاً، شبكة لأحدث المقالات، تصنيفات، بطاقة الكاتب، اشتراك بالنشرة البريدية، وتجربة قراءة مريحة.",
    },
    {
      id: "real-estate",
      label: "عقارات",
      prompt:
        "صمّم موقع وكالة عقارية مع قوائم العقارات، شريط منازل مميزة، ملفات الوسطاء، لمحة عن الأحياء، قسم تمويل/رهن، ونموذج استفسار.",
    },
    {
      id: "wedding",
      label: "زفاف",
      prompt:
        "أنشئ موقع زفاف رومانسي يتضمن قصة العروسين، جدول الفعالية، تفاصيل المكان، نموذج RSVP، معرض صور، قسم هدايا، وخطوطاً أنيقة.",
    },
    {
      id: "saas",
      label: "SaaS",
      prompt:
        "أنشئ موقع تسويقي لمنتج SaaS مع عنوان بطولي، لقطات للمنتج، شرح المزايا، التكاملات، خطط الأسعار، شعارات العملاء، ودعوة واضحة للبدء.",
    },
    {
      id: "ngo",
      label: "جمعية",
      prompt:
        "أنشئ موقع جمعية/منظمة خيرية يتضمن الرسالة، أرقام الأثر، الحملات النشطة، التسجيل كمتطوع، دعوة للتبرع، وقصص نجاح المستفيدين.",
    },
  ],
  ku: [
    {
      id: "restaurant",
      label: "چێشتخانە",
      prompt:
        "وێبسایتێکی مۆدێرن بۆ چێشتخانە دروست بکە بە بەشی سەرەکیی گەرم، خواردنی تایبەت، مێنووی پۆلپۆل، چیرۆکی شێف، گەلەری وێنە، هەڵسەنگاندنەکانی کڕیار، و فۆڕمی پەیوەندی/حجز.",
    },
    {
      id: "portfolio",
      label: "پۆرتفۆلیۆ",
      prompt:
        "وێبسایتێکی پۆرتفۆلیۆی کەسی دروست بکە بە بەشی ناساندن، دەربارەی من، تۆڕی پرۆژەکان، بەشی تواناکان، وتەی کڕیاران، و ڕێگاکانی پەیوەندی. سادە و پڕۆفیشناڵ بێت.",
    },
    {
      id: "landing-page",
      label: "Landing",
      prompt:
        "پەڕەیەکی landing بۆ ستارتاپ دروست بکە کە بەشی سەرەکیی بەهێز، پێشنیاری بەها، تایبەتمەندییەکان، پشتگیری کۆمەڵایەتی، پلانی نرخ، FAQ، و بانگەوازێکی ڕوون بۆ دەستپێکردن هەبێت.",
    },
    {
      id: "clinic",
      label: "کلینیک",
      prompt:
        "وێبسایتێکی کلینیکی پزیشکی دروست بکە بە پڕۆفایلی پزیشکان، پسپۆڕییەکان، بەشی وەرگرتنی کات، کاتی کارکردن، زانیاری بیمە، هەڵسەنگاندنی نەخۆشان، و پەیوەندی کاتی فریاگوزاری.",
    },
    {
      id: "law-firm",
      label: "نووسینگەی یاسا",
      prompt:
        "وێبسایتێکی نووسینگەی پارێزەرایەتی دروست بکە بە hero ی فەرمی، بوارەکانی کار، پڕۆفایلی پارێزەران، سەرکەوتنی دۆزەکان، فۆڕمی راوێژکاری، و زانیاری شوێن.",
    },
    {
      id: "ecommerce",
      label: "فرۆشگا",
      prompt:
        "سەرپەڕەیەکی فرۆشگای ئۆنلاین دروست بکە کە بەرهەمی تایبەت، پۆلەکانی بەرهەم، بانەری ئۆفەر، ڕای کڕیاران، subscribe بۆ نیوەزنامە، و دیزاینێکی فرۆشتن-مەحۆر هەبێت.",
    },
    {
      id: "gym",
      label: "فیتنەس",
      prompt:
        "وێبسایتێکی هۆڵی وەرزشی دروست بکە بە وتەی هاندەر، خشتەی وانەکان، بەشی ڕاهێنەران، پلانی ئەندامێتی، چیرۆکی گۆڕانکاری، و فۆڕمی بەشداری.",
    },
    {
      id: "blog",
      label: "بلۆگ",
      prompt:
        "سەرپەڕەیەکی بلۆگی نوێ دروست بکە بە بابەتی دیاریکراو، تۆڕی بابەتە نوێکان، پۆلەکان، کارتێکی نووسەر، subscribe بۆ نیوەزنامە، و چینەوەیەکی ئاسودەی خوێندن.",
    },
    {
      id: "real-estate",
      label: "موڵک",
      prompt:
        "وێبسایتێکی ئاژانسی موڵک دروست بکە بە لیستی خانووبەرە، carousel ی خانووی تایبەت، پڕۆفایلی ئاژانسیارەکان، زانیاری ناوچەکان، بانگەوازی قەرز/ڕەهن، و فۆڕمی داواکاری.",
    },
    {
      id: "wedding",
      label: "هاوسەرگیری",
      prompt:
        "وێبسایتێکی رۆمانسی بۆ ئاھەنگی هاوسەرگیری دروست بکە بە چیرۆکی هاوسەران، خشتەی ڕووداو، زانیاری شوێن، فۆڕمی RSVP، گەلەری وێنە، و بەشی دیاری.",
    },
    {
      id: "saas",
      label: "SaaS",
      prompt:
        "وێبسایتێکی مارکێتینگی بەرھەمی SaaS دروست بکە بە سەردێڕی سەرەکی، سکرینشۆتی بەرھەم، ڕوونکردنەوەی تایبەتمەندی، integration، پلانی نرخ، لوگۆی کڕیاران، و بانگەوازی دەستپێکردن.",
    },
    {
      id: "ngo",
      label: "خێرخوازی",
      prompt:
        "وێبسایتێکی دامەزراوەی خێرخوازی/NGO دروست بکە بە ئامانج، ئامارەکانی کاریگەری، کەمپەینی چالاک، تۆمارکردنی خۆبەخش، بانگەوازی بەخشین، و چیرۆکی سەرکەوتنی سوودمەندان.",
    },
  ],
};

export function getPromptSuggestions(language: AppLanguage): PromptSuggestion[] {
  return suggestionsByLanguage[language] ?? suggestionsByLanguage.en;
}
