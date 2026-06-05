import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getClient } from '@/src/db/initialize';
import { verifyChainHashFor } from './entry-hash';
import { createLogbookService } from './logbook-service';
import {
  ClassificationField,
  filterRecentValues,
  filterRecentHazards,
} from './classification';
import { scheduleCloudBackupAfterSigning } from '@/src/domain/cloud-backup/use-cloud-backup';
import {
  AddEntryAttachmentInput,
  AttachGearToEntryInput,
  CompleteRemoteSignatureRequestInput,
  CreateAmendmentInput,
  CreateEntryInput,
  CreateEntryTemplateInput,
  CreateRemoteSignatureRequestInput,
  EntrySignature,
  ExportLogbookOptions,
  LogbookEntry,
  RemoveGearFromEntryInput,
  SignEntryInput,
  UpdateDraftEntryInput,
} from './types';

export function useEntries() {
  return useQuery({
    queryKey: ['entries'],
    queryFn: () => createLogbookService(getClient()).listEntries(),
  });
}

// Pending, expiry-bearing remote requests — the change-signal the notification
// reconciler watches to (re)schedule "request expired" reminders.
export function useActiveRemoteSignatureRequests() {
  return useQuery({
    queryKey: ['activeRemoteSignatureRequests'],
    queryFn: () => createLogbookService(getClient()).listActiveRemoteSignatureRequests(),
  });
}

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: () => createLogbookService(getClient()).getDashboardSummary(),
  });
}

export function useCareerStats() {
  return useQuery({
    queryKey: ['careerStats'],
    queryFn: () => createLogbookService(getClient()).getCareerStats(),
  });
}

export function useEntryDetail(entryId: string | null) {
  return useQuery({
    enabled: Boolean(entryId),
    queryKey: ['entryDetail', entryId],
    queryFn: () => {
      if (!entryId) throw new Error('entry_id_required');
      return createLogbookService(getClient()).getEntryDetail(entryId);
    },
  });
}

// Entries that amend `entryId`. Powers the "Amended by …" lineage chip on the
// entry detail screen. Returns an empty array (not null) when none exist so
// the consumer can render unconditionally without nullable guards.
export function useAmendmentsOf(entryId: string | null) {
  return useQuery<LogbookEntry[]>({
    enabled: Boolean(entryId),
    queryKey: ['amendmentsOf', entryId],
    queryFn: () => {
      if (!entryId) throw new Error('entry_id_required');
      return createLogbookService(getClient()).listAmendmentsOf(entryId);
    },
  });
}

export function useRemoteSignatureRequestDetail(requestCode: string | null, signingToken?: string | null) {
  return useQuery({
    enabled: Boolean(requestCode && signingToken),
    queryKey: ['remoteSignatureRequest', requestCode, signingToken ?? null],
    queryFn: () => {
      if (!requestCode) throw new Error('remote_request_code_required');
      return createLogbookService(getClient()).getRemoteSignatureRequestDetail({
        request_code: requestCode,
        signing_token: signingToken,
        mark_viewed: true,
      });
    },
  });
}

export function useCreateEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEntryInput) => createLogbookService(getClient()).createDraft(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      queryClient.invalidateQueries({ queryKey: ['careerStats'] });
      queryClient.invalidateQueries({ queryKey: ['entryTemplates'] });
    },
  });
}

export function useUpdateDraftEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateDraftEntryInput) => createLogbookService(getClient()).updateDraft(input),
    onSuccess: (detail) => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      queryClient.invalidateQueries({ queryKey: ['careerStats'] });
      queryClient.invalidateQueries({ queryKey: ['entryDetail', detail.entry.id] });
    },
  });
}

export function useDeleteDraftEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (entryId: string) => createLogbookService(getClient()).deleteDraftEntry(entryId),
    onSuccess: ({ id }) => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      queryClient.invalidateQueries({ queryKey: ['careerStats'] });
      // Deleting a draft cascade-deletes its attachments — refresh the
      // cross-entry Attachments index so they don't linger there. (P3-3)
      queryClient.invalidateQueries({ queryKey: ['attachmentsAll'] });
      queryClient.removeQueries({ queryKey: ['entryDetail', id] });
    },
  });
}

