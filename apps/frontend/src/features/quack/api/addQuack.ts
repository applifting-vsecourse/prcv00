import { api } from "@/lib/api-client"

import { quackSchema, type Quack, type QuackMood } from "@/features/quack/api/quackSchemas"

export async function addQuack(input: {
  text: string
  mood: QuackMood | null
  // Turns the quack into a question; null for a plain quack.
  poll: { options: string[] } | null
}): Promise<Quack> {
  const json = await api.post("quacks", { json: input }).json()
  return quackSchema.parse(json)
}
