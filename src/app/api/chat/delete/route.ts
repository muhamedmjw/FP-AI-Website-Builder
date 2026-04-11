import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { getCurrentUser } from "@/shared/services/user-service";
import { abortGeneration } from "@/server/services/generation-manager";

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
    }

    return rawBody;
  } catch {
    return rawBody || fallback;
  }
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

    const unpublishLiveSite =
      body &&
      typeof body === "object" &&
      "unpublishLiveSite" in body &&
      typeof body.unpublishLiveSite === "boolean"
        ? body.unpublishLiveSite
        : false;

    if (!chatId) {
      return NextResponse.json({ error: "chatId is required." }, { status: 400 });
    }

    const { data: ownedChat, error: chatLookupError } = await supabase
      .from("chats")
      .select("id")
      .eq("id", chatId)
      .eq("user_id", user.id)
      .single();

    if (chatLookupError || !ownedChat) {
      return NextResponse.json({ error: "Chat not found." }, { status: 404 });
    }

    // Abort any active generation for this chat before deleting
    abortGeneration(chatId);

    if (unpublishLiveSite) {
      const token = process.env.NETLIFY_API_TOKEN;

      if (!token) {
        return NextResponse.json(
          { error: "NETLIFY_API_TOKEN is not configured." },
          { status: 500 }
        );
      }

      const { data: website, error: websiteError } = await supabase
        .from("websites")
        .select("id")
        .eq("chat_id", chatId)
        .maybeSingle();

      if (websiteError) {
        throw websiteError;
      }

      if (website?.id) {
        const { data: latestDeploy, error: deployError } = await supabase
          .from("deploys")
          .select("netlify_site_id")
          .eq("website_id", website.id)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (deployError) {
          throw deployError;
        }

        const siteId = latestDeploy?.netlify_site_id?.trim();

        if (siteId) {
          const deleteSiteResponse = await fetch(
            `https://api.netlify.com/api/v1/sites/${siteId}`,
            {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (!deleteSiteResponse.ok && deleteSiteResponse.status !== 404) {
            const message = await parseErrorMessage(
              deleteSiteResponse,
              "Failed to unpublish the Netlify site."
            );

            return NextResponse.json({ error: message }, { status: 502 });
          }
        }
      }
    }

    const { error: deleteError } = await supabase
      .from("chats")
      .delete()
      .eq("id", chatId)
      .eq("user_id", user.id);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/chat/delete error:", error);

    const message =
      error instanceof Error ? error.message : "Internal server error.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
