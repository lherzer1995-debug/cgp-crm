import { useState, useCallback, useEffect } from 'react';
import Sidebar, { type Page } from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Dashboard from './components/pages/Dashboard';
import Kunden from './components/pages/Kunden';
import Aufgaben from './components/pages/Aufgaben';
import Einsaetze from './components/pages/Einsaetze';
import Kalender from './components/pages/Kalender';
import Einstellungen from './components/pages/Einstellungen';

export default function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 900px)');

    const syncViewport = () => {
      const mobile = mediaQuery.matches;
      setIsMobile(mobile);
      if (mobile) setCollapsed(false);
    };

    syncViewport();
    mediaQuery.addEventListener('change', syncViewport);
    return () => mediaQuery.removeEventListener('change', syncViewport);
  }, []);

  const nav = useCallback((p: Page) => {
    setPage(p);
    setMobileMenuOpen(false);
  }, []);

  const toggleSidebar = useCallback(() => {
    if (isMobile) setMobileMenuOpen(open => !open);
    else setCollapsed(c => !c);
  }, [isMobile]);

  const sidebarWidth = isMobile ? 0 : collapsed ? 84 : 284;

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <Dashboard onNav={nav} />;
      case 'kunden': return <Kunden />;
      case 'aufgaben': return <Aufgaben />;
      case 'einsaetze': return <Einsaetze />;
      case 'kalender': return <Kalender />;
      case 'einstellungen': return <Einstellungen />;
      default: return <Dashboard onNav={nav} />;
    }
  };

  return (
    <div className="app-shell bg-void">
      <Sidebar
        current={page}
        onNav={nav}
        collapsed={!isMobile && collapsed}
        onToggle={toggleSidebar}
        mobileOpen={mobileMenuOpen}
        isMobile={isMobile}
      />

      {isMobile && mobileMenuOpen && (
        <button
          aria-label="Navigation schließen"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <div
        className="app-main transition-[margin] duration-300 ease-[cubic-bezier(.16,1,.3,1)]"
        style={{ marginLeft: sidebarWidth }}
      >
        <Header
          page={page}
          search={search}
          onSearch={setSearch}
          onMenuClick={toggleSidebar}
          isMobile={isMobile}
        />
        <main className="app-content">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}
