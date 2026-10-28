import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { PengajuanView } from './components/PengajuanView';
import { TrackingView } from './components/TrackingView';
import { ApprovalView } from './components/ApprovalView';
import { LoginView } from './components/LoginView';
import { FullScreenPdfViewer } from './components/FullScreenPdfViewer';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

const MainContent: React.FC = () => {
  const { isLoggedIn, activeTab, notification, fullScreenPreviewRequest, setFullScreenPreviewRequest } = useApp();
  
  if (!isLoggedIn) {
    return <LoginView />;
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-neutral-50/70 text-neutral-900">
      <Header />
      <main className="flex-1 pb-16">
        {activeTab === 'pengajuan' && <PengajuanView />}
        {activeTab === 'tracking' && <TrackingView />}
        {activeTab === 'approval' && <ApprovalView />}
      </main>
      
      {fullScreenPreviewRequest && (
        <FullScreenPdfViewer
          request={fullScreenPreviewRequest}
          onClose={() => setFullScreenPreviewRequest(null)}
        />
      )}
      
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 transition-all animate-bounce-subtle">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-xs font-medium max-w-md ${
              notification.type === 'error'
                ? 'bg-rose-50 text-rose-900 border-rose-200'
                : notification.type === 'info'
                ? 'bg-blue-50 text-blue-900 border-blue-200'
                : 'bg-emerald-50 text-emerald-900 border-emerald-200'
            }`}
          >
            {notification.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : notification.type === 'info' ? (
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
        </div>
      )}
      
      <footer className="border-t border-neutral-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <div>
            <span className="font-semibold text-neutral-700">Approval Management System (AMS)</span>
          </div>
          <div>
            <span>&copy; {new Date().getFullYear()} AMS</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}