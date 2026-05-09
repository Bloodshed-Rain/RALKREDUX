import "@supabase/functions-js/edge-runtime.d.ts";
import {
  corsHeaders,
  expireIfNeeded,
  findRequestByToken,
  getAuthenticatedUser,
  hashRemoteSigningToken,
  jsonResponse,
  sanitizeRequest,
  serviceClient,
} from "../_shared/remote-signing.ts";

type CreateHostedRemoteRequestBody = {
  local_request_id?: string;
  local_entry_id?: string;
  request_code?: string;
  recipient_name?: string;
  recipient_contact?: string | null;
  verifier_role?: string | null;
  verifier_company?: string | null;
  entry?: Record<string, unknown>;
  entry_hash?: string;
  hash_version?: number;
  signing_token?: string;
  expires_at?: string;
};

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label}_required`);
  }
  return value.trim();
}

async function createHostedRequest(req: Request): Promise<Response> {
  const user = await getAuthenticatedUser(req);
  if (!user) return jsonResponse({ error: "auth_required" }, 401);

  const body = await req.json() as CreateHostedRemoteRequestBody;
  const localRequestId = requiredString(
    body.local_request_id,
    "local_request_id",
  );
  const requestCode = requiredString(body.request_code, "request_code")
    .toUpperCase();
  const signingToken = requiredString(body.signing_token, "signing_token");
  const entry = body.entry;

  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    return jsonResponse({ error: "entry_required" }, 400);
  }

  const expiresAt = requiredString(body.expires_at, "expires_at");
  if (Number.isNaN(new Date(expiresAt).getTime())) {
    return jsonResponse({ error: "expires_at_invalid" }, 400);
  }
  if (!Number.isInteger(body.hash_version) || Number(body.hash_version) < 1) {
    return jsonResponse({ error: "hash_version_invalid" }, 400);
  }

  const { data, error } = await serviceClient()
    .from("remote_signing_requests")
    .upsert({
      owner_id: user.id,
      local_request_id: localRequestId,
      local_entry_id: requiredString(body.local_entry_id, "local_entry_id"),
      request_code: requestCode,
      recipient_name: requiredString(body.recipient_name, "recipient_name"),
      recipient_contact: body.recipient_contact?.trim() || null,
      verifier_role: body.verifier_role?.trim() || null,
      verifier_company: body.verifier_company?.trim() || null,
      entry_payload: entry,
      entry_hash: requiredString(body.entry_hash, "entry_hash"),
      hash_version: Number(body.hash_version),
      signing_token_hash: await hashRemoteSigningToken(signingToken),
      token_hint: signingToken.slice(-6),
      status: "pending",
      expires_at: expiresAt,
    }, { onConflict: "owner_id,local_request_id" })
    .select("*")
    .single();

  if (error) throw error;
  return jsonResponse({ request: sanitizeRequest(data) }, 201);
}

async function readHostedRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const requestCode = requiredString(url.searchParams.get("code"), "code");
  const token = requiredString(url.searchParams.get("token"), "token");
  const row = await findRequestByToken(requestCode, token);
  if (!row) return jsonResponse({ error: "remote_request_not_found" }, 404);

  const request = await expireIfNeeded(row);
  if (request.status === "pending" && !request.viewed_at) {
    const { data, error } = await serviceClient()
      .from("remote_signing_requests")
      .update({ viewed_at: new Date().toISOString() })
      .eq("id", request.id)
      .is("viewed_at", null)
      .select("*")
      .single();

    if (error) throw error;
    return jsonResponse({ request: sanitizeRequest(data) });
  }

  return jsonResponse({ request: sanitizeRequest(request) });
}

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    if (req.method === "POST") return await createHostedRequest(req);
    if (req.method === "GET") return await readHostedRequest(req);
    return jsonResponse({ error: "method_not_allowed" }, 405);
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "remote_request_failed";
    return jsonResponse({ error: message }, 400);
  }
});
