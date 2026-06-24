import { useCallback, useEffect, useMemo, useState } from 'react';
import Sidebar, { type Page } from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Dashboard from './components/pages/Dashboard';
import Kunden from './components/pages/Kunden';
import Aufgaben from './components/pages/Aufgaben';
import Einsaetze from './components/pages/Einsaetze';
import Kalender from './components/pages/Kalender';
import Einstellungen from './components/pages/Einstellungen';
import { FeedbackToast, SkeletonBlock } from './components/ui/common';
import { CustomerCreateModal, ServiceCreateModal, TaskCreateModal } from './components/ui/workflow-modals';
import { useAppStore } from './data/app-store';

export default function App() {
  const { feedback, clearFeedback, isBooting } = useAppStore();
  const [page, setPage] = useState<Page>('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [quickCreate, setQuickCreate] = useState<null | 'customer' | 'task' | 'service'>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 960px)');
    const syncViewport = () => {
      const mobile = mediaQuery.matches;
      setIsMobile(mobile);
      if (mobile) setCollapsed(false);
    };
    syncViewport();
    mediaQuery.addEventListener('change', syncViewport);
    return () => mediaQuery.removeEventListener('change', syncViewport);
  }, []);

  const nav = useCallback((nextPage: Page) => {
    setPage(nextPage);
    setMobileMenuOpen(false);
  }, []);

  const toggleSidebar = useCallback(() => {
    if (isMobile) setMobileMenuOpen((open) => !open);
    else setCollapsed((value) => !value);
  }, [isMobile]);

  const sidebarWidth = isMobile ? 0 : collapsed ? 88 : 286;

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ type?: 'customer' | 'task' | 'service'; source?: string }>).detail;
      if (detail?.source !== 'header' || !detail.type) return;
      setQuickCreate(detail.type);
    };
    window.addEventListener('crm:create', handler as EventListener);
    return () => window.removeEventListener('crm:create', handler as EventListener);
  }, []);

  const pageNode = useMemo(() => {
    const props = { search };
    switch (page) {
      case 'dashboard':
        return <Dashboard onNav={nav} search={search} />;
      case 'kunden':
        return <Kunden {...props} />;
      case 'aufgaben':
        return <Aufgaben {...props} />;
      case 'einsaetze':
        return <Einsaetze {...props} />;
      case 'kalender':
        return <Kalender {...props} />;
      case 'einstellungen':
        return <Einstellungen />;
      default:
        return <Dashboard onNav={nav} search={search} />;
    }
  }, [page, nav, search]);

  return (
    <div className="app-shell">
      <Sidebar
        current={page}
        onNav={nav}
        collapsed={!isMobile && collapsed}
        onToggle={toggleSidebar}
        mobileOpen={mobileMenuOpen}
        isMobile={isMobile}
      />

      {isMobile && mobileMenuOpen ? (
        <button
          aria-label="Navigation schließen"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      ) : null}

      <div className="app-main transition-[margin] duration-300" style={{ marginLeft: sidebarWidth }}>
        <Header page={page} search={search} onSearch={setSearch} onMenuClick={toggleSidebar} isMobile={isMobile} />
        <main className="app-content">
          {isBooting ? (
            <div className="space-y-5 p-6 lg:p-8">
              <SkeletonBlock className="h-16 w-[320px]" />
              <div className="grid gap-4 lg:grid-cols-3">
                <SkeletonBlock className="h-[220px]" />
                <SkeletonBlock className="h-[220px]" />
                <SkeletonBlock className="h-[220px]" />
              </div>
              <SkeletonBlock className="h-[360px]" />
            </div>
          ) : (
            pageNode
          )}
        </main>
      </div>

      {feedback ? <FeedbackToast type={feedback.type} message={feedback.message} onClose={clearFeedback} /> : null}
      <CustomerCreateModal open={quickCreate === 'customer'} onClose={() => setQuickCreate(null)} />
      <TaskCreateModal open={quickCreate === 'task'} onClose={() => setQuickCreate(null)} />
      <ServiceCreateModal open={quickCreate === 'service'} onClose={() => setQuickCreate(null)} />
    </div>
  );
}
