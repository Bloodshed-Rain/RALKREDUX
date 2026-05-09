import "@supabase/functions-js/edge-runtime.d.ts";
import {
  corsHeaders,
  expireIfNeeded,
  findRequestByToken,
  jsonResponse,
  sanitizeRequest,
  serviceClient,
} from "../_shared/remote-signing.ts";

type CompleteHostedRemoteRequestBody = {
  request_code?: string;
  signing_token?: string;
  signature_id?: string;
  signature?: Record<string, unknown>;
};

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label}_required`);
  }
  return value.trim();
}

async function hashIp(value: string | null): Promise<string | null> {
  if (!value) return null;
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    if (req.method !== "POST") {
      return jsonResponse({ error: "method_not_allowed" }, 405);
    }

    const body = await req.json() as CompleteHostedRemoteRequestBody;
    const requestCode = requiredString(body.request_code, "request_code");
    const signingToken = requiredString(body.signing_token, "signing_token");
    const signatureId = requiredString(body.signature_id, "signature_id");
    const signature = body.signature;

    if (
      !signature || typeof signature !== "object" || Array.isArray(signature)
    ) {
      return jsonResponse({ error: "signature_required" }, 400);
    }

    const existing = await findRequestByToken(requestCode, signingToken);
    if (!existing) {
      return jsonResponse({ error: "remote_request_not_found" }, 404);
    }

    const request = await expireIfNeeded(existing);
    if (request.status === "expired") {
      return jsonResponse({ error: "remote_request_expired" }, 409);
    }
    if (request.status !== "pending") {
      return jsonResponse({ error: "remote_request_not_pending" }, 409);
    }

    const completedAt = new Date().toISOString();
    const { data, error } = await serviceClient()
      .from("remote_signing_requests")
      .update({
        status: "completed",
        completed_at: completedAt,
        completed_signature_id: signatureId,
        completed_signature_payload: signature,
        completed_ip_hash: await hashIp(req.headers.get("x-forwarded-for")),
        completed_user_agent: req.headers.get("user-agent"),
      })
      .eq("id", request.id)
      .eq("status", "pending")
      .select("*")
      .single();

    if (error) throw error;
    return jsonResponse({ request: sanitizeRequest(data) });
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "remote_signature_completion_failed";
    return jsonResponse({ error: message }, 400);
  }
});
