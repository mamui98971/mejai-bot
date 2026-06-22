import { useEffect, useState } from 'react';
import liff from '@line/liff';
import { Sparkles, Wallet, Flame, Heart, Activity } from 'lucide-react';
import './index.css';

function App() {
  const [profile, setProfile] = useState<{ displayName: string; pictureUrl?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initLiff() {
      try {
        // We use a dummy ID here, in real app we inject LINE_LIFF_ID from .env
        await liff.init({ liffId: import.meta.env.VITE_LINE_LIFF_ID || 'dummy-liff-id' });
        if (liff.isLoggedIn()) {
          const p = await liff.getProfile();
          setProfile({ displayName: p.displayName, pictureUrl: p.pictureUrl });
        } else {
          // Mock data for local testing
          setProfile({ 
            displayName: 'Nick', 
            pictureUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Nick'
          });
        }
      } catch (err) {
        console.error('LIFF init failed', err);
        setProfile({ displayName: 'Guest' });
      } finally {
        setLoading(false);
      }
    }
    initLiff();
  }, []);

  if (loading) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
        <p>Loading Mejai...</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Header Profile */}
      <div className="glass-card header-profile">
        <img 
          src={profile?.pictureUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Guest'} 
          alt="Profile" 
          className="profile-avatar"
        />
        <div className="profile-info">
          <h1>{profile?.displayName}</h1>
          <p>Premium Member 💎</p>
        </div>
      </div>

      {/* Relationship & Status */}
      <div className="glass-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <Heart color="var(--primary)" size={24} />
          <h2 style={{ fontSize: '18px', fontWeight: '600' }}>ความสัมพันธ์ (Mejai)</h2>
        </div>
        <div className="stats-grid">
          <div className="stat-box">
            <span className="stat-label">สถานะ</span>
            <span className="stat-value primary">คนรู้ใจ 💕</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">ความสนิท</span>
            <span className="stat-value">92/100</span>
          </div>
        </div>
      </div>

      {/* Daily Summary */}
      <div className="glass-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <Activity color="var(--accent-cyan)" size={24} />
          <h2 style={{ fontSize: '18px', fontWeight: '600' }}>สรุปวันนี้</h2>
        </div>
        <div className="stats-grid">
          <div className="stat-box">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Wallet size={16} color="var(--text-muted)" />
              <span className="stat-label">ใช้จ่ายไป</span>
            </div>
            <span className="stat-value cyan">฿450</span>
          </div>
          <div className="stat-box">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Flame size={16} color="var(--text-muted)" />
              <span className="stat-label">แคลอรี่</span>
            </div>
            <span className="stat-value">1,240 <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>kcal</span></span>
          </div>
        </div>
      </div>

      {/* Action */}
      <button 
        className="btn-primary"
        onClick={() => liff.closeWindow()}
      >
        <Sparkles size={20} />
        กลับไปคุยกับเมใจ
      </button>
    </div>
  );
}

export default App;
