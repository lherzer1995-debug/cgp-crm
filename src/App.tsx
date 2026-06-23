import { useState, useCallback } from 'react';
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
  const [search, setSearch] = useState('');

  const nav = useCallback((p: Page) => setPage(p), []);
  const toggle = useCallback(() => setCollapsed(c => !c), []);

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
    <div className="flex h-screen bg-void overflow-hidden noise">
      {/* Sidebar */}
      <Sidebar current={page} onNav={nav} collapsed={collapsed} onToggle={toggle} />
      
      {/* Main Content */}
      <div 
        className="flex-1 flex flex-col transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{ marginLeft: collapsed ? 72 : 260 }}
      >
        <Header page={page} search={search} onSearch={setSearch} />
        <main className="flex-1 overflow-hidden">
          {renderPage()}
        </main>
      </div>

      {/* Ambient Effects */}
      <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-primary/[0.02] rounded-full blur-[150px] pointer-events-none" />
      <div className="fixed bottom-0 left-1/3 w-[500px] h-[400px] bg-violet/[0.015] rounded-full blur-[120px] pointer-events-none" />
    </div>
  );
}
