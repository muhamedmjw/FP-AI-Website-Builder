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
  language: "en" | "ar" | "ku",
  generatedAt: string
): string {
  if (language === "ar") {
    return [
      `# ${chatTitle}`,
      "",
      "تم إنشاء هذا الموقع بواسطة AI Website Builder.",
      "",
      "## هيكل المشروع",
      "",
      "- `index.html` — الملف الرئيسي للموقع",
      "- `assets/css/styles.css` — ملف التنسيقات",
      "- `assets/js/main.js` — ملف الجافاسكريبت",
      "- `assets/images/` — ضع صورك هنا",
      "",
      "## كيفية الاستخدام",
      "",
      "1. افتح `index.html` في متصفحك",
      "2. عدّل `assets/css/styles.css` لتغيير التصميم",
      "3. عدّل `assets/js/main.js` لتغيير السلوك",
      "4. ضع صورك في مجلد `assets/images/`",
      "",
      "## النشر",
      "",
      "ارفع مجلد المشروع كاملاً إلى أي استضافة ثابتة:",
      "",
      "- **Netlify** — اسحب وأفلت المجلد",
      "- **GitHub Pages** — ارفع المشروع وفعّل Pages",
      "- **Vercel** — استورد المشروع",
      "",
      `تاريخ الإنشاء: ${generatedAt}`,
    ].join("\n");
  }

  if (language === "ku") {
    return [
      `# ${chatTitle}`,
      "",
      "ئەم وێبسایتە لەلایەن AI Website Builder دروست کراوە.",
      "",
      "## پێکهاتەی پرۆژە",
      "",
      "- `index.html` — فایلی سەرەکی وێبسایت",
      "- `assets/css/styles.css` — فایلی ستایل",
      "- `assets/js/main.js` — فایلی جاڤاسکریپت",
      "- `assets/images/` — وێنەکانت ئێرە دابنێ",
      "",
      "## چۆنیەتی بەکارهێنان",
      "",
      "1. `index.html` لە براوزەرەکەت بکەرەوە",
      "2. `assets/css/styles.css` دەستکاری بکە بۆ گۆڕینی ستایل",
      "3. `assets/js/main.js` دەستکاری بکە بۆ گۆڕینی ڕەفتار",
      "4. وێنەکانت لە `assets/images/` دابنێ",
      "",
      "## بڵاوکردنەوە",
      "",
      "هەموو مجلدی پرۆژە بارکە بۆ هەر هۆستێکی ستاتیک:",
      "",
      "- **Netlify** — فۆڵدەرەکە بکێشە و بیخەرێوە",
      "- **GitHub Pages** — پرۆژە بکە push و Pages چالاک بکە",
      "- **Vercel** — پرۆژەکە ئیمپۆرت بکە",
      "",
      `بەرواری دروستکردن: ${generatedAt}`,
    ].join("\n");
  }

  return [
    `# ${chatTitle}`,
    "",
    "Built with AI Website Builder.",
    "",
    "## Project Structure",
    "",
    "- `index.html` — Main HTML file",
    "- `assets/css/styles.css` — Stylesheet",
    "- `assets/js/main.js` — JavaScript",
    "- `assets/images/` — Add your images here",
    "",
    "## How to Use",
    "",
    "1. Open `index.html` in your browser",
    "2. Edit `assets/css/styles.css` to change styles",
    "3. Edit `assets/js/main.js` to change behaviour",
    "4. Replace placeholder images in `assets/images/`",
    "",
    "## Deploy",
    "",
    "Upload the entire project folder to any static host:",
    "",
    "- **Netlify** — drag and drop the folder",
    "- **GitHub Pages** — push to a repo and enable Pages",
    "- **Vercel** — import the project",
    "",
    `Generated: ${generatedAt}`,
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
        '<link rel="stylesheet" href="assets/css/styles.css">'
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
          '<script src="assets/js/main.js"></script>'
        );
      }
    }

    // ---------- Build the ZIP with proper folder structure ----------
    const zip = new JSZip();
    const safeFolderName = zipFilename.replace(/\.zip$/i, "");
    const folder = zip.folder(safeFolderName)!;
    folder.file("assets/css/styles.css", extractedCss);
    folder.file("assets/js/main.js", extractedJs || "// main.js\n");
    folder.file("assets/images/.gitkeep", "");
    folder.file(
      ".gitignore",
      "node_modules/\n.DS_Store\n*.log\n"
    );
    folder.file(
      "README.md",
      generateReadme(
        chatWithTitle?.title ?? "Website",
        website.language,
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

      // Check if the generated HTML actually uses this image.
      // If the filename is not referenced anywhere in the HTML, skip adding it to the ZIP.
      if (!processedHtml.includes(fileName)) {
        continue;
      }

      const base64 = dataUri.split(",")[1]?.trim() ?? "";
      if (!base64) {
        continue;
      }

      processedHtml = replaceDataUriSrcWithFilePath(processedHtml, dataUri, fileName);

      // We place the files dynamically dependent on how the AI referenced them.
      // Usually, it's just the root or assets/images/. We'll use the root by default 
      // since the HTML `src="filename"` typically doesn't include the folder unless requested.
      folder.file(fileName, Buffer.from(base64, "base64"));
    }

    folder.file("index.html", processedHtml);

    const zipBuffer = await zip.generateAsync({ type: "arraybuffer" });

    // Count the files in the zip (excluding folders)
    const fileCount = Object.keys(folder.files).filter(
      (name) => !folder.files[name].dir
    ).length;

    // Log the download to the zip_downloads table
    await supabase.from("zip_downloads").insert({
      user_id: user.id,
      website_id: website.id,
      file_count: fileCount,
    });

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