export function useEntryTemplates() {
  return useQuery({
    queryKey: ['entryTemplates'],
    queryFn: () => createLogbookService(getClient()).listEntryTemplates(),
  });
}

export function useCreateEntryTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEntryTemplateInput) =>
      createLogbookService(getClient()).createEntryTemplate(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entryTemplates'] });
    },
  });
}

export function useSupervisorContacts() {
  return useQuery({
    queryKey: ['supervisorContacts'],
    queryFn: () => createLogbookService(getClient()).listSupervisorContacts(),
  });
}

export function useCreateAmendment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAmendmentInput) => createLogbookService(getClient()).createAmendmentDraft(input),
    onSuccess: (entry, input) => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      queryClient.invalidateQueries({ queryKey: ['careerStats'] });
      queryClient.invalidateQueries({ queryKey: ['entryDetail', input.entry_id] });
      queryClient.invalidateQueries({ queryKey: ['entryDetail', entry.id] });
      // The source entry's "Amended by …" chip needs to refresh.
      queryClient.invalidateQueries({ queryKey: ['amendmentsOf', input.entry_id] });
    },
  });
}

export function useSignEntryLocal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SignEntryInput) => createLogbookService(getClient()).signEntryLocal(input),
    onSuccess: (detail) => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      queryClient.invalidateQueries({ queryKey: ['careerStats'] });
      queryClient.invalidateQueries({ queryKey: ['supervisorContacts'] });
      queryClient.invalidateQueries({ queryKey: ['entryDetail', detail.entry.id] });
      queryClient.invalidateQueries({ queryKey: ['chainHead'] });
      // A new signature extends the chain → re-run the full-chain verification
      // the audit-export screen's "Chain valid" pill is gated on.
      queryClient.invalidateQueries({ queryKey: ['verifyFullChain'] });
      if (detail.entry.amends_entry_id) {
        queryClient.invalidateQueries({ queryKey: ['entryDetail', detail.entry.amends_entry_id] });
      }
      // New immutable signature → refresh the cloud safety net (debounced, gated).
      scheduleCloudBackupAfterSigning();
    },
  });
}

export function useCreateRemoteSignatureRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRemoteSignatureRequestInput) =>
      createLogbookService(getClient()).createRemoteSignatureRequest(input),
    onSuccess: (detail) => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      queryClient.invalidateQueries({ queryKey: ['supervisorContacts'] });
      queryClient.invalidateQueries({ queryKey: ['entryDetail', detail.entry.id] });
      queryClient.invalidateQueries({ queryKey: ['activeRemoteSignatureRequests'] });
    },
  });
}

export function useCancelRemoteSignatureRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (entryId: string) =>
      createLogbookService(getClient()).cancelRemoteSignatureRequest(entryId),
    onSuccess: (detail) => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      queryClient.invalidateQueries({ queryKey: ['entryDetail', detail.entry.id] });
      queryClient.invalidateQueries({ queryKey: ['activeRemoteSignatureRequests'] });
    },
  });
}

export function useCompleteRemoteSignatureRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CompleteRemoteSignatureRequestInput) =>
      createLogbookService(getClient()).completeRemoteSignatureRequest(input),
    onSuccess: (detail, input) => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      queryClient.invalidateQueries({ queryKey: ['careerStats'] });
      queryClient.invalidateQueries({ queryKey: ['supervisorContacts'] });
      queryClient.invalidateQueries({ queryKey: ['entryDetail', detail.entry.id] });
      queryClient.invalidateQueries({ queryKey: ['remoteSignatureRequest', input.request_code] });
      queryClient.invalidateQueries({ queryKey: ['activeRemoteSignatureRequests'] });
      queryClient.invalidateQueries({ queryKey: ['chainHead'] });
      // A new signature extends the chain → re-run the full-chain verification
      // the audit-export screen's "Chain valid" pill is gated on.
      queryClient.invalidateQueries({ queryKey: ['verifyFullChain'] });
      if (detail.entry.amends_entry_id) {
        queryClient.invalidateQueries({ queryKey: ['entryDetail', detail.entry.amends_entry_id] });
      }
      // Imported a completed remote signature → refresh the cloud safety net.
      scheduleCloudBackupAfterSigning();
    },
  });
}

