// The reply fields of a quack that starts a conversation and has no replies,
// for test fixtures that are about something else.
export const CONVERSATION_START = {
  isDeleted: false,
  parentId: null,
  root: null,
  replyTo: null,
  replyCount: 0,
} as const
