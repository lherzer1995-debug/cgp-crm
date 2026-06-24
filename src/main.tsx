
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/react';
import './index.css';
import App from './App';
import { AuthShell, MissingClerkConfig } from './components/auth/AuthShell';
import { AppStoreProvider } from './data/app-store';

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function Root() {
  if (!clerkPublishableKey) {
    return <MissingClerkConfig />;
  }

  return (
    <ClerkProvider publishableKey={clerkPublishableKey} afterSignOutUrl="/">
      <AuthShell>
        <AppStoreProvider>
          <App />
        </AppStoreProvider>
      </AuthShell>
    </ClerkProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
