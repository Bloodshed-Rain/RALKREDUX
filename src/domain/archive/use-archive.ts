import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getClient } from '@/src/db/initialize';
import { createArchiveService } from './archive-service';
import { CreateArchiveInput, UpdateArchiveInput } from './types';

export function useArchives() {
  return useQuery({
    queryKey: ['archives'],
    queryFn: () => createArchiveService(getClient()).listArchives(),
  });
}

export function useArchive(id: string) {
  return useQuery({
    queryKey: ['archives', id],
    queryFn: () => createArchiveService(getClient()).getArchive(id),
    enabled: !!id,
  });
}

export function useCreateArchive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateArchiveInput) => createArchiveService(getClient()).createArchive(input),
    onSuccess: (archive) => {
      queryClient.invalidateQueries({ queryKey: ['archives'] });
      queryClient.setQueryData(['archives', archive.id], archive);
    },
  });
}

export function useUpdateArchive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateArchiveInput }) =>
      createArchiveService(getClient()).updateArchive(id, input),
    onSuccess: (archive) => {
      queryClient.invalidateQueries({ queryKey: ['archives'] });
      queryClient.setQueryData(['archives', archive.id], archive);
    },
  });
}

export function useDeleteArchive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => createArchiveService(getClient()).deleteArchive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archives'] });
    },
  });
}
