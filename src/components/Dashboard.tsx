
import { Wallet, CheckCircle2, Circle, MessageCircle } from 'lucide-react';
import liff from '@line/liff';
import { toggleScheduleDone } from '../api/client';
import type { DashboardData } from '../api/client';
import { ProgressBar } from './ProgressBar';
import { useState, useEffect } from 'react';

interface DashboardProps {
  data: DashboardData;
}

const STATUS_MAP: Record<string, string> = {
  stranger: 'คนแปลกหน้า',
  acquaintance: 'คนรู้จัก',
  friend: 'เพื่อน',
  close_friend: 'เพื่อนสนิท',
  soulmate: 'คนรู้ใจ',
};

export function Dashboard({ data }: DashboardProps) {
  const { relationship, stats } = data;
  const displayStatus = STATUS_MAP[relationship.status?.toLowerCase()] || relationship.status;
  const remainingBudget = (data.user.monthlyBudget || 0) - (stats.monthlyExpense || 0);

  const [localToday, setLocalToday] = useState(data.todaySchedules || []);
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);

  useEffect(() => {
    setLocalToday(data.todaySchedules || []);
  }, [data.todaySchedules]);

  const handleToggle = async (item: any) => {
    const newStatus = !item.is_done;
    setLocalToday(prev => prev.map(s => s.id === item.id ? { ...s, is_done: newStatus } : s));
    try {
      await toggleScheduleDone(item.id, { title: item.title, datetime_iso: item.datetime_iso, is_done: newStatus }, newStatus);
    } catch (err) {
      console.error(err);
      setLocalToday(prev => prev.map(s => s.id === item.id ? { ...s, is_done: item.is_done } : s));
    }
  };

  return (
    <div className="dashboard-view fadeIn">
      <div className="glass-card">
        <div className="card-header" style={{ justifyContent: 'center' }}>
          <h2>ความสัมพันธ์ ({relationship.bot_name || 'เมใจ'})</h2>
        </div>
        <div className="stats-grid mb-24">
          <div className="stat-box"><span className="stat-label">สถานะ</span><span className="stat-value primary">{displayStatus}</span></div>
          <div className="stat-box"><span className="stat-label">ความสนิท</span><span className="stat-value">{relationship.affinityScore}/100</span></div>
        </div>

        <div className="card-header" style={{ marginTop: '8px', justifyContent: 'center' }}><h2>สรุปวันนี้</h2></div>
        <div className="stats-grid mb-16">
          <div className="stat-box">
            <div className="stat-label-row"><Wallet size={16} color="var(--text-muted)" /><span className="stat-label">รายจ่ายวันนี้</span></div>
            <span className="stat-value cyan">฿{stats.dailyExpense.toLocaleString()}</span>
          </div>
          <div className="stat-box">
            <div className="stat-label-row"><span className="stat-label">งบประมาณคงเหลือ</span></div>
            <span className={`stat-value ${remainingBudget < 0 ? 'red' : 'purple'}`}>฿{remainingBudget.toLocaleString()}</span>
          </div>
        </div>

        <div className="nutrition-section">
          <h3 className="section-subtitle">โภชนาการ</h3>
          <ProgressBar label="พลังงาน (Calories)" current={stats.dailyCalories} max={2000} unit="kcal" color="#FF9500" />
          <ProgressBar label="โปรตีน (Protein)" current={stats.dailyProtein} max={120} unit="g" color="var(--accent-purple)" />
          <ProgressBar label="โซเดียม (Sodium)" current={stats.dailySodium} max={2300} unit="mg" color="var(--accent-cyan)" isWarning />
        </div>

        <div className="schedule-section" style={{ marginTop: '24px' }}>
          <div className="card-header" style={{ justifyContent: 'space-between', marginBottom: '16px', display: 'flex', alignItems: 'center' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', letterSpacing: '-0.5px' }}>วันนี้มีอะไรบ้าง?</h2>
            {localToday.length > 0 && (
              <span style={{ fontSize: '12px', background: 'var(--bg-color)', color: 'var(--text-muted)', padding: '4px 10px', borderRadius: '100px', fontWeight: '600' }}>
                {localToday.filter((s: any) => s.is_done).length}/{localToday.length}
              </span>
            )}
          </div>
          {localToday.length > 0 ? (
            <div className="schedule-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {localToday.map((item, idx) => {
                 const date = new Date(item.datetime_iso);
                 const isPastDay = date.toDateString() !== new Date().toDateString();
                 const formatted = isPastDay 
                   ? date.toLocaleString('th-TH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                   : date.toLocaleString('th-TH', { hour: '2-digit', minute: '2-digit' });
                 return (
                   <div 
                     key={idx} 
                     onClick={() => handleToggle(item)}
                     style={{ 
                       background: item.is_done ? '#F9F9FB' : '#FFFFFF', 
                       border: item.is_done ? '1px solid #F0F0F0' : '1px solid #EAEAEA',
                       boxShadow: item.is_done ? 'none' : '0 2px 8px rgba(0,0,0,0.03)',
                       borderRadius: '14px', 
                       padding: '10px 16px', 
                       display: 'flex',
                       justifyContent: 'space-between',
                       alignItems: 'center',
                       cursor: 'pointer',
                       transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                       transform: 'translateY(0)'
                   }}>
                     <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                         {item.is_done ? (
                           <div style={{ background: 'rgba(52, 199, 89, 0.1)', borderRadius: '50%', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                             <CheckCircle2 size={18} color="var(--success-green)" strokeWidth={2.5} />
                           </div>
                         ) : (
                           <div style={{ padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                             <Circle size={22} color="#D1D1D6" strokeWidth={2} />
                           </div>
                         )}
                         <span style={{ 
                           fontWeight: item.is_done ? '500' : '600', 
                           fontSize: '15px',
                           letterSpacing: '-0.2px',
                           color: item.is_done ? '#A1A1A6' : (isPastDay ? '#FF3B30' : '#1C1C1E'),
                           textDecoration: item.is_done ? 'line-through' : 'none',
                           transition: 'all 0.2s'
                         }}>
                           {item.title}
                         </span>
                       </div>
                       <span style={{ fontSize: '13px', color: item.is_done ? '#A1A1A6' : (isPastDay ? '#FF3B30' : '#1C1C1E'), fontWeight: '600', flexShrink: 0 }}>
                         {formatted} น.
                       </span>
                     </div>
                   </div>
                 );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px', padding: '20px', background: '#FAFAFA', borderRadius: '16px', border: '1px dashed #E5E5EA' }}>
              วันนี้ว่างยาวๆ ไม่มีนัดเลยค่ะ 😴
            </div>
          )}
        </div>

        {data.upcomingSchedules && data.upcomingSchedules.length > 0 && (
          <>
            <div 
              onClick={() => setShowAllUpcoming(true)}
              style={{
                marginTop: '32px',
                marginBottom: '24px',
                background: '#F2F2F7',
                borderRadius: '16px',
                padding: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                border: '1px solid rgba(0,0,0,0.04)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  background: '#FF3B30',
                  color: 'white',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  {data.upcomingSchedules.length}
                </div>
                <span style={{ fontSize: '15px', fontWeight: '600', color: '#1C1C1E' }}>
                  เช็คนัดหมายล่วงหน้า
                </span>
              </div>
              <div style={{ color: '#8E8E93' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </div>
            </div>

            {/* Modal */}
            {showAllUpcoming && (
              <div style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '20px',
                animation: 'fadeIn 0.2s ease-out'
              }}>
                <div style={{
                  background: '#FFFFFF',
                  borderRadius: '24px',
                  width: '100%',
                  maxWidth: '400px',
                  maxHeight: '80vh',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
                }}>
                  <div style={{ padding: '20px', borderBottom: '1px solid #F2F2F7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#1C1C1E', margin: 0 }}>นัดหมายล่วงหน้า</h2>
                    <button 
                      onClick={() => setShowAllUpcoming(false)}
                      style={{ background: '#F2F2F7', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8E8E93', cursor: 'pointer' }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                  </div>
                  
                  <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {data.upcomingSchedules.map((item, idx) => {
                       const date = new Date(item.datetime_iso);
                       const formatted = date.toLocaleString('th-TH', { month: 'short', day: 'numeric' });
                       return (
                         <div key={`modal-up-${idx}`} style={{ 
                           display: 'flex', justifyContent: 'space-between', padding: '16px', 
                           background: '#F2F2F7',
                           borderRadius: '16px',
                           fontSize: '14px',
                           alignItems: 'center'
                         }}>
                           <div style={{ color: '#1C1C1E', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: '600' }}>
                             <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#D1D1D6' }} />
                             {item.title}
                           </div>
                           <div style={{ color: '#FF3B30', fontSize: '13px', fontWeight: '600' }}>{formatted}</div>
                         </div>
                       );
                    })}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
