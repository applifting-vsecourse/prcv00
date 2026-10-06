import type { QuackMood } from "@/features/quack/api/quackSchemas"
import { moodLabels } from "@/features/quack/components/moods"

type QuackMoodBadgeProps = { mood: QuackMood }

export function QuackMoodBadge({ mood }: QuackMoodBadgeProps) {
  const { icon: Icon, label } = moodLabels[mood]

  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Icon
        aria-hidden="true"
        className="size-3"
      />
      {label}
    </span>
  )
}