export function useAttachGearToEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AttachGearToEntryInput) =>
      createLogbookService(getClient()).attachGearToEntry(input),
    onSuccess: (detail) => {
      queryClient.invalidateQueries({ queryKey: ['entryDetail', detail.entry.id] });
      queryClient.invalidateQueries({ queryKey: ['entries'] });
    },
  });
}

export function useRemoveGearFromEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RemoveGearFromEntryInput) =>
      createLogbookService(getClient()).removeGearFromEntry(input),
    onSuccess: (detail) => {
      queryClient.invalidateQueries({ queryKey: ['entryDetail', detail.entry.id] });
    },
  });
}

export function useAddEntryAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddEntryAttachmentInput) =>
      createLogbookService(getClient()).addEntryAttachment(input),
    onSuccess: (detail) => {
      queryClient.invalidateQueries({ queryKey: ['entryDetail', detail.entry.id] });
      // Keep the cross-entry Attachments index fresh after a new attachment. (P3-3)
      queryClient.invalidateQueries({ queryKey: ['attachmentsAll'] });
    },
  });
}

export function useExportLogbook() {
  return useMutation({
    mutationFn: (options: ExportLogbookOptions = {}) =>
      createLogbookService(getClient()).exportLogbook(options),
  });
}

export function useExportEntryPacket() {
  return useMutation({
    mutationFn: (entryId: string) => createLogbookService(getClient()).exportEntryPacket(entryId),
  });
}

export function useChainHead() {
  return useQuery({
    queryKey: ['chainHead'],
    queryFn: () => createLogbookService(getClient()).getLatestChainHash(),
  });
}

export function useAllAttachments() {
  return useQuery({
    queryKey: ['attachmentsAll'],
    queryFn: () => createLogbookService(getClient()).listAttachmentsWithEntry(),
  });
}

export function useEntryChainValid(
  entry: LogbookEntry | null | undefined,
  signature: EntrySignature | null | undefined,
) {
  const enabled = Boolean(entry && signature && signature.chain_hash);
  return useQuery<boolean>({
    enabled,
    queryKey: ['entryChainValid', entry?.id ?? null, signature?.id ?? null, signature?.hash_version ?? null],
    queryFn: () => {
      if (!entry || !signature) throw new Error('entry_and_signature_required');
      return verifyChainHashFor({ entry, signature });
    },
  });
}

export function useVerifyFullChain() {
  return useQuery({
    queryKey: ['verifyFullChain'],
    queryFn: () => createLogbookService(getClient()).verifyFullChain(),
    // Re-runs only when invalidated (the chain-extending sign / remote-complete
    // mutations invalidate ['verifyFullChain']) or on a cold remount after gcTime —
    // full-chain re-hashing is too costly to run on every render.
    staleTime: Infinity,
  });
}

const RECENTS_CAP = 8;

export function useRecentClassificationValues(field: ClassificationField) {
  return useQuery<string[]>({
    queryKey: ['recentClassification', field],
    queryFn: async () => {
      const raw = await createLogbookService(getClient()).listRecentClassificationValues(field);
      return filterRecentValues(field, raw, RECENTS_CAP);
    },
  });
}

export function useRecentHazardValues() {
  return useQuery<string[]>({
    queryKey: ['recentHazards'],
    queryFn: async () => {
      const raw = await createLogbookService(getClient()).listRecentHazardValues();
      return filterRecentHazards(raw, RECENTS_CAP);
    },
  });
}
