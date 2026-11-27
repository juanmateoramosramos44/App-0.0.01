import React, { useState, useEffect, Suspense, lazy } from 'react';
import { MaintenanceProvider, useMaintenance } from './context/MaintenanceContext';
import { Navbar } from './components/layout/Navbar';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { LoginView } from './components/auth/LoginView';
import { Bell, Sparkles, RefreshCw, Loader2 } from 'lucide-react';
import { syncPushSubscriptionWithServer } from './lib/notifications';

// Vista inicial eager para FCP inmediato; vistas secundarias en lazy-loading para acelerar arranque
import { DashboardOverview } from './components/dashboard/DashboardOverview';
import { ReportIncidentModal } from './components/incidencias/ReportIncidentModal';
import { NotificationPermissionBanner } from './components/notifications/NotificationPermissionBanner';
import { PWAAutoPrompt } from './components/common/PWAAutoPrompt';

const DailyRoundsView = lazy(() => import('./components/rondas/DailyRoundsView').then(m => ({ default: m.DailyRoundsView })));
const EquipmentAndPumpsView = lazy(() => import('./components/equipos/EquipmentAndPumpsView').then(m => ({ default: m.EquipmentAndPumpsView })));
const EquipmentResumeView = lazy(() => import('./components/hojasvida/EquipmentResumeView').then(m => ({ default: m.EquipmentResumeView })));
const IncidentsLiveView = lazy(() => import('./components/incidencias/IncidentsLiveView').then(m => ({ default: m.IncidentsLiveView })));
const PreventiveView = lazy(() => import('./components/preventivo/PreventiveView').then(m => ({ default: m.PreventiveView })));
const RequestsView = lazy(() => import('./components/solicitudes/RequestsView').then(m => ({ default: m.RequestsView })));
const TasksView = lazy(() => import('./components/tareas/TasksView').then(m => ({ default: m.TasksView })));
const SettingsView = lazy(() => import('./components/configuracion/SettingsView').then(m => ({ default: m.SettingsView })));
const UsersView = lazy(() => import('./components/usuarios/UsersView').then(m => ({ default: m.UsersView })));
const TechnicianSchedulesView = lazy(() => import('./components/horarios/TechnicianSchedulesView').then(m => ({ default: m.TechnicianSchedulesView })));
const CronogramaView = lazy(() => import('./components/cronograma/CronogramaView').then(m => ({ default: m.CronogramaView })));
const MetersView = lazy(() => import('./components/contadores/MetersView').then(m => ({ default: m.MetersView })));
const BitacoraTecnicaView = lazy(() => import('./components/bitacora/BitacoraTecnicaView').then(m => ({ default: m.BitacoraTecnicaView })));

const TabLoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center min-h-[280px] text-slate-400">
    <div className="flex items-center gap-2.5 text-sm font-medium">
      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
      <span>Cargando módulo...</span>
    </div>
  </div>
);

