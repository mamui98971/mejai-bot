import React, { useState } from 'react';
import { ArrowLeft, User as UserIcon, Bot, ChevronDown, Check } from 'lucide-react';
import { updateSettings } from '../api/client';
import type { DashboardData } from '../api/client';

interface SettingsFormProps {
  data: DashboardData | null;
  onBack: () => void;
}

export function SettingsForm({ data, onBack }: SettingsFormProps) {
  const [activeTab, setActiveTab] = useState<'user' | 'ai'>('user');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // Parse birthdate
  const initialDate = data?.user?.birthdate ? new Date(data.user.birthdate) : null;
  const [dob, setDob] = useState({
    day: initialDate ? String(initialDate.getDate()) : '',
    month: initialDate ? String(initialDate.getMonth() + 1) : '',
    year: initialDate ? String(initialDate.getFullYear()) : ''
  });

  const [userProfile, setUserProfile] = useState({
    display_name: data?.user?.displayName || '',
    gender: data?.user?.gender || '',
    weight: data?.user?.weight ? String(data.user.weight) : '',
    height: data?.user?.height ? String(data.user.height) : '',
    goal: data?.user?.goal || '',
    monthly_budget: data?.user?.monthlyBudget ? String(data.user.monthlyBudget) : '',
  });

  const [aiPersona, setAiPersona] = useState({
    bot_name: data?.relationship?.bot_name || 'เมใจ',
    bot_age: String(data?.relationship?.bot_age || 22),
    bot_personality: data?.relationship?.bot_personality || '',
  });

  // Custom Dropdown state
  const [isGoalOpen, setIsGoalOpen] = useState(false);
  const goalOptions = [
    { value: '', label: '-- ไม่ระบุ --', color: 'var(--text-muted)' },
    { value: 'ผอม', label: 'ลดน้ำหนัก (อยากผอม)', color: 'var(--primary)' },
    { value: 'สมส่วน', label: 'รักษารูปร่าง (อยากสมส่วน)', color: 'var(--accent-purple)' },
    { value: 'อ้วน', label: 'เพิ่มน้ำหนัก (อยากอ้วน)', color: '#FF9500' } // iOS Orange
  ];

  const handleUserChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setUserProfile({ ...userProfile, [e.target.name]: e.target.value });
  };

  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDob({ ...dob, [e.target.name]: e.target.value });
  };

  const handleAiChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setAiPersona({ ...aiPersona, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);

    let calculatedAge = null;
    let birthdateStr = null;
    
    // Construct birthdate and calculate age
    if (dob.day && dob.month && dob.year) {
      birthdateStr = `${dob.year}-${dob.month.padStart(2, '0')}-${dob.day.padStart(2, '0')}`;
      const birthDate = new Date(birthdateStr);
      if (!isNaN(birthDate.getTime())) {
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        calculatedAge = age;
      }
    }

    try {
      await updateSettings(
        {
          display_name: userProfile.display_name || undefined,
          gender: userProfile.gender || undefined,
          birthdate: birthdateStr || undefined,
          age: calculatedAge || undefined,
          weight: userProfile.weight ? parseFloat(userProfile.weight) : undefined,
          height: userProfile.height ? parseFloat(userProfile.height) : undefined,
          goal: userProfile.goal === 'ผอม' || userProfile.goal === 'สมส่วน' || userProfile.goal === 'อ้วน' ? userProfile.goal : undefined,
          monthly_budget: userProfile.monthly_budget ? parseInt(userProfile.monthly_budget) : undefined,
        },
        {
          bot_name: aiPersona.bot_name || undefined,
          bot_age: aiPersona.bot_age ? parseInt(aiPersona.bot_age) : undefined,
          bot_personality: aiPersona.bot_personality || undefined,
        }
      );
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onBack(); // Go back to dashboard automatically on success
      }, 1500);
    } catch (err) {
      console.error('Failed to save settings:', err);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setSaving(false);
    }
  };

  const currentGoalOption = goalOptions.find(opt => opt.value === userProfile.goal) || goalOptions[0];

  return (
    <div className="slideUp">
      <div className="header-action" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', height: '44px' }}>
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
        <h1 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.5px', margin: 0 }}>ตั้งค่าตัวตน</h1>
      </div>

      <div className="glass-card">
        <div className="ios-segmented-control">
          <div 
            className={`ios-segment ${activeTab === 'user' ? 'active' : ''}`}
            onClick={() => setActiveTab('user')}
          >
            <UserIcon size={16} /> ข้อมูลผู้ใช้
          </div>
          <div 
            className={`ios-segment ${activeTab === 'ai' ? 'active' : ''}`}
            onClick={() => setActiveTab('ai')}
          >
            <Bot size={16} /> คู่สนทนา (AI)
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          
          {activeTab === 'user' && (
            <div className="fadeIn">
              <div className="ios-input-group">
                <label className="ios-label">ชื่อผู้ใช้ (ให้ AI เรียก)</label>
                <input className="ios-input" name="display_name" value={userProfile.display_name} onChange={handleUserChange} placeholder="ป้อนชื่อของคุณ" />
              </div>
              
              <div className="ios-input-group">
                <label className="ios-label">วันเดือนปีเกิด (ค.ศ.)</label>
                <div className="ios-input-row">
                  <input className="ios-input" type="number" name="day" placeholder="วัน" value={dob.day} onChange={handleDobChange} min="1" max="31" style={{ flex: 1, textAlign: 'center', padding: '14px 8px' }} />
                  <input className="ios-input" type="number" name="month" placeholder="เดือน" value={dob.month} onChange={handleDobChange} min="1" max="12" style={{ flex: 1, textAlign: 'center', padding: '14px 8px' }} />
                  <input className="ios-input" type="number" name="year" placeholder="ปี ค.ศ." value={dob.year} onChange={handleDobChange} min="1900" max="2100" style={{ flex: 1.2, textAlign: 'center', padding: '14px 8px' }} />
                </div>
              </div>
              
              <div className="ios-input-group">
                <label className="ios-label">เพศ</label>
                <input className="ios-input" name="gender" placeholder="เช่น ชาย, หญิง, อื่นๆ" value={userProfile.gender} onChange={handleUserChange} />
              </div>

              <div className="ios-input-row">
                <div className="ios-input-group" style={{ flex: 1 }}>
                  <label className="ios-label">น้ำหนัก (kg)</label>
                  <input className="ios-input" type="number" step="0.1" name="weight" placeholder="0.0" value={userProfile.weight} onChange={handleUserChange} />
                </div>
                <div className="ios-input-group" style={{ flex: 1 }}>
                  <label className="ios-label">ส่วนสูง (cm)</label>
                  <input className="ios-input" type="number" step="0.1" name="height" placeholder="0.0" value={userProfile.height} onChange={handleUserChange} />
                </div>
              </div>

              <div className="ios-input-group">
                <label className="ios-label">งบประมาณใช้จ่ายต่อเดือน</label>
                <input className="ios-input" type="number" name="monthly_budget" placeholder="เช่น 15000" value={userProfile.monthly_budget} onChange={handleUserChange} />
              </div>

              <div className="ios-input-group" style={{ position: 'relative' }}>
                <label className="ios-label">เป้าหมายโภชนาการ</label>
                <div 
                  className="ios-select-dropdown"
                  onClick={() => setIsGoalOpen(!isGoalOpen)}
                  style={{ color: currentGoalOption.color }}
                >
                  <span>{currentGoalOption.label}</span>
                  <ChevronDown size={20} style={{ transform: isGoalOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.3s ease', color: 'var(--text-muted)' }} />
                </div>
                
                {isGoalOpen && (
                  <div className="ios-dropdown-menu slideDown">
                    {goalOptions.map((opt) => (
                      <div 
                        key={opt.value}
                        className="ios-dropdown-item"
                        onClick={() => {
                          setUserProfile({ ...userProfile, goal: opt.value });
                          setIsGoalOpen(false);
                        }}
                      >
                        <span style={{ color: opt.color, fontWeight: userProfile.goal === opt.value ? 600 : 400 }}>{opt.label}</span>
                        {userProfile.goal === opt.value && <Check size={20} color={opt.color} />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="fadeIn">
              <div className="ios-input-group">
                <label className="ios-label">ชื่อ AI</label>
                <input className="ios-input" name="bot_name" value={aiPersona.bot_name} onChange={handleAiChange} placeholder="ตั้งชื่อคู่สนทนา" />
              </div>
              
              <div className="ios-input-group">
                <label className="ios-label">อายุ AI (ปี)</label>
                <input className="ios-input" type="number" name="bot_age" value={aiPersona.bot_age} onChange={handleAiChange} placeholder="22" />
              </div>

              <div className="ios-input-group">
                <label className="ios-label">นิสัย / คาร์แรคเตอร์</label>
                <textarea 
                  className="ios-input"
                  name="bot_personality" 
                  value={aiPersona.bot_personality} 
                  onChange={handleAiChange} 
                  rows={5}
                  placeholder="เช่น เป็นสาวใช้ซึนเดเระ, หรือรุ่นพี่มหาลัยสุดหล่อ..."
                  style={{ resize: 'none' }} 
                />
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', paddingLeft: '8px' }}>* ระบบจะบังคับให้ AI สวมบทบาทตามที่ระบุไว้</p>
              </div>
            </div>
          )}

          <button 
            type="submit" 
            className="btn-premium" 
            disabled={saving}
            style={{ marginTop: '24px' }}
          >
            {saving ? (
              <span className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px', borderTopColor: 'white' }}></span>
            ) : success ? (
              <>
                <Check size={20} /> บันทึกสำเร็จ
              </>
            ) : (
              'บันทึกการตั้งค่า'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
