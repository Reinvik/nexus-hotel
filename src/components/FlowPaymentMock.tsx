import { useState } from 'react';
import { CreditCard, ShieldCheck, Loader2, ArrowLeft, Building, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
 
interface FlowPaymentMockProps {
  amount: number;
  email: string;
  guestName: string;
  roomName: string;
  onSuccess: () => void;
  onCancel: () => void;
}
 
type PaymentStep = 'select_method' | 'card_form' | 'processing' | 'success';
 
export function FlowPaymentMock({ amount, guestName, roomName, onSuccess, onCancel }: FlowPaymentMockProps) {
  const [step, setStep] = useState<PaymentStep>('select_method');
  const [method, setMethod] = useState<'webpay' | 'mach' | 'onepay'>('webpay');
  const [bank, setBank] = useState('Banco de Chile');
  const [cardData, setCardData] = useState({
    number: '4532 •••• •••• 8824',
    name: guestName.toUpperCase(),
    expiry: '12/29',
    cvv: '123'
  });
  const [loadingMsg, setLoadingMsg] = useState('Conectando con Transbank...');
 
  const handlePay = (selectedMethod?: 'webpay' | 'mach' | 'onepay') => {
    const currentMethod = selectedMethod || method;
    setStep('processing');
    setLoadingMsg(`Conectando con ${currentMethod === 'webpay' ? 'Webpay Plus' : currentMethod === 'mach' ? 'MACH' : 'OnePay'}...`);
    setTimeout(() => {
      setLoadingMsg('Verificando fondos con el banco emisor...');
      setTimeout(() => {
        setLoadingMsg('Confirmando pago con Flow.cl...');
        setTimeout(() => {
          setStep('success');
          setTimeout(() => {
            onSuccess();
          }, 3000);
        }, 1500);
      }, 1500);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-[#070b15] z-[200] flex items-center justify-center p-4 overflow-y-auto">
      {/* Background decoration */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg bg-[#0e1726] border border-white/5 rounded-3xl overflow-hidden shadow-2xl relative z-10 flex flex-col"
      >
        {/* Flow Header */}
        <div className="bg-[#1e293b] p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-orange-500 text-white font-extrabold text-lg px-3 py-1 rounded-lg tracking-wider">
              flow
            </div>
            <div className="h-6 w-[1px] bg-white/20" />
            <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">
              Pasarela de Pago Segura
            </span>
          </div>
          <button 
            onClick={onCancel}
            className="text-xs text-slate-400 hover:text-white uppercase font-black tracking-wider transition-colors"
          >
            Cancelar
          </button>
        </div>

        {/* Purchase Summary bar */}
        <div className="bg-[#152033] px-6 py-4 flex justify-between items-center border-b border-white/5">
          <div>
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Hospedaje</h4>
            <p className="text-sm font-bold text-white mt-0.5">{roomName}</p>
          </div>
          <div className="text-right">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Total a Pagar</h4>
            <p className="text-lg font-black text-orange-400">${amount.toLocaleString('es-CL')} CLP</p>
          </div>
        </div>

        {/* Content Container */}
        <div className="p-6 flex-1 flex flex-col justify-center min-h-[300px]">
          {step === 'select_method' && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <h3 className="text-base font-black text-white tracking-tight">
                Selecciona tu medio de pago chileno:
              </h3>

              <div className="grid grid-cols-1 gap-3">
                {/* Webpay Plus */}
                <button
                  onClick={() => { setMethod('webpay'); setStep('card_form'); }}
                  className="flex items-center justify-between p-5 rounded-2xl border-2 border-white/5 hover:border-orange-500/50 bg-white/5 hover:bg-white/[0.08] text-left transition-all active:scale-[0.98] group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-md">
                      WP
                    </div>
                    <div>
                      <span className="font-extrabold text-white text-sm block">Webpay Plus</span>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider mt-0.5">Tarjetas de Crédito / Débito / Redcompra</span>
                    </div>
                  </div>
                  <div className="w-6 h-6 rounded-full border-2 border-white/10 group-hover:border-orange-500 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-orange-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>

                {/* MACH */}
                <button
                  onClick={() => { setMethod('mach'); handlePay('mach'); }}
                  className="flex items-center justify-between p-5 rounded-2xl border-2 border-white/5 hover:border-[#7b1fa2]/50 bg-white/5 hover:bg-white/[0.08] text-left transition-all active:scale-[0.98] group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-md">
                      M
                    </div>
                    <div>
                      <span className="font-extrabold text-white text-sm block">MACH</span>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider mt-0.5">Paga al instante con tu cuenta MACH</span>
                    </div>
                  </div>
                  <div className="w-6 h-6 rounded-full border-2 border-white/10 group-hover:border-[#7b1fa2] flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-[#7b1fa2] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>

                {/* OnePay */}
                <button
                  onClick={() => { setMethod('onepay'); handlePay('onepay'); }}
                  className="flex items-center justify-between p-5 rounded-2xl border-2 border-white/5 hover:border-yellow-500/50 bg-white/5 hover:bg-white/[0.08] text-left transition-all active:scale-[0.98] group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-yellow-600 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-md">
                      OP
                    </div>
                    <div>
                      <span className="font-extrabold text-white text-sm block">OnePay Transbank</span>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider mt-0.5">Billetera digital Transbank</span>
                    </div>
                  </div>
                  <div className="w-6 h-6 rounded-full border-2 border-white/10 group-hover:border-yellow-500 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-yellow-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              </div>
            </motion.div>
          )}

          {step === 'card_form' && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <button onClick={() => setStep('select_method')} className="text-slate-400 hover:text-white p-1">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Detalles de tu Tarjeta (Webpay)
                </h3>
              </div>

              {/* Bank Selection */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  Banco Emisor
                </label>
                <div className="relative">
                  <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <select 
                    value={bank}
                    onChange={(e) => setBank(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-[#131c2e] border border-white/5 rounded-xl text-white font-bold outline-none cursor-pointer"
                  >
                    <option value="Banco de Chile">Banco de Chile</option>
                    <option value="Banco Estado">Banco Estado</option>
                    <option value="Banco Santander">Banco Santander</option>
                    <option value="Banco BCI">Banco BCI</option>
                    <option value="Banco Itaú">Banco Itaú</option>
                    <option value="Banco Falabella">Banco Falabella</option>
                    <option value="Otro Banco">Otro Banco</option>
                  </select>
                </div>
              </div>

              {/* Card Inputs */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Número de Tarjeta</label>
                  <div className="relative">
                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input 
                      type="text" 
                      value={cardData.number}
                      onChange={(e) => setCardData({...cardData, number: e.target.value})}
                      placeholder="XXXX XXXX XXXX XXXX"
                      className="w-full pl-11 pr-4 py-3 bg-[#131c2e] border border-white/5 rounded-xl text-white font-black tracking-widest outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Vencimiento</label>
                    <input 
                      type="text" 
                      value={cardData.expiry}
                      onChange={(e) => setCardData({...cardData, expiry: e.target.value})}
                      placeholder="MM/AA"
                      className="w-full px-4 py-3 bg-[#131c2e] border border-white/5 rounded-xl text-white font-bold outline-none text-center"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">CVV</label>
                    <input 
                      type="password" 
                      value={cardData.cvv}
                      onChange={(e) => setCardData({...cardData, cvv: e.target.value})}
                      placeholder="123"
                      maxLength={3}
                      className="w-full px-4 py-3 bg-[#131c2e] border border-white/5 rounded-xl text-white font-bold outline-none text-center"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Nombre en la Tarjeta</label>
                  <input 
                    type="text" 
                    value={cardData.name}
                    onChange={(e) => setCardData({...cardData, name: e.target.value.toUpperCase()})}
                    className="w-full px-4 py-3 bg-[#131c2e] border border-white/5 rounded-xl text-white font-bold uppercase outline-none"
                  />
                </div>
              </div>

              <button
                onClick={() => handlePay()}
                className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-extrabold uppercase tracking-widest text-xs transition-all active:scale-[0.98] shadow-lg shadow-orange-500/20"
              >
                Pagar con Webpay
              </button>
            </motion.div>
          )}

          {step === 'processing' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-8 text-center space-y-6">
              <div className="relative">
                <Loader2 className="w-16 h-16 animate-spin text-orange-500" />
                <ShieldCheck className="w-6 h-6 text-emerald-400 absolute inset-0 m-auto" />
              </div>
              <div className="space-y-2">
                <h4 className="text-lg font-black text-white tracking-tight">Procesando Pago Seguro</h4>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider animate-pulse">
                  {loadingMsg}
                </p>
              </div>
              <div className="flex items-center gap-1.5 justify-center bg-[#131c2e] px-4 py-2 rounded-full border border-white/5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  Transacción protegida por cifrado SSL de 256 bits
                </span>
              </div>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }} 
              className="flex flex-col items-center justify-center py-8 text-center space-y-6"
            >
              <div className="w-20 h-20 bg-emerald-500/20 rounded-full border-2 border-emerald-500/50 flex items-center justify-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.2, 1] }}
                  transition={{ duration: 0.5 }}
                >
                  <ShieldCheck className="w-10 h-10 text-emerald-400" />
                </motion.div>
              </div>
              <div className="space-y-2">
                <h4 className="text-2xl font-black text-white tracking-tight">¡Pago Aprobado!</h4>
                <p className="text-sm text-slate-300">
                  La transacción de <span className="font-bold text-emerald-400">${amount.toLocaleString('es-CL')} CLP</span> fue exitosa.
                </p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest pt-2">
                  Redirigiendo de vuelta a Nexus Hotel en 3 segundos...
                </p>
              </div>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 bg-[#0b101c] border-t border-white/5 flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase tracking-widest">
          <span>Comercio: Nexus Hotel</span>
          <div className="flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-slate-600" />
            <span>Transacción Segura de Prueba</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
