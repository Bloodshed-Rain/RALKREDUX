import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getClient } from '@/src/db/initialize';
import { buildRemoteSigningToken, createLogbookService } from '@/src/domain/logbook/logbook-service';
import { EntryDetail, RemoteSignatureRequest } from '@/src/domain/logbook/types';
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
