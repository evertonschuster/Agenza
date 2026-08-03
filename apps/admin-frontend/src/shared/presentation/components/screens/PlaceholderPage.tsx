import type { ComponentType, JSX } from 'react'

interface PlaceholderPageProps {
  title: string
  icon: ComponentType<{ className?: string }>
}

export function PlaceholderPage({ title, icon: Icon }: PlaceholderPageProps): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-5 flex size-14 items-center justify-center rounded-full bg-primary/10">
        <Icon className="size-6 text-primary" />
      </div>
      <h1 className="text-xl font-semibold text-foreground">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">Esta seção está em construção.</p>
    </div>
  )
}
