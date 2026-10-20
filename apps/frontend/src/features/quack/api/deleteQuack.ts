import { api, HTTPError } from "@/lib/api-client"

export async function deleteQuack(quackId: string): Promise<void> {
  try {
    await api.delete(`quacks/${encodeURIComponent(quackId)}`)
  } catch (error) {
    // Already gone (e.g. deleted from another tab): that's what was wanted.
    if (error instanceof HTTPError && error.response.status === 404) return
    throw error
  }
}
