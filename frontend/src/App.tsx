import { useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthProvider'
import { BidFlowProvider } from '@/context/BidFlowProvider'
import { BoardProvider } from '@/context/BoardProvider'
import { ToastProvider } from '@/context/ToastProvider'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { HowItWorksPage } from '@/pages/HowItWorksPage'
import { LeaderboardPage } from '@/pages/LeaderboardPage'
import { MyProjectPage } from '@/pages/MyProjectPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { SubmitPage } from '@/pages/SubmitPage'

/** Router-level providers, in dependency order: toasts → board → auth → bidding. */
export function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <BoardProvider>
          <AuthProvider>
            <BidFlowProvider>
              <ScrollToTop />

              <a
                href="#main"
                className="sr-only rounded-md bg-brand px-4 py-2 font-medium text-brand-ink focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-200"
              >
                Skip to content
              </a>

              <div className="flex min-h-dvh flex-col">
                <Header />

                <main id="main" className="flex-1">
                  <Routes>
                    <Route path="/" element={<LeaderboardPage />} />
                    <Route path="/how-it-works" element={<HowItWorksPage />} />
                    <Route path="/submit" element={<SubmitPage />} />
                    <Route path="/my-project" element={<MyProjectPage />} />
                    <Route path="*" element={<NotFoundPage />} />
                  </Routes>
                </main>

                <Footer />
              </div>
            </BidFlowProvider>
          </AuthProvider>
        </BoardProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}

/** Route changes should start at the top, like a page load would. */
function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])

  return null
}
