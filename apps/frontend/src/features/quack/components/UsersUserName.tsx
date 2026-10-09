import { HighlightedText } from "@/features/quack/components/HighlightedText"

type UsersUserNameProps = {
  username: string
  highlight?: string
}

export function UsersUserName({ username, highlight }: UsersUserNameProps) {
  return (
    <span className="text-sm text-muted-foreground">
      @
      <HighlightedText
        text={username}
        term={highlight}
      />
    </span>
  )
}
