import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { runMigrations, isFreshInstall } from './db/migrations';
import { seedDatabase } from './db/seed';
import { Nav } from './components/common';
import { SessionProvider } from './context/SessionContext';
import { Home, Exercises, ExerciseDetailPage, Templates, TemplateDetailPage, TemplateEditPage, Progressions, Routines, Workout, History, Progress, Analytics, Settings } from './pages';
import './styles/global.css';
import './styles/theme.css';


function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initializeDatabase() {
      try {
        // Check fresh install BEFORE migrations (migration adds progression exercises)
        const fresh = await isFreshInstall();

        // Run migrations (for existing users upgrading)
        await runMigrations();

        // Seed if fresh install
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
      <SessionProvider>
        <Nav />
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
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </SessionProvider>
    </BrowserRouter>
  );
}

export default App;
