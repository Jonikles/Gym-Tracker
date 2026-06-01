import { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { runMigrations, isFreshInstall } from './db/migrations';
import { seedDatabase } from './db/seed';
import { useThemeEffect } from './hooks/useTheme';
import { Nav, ErrorBoundary, SkeletonList } from './components/common';
import { UpdatePrompt } from './components/common/UpdatePrompt';
import { SessionProvider } from './context/SessionContext';
import { UndoProvider } from './context/UndoContext';
import './styles/global.css';
import './styles/theme.css';

// Lazy-loaded pages — each becomes its own chunk
const Home = lazy(() => import('./pages/Home').then(m => ({ default: m.Home })));
const Exercises = lazy(() => import('./pages/Exercises').then(m => ({ default: m.Exercises })));
const ExerciseDetailPage = lazy(() => import('./pages/ExerciseDetail').then(m => ({ default: m.ExerciseDetailPage })));
const Templates = lazy(() => import('./pages/Templates').then(m => ({ default: m.Templates })));
const TemplateDetailPage = lazy(() => import('./pages/TemplateDetail').then(m => ({ default: m.TemplateDetailPage })));
const TemplateEditPage = lazy(() => import('./pages/TemplateEdit').then(m => ({ default: m.TemplateEditPage })));
const Progressions = lazy(() => import('./pages/Progressions').then(m => ({ default: m.Progressions })));
const Routines = lazy(() => import('./pages/Routines').then(m => ({ default: m.Routines })));
const Workout = lazy(() => import('./pages/Workout').then(m => ({ default: m.Workout })));
const History = lazy(() => import('./pages/History').then(m => ({ default: m.History })));
const Progress = lazy(() => import('./pages/Progress').then(m => ({ default: m.Progress })));
const Analytics = lazy(() => import('./pages/Analytics').then(m => ({ default: m.Analytics })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Tools = lazy(() => import('./pages/Tools').then(m => ({ default: m.Tools })));
const Measurements = lazy(() => import('./pages/Measurements').then(m => ({ default: m.Measurements })));
const NotFound = lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFound })));

function PageLoader() {
  return (
    <div className="page">
      <SkeletonList count={5} lines={2} />
    </div>
  );
}

function App() {
  useThemeEffect();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initializeDatabase() {
      try {
        const fresh = await isFreshInstall();
        await runMigrations();
        if (fresh) {
          await seedDatabase();
        }
        setIsLoading(false);
      } catch (err) {
        console.error('Database initialization failed:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize database');
        setIsLoading(false);
      }
    }

    initializeDatabase();
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
    <BrowserRouter>
      <UpdatePrompt />
      <SessionProvider>
        <UndoProvider>
        <Nav />
        <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/exercises" element={<Exercises />} />
          <Route path="/exercises/:id" element={<ExerciseDetailPage />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/templates/:id" element={<TemplateDetailPage />} />
          <Route path="/templates/:id/edit" element={<TemplateEditPage />} />
          <Route path="/progressions" element={<Progressions />} />
          <Route path="/progressions/:progressionId" element={<Progressions />} />
          <Route path="/routines" element={<Routines />} />
          <Route path="/routines/:id" element={<Routines />} />
          <Route path="/workout" element={<Workout />} />
          <Route path="/history" element={<History />} />
          <Route path="/history/:id" element={<History />} />
          <Route path="/history/:id/:action" element={<History />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/progress/:exerciseId" element={<Progress />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/tools" element={<Tools />} />
          <Route path="/body" element={<Measurements />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
        </ErrorBoundary>
        </UndoProvider>
      </SessionProvider>
    </BrowserRouter>
  );
}

export default App;
