import type { JSX } from 'react'
import { RouterProvider } from 'react-router'
import { router } from '@/app/routes/router'

export function App(): JSX.Element {
  return <RouterProvider router={router} />
}
