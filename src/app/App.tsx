import { useEffect } from 'react';
import { ENABLE_DEMO_DATA } from './config';
import { seedDemoData } from '../db/database';
import { AppRoutes } from '../routes/AppRoutes';

export default function App() {
  useEffect(() => {
    void seedDemoData(ENABLE_DEMO_DATA);
  }, []);

  return <AppRoutes />;
}
