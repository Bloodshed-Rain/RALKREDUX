import { createClient } from "@supabase/supabase-js";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export type RemoteSigningStatus =
  | "pending"
  | "completed"
  | "cancelled"
  | "expired";

export type RemoteSigningRow = {
  id: string;
  owner_id: string | null;
  local_request_id: string;
  local_entry_id: string;
  request_code: string;
  recipient_name: string;
  recipient_contact: string | null;
  verifier_role: string | null;
  verifier_company: string | null;
  entry_payload: Record<string, unknown>;
  entry_hash: string;
  hash_version: number;
  signing_token_hash: string;
  token_hint: string | null;
  status: RemoteSigningStatus;
  expires_at: string;
  viewed_at: string | null;
  completed_at: string | null;
  completed_signature_payload: Record<string, unknown> | null;
  completed_signature_id: string | null;
  created_at: string;
  updated_at: string;
};

export const ENTRY_HASH_VERSION = 2;

type JsonValue = string | number | boolean | null | JsonValue[] | {
  [key: string]: JsonValue;
};

function stableStringify(value: JsonValue): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${
      Object.keys(value).sort().map((key) => {
        const objectValue = value as { [key: string]: JsonValue };
        return `${JSON.stringify(key)}:${stableStringify(objectValue[key])}`;
      }).join(",")
    }}`;
  }

  return JSON.stringify(value);
}

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function numberField(entry: Record<string, unknown>, key: string): number {
  const value = entry[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${key}_invalid`);
  }
  return value;
}

function nullableStringField(
  entry: Record<string, unknown>,
  key: string,
): string | null {
  const value = entry[key];
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") throw new Error(`${key}_invalid`);
  return value;
}

function stringField(entry: Record<string, unknown>, key: string): string {
  const value = entry[key];
  if (typeof value !== "string") throw new Error(`${key}_invalid`);
  return value;
}

export function canonicalizeEntryPayload(
  entry: Record<string, unknown>,
): string {
  const maxHeight = entry.max_height === null
    ? null
    : Number(numberField(entry, "max_height").toFixed(2));

  return stableStringify({
    entry: {
      amends_entry_id: nullableStringField(entry, "amends_entry_id"),
      client: stringField(entry, "client"),
      date_from: stringField(entry, "date_from"),
      date_to: stringField(entry, "date_to"),
      description: stringField(entry, "description"),
      employer: stringField(entry, "employer"),
      access_method: stringField(entry, "access_method"),
      height_unit: stringField(entry, "height_unit"),
      id: stringField(entry, "id"),
      irata_level_snapshot: nullableStringField(entry, "irata_level_snapshot"),
      max_height: maxHeight,
      site: stringField(entry, "site"),
      sprat_level_snapshot: nullableStringField(entry, "sprat_level_snapshot"),
      structure_type: stringField(entry, "structure_type"),
      work_task: stringField(entry, "work_task"),
      work_hours: Number(numberField(entry, "work_hours").toFixed(2)),
    },
    schema: "ralb.logbook.entry",
    version: ENTRY_HASH_VERSION,
  });
}

export async function hashEntryPayload(
  entry: Record<string, unknown>,
): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonicalizeEntryPayload(entry)),
  );
  return toHex(digest);
}

export async function hashRemoteSigningToken(token: string): Promise<string> {
  const payload = stableStringify({
    schema: "ralb.remote-signing-token",
    token,
    version: 1,
  });
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(payload),
  );
  return toHex(digest);
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

export function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

export function serviceClient() {
  return createClient(
    requireEnv("SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

export async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;

  const client = createClient(
    requireEnv("SUPABASE_URL"),
    requireEnv("SUPABASE_ANON_KEY"),
    {
      global: { headers: { Authorization: authHeader } },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );

  const { data, error } = await client.auth.getUser();
  if (error) return null;
  return data.user;
}

export function sanitizeRequest(row: RemoteSigningRow) {
  return {
    id: row.id,
    local_request_id: row.local_request_id,
    local_entry_id: row.local_entry_id,
    request_code: row.request_code,
    recipient_name: row.recipient_name,
    recipient_contact: row.recipient_contact,
    verifier_role: row.verifier_role,
    verifier_company: row.verifier_company,
    entry: row.entry_payload,
    entry_hash: row.entry_hash,
    hash_version: row.hash_version,
    token_hint: row.token_hint,
    status: row.status,
    expires_at: row.expires_at,
    viewed_at: row.viewed_at,
    completed_at: row.completed_at,
    completed_signature_id: row.completed_signature_id,
    completed_signature: row.completed_signature_payload,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function findRequestByToken(
  requestCode: string,
  token: string,
): Promise<RemoteSigningRow | null> {
  const tokenHash = await hashRemoteSigningToken(token.trim());
  const { data, error } = await serviceClient()
    .from("remote_signing_requests")
    .select("*")
    .eq("request_code", requestCode.trim().toUpperCase())
    .eq("signing_token_hash", tokenHash)
    .maybeSingle();

  if (error) throw error;
  return data as RemoteSigningRow | null;
}

export async function expireIfNeeded(
  row: RemoteSigningRow,
): Promise<RemoteSigningRow> {
  if (
    row.status !== "pending" || new Date(row.expires_at).getTime() >= Date.now()
  ) {
    return row;
  }

  const { data, error } = await serviceClient()
    .from("remote_signing_requests")
    .update({ status: "expired" })
    .eq("id", row.id)
    .eq("status", "pending")
    .select("*")
    .single();

  if (error) throw error;
  return data as RemoteSigningRow;
}
