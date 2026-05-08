import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getClient } from '@/src/db/initialize';
import { createLogbookService } from './logbook-service';
import { CreateAmendmentInput, CreateEntryInput, CreateRemoteSignatureRequestInput, SignEntryInput } from './types';

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

export function useCreateEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEntryInput) => createLogbookService(getClient()).createDraft(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
    },
  });
}

export function useCreateAmendment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAmendmentInput) => createLogbookService(getClient()).createAmendmentDraft(input),
    onSuccess: (entry, input) => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
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
      queryClient.invalidateQueries({ queryKey: ['entryDetail', detail.entry.id] });
    },
  });
}
