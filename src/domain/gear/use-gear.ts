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

export function useGearItemDetail(gearId: string | null | undefined) {
  return useQuery({
    enabled: !!gearId,
    queryKey: ['gearItem', gearId],
    queryFn: () => createGearService(getClient()).getGearItemDetailById(gearId!),
  });
}

export function useGearInspections(gearId: string | null | undefined, limit = 8) {
  return useQuery({
    enabled: !!gearId,
    queryKey: ['gearInspections', gearId, limit],
    queryFn: () => createGearService(getClient()).listInspectionsForGear(gearId!, limit),
  });
}

export function useGearCatalogSearch(
  query: string,
  category: GearCategory | null,
  limit?: number,
) {
  const trimmed = query.trim();
  // Fire when EITHER the query is long enough OR a category is picked —
  // the catalog browser uses the category-only path to list a slice of
  // the seeded catalog while empty-search browsing.
  return useQuery({
    enabled: trimmed.length >= 2 || Boolean(category),
    queryKey: ['gearCatalog', 'search', category, trimmed.toLowerCase(), limit ?? null],
    queryFn: () =>
      createGearService(getClient()).searchGearCatalog({
        query,
        category,
        limit,
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
    onSuccess: (detail) => {
      queryClient.invalidateQueries({ queryKey: ['gearItems'] });
      queryClient.invalidateQueries({ queryKey: ['gearSummary'] });
      queryClient.invalidateQueries({ queryKey: ['gearItem', detail.item.id] });
      queryClient.invalidateQueries({ queryKey: ['gearInspections', detail.item.id] });
    },
  });
}
