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
          <div className="card-header" style={{ justifyContent: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600' }}>ตารางงานวันนี้</h2>
          </div>
          {localToday.length > 0 ? (
            <div className="schedule-list" style={{ 
              background: '#FFFFFF', 
              borderRadius: '12px',
              border: '1px solid var(--surface-border)',
              overflow: 'hidden'
            }}>
              {localToday.map((item, idx) => {
                 const date = new Date(item.datetime_iso);
                 const formatted = date.toLocaleString('th-TH', { hour: '2-digit', minute: '2-digit' });
                 return (
                   <div 
                     key={idx} 
                     onClick={() => handleToggle(item)}
                     style={{ 
                       padding: '16px', 
                       borderBottom: idx === localToday.length - 1 ? 'none' : '1px solid var(--surface-border)',
                       display: 'flex',
                       justifyContent: 'space-between',
                       alignItems: 'center',
                       cursor: 'pointer',
                       transition: 'background 0.2s',
                       backgroundColor: item.is_done ? '#FAFAFA' : '#FFFFFF'
                   }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                       {item.is_done ? (
                         <CheckCircle2 size={22} color="var(--primary)" />
                       ) : (
                         <Circle size={22} color="#C7C7CC" />
                       )}
                       <div style={{ 
                         fontWeight: item.is_done ? '400' : '500', 
                         fontSize: '15px',
                         color: item.is_done ? 'var(--text-muted)' : 'var(--text-main)',
                         textDecoration: item.is_done ? 'line-through' : 'none'
                       }}>
                         {item.title}
                       </div>
                     </div>
                     <div style={{ fontSize: '13px', color: item.is_done ? 'var(--text-muted)' : 'var(--primary)', fontWeight: '500' }}>
                       {formatted} น.
                     </div>
                   </div>
                 );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px', padding: '16px', background: '#FAFAFA', borderRadius: '12px', border: '1px solid var(--surface-border)' }}>
              วันนี้ว่างยาวๆ ไม่มีนัดเลยค่ะ 😴
            </div>
          )}
        </div>

        {data.upcomingSchedules && data.upcomingSchedules.length > 0 && (
          <div className="schedule-section" style={{ marginTop: '24px', marginBottom: '24px' }}>
            <div className="card-header" style={{ justifyContent: 'center', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '15px', color: 'var(--text-muted)', fontWeight: '500' }}>นัดหมายล่วงหน้า</h2>
            </div>
            <div className="schedule-list" style={{ 
              background: '#FFFFFF', 
              borderRadius: '12px',
              border: '1px solid var(--surface-border)',
              overflow: 'hidden'
            }}>
              {data.upcomingSchedules.map((item, idx) => {
                 const date = new Date(item.datetime_iso);
                 const formatted = date.toLocaleString('th-TH', { month: 'short', day: 'numeric' });
                 return (
                   <div key={`up-${idx}`} style={{ 
                     display: 'flex', justifyContent: 'space-between', padding: '14px 16px', 
                     borderBottom: idx === data.upcomingSchedules.length - 1 ? 'none' : '1px solid var(--surface-border)', 
                     fontSize: '14px',
                     alignItems: 'center'
                   }}>
                     <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                       <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#C7C7CC' }} />
                       {item.title}
                     </div>
                     <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{formatted}</div>
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
