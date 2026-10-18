# Plan: Quack polls

## Context

People ask questions in quacks ("where for lunch?") and count replies by hand. The counts come out wrong and the question gets buried under the replies. [docs/stories/quack-polls.md](../stories/quack-polls.md) settles every product decision: a quack can carry 2–6 answers; there is one vote per person, which can be changed or taken back; counts, percentages that add up to 100 and a total; anonymous; only the author can close a poll, and closing is final; a vote is refused if the poll was already closed when it arrives; the feed refreshes on focus, not live; a failed vote rolls back and shows a message at the poll; feed search also covers answers; the welcome page shows polls read-only.

The plan follows the existing quack slice: Prisma model → repository → service → DTO-validated controller → zod schema → TanStack Query → components.

## Data model (Prisma, `apps/backend/prisma/schema.prisma`)

```prisma
model Poll {
  id        String       @id @default(cuid())
  quack     Quack        @relation(fields: [quackId], references: [id], onDelete: Cascade)
  quackId   String       @unique          // a quack has at most one poll
  closedAt  DateTime?                     // null = open; set once, never cleared
  createdAt DateTime     @default(now())
  options   PollOption[]
  votes     PollVote[]
  @@map("poll")
}

model PollOption {
  id       String     @id @default(cuid())
  poll     Poll       @relation(fields: [pollId], references: [id], onDelete: Cascade)
  pollId   String
  text     String     @db.VarChar(50)
  position Int                             // order the author wrote them (criterion 18)
  votes    PollVote[]
  @@unique([pollId, position])
  @@map("poll_option")
}

model PollVote {
  poll      Poll       @relation(fields: [pollId], references: [id], onDelete: Cascade)
  pollId    String
  option    PollOption @relation(fields: [optionId], references: [id], onDelete: Cascade)
  optionId  String
  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId    String
  updatedAt DateTime   @updatedAt
  @@id([pollId, userId])                   // one person, one vote, enforced by the DB
  @@index([optionId])
  @@map("poll_vote")
}
```

Key choices:

- **No stored counters.** Counts are derived on every read with `_count` on the options. A stored counter can drift, while a count of rows can't. This is what "the numbers have to be right for everyone" means here.
- The vote row's primary key is `(pollId, userId)`. Changing a vote is an upsert on that key, so double-counting is impossible even under concurrent requests.
- The duplicate-answer check ("Pizza" = "pizza ") lives in the DTO/service, not in the DB.
- Migration via `pnpm backend prisma:migrations:run`; the DB is up now.

## Endpoints

| Method & path                    | Body                                           | Result                                          | Errors                                                                    |
| -------------------------------- | ---------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------- |
| `POST /api/quacks` (extended)    | `{ text, mood, poll?: { options: string[] } }` | `QuackResponseDto` incl. `poll`                 | 400: 2–6 options, each trimmed 1–50 chars, no case-insensitive duplicates |
| `GET /api/quacks?q=` (extended)  |                                                | each quack has `poll: PollDto \| null`          | —                                                                         |
| `PUT /api/polls/:pollId/vote`    | `{ optionId }`                                 | `PollDto`                                       | 404 unknown poll or option not in this poll · **409 `POLL_CLOSED`**       |
| `DELETE /api/polls/:pollId/vote` |                                                | `PollDto` (withdrawing with no vote is a no-op) | 404 · 409 `POLL_CLOSED`                                                   |
| `POST /api/polls/:pollId/close`  |                                                | `PollDto`                                       | 403 not the author · 404 · 409 already closed                             |

`PollDto = { id, isClosed, totalVotes, myOptionId: string | null, options: [{ id, text, votes }] }`. Options are ordered by `position`. `myOptionId` is the viewer's own vote, so the quack list now needs the viewer's id (the controller passes `user.id`). Nobody else's vote is ever exposed (criterion 12).

**Closed-vs-vote race (criterion 24):** the vote and withdraw calls run in a `$transaction` that first locks the poll row (`SELECT … FOR UPDATE` via `$queryRaw`) and checks `closedAt`. The close call updates the same row, so the two are serialized: a vote that arrives after the close is refused, never counted.

## Backend structure

