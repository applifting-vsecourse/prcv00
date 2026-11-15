import { api } from "@/lib/api-client"

import { quackSchema, type Quack, type QuackMood } from "@/features/quack/api/quackSchemas"

export async function addQuack(input: {
  text: string
  mood: QuackMood | null
  // Turns the quack into a question; null for a plain quack.
  poll: { options: string[] } | null
  // Makes it a reply to that quack; a reply is text only.
  parentId?: string
}): Promise<Quack> {
  const json = await api.post("quacks", { json: input }).json()
  return quackSchema.parse(json)
}
