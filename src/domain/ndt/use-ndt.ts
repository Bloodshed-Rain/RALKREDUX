import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getClient } from '@/src/db/initialize';
import { createNdtService } from './ndt-service';
import { scheduleCloudBackupAfterSigning } from '@/src/domain/cloud-backup/use-cloud-backup';
import {
  CompleteNdtRemoteRequestInput,
  CreateNdtInspectionInput,
  CreateNdtRemoteRequestInput,
  SignNdtInspectionInput,
  UpdateNdtInspectionInput,
} from './types';

// ─── Queries ─────────────────────────────────────────────────────────────────

export function useNdtInspections() {
  return useQuery({
    queryKey: ['ndtInspections'],
    queryFn: () => createNdtService(getClient()).listInspections(),
  });
}

export function useNdtInspectionDetail(id: string | null) {
  return useQuery({
    enabled: Boolean(id),
    queryKey: ['ndtInspectionDetail', id],
    queryFn: () => {
      if (!id) throw new Error('ndt_id_required');
      return createNdtService(getClient()).getInspectionDetail(id);
    },
  });
}

export function useNdtSummary() {
  return useQuery({
    queryKey: ['ndtSummary'],
    queryFn: () => createNdtService(getClient()).getSummary(),
  });
}

export function useNdtRemoteRequestDetail(requestCode: string | null, signingToken?: string | null) {
  return useQuery({
    enabled: Boolean(requestCode && signingToken),
    queryKey: ['ndtRemoteRequest', requestCode, signingToken ?? null],
    queryFn: () => {
      if (!requestCode) throw new Error('remote_request_code_required');
      return createNdtService(getClient()).getRemoteRequestDetail({
        request_code: requestCode,
        signing_token: signingToken,
        mark_viewed: true,
      });
    },
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateNdtInspection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateNdtInspectionInput) =>
      createNdtService(getClient()).createInspection(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ndtInspections'] });
      queryClient.invalidateQueries({ queryKey: ['ndtSummary'] });
    },
  });
}

export function useUpdateNdtInspection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateNdtInspectionInput) =>
      createNdtService(getClient()).updateInspection(input),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['ndtInspections'] });
      queryClient.invalidateQueries({ queryKey: ['ndtSummary'] });
      queryClient.invalidateQueries({ queryKey: ['ndtInspectionDetail', result.id] });
    },
  });
}

export function useDeleteNdtInspection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => createNdtService(getClient()).deleteInspection(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['ndtInspections'] });
      queryClient.invalidateQueries({ queryKey: ['ndtSummary'] });
      queryClient.removeQueries({ queryKey: ['ndtInspectionDetail', id] });
    },
  });
}

export function useMarkNdtLogged() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => createNdtService(getClient()).markLogged(id),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['ndtInspections'] });
      queryClient.invalidateQueries({ queryKey: ['ndtSummary'] });
      queryClient.invalidateQueries({ queryKey: ['ndtInspectionDetail', result.id] });
    },
  });
}

export function useSignNdtLocal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SignNdtInspectionInput) =>
      createNdtService(getClient()).signNdtLocal(input),
    onSuccess: (detail) => {
      queryClient.invalidateQueries({ queryKey: ['ndtInspections'] });
      queryClient.invalidateQueries({ queryKey: ['ndtSummary'] });
      queryClient.invalidateQueries({ queryKey: ['ndtInspectionDetail', detail.inspection.id] });
      // New immutable NDT signature → refresh the cloud safety net (debounced, gated).
      scheduleCloudBackupAfterSigning();
    },
  });
}

export function useCreateNdtRemoteRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateNdtRemoteRequestInput) =>
      createNdtService(getClient()).createRemoteRequest(input),
    onSuccess: (detail) => {
      queryClient.invalidateQueries({ queryKey: ['ndtInspections'] });
      queryClient.invalidateQueries({ queryKey: ['ndtSummary'] });
      queryClient.invalidateQueries({ queryKey: ['ndtInspectionDetail', detail.inspection.id] });
    },
  });
}

export function useCancelNdtRemoteRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (inspectionId: string) =>
      createNdtService(getClient()).cancelRemoteRequest(inspectionId),
    onSuccess: (detail) => {
      queryClient.invalidateQueries({ queryKey: ['ndtInspections'] });
      queryClient.invalidateQueries({ queryKey: ['ndtSummary'] });
      queryClient.invalidateQueries({ queryKey: ['ndtInspectionDetail', detail.inspection.id] });
    },
  });
}

export function useCompleteNdtRemoteRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CompleteNdtRemoteRequestInput) =>
      createNdtService(getClient()).completeRemoteRequest(input),
    onSuccess: (detail, input) => {
      queryClient.invalidateQueries({ queryKey: ['ndtInspections'] });
      queryClient.invalidateQueries({ queryKey: ['ndtSummary'] });
      queryClient.invalidateQueries({ queryKey: ['ndtInspectionDetail', detail.inspection.id] });
      queryClient.invalidateQueries({ queryKey: ['ndtRemoteRequest', input.request_code] });
      // Imported a completed remote NDT signature → refresh the cloud safety net.
      scheduleCloudBackupAfterSigning();
    },
  });
}