- `modules/quack`: `CreateQuackDto` gets an optional nested `poll` (`@ValidateNested`, `@ArrayMinSize(2)`, `@ArrayMaxSize(6)`, per-item trim + `@Length(1,50)`, plus a custom no-duplicates validator). `QuackRepository.createQuack` creates the poll with a nested create in the same write. `getQuacks` includes `poll { options { _count votes }, votes where userId }`. `buildSearchWhere` (`quack.repository.ts`) gains `{ poll: { options: { some: { text: contains } } } }`, reusing `escapeLikePattern`. `QuackResponseDto.fromDomain` maps the poll.
- New `modules/poll` (controller, service, repository, domain), the same layout as `modules/profile`. It owns the vote, withdraw and close calls. Domain errors are `PollClosedError` and `NotPollAuthorError`, mapped in the controller to 409 and 403, the same way `UsernameTakenError` is mapped in `profile.controller.ts`.
- Tests: DTO specs (option count, length, duplicates), service specs with a mocked repository (vote on a closed poll is refused, close by a non-author is refused, withdrawing with no vote is a no-op).

## Frontend structure

- `features/quack/api/quackSchemas.ts`: `pollSchema` and `quackSchema.poll: pollSchema.nullable()`.
- `features/quack/lib/pollPercentages.ts`: a pure largest-remainder function that turns counts into whole percentages summing to exactly 100 (criterion 14). Unit tested: 1/1/1 → 34/33/33, all zero → no percentages.
- `features/quack/components/QuackPoll.tsx`: the answer list. Each answer is a `<button aria-pressed>` (clicking the pressed answer withdraws the vote), with the count, percentage and a bar whose width is set by an inline style percentage, since the data-driven width can't be a fixed class. It shows "N votes", "No votes yet" (criteria 27–28), "Closed", the error line under the poll, a read-only mode (no buttons) for closed polls and the welcome page, and highlighted search matches via `HighlightedText`.
- `features/quack/hooks/useVote.ts`: a `useMutation` with `scope: { id: pollId }`. TanStack v5 runs mutations that share a scope one after another, so the server receives clicks in order and the last click wins (criterion 11). `onMutate` cancels the quack list queries, snapshots them, and applies the new vote to every cached list via `setQueriesData(quackKeys.lists())` (instant, criterion 7). `onError` restores the snapshot and sets the poll's error: a 409 `POLL_CLOSED` becomes a `PollClosedError` with the closed message (criterion 24, the same pattern as `profileErrors.ts`); anything else becomes "Your vote didn't go through. Try again." `onSettled` invalidates `quackKeys.all()`.
- Closing: a "Close question" button shown only when `quack.userId === session user.id` (`useSession`), with an AlertDialog confirm. Add the dialog with `pnpm dlx shadcn@latest add alert-dialog`. Last time the CLI imported a stray `cn` npm package, so check the import and the lockfile, and strip any shadow.
- `QuackForm.tsx`: an "Add answers" button reveals a `useFieldArray` of answer inputs, each with a visible label and a remove button with an `aria-label`. Add is hidden at 6 answers and remove is hidden at 2. The zod `superRefine` puts errors on `poll.options.<i>` (empty, too long, duplicate). After posting, the form resets with the answers removed and the default mood kept.
- `routes/index.tsx`: add one sample poll to `SAMPLE_QUACKS`, rendered read-only (criterion 26).

## Build order

Each step is shippable and tested before the next starts.

1. **Schema + migration**: Poll, PollOption, PollVote, and a relation on Quack and User.
2. **Create a poll with a quack**: the DTO with validation and specs, a nested create in the repository, `fromDomain` mapping.
3. **Read**: the feed includes the poll with derived counts and `myOptionId`; search matches answers; repository/service specs.
4. **Vote / withdraw / close**: the poll module with the locking transaction, the error mapping and specs. Check it in Swagger at `/api/docs`.
5. **Frontend read path**: `pollSchema`, `pollPercentages` with tests, `QuackPoll` read-only (numbers, no votes yet, closed, highlight), the welcome-page sample.
6. **Voting**: `useVote` with optimistic update, scoped serial mutations, rollback and the per-poll error; component tests with a mocked API (instant change, rollback and message, last click wins, withdraw).
7. **Closing**: the author-only button, AlertDialog, read-only after close; the closed-before-your-vote message.
8. **Asking**: the answers editor in `QuackForm`, plus tests (2–6 limit, length, duplicates, reset after posting).
9. **Seed**: add one or two example polls with votes in `seed-database.ts` so the feed shows the feature out of the box.

## Verification

- `pnpm backend test`, `pnpm frontend test:ci`, frontend lint and type-check. On Windows, run eslint and the vite build directly (the npm scripts' single-quoted globs fail there, as noted in PR #4).
- In the running app (frontend :3050, backend :4050), walk through every acceptance criterion with two signed-in seed users in two browser contexts: one vote each, switch, withdraw, numbers agree after a refocus; fail a vote by stopping the backend and check the rollback and message; close as the author, then vote from the other user's stale tab and check criterion 24; search for an answer word; the welcome page while signed out.
- Restore any seed data changed during manual testing.
