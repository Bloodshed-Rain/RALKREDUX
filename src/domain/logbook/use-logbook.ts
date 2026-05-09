import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getClient } from '@/src/db/initialize';
import { createLogbookService } from './logbook-service';
import {
  AddEntryAttachmentInput,
  AttachGearToEntryInput,
  CompleteRemoteSignatureRequestInput,
  CreateAmendmentInput,
  CreateEntryInput,
  CreateEntryTemplateInput,
  CreateRemoteSignatureRequestInput,
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
      if (detail.entry.amends_entry_id) {
        queryClient.invalidateQueries({ queryKey: ['entryDetail', detail.entry.amends_entry_id] });
      }
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
      if (detail.entry.amends_entry_id) {
        queryClient.invalidateQueries({ queryKey: ['entryDetail', detail.entry.amends_entry_id] });
      }
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
    },
  });
}

export function useExportLogbook() {
  return useMutation({
    mutationFn: () => createLogbookService(getClient()).exportLogbook(),
  });
}

export function useExportLogbookCsv() {
  return useMutation({
    mutationFn: () => createLogbookService(getClient()).exportLogbookCsv(),
  });
}

export function useExportEntryPacket() {
  return useMutation({
    mutationFn: (entryId: string) => createLogbookService(getClient()).exportEntryPacket(entryId),
  });
}
