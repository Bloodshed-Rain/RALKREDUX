import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getClient } from '@/src/db/initialize';
import { createGearService } from './gear-service';
import { CreateGearItemInput, GearCategory, RecordGearInspectionInput } from './types';

export function useGearItems() {
  return useQuery({
    queryKey: ['gearItems'],
    queryFn: () => createGearService(getClient()).listGearItems(),
  });
}

export function useGearSummary() {
  return useQuery({
    queryKey: ['gearSummary'],
    queryFn: () => createGearService(getClient()).getGearSummary(),
  });
}

export function useGearCatalogSearch(query: string, category: GearCategory | null) {
  return useQuery({
    enabled: query.trim().length >= 2,
    queryKey: ['gearCatalog', 'search', category, query.trim().toLowerCase()],
    queryFn: () =>
      createGearService(getClient()).searchGearCatalog({
        query,
        category,
      }),
    staleTime: 60 * 60 * 1000,
  });
}

export function useCreateGearItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateGearItemInput) => createGearService(getClient()).createGearItem(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gearItems'] });
      queryClient.invalidateQueries({ queryKey: ['gearSummary'] });
    },
  });
}

export function useRecordGearInspection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RecordGearInspectionInput) =>
      createGearService(getClient()).recordInspection(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gearItems'] });
      queryClient.invalidateQueries({ queryKey: ['gearSummary'] });
    },
  });
}
