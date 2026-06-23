import { useEffect, useState } from 'react';
import { createCheckout } from '../api/client';
import { QrCode, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';

interface PaymentPortalProps {
  tier: 'standard' | 'premium';
  onBack: () => void;
}

interface CheckoutResult {
  qrPayload: string;
  amount: number;
  expiresIn: number;
}

export function PaymentPortal({ tier, onBack }: PaymentPortalProps) {
  const [loading, setLoading] = useState(true);
  const [checkout, setCheckout] = useState<CheckoutResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(600);

  useEffect(() => {
    async function fetchQR() {
      try {
        const response = await createCheckout(tier) as CheckoutResult;
        setCheckout(response);
        setTimeLeft(response.expiresIn);
      } catch (error: unknown) {
        console.error('Failed to load QR:', error);
        setErrorMsg(error instanceof Error ? error.message : 'Failed to generate payment QR');
      } finally {
        setLoading(false);
      }
    }
    fetchQR();
  }, [tier]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((previous) => previous - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;

  return (
    <div className="payment-view slideUp">
      <button className="btn-back" onClick={onBack}><ArrowLeft size={20} />กลับ</button>
      <div className="glass-card text-center mt-16">
        <h2 className="payment-title">Mejai {tier === 'premium' ? 'Premium' : 'Standard'}</h2>
        {loading ? <div className="qr-skeleton"><Loader2 className="spinner" size={32} /></div> : errorMsg ? (
          <div className="qr-error" style={{ color: 'var(--danger-color)', padding: '2rem' }}><AlertCircle size={48} /><p>{errorMsg}</p></div>
        ) : (
          <div className="qr-container">
            <div className="omise-qr-wrapper" style={{ background: '#fff', padding: '1rem', borderRadius: '1rem', margin: '0 auto 1.5rem', width: 'fit-content' }}>
              {checkout?.qrPayload ? <img src={checkout.qrPayload} alt="PromptPay QR Code" style={{ width: '200px', height: '200px' }} /> : <QrCode size={120} color="#000" />}
            </div>
            <div className="payment-amount"><h3>ยอดชำระ: ฿{checkout?.amount.toFixed(2)}</h3><p className="timer">QR หมดอายุใน: {formatTime(timeLeft)}</p></div>
          </div>
        )}
      </div>
    </div>
  );
}
