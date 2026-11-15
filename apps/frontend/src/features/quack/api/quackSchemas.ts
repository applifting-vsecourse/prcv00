import { z } from "zod"

import { quackMoodSchema } from "@/lib/moods"

// Per the Applifting frontend playbook: validate every server payload with zod
// and infer types from the schema rather than auto-generating them.
export const quackUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  username: z.string(),
})

export const pollOptionSchema = z.object({
  id: z.string(),
  text: z.string(),
  votes: z.number().int().nonnegative(),
})

export const pollSchema = z.object({
  id: z.string(),
  isClosed: z.boolean(),
  // In the order the author wrote them; votes never reorder them.
  options: z.array(pollOptionSchema),
  totalVotes: z.number().int().nonnegative(),
  // The signed-in user's own vote. Nobody else's is ever sent.
  myOptionId: z.string().nullable(),
})

// A quack that starts a conversation, or a reply (parentId set). A deleted
// quack that still has replies comes back as a placeholder: isDeleted, with
// no text, author, mood or poll (docs/adr/0002).
export const quackSchema = z.object({
  id: z.string(),
  text: z.string().nullable(),
  mood: quackMoodSchema.nullable(),
  userId: z.string().nullable(),
  createdAt: z.coerce.date(),
  user: quackUserSchema.nullable(),
  poll: pollSchema.nullable(),
  isDeleted: z.boolean(),
  parentId: z.string().nullable(),
  // The conversation a reply belongs to; user is null when its start was deleted.
  root: z.object({ id: z.string(), user: quackUserSchema.nullable() }).nullable(),
  // Who a reply answers; null for a conversation start or a deleted parent.
  replyTo: quackUserSchema.nullable(),
  // Replies in the conversation this quack starts, deleted ones not counted.
  replyCount: z.number().int().nonnegative(),
})

export const quacksSchema = z.array(quackSchema)

export type Quack = z.infer<typeof quackSchema>
export type QuackUser = z.infer<typeof quackUserSchema>
export type Poll = z.infer<typeof pollSchema>
export type { QuackMood } from "@/lib/moods"
