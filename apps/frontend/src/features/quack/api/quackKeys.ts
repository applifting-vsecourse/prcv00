export const quackKeys = {
  all: () => ["quacks"] as const,
  lists: () => [...quackKeys.all(), "list"] as const,
  list: (search?: string, isMine?: boolean, tag?: string) =>
    [...quackKeys.lists(), { search, isMine: isMine === true, tag }] as const,
  conversation: (quackId: string) => [...quackKeys.all(), "conversation", quackId] as const,
}
