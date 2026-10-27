import { BrowserRouter, Link, Route, Routes } from 'react-router'
import LinkPage from './pages/LinkPage'
import LinksPage from './pages/LinksPage'

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}

// The app owns only `/` and `/_/…`; every other path is a Go Link.
// Separate from the router so tests can render it under a MemoryRouter.
export function AppRoutes() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          <Link to="/">
            <span className="text-blue-600 dark:text-blue-400">go/</span>links
          </Link>
        </h1>
      </header>
      <Routes>
        <Route path="/" element={<LinksPage />} />
        <Route path="/_/links/:name" element={<LinkPage />} />
        <Route path="*" element={<p className="text-zinc-500">Page not found.</p>} />
      </Routes>
    </main>
  )
}
