interface Env {
  VIP_RPC_URL: string;
  ALLOWED_ORIGIN: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders(env.ALLOWED_ORIGIN),
      });
    }

    // Only allow POST (JSON-RPC)
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    // Forward to VIP RPC
    const response = await fetch(env.VIP_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: request.body,
    });

    const data = await response.text();
    return new Response(data, {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders(env.ALLOWED_ORIGIN),
      },
    });
  },
} satisfies ExportedHandler<Env>;

function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
