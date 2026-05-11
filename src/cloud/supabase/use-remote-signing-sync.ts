import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { getClient } from '@/src/db/initialize';
import { buildRemoteSigningToken, createLogbookService } from '@/src/domain/logbook/logbook-service';
import { EntryDetail, RemoteSignatureRequest } from '@/src/domain/logbook/types';
import { isSupabaseConfigured } from './client';
import { fetchHostedRemoteSigningRequest, hostedCompletionInputFromDetail } from './remote-signing';

type HostedCompletionImportResult =
  | { imported: true; detail: EntryDetail }
  | { imported: false; reason: 'not_completed' | 'missing_signature' | 'import_failed' };

export async function importHostedRemoteSignatureCompletion(
  request: RemoteSignatureRequest,
): Promise<HostedCompletionImportResult> {
  const signingToken = buildRemoteSigningToken(request);
  const hosted = await fetchHostedRemoteSigningRequest(request.request_code, signingToken);
  if (!hosted || hosted.request.status !== 'completed') {
    return { imported: false, reason: 'not_completed' };
  }

  const input = hostedCompletionInputFromDetail(hosted, signingToken);
  if (!input) return { imported: false, reason: 'missing_signature' };

  try {
    const detail = await createLogbookService(getClient()).completeRemoteSignatureRequest(input);
    return { imported: true, detail };
  } catch {
    return { imported: false, reason: 'import_failed' };
  }
}

export function useImportHostedRemoteSignatureCompletion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: importHostedRemoteSignatureCompletion,
    onSuccess: (result, request) => {
      if (!result.imported) return;

      queryClient.invalidateQueries({ queryKey: ['entries'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      queryClient.invalidateQueries({ queryKey: ['careerStats'] });
      queryClient.invalidateQueries({ queryKey: ['supervisorContacts'] });
      queryClient.invalidateQueries({ queryKey: ['entryDetail', result.detail.entry.id] });
      queryClient.invalidateQueries({ queryKey: ['remoteSignatureRequest', request.request_code] });
      if (result.detail.entry.amends_entry_id) {
        queryClient.invalidateQueries({ queryKey: ['entryDetail', result.detail.entry.amends_entry_id] });
      }
    },
  });
}

const POLL_INTERVAL_MS = 5000;
const MAX_CONSECUTIVE_FAILURES = 3;

export function shouldAutoSyncHostedRemoteSignature(
  detail: EntryDetail | null | undefined,
  options: { supabaseConfigured: boolean; now?: number },
): boolean {
  if (!options.supabaseConfigured) return false;
  if (!detail) return false;
  if (detail.entry.status !== 'draft') return false;
  const request = detail.remote_request;
  if (!request) return false;
  if (request.status !== 'pending') return false;
  if (request.expires_at) {
    const expiresAtMs = Date.parse(request.expires_at);
    const nowMs = options.now ?? Date.now();
    if (Number.isFinite(expiresAtMs) && expiresAtMs <= nowMs) return false;
  }
  return true;
}

export function useAutoSyncHostedRemoteSignature(detail: EntryDetail | null | undefined): void {
  const { mutateAsync } = useImportHostedRemoteSignatureCompletion();
  const shouldPoll = shouldAutoSyncHostedRemoteSignature(detail, {
    supabaseConfigured: isSupabaseConfigured(),
  });
  const remoteRequest = shouldPoll ? detail?.remote_request ?? null : null;
  const requestCode = remoteRequest?.request_code ?? null;

  useFocusEffect(
    React.useCallback(() => {
      if (!shouldPoll || !remoteRequest) return undefined;

      let cancelled = false;
      let inFlight = false;
      let failureCount = 0;
      let intervalId: ReturnType<typeof setInterval> | null = null;

      const stop = () => {
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      };

      const tick = async () => {
        if (cancelled || inFlight) return;
        inFlight = true;
        try {
          const result = await mutateAsync(remoteRequest);
          if (cancelled) return;
          if (result.imported || result.reason === 'not_completed') {
            failureCount = 0;
          } else {
            failureCount += 1;
          }
        } catch {
          if (!cancelled) failureCount += 1;
        } finally {
          inFlight = false;
        }

        if (failureCount >= MAX_CONSECUTIVE_FAILURES) {
          stop();
        }
      };

      void tick();
      intervalId = setInterval(tick, POLL_INTERVAL_MS);

      return () => {
        cancelled = true;
        stop();
      };
    }, [shouldPoll, requestCode, mutateAsync]),
  );
}
