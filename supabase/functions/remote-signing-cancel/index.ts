import "@supabase/functions-js/edge-runtime.d.ts";
import {
  corsHeaders,
  expireIfNeeded,
  getAuthenticatedUser,
  jsonResponse,
  RemoteSigningRow,
  sanitizeRequest,
  serviceClient,
} from "../_shared/remote-signing.ts";

type CancelHostedRemoteRequestBody = {
  request_code?: string;
};

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label}_required`);
  }
  return value.trim();
}

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    if (req.method !== "POST") {
      return jsonResponse({ error: "method_not_allowed" }, 405);
    }

    const user = await getAuthenticatedUser(req);
    if (!user) return jsonResponse({ error: "auth_required" }, 401);

    const body = await req.json() as CancelHostedRemoteRequestBody;
    const requestCode = requiredString(body.request_code, "request_code")
      .toUpperCase();

    const { data: existing, error: findError } = await serviceClient()
      .from("remote_signing_requests")
      .select("*")
      .eq("request_code", requestCode)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (findError) throw findError;
    if (!existing) {
      return jsonResponse({ error: "remote_request_not_found" }, 404);
    }

    const row = await expireIfNeeded(existing as RemoteSigningRow);

    if (row.status === "cancelled") {
      return jsonResponse({ request: sanitizeRequest(row) });
    }
    if (row.status !== "pending") {
      return jsonResponse({ error: "remote_request_not_cancellable" }, 409);
    }

    const { data, error } = await serviceClient()
      .from("remote_signing_requests")
      .update({ status: "cancelled" })
      .eq("id", row.id)
      .eq("owner_id", user.id)
      .eq("status", "pending")
      .select("*")
      .single();

    if (error) throw error;
    return jsonResponse({ request: sanitizeRequest(data as RemoteSigningRow) });
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "remote_signature_cancellation_failed";
    return jsonResponse({ error: message }, 400);
  }
});