function AppContent() {
  const { 
    selectedTab, 
    setSelectedTab, 
    settings, 
    currentUser, 
    isSectionAllowed,
    hasNewAppVersion, 
    reloadAppForUpdate,
    notificationPermission,
    requestSystemNotificationPermission
  } = useMaintenance();
  const [preselectedEquipmentId, setPreselectedEquipmentId] = useState<string | null>(null);
  const [isReloading, setIsReloading] = useState<boolean>(false);



  if (!currentUser) {
    return (
      <ErrorBoundary sectionTitle="el Inicio de Sesión">
        <LoginView />
      </ErrorBoundary>
    );
  }

  const handleUpdateClick = () => {
    if (isReloading) return;
    setIsReloading(true);
    reloadAppForUpdate();
  };

  const handleStartRoundFromDashboard = () => {
    setSelectedTab('rondas');
  };

  const handleNewPumpInspectionFromDashboard = (eqId?: string) => {
    if (eqId) {
      setPreselectedEquipmentId(eqId);
    }
    setSelectedTab('bombas');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col selection:bg-blue-600 selection:text-white relative">
      {/* Sticky Header with Hotel Identity, Shift & Admin Switcher */}
      <Navbar />

      {/* Banner para activar alertas en dispositivos donde aún no se hayan concedido permisos */}
      <NotificationPermissionBanner />

      {/* Promoción automática de instalación en navegador móvil */}
      <PWAAutoPrompt />

      {/* Floating Instant Update Notification Banner */}
      {hasNewAppVersion && (
        <div
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-[2300] bg-slate-900/95 backdrop-blur-md border border-emerald-500/40 text-white p-4 rounded-2xl shadow-2xl flex items-center space-x-4 max-w-md ring-1 ring-emerald-500/20 transition-all duration-300 transform translate-y-0 opacity-100"
        >
          <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-white flex items-center gap-1.5">
              <span>¡Actualización al instante!</span>
            </h4>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
              {isReloading ? 'Reiniciando aplicación con la nueva versión...' : 'Inyectando el nuevo código de inmediato...'}
            </p>
          </div>
          <button
            onClick={handleUpdateClick}
            disabled={isReloading}
            className={`px-3.5 py-2 text-white font-medium text-xs rounded-xl transition-all shadow-md flex items-center space-x-1.5 shrink-0 ${
              isReloading
                ? 'bg-emerald-700/90 cursor-wait shadow-emerald-950/40 ring-1 ring-emerald-400/40'
                : 'bg-emerald-600 hover:bg-emerald-500 hover:shadow-emerald-900/40 cursor-pointer active:scale-95'
            }`}
          >
            {isReloading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-200" />
                <span className="font-semibold text-emerald-100">Actualizando...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '2.5s' }} />
                <span>Actualizar</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <ErrorBoundary sectionTitle="este módulo">
          <Suspense fallback={<TabLoadingFallback />}>
            {selectedTab === 'dashboard' && isSectionAllowed('dashboard') && (
              <DashboardOverview 
                onStartRound={handleStartRoundFromDashboard}
                onNewPumpInspection={handleNewPumpInspectionFromDashboard}
              />
            )}

            {selectedTab === 'rondas' && isSectionAllowed('rondas') && (
              <DailyRoundsView />
            )}

            {selectedTab === 'bitacora' && isSectionAllowed('bitacora') && (
              <BitacoraTecnicaView />
            )}

            {selectedTab === 'contadores' && isSectionAllowed('contadores') && (
              <MetersView />
            )}

            {selectedTab === 'bombas' && isSectionAllowed('bombas') && (
              <EquipmentAndPumpsView 
                preselectedEquipmentId={preselectedEquipmentId}
                onClearPreselection={() => setPreselectedEquipmentId(null)}
              />
            )}

            {selectedTab === 'hojas_vida' && isSectionAllowed('hojas_vida') && (
              <EquipmentResumeView />
            )}

            {selectedTab === 'incidencias' && isSectionAllowed('incidencias') && (
              <IncidentsLiveView />
            )}

            {selectedTab === 'preventivo' && isSectionAllowed('preventivo') && (
              <PreventiveView />
            )}

            {selectedTab === 'solicitudes' && isSectionAllowed('solicitudes') && (
              <RequestsView />
            )}

            {selectedTab === 'tareas' && isSectionAllowed('tareas') && (
              <TasksView />
            )}

            {selectedTab === 'cronograma' && isSectionAllowed('cronograma') && (
              <CronogramaView />
            )}

            {selectedTab === 'horarios' && isSectionAllowed('horarios') && (
              <TechnicianSchedulesView />
            )}

            {selectedTab === 'usuarios' && isSectionAllowed('usuarios') && (
              <UsersView />
            )}

            {selectedTab === 'configuraciones' && isSectionAllowed('configuraciones') && (
              <SettingsView />
            )}

            {/* Fallback de seguridad anti-pantalla en blanco: si la pestaña no es válida o no está permitida */}
            {(!['dashboard', 'rondas', 'bitacora', 'contadores', 'bombas', 'hojas_vida', 'incidencias', 'preventivo', 'solicitudes', 'tareas', 'cronograma', 'horarios', 'usuarios', 'configuraciones'].includes(selectedTab) || !isSectionAllowed(selectedTab)) && (
              isSectionAllowed('dashboard') ? (
                <DashboardOverview 
                  onStartRound={handleStartRoundFromDashboard}
                  onNewPumpInspection={handleNewPumpInspectionFromDashboard}
                />
              ) : isSectionAllowed('rondas') ? (
                <DailyRoundsView />
              ) : isSectionAllowed('solicitudes') ? (
                <RequestsView />
              ) : isSectionAllowed('incidencias') ? (
                <IncidentsLiveView />
              ) : (
                <DailyRoundsView />
              )
            )}
          </Suspense>
        </ErrorBoundary>
      </main>

      {/* Global Real-Time Incident Report Modal */}
      <ReportIncidentModal />

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 text-xs py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            {settings?.hotelInfo?.hotelName && !settings.hotelInfo.hotelName.includes('Grand Horizon') ? settings.hotelInfo.hotelName : 'WAKE BIO HOTEL'} — Departamento de Ingeniería y Mantenimiento Hotelero.
          </p>
          <div className="flex items-center space-x-4 text-slate-500">
            <span>Rondas Técnicas Diarias</span>
            <span>•</span>
            <span>Supervisión de Bombas & Calderas</span>
            <span>•</span>
            <span>Gestión Preventiva</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MaintenanceProvider>
        <AppContent />
      </MaintenanceProvider>
    </ErrorBoundary>
  );
}
