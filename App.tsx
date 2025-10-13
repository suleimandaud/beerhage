import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Tabs from './src/navigation/Tabs';
import { SessionProvider } from './src/lib/session';
import './src/i18n';
import { SafeAreaProvider } from 'react-native-safe-area-context';
const qc = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <SessionProvider>
        <SafeAreaProvider>          {/* ⬅️ wrap once at the root */}
          <Tabs />
        </SafeAreaProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
