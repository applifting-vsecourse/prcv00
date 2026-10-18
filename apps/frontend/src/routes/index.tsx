import { createFileRoute, Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { Header } from "@/components/Header/Header"
import { Seo } from "@/components/Seo"
import { Button } from "@/components/ui/button"

import { HeaderMenu } from "@/features/auth/components/HeaderMenu"
import { useSession } from "@/features/auth/hooks/useSession"
import type { Quack } from "@/features/quack/api/quackSchemas"
import { QuackItem } from "@/features/quack/components/QuackItem"

export const Route = createFileRoute("/")({
  component: LandingPage,
})

// Static sample for the preview below. It renders through the same <Quack />
// component as the real feed, so the landing page can never drift from it.
const SAMPLE_QUACKS: Quack[] = [
  {
    id: "sample-1",
    text: "me: throws one crumb into the pond\nducks: assemble like the Avengers\ni fear i may have started something",
    mood: "happy",
    userId: "sample-user-1",
    createdAt: new Date("2026-09-22T09:12:00"),
    user: { id: "sample-user-1", name: "Caffeinated Duck", username: "CaffeinatedDuck" },
    poll: null,
  },
  {
    id: "sample-poll",
    text: "Lunch after the reed meeting — where do we go?",
    mood: null,
    userId: "sample-user-3",
    createdAt: new Date("2026-09-22T08:55:00"),
    user: { id: "sample-user-3", name: "Pond Admin", username: "PondAdmin" },
    poll: {
      id: "sample-poll",
      isClosed: false,
      options: [
        { id: "sample-option-1", text: "Bakery by the bridge", votes: 5 },
        { id: "sample-option-2", text: "Sushi place", votes: 3 },
        { id: "sample-option-3", text: "Salad bar", votes: 1 },
      ],
      totalVotes: 9,
      myOptionId: null,
    },
  },
  {
    id: "sample-2",
    text: "If ducks wore pants, would they wear them on their legs or over their whole lower half like a cape?\nAsking for a friend. A feathery friend.",
    mood: null,
    userId: "sample-user-2",
    createdAt: new Date("2026-09-22T08:40:00"),
    user: { id: "sample-user-2", name: "Deep Duck Thoughts", username: "DeepDuckThoughts" },
    poll: null,
  },
]

function LandingPage() {
  const { user } = useSession()

  return (
    <>
      <Seo title="Welcome" />
      <Header userMenu={<HeaderMenu />} />
      <main className="min-h-svh">
        <section className="mx-auto w-full max-w-2xl px-4 pt-16 pb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
            Vilém Prchal
          </h1>
          <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
            Say it in a few words.
          </h1>
          <p className="mx-auto mt-4 max-w-md text-lg text-pretty text-muted-foreground">
            Quacker is a tiny social network for short messages. Post a quack, read what everyone
            else is up to.
          </p>

          {/* The call to action depends on who is asking: no point offering an
              account to someone who already has one. */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {user ? (
              <Button
                asChild
                size="lg"
              >
                <Link to={ROUTES.quacks}>Go to your feed</Link>
              </Button>
            ) : (
              <>
                <Button
                  asChild
                  size="lg"
                >
                  <Link to={ROUTES.signup}>Create an account</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                >
                  <Link to={ROUTES.login}>Sign in</Link>
                </Button>
              </>
            )}
          </div>
        </section>

        <section
          aria-labelledby="preview-heading"
          className="mx-auto w-full max-w-2xl px-4 pb-20"
        >
          <h2
            id="preview-heading"
            className="mb-3 text-center text-xs font-medium tracking-widest text-muted-foreground uppercase"
          >
            A peek at the feed
          </h2>
          <div className="rounded-xl border border-border bg-card px-5 py-2">
            {SAMPLE_QUACKS.map((quack) => (
              <QuackItem
                key={quack.id}
                quack={quack}
                // A sample: questions show their results but can't be voted on.
                isReadOnly
              />
            ))}
          </div>
        </section>
      </main>
    </>
  )
}
