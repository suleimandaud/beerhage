// supabase/functions/advice/index.ts
// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const prompt = body?.prompt ?? "";
    const imageUrls = Array.isArray(body?.imageUrls) ? body.imageUrls : [];

    const key = Deno.env.get("OPENROUTER_KEY");
    if (!key) {
      return new Response(JSON.stringify({ error: "Missing OPENROUTER_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ✅ Force a vision model
    const model = body?.model || "openai/gpt-4o-mini";

    const safeImages = imageUrls
      .filter((u: any) => typeof u === "string" && u.startsWith("http"))
      .slice(0, 3);

    const content = [
      { type: "text", text: prompt },
      ...safeImages.map((url: string) => ({ type: "image_url", image_url: { url } })),
    ];

    const payload = {
      model,
      messages: [
        {
          role: "user",
          content: safeImages.length ? content : prompt,
        },
      ],
    };

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        // recommended by OpenRouter
        "HTTP-Referer": "https://beer-hage.app",
        "X-Title": "Beer Hage",
      },
      body: JSON.stringify(payload),
    });

    const raw = await res.text();

    let data: any = null;
    try {
      data = JSON.parse(raw);
    } catch {
      data = null;
    }

    console.log("OPENROUTER STATUS:", res.status);
    console.log("OPENROUTER RAW:", raw.slice(0, 1500));
    console.log("OPENROUTER IMAGES:", safeImages);

    if (!res.ok) {
      return new Response(
        JSON.stringify({
          error: "OpenRouter request failed",
          status: res.status,
          details: data?.error ?? raw,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ai = data?.choices?.[0]?.message?.content;

    if (!ai || typeof ai !== "string" || ai.trim().length === 0) {
      return new Response(
        JSON.stringify({
          error: "Empty or invalid AI response",
          details: data ?? raw,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err?.message ?? String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
