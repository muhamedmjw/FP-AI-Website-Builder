import JSZip from "jszip";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { getCurrentUser } from "@/shared/services/user-service";
import {
  getWebsiteByChatId,
  getGeneratedHtml,
} from "@/server/services/website-service";

function toSafeFilename(title: string): string {
  const safeBase = title
    .toLowerCase()
    .replace(/[^a-z0-9\s_]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

  return `${safeBase || "website"}.zip`;
}

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
    const folder = zip.folder("project")!;

    folder.file("index.html", processedHtml);
    folder.file("assets/css/styles.css", extractedCss);
    folder.file("assets/js/main.js", extractedJs || "// main.js\n");
    folder.file("assets/images/.gitkeep", "");
    folder.file(
      ".gitignore",
      "node_modules/\n.DS_Store\n*.log\n"
    );
    folder.file(
      "README.md",
      [
        "# AI Generated Website",
        "",
        "Built with AI Website Builder",
        "",
        "## Project Structure",
        "",
        "- `index.html` — Main HTML file",
        "- `assets/css/` — Stylesheet",
        "- `assets/js/` — JavaScript",
        "- `assets/images/` — Add your images here",
        "",
        "## How to Use",
        "",
        "1. Open `index.html` in your browser",
        "2. Edit `assets/css/styles.css` to change styles",
        "3. Edit `assets/js/main.js` to change behavior",
        "4. Replace placeholder images in `assets/images/`",
        "",
        "## Deploy",
        "",
        "Upload the entire `project/` folder to any static host:",
        "",
        "- **Netlify** — drag and drop the folder",
        "- **GitHub Pages** — push to a repo and enable Pages",
        "- **Vercel** — import the project",
        "",
        `Generated: ${new Date().toISOString()}`,
      ].join("\n")
    );

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
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
