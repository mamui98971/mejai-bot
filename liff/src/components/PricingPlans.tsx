import { Check, X, ArrowLeft, Star, Zap } from 'lucide-react';

interface PricingPlansProps {
  currentTier: 'free' | 'standard' | 'premium';
  onSelectTier: (tier: 'standard' | 'premium') => void;
  onBack: () => void;
}

export function PricingPlans({ currentTier, onSelectTier, onBack }: PricingPlansProps) {
  return (
    <div className="pricing-view slideUp" style={{ paddingBottom: '24px' }}>
      <div className="header-action" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px', height: '44px' }}>
        <button 
          onClick={onBack}
          style={{ 
            position: 'absolute', 
            left: 0, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            background: 'var(--surface-color)', 
            borderRadius: '50%', 
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)', 
            color: 'var(--text-main)', 
            border: '1px solid var(--surface-border)',
            cursor: 'pointer'
          }}
        >
          <ArrowLeft size={20} strokeWidth={2.5} />
        </button>
        <h1 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.5px', margin: 0 }}>อัปเกรดแพ็กเกจ</h1>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-1px', margin: '0 0 8px 0' }}>ปลดล็อกขีดจำกัด</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>เลือกแพ็กเกจที่เหมาะกับคุณ</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px', alignItems: 'stretch' }}>
        
        {/* Free Plan */}
        <div className="glass-card" style={{ position: 'relative', padding: '12px 8px', display: 'flex', flexDirection: 'column', border: currentTier === 'free' ? '2px solid var(--text-main)' : '1px solid var(--surface-border)' }}>
          {currentTier === 'free' && (
            <div style={{ position: 'absolute', top: 0, right: 0, background: 'var(--text-main)', color: 'white', fontSize: '8px', fontWeight: 700, padding: '2px 6px', borderBottomLeftRadius: '6px', textTransform: 'uppercase' }}>Current</div>
          )}
          <div style={{ marginBottom: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 2px 0' }}>Free</h3>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
              <span style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-1px' }}>฿0</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>/ด.</span>
            </div>
          </div>

          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 12px 0', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            <li style={{ display: 'flex', gap: '4px', alignItems: 'flex-start' }}>
              <Check size={12} style={{ color: 'var(--text-main)', marginTop: '2px', flexShrink: 0 }} />
              <span style={{ fontSize: '10px', lineHeight: '1.3' }}>ข้อความ 20/วัน</span>
            </li>
            <li style={{ display: 'flex', gap: '4px', alignItems: 'flex-start' }}>
              <Check size={12} style={{ color: 'var(--text-main)', marginTop: '2px', flexShrink: 0 }} />
              <span style={{ fontSize: '10px', lineHeight: '1.3' }}>จำได้ตลอดกาล</span>
            </li>
            <li style={{ display: 'flex', gap: '4px', alignItems: 'flex-start', opacity: 0.4 }}>
              <X size={12} style={{ color: 'var(--text-muted)', marginTop: '2px', flexShrink: 0 }} />
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', lineHeight: '1.3' }}>วิเคราะห์รูป/สลิป</span>
            </li>
            <li style={{ display: 'flex', gap: '4px', alignItems: 'flex-start', opacity: 0.4 }}>
              <X size={12} style={{ color: 'var(--text-muted)', marginTop: '2px', flexShrink: 0 }} />
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', lineHeight: '1.3' }}>ดูดวงอัตโนมัติ</span>
            </li>
            <li style={{ display: 'flex', gap: '4px', alignItems: 'flex-start', opacity: 0.4 }}>
              <X size={12} style={{ color: 'var(--text-muted)', marginTop: '2px', flexShrink: 0 }} />
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', lineHeight: '1.3' }}>แจ้งเตือนนัดหมาย</span>
            </li>
          </ul>

          <div style={{ marginTop: 'auto', padding: '8px 4px', fontSize: '11px', fontWeight: 600, color: 'var(--text-main)', textAlign: 'center', background: 'transparent', border: '1px solid var(--text-main)', borderRadius: '8px' }}>
            {currentTier === 'free' ? 'ปัจจุบัน' : 'ใช้ฟรี'}
          </div>
        </div>

        {/* Standard Plan */}
        <div className="glass-card" style={{ position: 'relative', padding: '12px 8px', display: 'flex', flexDirection: 'column', border: currentTier === 'standard' ? '2px solid var(--text-main)' : '1px solid var(--surface-border)' }}>
          {currentTier === 'standard' && (
            <div style={{ position: 'absolute', top: 0, right: 0, background: 'var(--text-main)', color: 'white', fontSize: '8px', fontWeight: 700, padding: '2px 6px', borderBottomLeftRadius: '6px', textTransform: 'uppercase' }}>Current</div>
          )}
          <div style={{ marginBottom: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 2px 0' }}>Standard</h3>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
              <span style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-1px' }}>฿49</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>/ด.</span>
            </div>
          </div>

          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 12px 0', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            <li style={{ display: 'flex', gap: '4px', alignItems: 'flex-start' }}>
              <Check size={12} style={{ color: 'var(--text-main)', marginTop: '2px', flexShrink: 0 }} />
              <span style={{ fontSize: '10px', lineHeight: '1.3' }}>ข้อความ 40/วัน</span>
            </li>
            <li style={{ display: 'flex', gap: '4px', alignItems: 'flex-start' }}>
              <Check size={12} style={{ color: 'var(--text-main)', marginTop: '2px', flexShrink: 0 }} />
              <span style={{ fontSize: '10px', lineHeight: '1.3' }}>จำได้ตลอดกาล</span>
            </li>
            <li style={{ display: 'flex', gap: '4px', alignItems: 'flex-start' }}>
              <Check size={12} style={{ color: 'var(--text-main)', marginTop: '2px', flexShrink: 0 }} />
              <span style={{ fontSize: '10px', lineHeight: '1.3' }}>วิเคราะห์รูป/สลิป</span>
            </li>
            <li style={{ display: 'flex', gap: '4px', alignItems: 'flex-start', opacity: 0.4 }}>
              <X size={12} style={{ color: 'var(--text-muted)', marginTop: '2px', flexShrink: 0 }} />
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', lineHeight: '1.3' }}>ดูดวงอัตโนมัติ</span>
            </li>
            <li style={{ display: 'flex', gap: '4px', alignItems: 'flex-start', opacity: 0.4 }}>
              <X size={12} style={{ color: 'var(--text-muted)', marginTop: '2px', flexShrink: 0 }} />
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', lineHeight: '1.3' }}>แจ้งเตือนนัดหมาย</span>
            </li>
          </ul>

          {currentTier === 'free' ? (
            <button 
              onClick={() => onSelectTier('standard')}
              style={{ width: '100%', padding: '8px 4px', borderRadius: '8px', background: '#F2F2F7', color: 'var(--text-main)', fontSize: '11px', fontWeight: 600, border: 'none', cursor: 'pointer', marginTop: 'auto' }}
            >
              อัปเกรด
            </button>
          ) : (
            <div style={{ marginTop: 'auto', padding: '8px 4px', fontSize: '11px', fontWeight: 600, color: 'var(--text-main)', textAlign: 'center', background: 'transparent', border: '1px solid var(--text-main)', borderRadius: '8px' }}>
              ปัจจุบัน
            </div>
          )}
        </div>

        {/* Premium Plan (Black Card) */}
        <div className="glass-card" style={{ position: 'relative', padding: '12px 8px', display: 'flex', flexDirection: 'column', background: '#111111', color: 'white', border: 'none' }}>
          <div style={{ position: 'absolute', top: 0, right: 0, background: 'linear-gradient(135deg, #FFD700, #FFA500)', color: '#000', fontSize: '8px', fontWeight: 800, padding: '2px 6px', borderBottomLeftRadius: '6px', textTransform: 'uppercase' }}>แนะนำ</div>
          
          <div style={{ marginBottom: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 2px 0', display: 'flex', alignItems: 'center', gap: '2px' }}>
              Premium <Star size={12} fill="#FFD700" color="#FFD700" />
            </h3>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
              <span style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-1px' }}>
                {currentTier === 'standard' ? '฿40' : '฿89'}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '10px' }}>/ด.</span>
            </div>
            {currentTier === 'standard' && (
              <p style={{ fontSize: '8px', color: '#FFD700', margin: '2px 0 0 0' }}>*ราคาอัปเกรด</p>
            )}
          </div>

          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 12px 0', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            <li style={{ display: 'flex', gap: '4px', alignItems: 'flex-start' }}>
              <Check size={12} style={{ color: '#FFD700', marginTop: '2px', flexShrink: 0 }} />
              <span style={{ fontSize: '10px', lineHeight: '1.3' }}>ข้อความ <strong style={{ color: '#FFD700' }}>100/วัน</strong></span>
            </li>
            <li style={{ display: 'flex', gap: '4px', alignItems: 'flex-start' }}>
              <Check size={12} style={{ color: '#FFD700', marginTop: '2px', flexShrink: 0 }} />
              <span style={{ fontSize: '10px', lineHeight: '1.3' }}>จำได้ <strong style={{ color: '#FFD700' }}>ตลอดกาล</strong></span>
            </li>
            <li style={{ display: 'flex', gap: '4px', alignItems: 'flex-start' }}>
              <Check size={12} style={{ color: '#FFD700', marginTop: '2px', flexShrink: 0 }} />
              <span style={{ fontSize: '10px', lineHeight: '1.3' }}>วิเคราะห์รูป/สลิป</span>
            </li>
            <li style={{ display: 'flex', gap: '4px', alignItems: 'flex-start' }}>
              <Zap size={12} fill="#FFD700" color="#FFD700" style={{ marginTop: '2px', flexShrink: 0 }} />
              <span style={{ fontSize: '10px', lineHeight: '1.3' }}>ดูดวงอัตโนมัติแม่น</span>
            </li>
            <li style={{ display: 'flex', gap: '4px', alignItems: 'flex-start' }}>
              <Zap size={12} fill="#FFD700" color="#FFD700" style={{ marginTop: '2px', flexShrink: 0 }} />
              <span style={{ fontSize: '10px', lineHeight: '1.3' }}>แจ้งเตือนล่วงหน้า</span>
            </li>
          </ul>

          {currentTier !== 'premium' ? (
            <button 
              onClick={() => onSelectTier('premium')}
              style={{ width: '100%', padding: '8px 4px', borderRadius: '8px', background: 'white', color: '#111111', fontSize: '11px', fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 'auto' }}
            >
              {currentTier === 'standard' ? 'อัปเกรด Premium' : 'เลือก Premium'}
            </button>
          ) : (
            <div style={{ marginTop: 'auto', padding: '8px 4px', fontSize: '11px', fontWeight: 700, color: '#111111', background: '#FFD700', textAlign: 'center', borderRadius: '8px' }}>
              ใช้งานอยู่
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: '24px', padding: '16px', background: 'var(--surface-color)', borderRadius: '16px', border: '1px solid var(--surface-border)' }}>
        <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 12px 0', textAlign: 'center', color: 'var(--text-main)' }}>ฟีเจอร์พื้นฐานที่มีในทุกแพ็กเกจ</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Check size={14} style={{ color: 'var(--text-main)' }} />
            <span style={{ fontSize: '12px', color: 'var(--text-main)' }}>ระบบความสัมพันธ์</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Check size={14} style={{ color: 'var(--text-main)' }} />
            <span style={{ fontSize: '12px', color: 'var(--text-main)' }}>สรุปรายจ่ายต่อวัน</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Check size={14} style={{ color: 'var(--text-main)' }} />
            <span style={{ fontSize: '12px', color: 'var(--text-main)' }}>ระบบโภชนาการ</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Check size={14} style={{ color: 'var(--text-main)' }} />
            <span style={{ fontSize: '12px', color: 'var(--text-main)' }}>เป้าหมายแต่ละวัน</span>
          </div>
        </div>
      </div>

    </div>
  );
}
