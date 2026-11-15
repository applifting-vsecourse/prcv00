import type { ReactNode } from "react"
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router"
import { render } from "@testing-library/react"

// Renders `ui` inside a small in-memory router, for components that contain a
// <Link> (it needs a router to build its href). Every path in `paths` shows
// `ui`, so a click stays on screen; `router.state.location` says where it led.
export async function renderWithRouter(ui: ReactNode, paths = ["/", "/quacks"]) {
  const rootRoute = createRootRoute({ component: Outlet })
  const routes = paths.map((path) =>
    createRoute({ getParentRoute: () => rootRoute, path, component: () => ui }),
  )
  const router = createRouter({
    routeTree: rootRoute.addChildren(routes),
    history: createMemoryHistory({ initialEntries: [paths[0] ?? "/"] }),
  })
  await router.load()
  return { ...render(<RouterProvider router={router} />), router }
}
