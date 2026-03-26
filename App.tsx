// App.tsx
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SessionProvider } from './src/lib/session';
import RootNavigator from './src/navigation/RootNavigator'; // ✅ new root

import './src/i18n';

const qc = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <SessionProvider>
        <SafeAreaProvider>
          <RootNavigator />
        </SafeAreaProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
