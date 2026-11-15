import type { Quack } from "@/features/quack/api/quackSchemas"

export type ConversationNode = {
  quack: Quack
  // Replies to this quack, oldest first.
  replies: ConversationNode[]
}

// The server sends a conversation as a flat list, oldest first. Each reply
// hangs under its parent; the order within a level stays the server's.
// undefined when the list has no quack that starts a conversation.
export function buildConversationTree(quacks: Quack[]): ConversationNode | undefined {
  const nodes = new Map<string, ConversationNode>(
    quacks.map((quack) => [quack.id, { quack, replies: [] }]),
  )
  let root: ConversationNode | undefined
  for (const node of nodes.values()) {
    const { parentId } = node.quack
    if (parentId === null) {
      root = node
      continue
    }
    nodes.get(parentId)?.replies.push(node)
  }
  return root
}
