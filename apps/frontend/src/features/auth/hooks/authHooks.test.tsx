import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { authKeys } from "@/lib/auth-keys"

import { authSessionQueryOptions } from "@/features/auth/api/authSessionQueryOptions"
import { useSignIn } from "@/features/auth/hooks/useSignIn"
import { useSignUp } from "@/features/auth/hooks/useSignUp"
import { authClient } from "@/features/auth/lib/auth-client"

vi.mock("@/features/auth/lib/auth-client", () => ({
  authClient: {
    getSession: vi.fn(),
    signIn: { email: vi.fn() },
    signUp: { email: vi.fn() },
  },
}))

const signedOut = { data: null, error: null }
const signedIn = {
  data: { user: { id: "u1", email: "duck@example.com", name: "Duck", username: "duck" } },
  error: null,
}

const wrapperFor = (queryClient: QueryClient) =>
  function QueryWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }

beforeEach(() => {
  vi.mocked(authClient.getSession).mockReset()
  vi.mocked(authClient.signIn.email).mockReset()
  vi.mocked(authClient.signUp.email).mockReset()
})

describe("useSignIn", () => {
  // The login page is the situation: the session is cached as signed out,
  // but no component on the page is watching it.
  it("refreshes the session even when nothing on the page uses it", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    vi.mocked(authClient.getSession).mockResolvedValueOnce(signedOut)
    await queryClient.prefetchQuery(authSessionQueryOptions())
    expect(queryClient.getQueryData(authKeys.session())).toBeNull()

    vi.mocked(authClient.signIn.email).mockResolvedValue({ data: {}, error: null })
    vi.mocked(authClient.getSession).mockResolvedValue(signedIn)
    const { result } = renderHook(() => useSignIn(), { wrapper: wrapperFor(queryClient) })

    await result.current.mutateAsync({ email: "duck@example.com", password: "password1" })

    await waitFor(() =>
      expect(queryClient.getQueryData(authKeys.session())).toMatchObject({
        user: { id: "u1" },
      }),
    )
  })
})

describe("useSignUp", () => {
  it("sends the verification link back to the feed, not the backend root", async () => {
    vi.mocked(authClient.signUp.email).mockResolvedValue({ data: {}, error: null })
    vi.mocked(authClient.getSession).mockResolvedValue(signedIn)
    const { result } = renderHook(() => useSignUp(), {
      wrapper: wrapperFor(new QueryClient()),
    })

    await result.current.mutateAsync({
      name: "Duck",
      username: "duck",
      email: "duck@example.com",
      password: "password1",
    })

    expect(authClient.signUp.email).toHaveBeenCalledWith(
      expect.objectContaining({ callbackURL: `${window.location.origin}/quacks` }),
    )
  })
})
