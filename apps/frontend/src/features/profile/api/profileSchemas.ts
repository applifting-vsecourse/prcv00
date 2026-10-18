import { z } from "zod"

import { quackMoodSchema } from "@/lib/moods"

export const profileSchema = z.object({
  username: z.string(),
  name: z.string(),
  bio: z.string().nullable(),
  defaultQuackMood: quackMoodSchema.nullable(),
})

export type Profile = z.infer<typeof profileSchema>
