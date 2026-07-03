import "@supabase/functions-js/edge-runtime.d.ts";
import {
  corsHeaders,
  getAuthenticatedUser,
  jsonResponse,
  serviceClient,
} from "../_shared/remote-signing.ts";

// Mirrors CLOUD_BACKUP_BUCKET in src/cloud/supabase/backup-cloud.ts.
const CLOUD_BACKUP_BUCKET = "logbook-backups";

// The client must echo this literal so a stray/buggy call can never delete an
// account by accident. App Store guideline 5.1.1(v) requires in-app deletion;
// this function is its server side.
const CONFIRM_PHRASE = "delete_my_account";

type DeleteAccountBody = {
  confirm?: string;
};

/**
 * Remove every object under the user's prefix in the private backup bucket.
 * Backup blobs live flat at `${owner_id}/${timestamp}.json`; loop in pages so
 * an account with >100 snapshots is still fully cleared.
 */
async function deleteBackupObjects(userId: string): Promise<void> {
  const storage = serviceClient().storage.from(CLOUD_BACKUP_BUCKET);
  for (;;) {
    const { data, error } = await storage.list(userId, { limit: 100 });
    if (error) throw error;
    if (!data || data.length === 0) return;

    const paths = data.map((object) => `${userId}/${object.name}`);
    const { error: removeError } = await storage.remove(paths);
    if (removeError) throw removeError;

    if (data.length < 100) return;
  }
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

    const body = await req.json().catch(() => ({})) as DeleteAccountBody;
    if (body.confirm !== CONFIRM_PHRASE) {
      return jsonResponse({ error: "confirmation_required" }, 400);
    }

    const service = serviceClient();

    // Explicitly clear owned rows first. The FKs cascade from auth.users, but
    // doing it here keeps the function correct even if a future table forgets
    // the cascade, and guarantees storage is empty before the user vanishes.
    const { error: signingError } = await service
      .from("remote_signing_requests")
      .delete()
      .eq("owner_id", user.id);
    if (signingError) throw signingError;

    const { error: backupRowsError } = await service
      .from("logbook_backups")
      .delete()
      .eq("owner_id", user.id);
    if (backupRowsError) throw backupRowsError;

    await deleteBackupObjects(user.id);

    const { error: deleteUserError } = await service.auth.admin.deleteUser(
      user.id,
    );
    if (deleteUserError) throw deleteUserError;

    return jsonResponse({ ok: true });
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "account_deletion_failed";
    return jsonResponse({ error: message }, 400);
  }
});
