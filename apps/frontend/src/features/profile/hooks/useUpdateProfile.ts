import { useMutation, useQueryClient } from "@tanstack/react-query"

import { profileKeys } from "@/features/profile/api/profileKeys"
import { updateProfile } from "@/features/profile/api/updateProfile"

export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateProfile,
    onSuccess: async (profile) => {
      queryClient.setQueryData(profileKeys.mine(), profile)
      // The name and @username appear in the header menu and on every quack,
      // so refresh everything rather than listing (and missing) those queries.
      await queryClient.invalidateQueries()
    },
  })
}
