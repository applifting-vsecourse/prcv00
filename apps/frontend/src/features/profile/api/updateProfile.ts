import { api, HTTPError } from "@/lib/api-client"

import { UsernameTakenError } from "@/features/profile/api/profileErrors"
import { profileSchema, type Profile } from "@/features/profile/api/profileSchemas"

export async function updateProfile(input: Profile): Promise<Profile> {
  // A 409 becomes UsernameTakenError, so the form can put the message under
  // the username field without knowing about HTTP.
  try {
    return profileSchema.parse(await api.put("profile", { json: input }).json())
  } catch (error) {
    if (error instanceof HTTPError && error.response.status === 409) {
      throw new UsernameTakenError()
    }
    throw error
  }
}
