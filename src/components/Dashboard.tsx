import { Wallet, CheckCircle2, Circle } from 'lucide-react';
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
            <div className="schedule-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                       boxShadow: item.is_done ? 'none' : '0 4px 16px rgba(0,0,0,0.04)',
                       borderRadius: '18px', 
                       padding: '16px 20px', 
                       display: 'flex',
                       justifyContent: 'space-between',
                       alignItems: 'center',
                       cursor: 'pointer',
                       transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                       transform: 'translateY(0)'
                   }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                       {item.is_done ? (
                         <div style={{ background: 'rgba(52, 199, 89, 0.1)', borderRadius: '50%', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                           <CheckCircle2 size={20} color="var(--success-green)" strokeWidth={2.5} />
                         </div>
                       ) : (
                         <div style={{ padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                           <Circle size={24} color="#D1D1D6" strokeWidth={2} />
                         </div>
                       )}
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                         <span style={{ 
                           fontWeight: item.is_done ? '500' : '600', 
                           fontSize: '16px',
                           letterSpacing: '-0.3px',
                           color: item.is_done ? '#A1A1A6' : (isPastDay ? '#FF3B30' : '#1C1C1E'),
                           textDecoration: item.is_done ? 'line-through' : 'none',
                           transition: 'all 0.2s'
                         }}>
                           {item.title}
                         </span>
                         <span style={{ fontSize: '13px', color: item.is_done ? '#D1D1D6' : (isPastDay ? '#FF3B30' : 'var(--primary)'), fontWeight: '600' }}>
                           {formatted} น.
                         </span>
                       </div>
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
          <div className="schedule-section" style={{ marginTop: '32px', marginBottom: '24px' }}>
            <div className="card-header" style={{ justifyContent: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase' }}>นัดหมายล่วงหน้า</h2>
            </div>
            <div className="schedule-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {data.upcomingSchedules.map((item, idx) => {
                 const date = new Date(item.datetime_iso);
                 const formatted = date.toLocaleString('th-TH', { month: 'short', day: 'numeric' });
                 return (
                   <div key={`up-${idx}`} style={{ 
                     display: 'flex', justifyContent: 'space-between', padding: '12px 16px', 
                     background: '#F2F2F7',
                     borderRadius: '14px',
                     fontSize: '14px',
                     alignItems: 'center',
                     border: '1px solid rgba(0,0,0,0.02)'
                   }}>
                     <div style={{ color: '#666666', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '500' }}>
                       <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#D1D1D6' }} />
                       {item.title}
                     </div>
                     <div style={{ color: '#8E8E93', fontSize: '13px', fontWeight: '600' }}>{formatted}</div>
                   </div>
                 );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
