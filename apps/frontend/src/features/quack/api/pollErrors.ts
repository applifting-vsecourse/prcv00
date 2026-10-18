// Thrown instead of the raw 409 POLL_CLOSED, so the poll can say why the vote
// didn't count without knowing about HTTP.
export class PollClosedError extends Error {
  constructor() {
    super("This question was closed before your vote.")
  }
}
