import { Wallet } from 'lucide-react';
import type { DashboardData } from '../api/client';
import { ProgressBar } from './ProgressBar';

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

        <div className="schedule-section" style={{ marginTop: '16px' }}>
          <div className="card-header" style={{ justifyContent: 'center', marginBottom: '12px' }}>
            <h2>ตารางงาน (Upcoming)</h2>
          </div>
          {data.upcomingSchedules && data.upcomingSchedules.length > 0 ? (
            <div className="schedule-list">
              {data.upcomingSchedules.map((item, idx) => {
                 const date = new Date(item.datetime_iso);
                 const formatted = date.toLocaleString('th-TH', { 
                   month: 'short', 
                   day: 'numeric', 
                   hour: '2-digit', 
                   minute: '2-digit' 
                 });
                 return (
                   <div key={idx} className="schedule-item" style={{ 
                     background: 'rgba(255,255,255,0.05)', 
                     padding: '12px 16px', 
                     borderRadius: '12px', 
                     marginBottom: '8px',
                     display: 'flex',
                     justifyContent: 'space-between',
                     alignItems: 'center'
                   }}>
                     <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>{item.title}</div>
                     <div style={{ fontSize: '0.85rem', color: 'var(--accent-purple)', fontWeight: '500' }}>{formatted} น.</div>
                   </div>
                 );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
              ยังไม่มีนัดหมายเร็วๆ นี้ค่ะ 😴
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
