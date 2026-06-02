import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getClient } from '@/src/db/initialize';
import { createProfileService } from './profile-service';
import { CreateProfileInput, UpdateProfileInput } from './types';

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: () => createProfileService(getClient()).getProfile(),
  });
}

export function useCreateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProfileInput) => createProfileService(getClient()).createProfile(input),
    onSuccess: (profile) => {
      queryClient.setQueryData(['profile'], profile);
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProfileInput) =>
      createProfileService(getClient()).updateProfile(input),
    onSuccess: (profile) => {
      queryClient.setQueryData(['profile'], profile);
    },
  });
}

export function useUpdateAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (avatarUri: string | null) =>
      createProfileService(getClient()).updateAvatar(avatarUri),
    onSuccess: (profile) => {
      queryClient.setQueryData(['profile'], profile);
    },
  });
}

