import JSZip from "jszip";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { getCurrentUser } from "@/shared/services/user-service";
import {
  getGeneratedHtml,
  getWebsiteByChatId,
} from "@/server/services/website-service";

type NetlifySiteResponse = {
  id: string;
  url?: string;
  ssl_url?: string;
};

type NetlifyDeployResponse = {
  id: string;
  state: string;
  url?: string;
  ssl_url?: string;
};

function extractAssetsFromHtml(html: string) {
  let processedHtml = html;
  let extractedCss = "";
  let extractedJs = "";

  const styleMatch = processedHtml.match(/<style>([\s\S]*?)<\/style>/i);
  if (styleMatch) {
    extractedCss = styleMatch[1].trim();
    processedHtml = processedHtml.replace(
      styleMatch[0],
      '<link rel="stylesheet" href="assets/css/styles.css">'
    );
  }

  const scriptMatches = [...processedHtml.matchAll(/<script>[\s\S]*?<\/script>/gi)];
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

  return {
    processedHtml,
    extractedCss,
    extractedJs,
  };
}

async function parseErrorMessage(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as { message?: string; error?: string };
    if (typeof data.message === "string") return data.message;
    if (typeof data.error === "string") return data.error;
    return fallback;
  } catch {
    return fallback;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
      return NextResponse.json({ error: "chatId is required." }, { status: 400 });
    }

    const website = await getWebsiteByChatId(supabase, chatId);
    if (!website) {
      return NextResponse.json(
        { error: "No website found for this chat." },
        { status: 404 }
      );
    }

    const html = await getGeneratedHtml(supabase, website.id);
    if (!html) {
      return NextResponse.json(
        { error: "No generated HTML found." },
        { status: 404 }
      );
    }

    const token = process.env.NETLIFY_API_TOKEN;
    if (!token) {
      return NextResponse.json(
        { error: "NETLIFY_API_TOKEN is not configured." },
        { status: 500 }
      );
    }

    const { processedHtml, extractedCss, extractedJs } = extractAssetsFromHtml(html);

    const zip = new JSZip();
    zip.file("index.html", processedHtml);
    zip.file("assets/css/styles.css", extractedCss);
    zip.file("assets/js/main.js", extractedJs || "// main.js\n");

    const zipBuffer = await zip.generateAsync({ type: "arraybuffer" });
    const zipBlob = new Blob([zipBuffer], { type: "application/zip" });

    const authHeader = { Authorization: `Bearer ${token}` };

    const createSiteResponse = await fetch("https://api.netlify.com/api/v1/sites", {
      method: "POST",
      headers: authHeader,
    });

    if (!createSiteResponse.ok) {
      const message = await parseErrorMessage(
        createSiteResponse,
        "Failed to create a Netlify site."
      );
      return NextResponse.json({ error: message }, { status: 502 });
    }

    const site = (await createSiteResponse.json()) as NetlifySiteResponse;

    const deployResponse = await fetch(
      `https://api.netlify.com/api/v1/sites/${site.id}/deploys`,
      {
        method: "POST",
        headers: {
          ...authHeader,
          "Content-Type": "application/zip",
        },
        body: zipBlob,
      }
    );

    if (!deployResponse.ok) {
      const message = await parseErrorMessage(
        deployResponse,
        "Failed to upload deploy ZIP to Netlify."
      );
      return NextResponse.json({ error: message }, { status: 502 });
    }

    let deploy = (await deployResponse.json()) as NetlifyDeployResponse;

    for (let attempt = 0; attempt < 15; attempt += 1) {
      if (deploy.state === "ready" || deploy.state === "error") {
        break;
      }

      await sleep(2000);

      const pollResponse = await fetch(
        `https://api.netlify.com/api/v1/deploys/${deploy.id}`,
        {
          method: "GET",
          headers: authHeader,
        }
      );

      if (!pollResponse.ok) {
        const message = await parseErrorMessage(
          pollResponse,
          "Failed to poll Netlify deploy status."
        );
        return NextResponse.json({ error: message }, { status: 502 });
      }

      deploy = (await pollResponse.json()) as NetlifyDeployResponse;
    }

    if (deploy.state !== "ready" && deploy.state !== "error") {
      return NextResponse.json(
        { error: "Deploy is still processing. Please retry in a moment." },
        { status: 504 }
      );
    }

    const deployUrl = deploy.ssl_url || deploy.url || site.ssl_url || site.url || "";

    const { error: insertError } = await supabase.from("deploys").insert({
      user_id: user.id,
      website_id: website.id,
      netlify_site_id: site.id,
      netlify_deploy_id: deploy.id,
      deploy_url: deployUrl,
      status: deploy.state,
    });

    if (insertError) {
      throw insertError;
    }

    if (deploy.state === "error") {
      return NextResponse.json(
        { error: "Netlify deployment failed.", siteId: site.id, deployId: deploy.id },
        { status: 502 }
      );
    }

    return NextResponse.json({
      deployUrl,
      siteId: site.id,
      deployId: deploy.id,
    });
  } catch (error) {
    console.error("POST /api/website/deploy error:", error);

    const message =
      error instanceof Error ? error.message : "Internal server error.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
