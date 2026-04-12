import JSZip from "jszip";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { getCurrentUser } from "@/shared/services/user-service";
import {
  getGeneratedHtml,
  getWebsiteByChatId,
} from "@/server/services/website-service";
import { extractAssetsFromHtml } from "@/shared/utils/html-assets";

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

async function parseErrorMessage(response: Response, fallback: string) {
  const contentType = response.headers.get("content-type") ?? "";
  const rawBody = (await response.text().catch(() => "")).trim();

  if (!rawBody) {
    return fallback;
  }

  try {
    if (contentType.includes("application/json")) {
      const data = JSON.parse(rawBody) as {
        message?: string;
        error?: string;
        code?: string | number;
        errors?: string[];
      };

      if (typeof data.message === "string" && data.message.trim()) {
        return data.message;
      }

      if (typeof data.error === "string" && data.error.trim()) {
        return data.error;
      }

      if (Array.isArray(data.errors) && data.errors.length > 0) {
        return data.errors.join(" ");
      }

      if (typeof data.code === "string" && data.code.trim()) {
        return data.code;
      }
    }

    return rawBody;
  } catch {
    return rawBody || fallback;
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

    const rawSiteName =
      body &&
      typeof body === "object" &&
      "siteName" in body &&
      typeof body.siteName === "string"
        ? body.siteName.trim().toLowerCase()
        : "";

    const siteName = rawSiteName.replace(/\s+/g, "-");

    if (!chatId) {
      return NextResponse.json({ error: "chatId is required." }, { status: 400 });
    }

    if (
      siteName &&
      !/^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$/.test(siteName)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid site name. Use 3-63 characters: lowercase letters, numbers, and hyphens only, and no hyphen at the start or end.",
        },
        { status: 400 }
      );
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

    const { data: existingDeploy } = await supabase
      .from("deploys")
      .select("netlify_site_id, deploy_url")
      .eq("website_id", website.id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let site: NetlifySiteResponse;

    if (existingDeploy?.netlify_site_id) {
      site = {
        id: existingDeploy.netlify_site_id,
        ssl_url: existingDeploy.deploy_url ?? undefined,
        url: existingDeploy.deploy_url ?? undefined,
      };
    } else {
      const createSiteRequestInit: RequestInit = {
        method: "POST",
        headers: siteName
          ? {
              ...authHeader,
              "Content-Type": "application/json",
            }
          : authHeader,
      };

      if (siteName) {
        createSiteRequestInit.body = JSON.stringify({ name: siteName });
      }

      const createSiteResponse = await fetch("https://api.netlify.com/api/v1/sites", {
        ...createSiteRequestInit,
      });

      if (!createSiteResponse.ok) {
        const message = await parseErrorMessage(
          createSiteResponse,
          "Failed to create a Netlify site."
        );

        if (siteName) {
          const looksLikeNameConflict =
            createSiteResponse.status === 409 ||
            createSiteResponse.status === 422 ||
            /already|taken|exists|unavailable|in use|name/i.test(message);

          if (looksLikeNameConflict) {
            return NextResponse.json(
              {
                error:
                  "That Netlify site name is unavailable. Please try a different name.",
              },
              { status: 409 }
            );
          }
        }

        const passthroughStatus =
          createSiteResponse.status >= 400 && createSiteResponse.status < 500
            ? createSiteResponse.status
            : 502;

        return NextResponse.json({ error: message }, { status: passthroughStatus });
      }

      site = (await createSiteResponse.json()) as NetlifySiteResponse;
    }

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
