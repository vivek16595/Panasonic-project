import React, { useState } from 'react';
import { ShopFloorProvider, useShopFloor } from './context/ShopFloorContext';
import { Navbar } from './components/Navbar';
import { Dashboard } from './pages/Dashboard';
import { CellManagement } from './pages/CellManagement';
import { ProductionQueuePage } from './pages/ProductionQueue';
import { EquipmentRegistry } from './pages/EquipmentRegistry';
import { PartTraceability } from './pages/PartTraceability';
import { ProductionHistoryPage } from './pages/ProductionHistory';
import { FaultsEvents } from './pages/FaultsEvents';
import { CsvOutputs } from './pages/CsvOutputs';

const MainContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const { isConnected } = useShopFloor();

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'cells':
        return <CellManagement />;
      case 'queue':
        return <ProductionQueuePage />;
      case 'equipment':
        return <EquipmentRegistry />;
      case 'traceability':
        return <PartTraceability />;
      case 'history':
        return <ProductionHistoryPage />;
      case 'faults':
        return <FaultsEvents />;
      case 'csv':
        return <CsvOutputs />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-[#070c18] text-slate-100 flex flex-col">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} isConnected={isConnected} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {renderTabContent()}
      </main>
      <footer className="border-t border-sky-950/60 py-4 text-center text-xs text-slate-500 font-mono">
        WELDING SHOP-FLOOR SIMULATOR • MULTI-CELL & SEQUENTIAL PRODUCTION EXECUTION ENGINE
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ShopFloorProvider>
      <MainContent />
    </ShopFloorProvider>
  );
};

export default App;
