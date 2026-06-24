import { useEffect, useState } from 'react';
import liff from '@line/liff';
import './index.css';
import { fetchDashboardData } from './api/client';
import type { DashboardData } from './api/client';
import { Dashboard } from './components/Dashboard';
import { PricingPlans } from './components/PricingPlans';
import { PaymentPortal } from './components/PaymentPortal';
import { SettingsForm } from './components/SettingsForm';
import { Settings } from 'lucide-react';

type ViewState = 'loading' | 'dashboard' | 'pricing' | 'payment' | 'error' | 'settings';

function App() {
  const [view, setView] = useState<ViewState>('loading');
  const [data, setData] = useState<DashboardData | null>(null);
  const [selectedTier, setSelectedTier] = useState<'standard' | 'premium'>('premium');

  useEffect(() => {
    async function init() {
      try {
        const liffId = import.meta.env.VITE_LINE_LIFF_ID;
        if (!liffId) {
          throw new Error('Missing VITE_LINE_LIFF_ID');
        }

        await liff.init({ liffId });

        if (!liff.isLoggedIn()) {
          liff.login({ redirectUri: window.location.href });
          return;
        }

        const dashboardData = await fetchDashboardData() as DashboardData;
        setData(dashboardData);

        const urlParams = new URLSearchParams(window.location.search);
        const requestedView = urlParams.get('view');

        if (requestedView === 'settings') {
          setView('settings');
        } else {
          setView('dashboard');
        }
      } catch (err) {
        console.error('Initialization failed completely', err);
        setView('error');
      }
    }
    init();
  }, []);

  if (view === 'loading') {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
        <p className="mt-16 tracking-wide">Syncing with Mejai...</p>
      </div>
    );
  }

  if (view === 'error') {
    return (
      <div className="loader-container">
        <p className="warning-text">LIFF is not configured or the online API is unreachable.</p>
        <button 
          onClick={() => {
            liff.logout();
            window.location.reload();
          }}
          style={{ marginTop: '20px', padding: '10px 20px', background: '#1C1C1E', color: '#FFFFFF', borderRadius: '12px', fontWeight: '600' }}
        >
          รีเซ็ตการเข้าสู่ระบบ (Reset Login)
        </button>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Header Profile */}
      <div className="glass-card header-profile slideDown">
        <img 
          src={liff.isLoggedIn() ? liff.getDecodedIDToken()?.picture : 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mejai&backgroundColor=f06292'} 
          alt="Profile" 
          className="profile-avatar"
        />
        <div className="profile-info" style={{ minWidth: 0 }}>
          <h1 style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{data?.relationship?.bot_name || 'เมใจ'}</h1>
          <p>{data?.user?.tier === 'premium' ? 'Premium Member' : data?.user?.tier === 'standard' ? 'Standard Member' : 'Free Tier'}</p>
        </div>
        
        {data?.user?.tier !== 'premium' && (
          <button 
            className="upgrade-pill"
            onClick={(e) => {
              e.stopPropagation();
              setView('pricing');
            }}
          >
            UPGRADE
          </button>
        )}

        <div 
          onClick={() => setView('settings')}
          style={{ marginLeft: 'auto', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', paddingRight: '4px', cursor: 'pointer' }}
        >
          <Settings size={22} />
        </div>
      </div>

      {view === 'dashboard' && data && (
        <Dashboard 
          data={data} 
        />
      )}

      {view === 'settings' && data && (
        <SettingsForm 
          data={data} 
          onBack={() => setView('dashboard')} 
        />
      )}

      {view === 'pricing' && (
        <PricingPlans 
          currentTier={data?.user?.tier || 'free'}
          onSelectTier={(tier: 'standard' | 'premium') => {
            setSelectedTier(tier);
            setView('payment');
          }}
          onBack={() => setView('dashboard')}
        />
      )}

      {view === 'payment' && (
        <PaymentPortal 
          tier={selectedTier}
          onBack={() => setView('pricing')} 
        />
      )}

      {/* Close LIFF Action */}
      {view === 'dashboard' && liff.isInClient() && (
        <button 
          className="btn-primary slideUp"
          onClick={() => liff.closeWindow()}
          style={{ 
            marginTop: '-12px',
            background: '#1C1C1E', // sleek black
            color: '#FFFFFF',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 8px 16px rgba(0,0,0,0.15)'
          }}
        >
          กลับไปคุยกับ{data?.relationship?.bot_name || 'เมใจ'}
        </button>
      )}
    </div>
  );
}

export default App;
