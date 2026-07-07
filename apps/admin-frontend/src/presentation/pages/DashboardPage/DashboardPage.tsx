import type { JSX } from 'react'

export function DashboardPage(): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-4 text-4xl">🚧</div>
      <h1 className="text-xl font-semibold text-gray-800">Dashboard</h1>
      <p className="mt-2 text-sm text-gray-500">This section is under construction.</p>
    </div>
  )
}
