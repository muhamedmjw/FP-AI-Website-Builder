import { Buffer } from "node:buffer";
import JSZip from "jszip";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { getCurrentUser } from "@/shared/services/user-service";
import {
  getWebsiteByChatId,
  getGeneratedHtml,
} from "@/server/services/website-service";
import { isMissingUploadColumns } from "@/shared/utils/db-guards";

function toSafeFilename(title: string): string {
  let safeBase = title
    .toLowerCase()
    .replace(/[^a-z0-9\s_]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

  if (/^\d/.test(safeBase)) {
    safeBase = `website-${safeBase}`;
  }

  return `${safeBase || "website"}.zip`;
}

function replaceDataUriSrcWithFilePath(
  html: string,
  dataUri: string,
  fileName: string
): string {
  if (!dataUri) {
    return html;
  }

  let nextHtml = html;
  nextHtml = nextHtml.replaceAll(`src="${dataUri}"`, `src="${fileName}"`);
  nextHtml = nextHtml.replaceAll(`src='${dataUri}'`, `src="${fileName}"`);
  return nextHtml;
}

function generateReadme(
  chatTitle: string,
  generatedAt: string
): string {
  return [
    `# ${chatTitle}`,
    "",
    "([English](#english) | [العربية](#العربية) | [کوردی](#کوردی))",
    "",
    "---",
    "",
    "<h2 id=\"english\">English</h2>",
    "",
    "Welcome to your newly generated project! This website was built using our AI tool. Everything is set up and ready for you to customize, deploy, and share with the world.",
    "",
    "### 📂 Project Structure",
    "",
    "| File / Directory | Description |",
    "| :--- | :--- |",
    "| `index.html` | The main HTML file containing the structure of your website. |",
    "| `css/styles.css` | The main stylesheet. Modify this to change colors, typography, and layout. |",
    "| `js/main.js` | The JavaScript file for interactive elements and logic. |",
    "| `images/` | A directory to store all your image assets. |",
    "",
    "### 🛠️ How to Work with This Project",
    "",
    "Getting started is incredibly simple. This is a static website, which means no complex build tools or servers are required to start developing:",
    "",
    "1. **View the site:** Double-click `index.html` to open it in your default web browser.",
    "2. **Edit the layout:** Open `index.html` in any text editor to modify the text, add new sections, or restructure the page.",
    "3. **Change the design:** Open `css/styles.css` to tweak the styles. You can change fonts, update the color palette, or adjust spacing.",
    "4. **Add interactivity:** Open `js/main.js` to add event listeners or dynamic behaviors.",
    "5. **Update images:** Place any new images inside the `images/` folder.",
    "",
    "### 🚀 Deployment",
    "",
    "**1. Built-in Deploy Button:**",
    "The fastest way to publish your website is right inside the chat window! Simply click the **Deploy** button on your generated website. It will instantly publish your site to Netlify in one click and provide you with a live, shareable URL within seconds.",
    "",
    "**2. Manual Deployment:**",
    "You can also host it for free on any static hosting platform. Simply upload the entire project folder to any of the following services:",
    "- **Netlify:** Drag and drop your project folder directly into their dashboard.",
    "- **Vercel:** Install the CLI or import a repository for automatic deployments.",
    "- **GitHub Pages:** Push this project to a repository, go to Settings, and enable GitHub Pages.",
    "",
    "---",
    "",
    "<h2 id=\"العربية\">العربية</h2>",
    "",
    "<div dir=\"rtl\">",
    "",
    "مرحباً بك في مشروعك الجديد! تم إنشاء هذا الموقع باستخدام أداة الذكاء الاصطناعي الخاصة بنا. كل شيء جاهز لتقوم بتخصيصه، نشره، ومشاركته مع العالم.",
    "",
    "### 📂 هيكل المشروع",
    "",
    "| الملف / المجلد | الوصف |",
    "| :--- | :--- |",
    "| ملف <code>index.html</code> | الملف الرئيسي الذي يحتوي على هيكل موقعك. |",
    "| ملف <code>css/styles.css</code> | ملف التنسيقات. قم بتعديله لتغيير الألوان، الخطوط، والتصميم. |",
    "| ملف <code>js/main.js</code> | ملف البرمجة لإضافة عناصر تفاعلية للموقع. |",
    "| مجلد <code>images/</code> | مجلد مخصص لتخزين جميع الصور. |",
    "",
    "### 🛠️ كيفية العمل على هذا المشروع",
    "",
    "البدء في استخدام المشروع بسيط للغاية، ولا يحتاج إلى التعامل مع خوادم معقدة للبدء في التطوير:",
    "",
    "1. **عرض الموقع:** انقر نقرًا مزدوجًا على ملف <code>index.html</code> لفتحه في متصفحك.",
    "2. **تعديل التصميم:** افتح ملف <code>index.html</code> في أي محرر نصوص لتعديل المحتوى.",
    "3. **تغيير الألوان والتنسيقات:** افتح ملف <code>css/styles.css</code> لتخصيص الألوان والمسافات.",
    "4. **إضافة تفاعل:** افتح ملف <code>js/main.js</code> وأضف الأكواد البرمجية المناسبة.",
    "5. **تحديث الصور:** ضع صورك الجديدة في مجلد <code>images/</code> الخاص بالمشروع.",
    "",
    "### 🚀 النشر",
    "",
    "**١. زر النشر المدمج:**",
    "أسرع طريقة لنشر موقعك هي من خلال المحادثة! ببساطة اضغط على زر **النشر** (Deploy) الموجود على موقعك المُنشأ. سيقوم فوراً بنشره وتزويدك برابط مباشر يمكن مشاركته خلال ثوانٍ.",
    "",
    "**٢. النشر اليدوي:**",
    "يمكنك أيضاً استضافة موقعك مجاناً برفع المجلد كاملاً إلى أي منصة استضافة سحابية:",
    "- موقع **نيتليفاي** أو **فيرسل**: من خلال سحب وإفلات المجلد في لوحة التحكم.",
    "- صفحات **جت هب**: برفع المشروع وتفعيل خصائص الصفحات.",
    "",
    "</div>",
    "",
    "---",
    "",
    "<h2 id=\"کوردی\">کوردی</h2>",
    "",
    "<div dir=\"rtl\">",
    "",
    "بەخێربێیت بۆ پرۆژە نوێیەکەت! ئەم وێبسایتە لەلایەن ئامرازی زیرەکی دەستکردەوە دروست کراوە. هەموو شتێک ئامادەیە بۆ ڕێکخستن، بڵاوکردنەوە، و هاوبەشکردنی لەگەڵ جیهان.",
    "",
    "### 📂 پێکهاتەی پرۆژە",
    "",
    "| فایل / فۆڵدەر | وەسف |",
    "| :--- | :--- |",
    "| فایلی <code>index.html</code> | فایلی سەرەکی کە پێکهاتەی وێبسایتەکەت لەخۆ دەگرێت. |",
    "| فایلی <code>css/styles.css</code> | فایلی ستایلی سەرەکی بۆ دەستکاری ڕەنگ و شێواز. |",
    "| فایلی <code>js/main.js</code> | فایلی جاڤاسکریپت بۆ کارلێککردن لەگەڵ ماڵپەڕەکە. |",
    "| فۆڵدەری <code>images/</code> | فۆڵدەرێک بۆ هەڵگرتنی هەموو وێنەکانت. |",
    "",
    "### 🛠️ چۆنیەتی کارکردن",
    "",
    "دەستپێکردن زۆر ئاسانە و پێویستی بە سێرڤەری ئاڵۆز نییە:",
    "",
    "1. **بینینی ماڵپەڕەکە:** کرتە بکە سەر فایلی <code>index.html</code> لە براوزەرەکەتدا.",
    "2. **گۆڕینی پێکهاتە:** فایلی <code>index.html</code> لە بەرنامەیەکی دەستکاریکردنی تێکست بکەرەوە.",
    "3. **گۆڕینی دیزاین:** فایلی <code>css/styles.css</code> بکەرەوە بۆ گۆڕینی ڕەنگ و فۆنت.",
    "4. **زیادکردنی جووڵە:** فایلی <code>js/main.js</code> بکەرەوە بۆ زیادکردنی کۆدی فرمان.",
    "5. **گۆڕینی وێنەکان:** وێنەکانت بخە ناو فۆڵدەری <code>images/</code> لە پرۆژەکەدا.",
    "",
    "### 🚀 بڵاوکردنەوە (Deploy)",
    "",
    "**١. دوگمەی بڵاوکردنەوەی خۆکار:**",
    "خێراترین ڕێگا بۆ بڵاوکردنەوەی ماڵپەڕەکەت لە ناو چاتەکەدایە! تەنها کرتە بکە سەر دوگمەی **بڵاوکردنەوە (Deploy)** لەسەر ئەو ماڵپەڕەی دروستت کردووە. دەستبەجێ بڵاودەکرێتەوە و لە چەند چرکەیەکدا لینکێکی ڕاستەوخۆت پێدەدرێت.",
    "",
    "**٢. بڵاوکردنەوەی دەستی:**",
    "دەتوانیت بە خۆڕایی هۆستی بکەیت لە یەکێک لەم پلاتفۆرمانە:",
    "- ماڵپەڕی **نيتليفای** یان **ڤێرسڵ**: بە کێشانی فۆڵدەرەکە بۆ ناو ماڵپەڕەکە.",
    "- خزمەتگوزاری **گیت‌هەب**: پرۆژەکە بنێرە و هەڵبژاردەی پەیجز چالاک بکە.",
    "",
    "</div>",
    "",
    "---",
    "",
    `*Generated on: ${generatedAt}*`,
  ].join("\n");
}

/**
 * ZIP export endpoint.
 * Despite the /guest path, this requires authentication.
 * The path is kept for backwards compatibility.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    const user = await getCurrentUser(supabase);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const chatId =
      body &&
      typeof body === "object" &&
      "chatId" in body &&
      typeof body.chatId === "string"
        ? body.chatId.trim()
        : "";

    if (!chatId) {
      return NextResponse.json(
        { error: "chatId is required." },
        { status: 400 }
      );
    }

    // Get the website and its generated HTML
    const website = await getWebsiteByChatId(supabase, chatId);
    if (!website) {
      return NextResponse.json(
        { error: "No website found for this chat." },
        { status: 404 }
      );
    }

    // Explicit ownership check (defense-in-depth on top of RLS)
    const { data: chat } = await supabase
      .from("chats")
      .select("user_id")
      .eq("id", website.chat_id)
      .single();

    if (!chat || chat.user_id !== user.id) {
      return NextResponse.json(
        { error: "Forbidden." },
        { status: 403 }
      );
    }

    const { data: chatWithTitle } = await supabase
      .from("chats")
      .select("title")
      .eq("id", website.chat_id)
      .single();

    const zipFilename = toSafeFilename(chatWithTitle?.title ?? "website");

    const html = await getGeneratedHtml(supabase, website.id);
    if (!html) {
      return NextResponse.json(
        { error: "No generated HTML found." },
        { status: 404 }
      );
    }

    // ---------- Extract CSS and JS from inline tags ----------
    let processedHtml = html;
    let extractedCss = "";
    let extractedJs = "";

    // Extract the FIRST custom <style> block (skip CDN links which are <link> tags)
    const styleMatch = processedHtml.match(/<style>([\s\S]*?)<\/style>/i);
    if (styleMatch) {
      extractedCss = styleMatch[1].trim();
      processedHtml = processedHtml.replace(
        styleMatch[0],
        '<link rel="stylesheet" href="css/styles.css">'
      );
    }

    // Extract the LAST inline <script> block (before </body>), skip CDN <script src="..."> tags
    const scriptMatches = [
      ...processedHtml.matchAll(/<script>[\s\S]*?<\/script>/gi),
    ];
    if (scriptMatches.length > 0) {
      const lastScript = scriptMatches[scriptMatches.length - 1];
      const jsContent = lastScript[0]
        .replace(/^<script>/i, "")
        .replace(/<\/script>$/i, "")
        .trim();
      if (jsContent) {
        extractedJs = jsContent;
        processedHtml = processedHtml.replace(
          lastScript[0],
          '<script src="js/main.js"></script>'
        );
      }
    }

    // Clean up any stray assets/images/ references in HTML directly
    processedHtml = processedHtml.replaceAll("assets/images/", "images/");

    // ---------- Build the ZIP with proper folder structure ----------
    const zip = new JSZip();
    const safeFolderName = zipFilename.replace(/\.zip$/i, "");
    const folder = zip.folder(safeFolderName)!;
    folder.file("css/styles.css", extractedCss);
    folder.file("js/main.js", extractedJs || "// main.js\n");
    folder.file("images/.gitkeep", "");
    folder.file(
      ".gitignore",
      "node_modules/\n.DS_Store\n*.log\n"
    );
    folder.file(
      "README.md",
      generateReadme(
        chatWithTitle?.title ?? "Website",
        new Date().toISOString()
      )
    );

    const { data: uploadedImages, error: uploadedImagesError } = await supabase
      .from("files")
      .select("file_name, content")
      .eq("website_id", website.id)
      .eq("is_user_upload", true);

    if (uploadedImagesError) {
      if (!isMissingUploadColumns(uploadedImagesError)) {
        throw uploadedImagesError;
      }
    }

    for (const imageRow of uploadedImages ?? []) {
      const dataUri = typeof imageRow.content === "string" ? imageRow.content : "";
      const fileName = typeof imageRow.file_name === "string" ? imageRow.file_name : "";

      if (!fileName) {
        continue;
      }

      let normalizedFileName = fileName;
      if (normalizedFileName.startsWith("assets/images/")) {
        normalizedFileName = normalizedFileName.replace("assets/images/", "images/");
      }

      // Check if the generated HTML actually uses this image.
      // If the filename is not referenced anywhere in the HTML, skip adding it to the ZIP.
      // Notice we check against normalizedFileName since the HTML may have already had assets/images/ replaced
      if (!processedHtml.includes(normalizedFileName) && !processedHtml.includes(fileName)) {
        continue;
      }

      const base64 = dataUri.split(",")[1]?.trim() ?? "";
      if (!base64) {
        continue;
      }

      // Replace both old and new permutations just in case
      processedHtml = replaceDataUriSrcWithFilePath(processedHtml, dataUri, normalizedFileName);

      // We place the files dynamically dependent on how the AI referenced them.
      // Notice we use normalizedFileName
      folder.file(normalizedFileName, Buffer.from(base64, "base64"));
    }

    folder.file("index.html", processedHtml);

    const zipBuffer = await zip.generateAsync({ type: "arraybuffer" });

    // Count the files in the zip (excluding folders)
    const fileCount = Object.keys(folder.files).filter(
      (name) => !folder.files[name].dir
    ).length;




    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipFilename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("POST /api/guest/zip error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error.";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
