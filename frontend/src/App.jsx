import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "./context/ThemeContext";
import { CurrencyProvider } from "./context/CurrencyContext";
import { ToastProvider } from "./context/ToastContext";
import ErrorBoundary from "./components/common/ErrorBoundary";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import { trackVisit } from "./services/adminApi";

// Route-level code splitting - keeps the ~600KB three.js + city engine out of
// the initial bundle and off every non-map route.
const Home = lazy(() => import("./pages/Home"));
const ProductDetails = lazy(() => import("./pages/ProductDetails"));
const Categories = lazy(() => import("./pages/Categories"));
const CategoryDetails = lazy(() => import("./pages/CategoryDetails"));
const About = lazy(() => import("./pages/About"));
const NotFound = lazy(() => import("./pages/NotFound"));
// Private ops dashboard - never linked from the public site, gets its own
// bundle so it never adds weight to a normal visit.
const AdminStats = lazy(() => import("./pages/AdminStats"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

function RouteFallback() {
  return (
    <div className="w-full h-[calc(100vh-56px)] min-h-[560px] flex items-center justify-center bg-[#F1EEE6] dark:bg-[#14171C]">
      <div className="h-6 w-6 rounded-full border-2 border-coral/30 border-t-coral animate-spin" />
    </div>
  );
}

/**
 * The admin dashboard is a standalone operations screen, not a page in the
 * public site - it gets no Header/Footer chrome, and its own visits are
 * excluded from the traffic beacon (an admin checking the dashboard
 * shouldn't count as, or pollute, the audience data it's showing).
 */
function AppShell() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");

  useEffect(() => {
    if (isAdmin) return;
    trackVisit(location.pathname);
  }, [location.pathname, isAdmin]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-charcoal dark:text-cream">
      {!isAdmin && <Header />}
      <main className="flex-1">
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/products/:id" element={<ProductDetails />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/categories/:categoryId" element={<CategoryDetails />} />
            <Route path="/about" element={<About />} />
            <Route path="/admin/stats/:code" element={<AdminStats />} />
            <Route path="/admin/stats" element={<AdminStats />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      {!isAdmin && <Footer />}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <CurrencyProvider>
          <ToastProvider>
            <BrowserRouter>
              <AppShell />
            </BrowserRouter>
          </ToastProvider>
          </CurrencyProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
