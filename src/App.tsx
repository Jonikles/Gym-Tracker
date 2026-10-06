import { useEffect, useState, lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Outlet, useLocation } from 'react-router-dom';
import { Nav, ErrorBoundary, SkeletonList } from './components/common';
import { UpdatePrompt } from './components/common/UpdatePrompt';
import { SessionProvider } from './context/SessionContext';
import { UndoProvider } from './context/UndoContext';
import './styles/global.css';
import './styles/theme.css';

// Page chunk loaders — shared by lazy() and idle-time prefetching
const loadHome = () => import('./pages/Home');
const loadExercises = () => import('./pages/Exercises');
const loadExerciseDetail = () => import('./pages/ExerciseDetail');
const loadTemplates = () => import('./pages/Templates');
const loadTemplateDetail = () => import('./pages/TemplateDetail');
const loadTemplateEdit = () => import('./pages/TemplateEdit');
const loadProgressions = () => import('./pages/Progressions');
const loadRoutines = () => import('./pages/Routines');
const loadWorkout = () => import('./pages/Workout');
const loadHistory = () => import('./pages/History');
const loadProgress = () => import('./pages/Progress');
const loadAnalytics = () => import('./pages/Analytics');
const loadSettings = () => import('./pages/Settings');
const loadNotFound = () => import('./pages/NotFound');

const PAGE_LOADERS: Array<() => Promise<unknown>> = [
  loadWorkout,
  loadHistory,
  loadExercises,
  loadTemplates,
  loadRoutines,
  loadProgress,
  loadAnalytics,
  loadSettings,
  loadExerciseDetail,
  loadTemplateDetail,
  loadTemplateEdit,
  loadProgressions,
  loadHome,
  loadNotFound,
];

// Lazy-loaded pages
const Home = lazy(() => loadHome().then(m => ({ default: m.Home })));
const Exercises = lazy(() => loadExercises().then(m => ({ default: m.Exercises })));
const ExerciseDetailPage = lazy(() => loadExerciseDetail().then(m => ({ default: m.ExerciseDetailPage })));
const Templates = lazy(() => loadTemplates().then(m => ({ default: m.Templates })));
const TemplateDetailPage = lazy(() => loadTemplateDetail().then(m => ({ default: m.TemplateDetailPage })));
const TemplateEditPage = lazy(() => loadTemplateEdit().then(m => ({ default: m.TemplateEditPage })));
const Progressions = lazy(() => loadProgressions().then(m => ({ default: m.Progressions })));
const Routines = lazy(() => loadRoutines().then(m => ({ default: m.Routines })));
const Workout = lazy(() => loadWorkout().then(m => ({ default: m.Workout })));
const History = lazy(() => loadHistory().then(m => ({ default: m.History })));
const Progress = lazy(() => loadProgress().then(m => ({ default: m.Progress })));
const Analytics = lazy(() => loadAnalytics().then(m => ({ default: m.Analytics })));
const Settings = lazy(() => loadSettings().then(m => ({ default: m.Settings })));
const NotFound = lazy(() => loadNotFound().then(m => ({ default: m.NotFound })));

/** Warm all page chunks in idle time so first visits to a tab are instant */
function prefetchPages() {
  type IdleWindow = Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  };
  const w = window as IdleWindow;
  const schedule = (cb: () => void) =>
    w.requestIdleCallback ? w.requestIdleCallback(cb, { timeout: 3000 }) : window.setTimeout(cb, 500);

  const queue = [...PAGE_LOADERS];
  const next = () => {
    const loader = queue.shift();
    if (!loader) return;
    loader()
      .catch(() => { /* ignore — real navigation will retry */ })
      .finally(() => schedule(next));
  };
  schedule(next);
}

function PageLoader() {
  return (
    <div className="page">
      <SkeletonList count={5} lines={2} />
    </div>
  );
}

/** Error boundary that resets whenever the route changes */
function RouteErrorBoundary({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return <ErrorBoundary key={location.pathname}>{children}</ErrorBoundary>;
}

/** Root layout — wraps all routes with providers, nav, error boundary */
function RootLayout() {
  return (
    <SessionProvider>
      <UndoProvider>
        <Nav />
        <RouteErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </RouteErrorBoundary>
      </UndoProvider>
    </SessionProvider>
  );
}

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/exercises', element: <Exercises /> },
      { path: '/exercises/:id', element: <ExerciseDetailPage /> },
      { path: '/templates', element: <Templates /> },
      { path: '/templates/:id', element: <TemplateDetailPage /> },
      { path: '/templates/:id/edit', element: <TemplateEditPage /> },
      { path: '/progressions', element: <Progressions /> },
      { path: '/progressions/:progressionId', element: <Progressions /> },
      { path: '/routines', element: <Routines /> },
      { path: '/routines/:id', element: <Routines /> },
      { path: '/workout', element: <Workout /> },
      { path: '/history', element: <History /> },
      { path: '/history/:id', element: <History /> },
      { path: '/history/:id/:action', element: <History /> },
      { path: '/progress', element: <Progress /> },
      { path: '/progress/:exerciseId', element: <Progress /> },
      { path: '/analytics', element: <Analytics /> },
      { path: '/settings', element: <Settings /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        // Dynamic import keeps seed/progression data out of the main chunk
        const { initializeDatabase } = await import('./db/migrations');
        await initializeDatabase();
        if (cancelled) return;
        setIsLoading(false);
        prefetchPages();
      } catch (err) {
        console.error('Database initialization failed:', err);
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to initialize database');
        setIsLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="loading">
        <p>Initializing...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error">
        <h1>Error</h1>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <>
      <UpdatePrompt />
      <RouterProvider router={router} />
    </>
  );
}

export default App;
