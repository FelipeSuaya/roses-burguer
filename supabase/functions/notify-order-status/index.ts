import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type NotifyPayload = {
  order_number: number;
  nombre?: string;
  telefono?: string | null;
  tipo: "retiro" | "envio";
  estado: "listo_para_retirar" | "cadete_salio";
  direccion_envio?: string | null;
};

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Parse JSON robustly (helps when callers send unexpected content-type)
    const rawBody = await req.text();
    let payload: NotifyPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch (e: unknown) {
      return new Response(
        JSON.stringify({
          error: "Invalid JSON",
          details: e instanceof Error ? e.message : "Unknown error",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!payload?.order_number || !payload?.tipo || !payload?.estado) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields",
          required: ["order_number", "tipo", "estado"],
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const webhookUrl = "https://n8nwebhookx.botec.tech/webhook/notificacion-estado";

    const webhookRes = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // n8n should return 2xx; if it doesn't, bubble up the body for debugging
    if (!webhookRes.ok) {
      const text = await webhookRes.text().catch(() => "");
      return new Response(
        JSON.stringify({
          ok: false,
          status: webhookRes.status,
          body: text,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const maybeText = await webhookRes.text().catch(() => "");
    return new Response(
      JSON.stringify({ ok: true, status: webhookRes.status, response: maybeText || null }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    console.error("notify-order-status error:", error);
    return new Response(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
