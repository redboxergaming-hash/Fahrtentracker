import { useEffect } from 'react';
import { seedDemoData } from '../db/database';
import { AppRoutes } from '../routes/AppRoutes';

export default function App() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const skipDemoSeed = params.get('noSeedDemo') === '1';

    if (!skipDemoSeed) {
      void seedDemoData();
    }
  }, []);

  return <AppRoutes />;
}
