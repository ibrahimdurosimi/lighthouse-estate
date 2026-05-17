import React, { useState } from 'react';
import { Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { useApp } from '../lib/context';
import { db, appId } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { hashPin, HOUSES, SUB_OPTIONS } from '../lib/utils';

export default function Register() {
    const { setView, notify } = useApp();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [house, setHouse] = useState(HOUSES[0]);
    const [sub, setSub] = useState(SUB_OPTIONS[0]);
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [showPin, setShowPin] = useState(false);
    const [showConfirmPin, setShowConfirmPin] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if(pin.trim() !== confirmPin.trim()) return notify("PINs do not match.", "error");
        if(pin.trim().length !== 6) return notify("PIN must be 6 digits.", "error");

        try {
            const hashed = await hashPin(pin.trim());
            const id = `${house} - ${sub}`;
            
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'users'), {
                firstName, 
                lastName,
                phone, 
                email,
                identifier: id, 
                pin: hashed, 
                role: 'resident', 
                status: 'pending', 
                createdAt: serverTimestamp()
            });
            notify("Salaam, Registry Submitted.");
            setView('landing');
        } catch(err) { 
            notify("System busy.", "error"); 
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 animate-fade-in">
            <div className="w-full max-w-sm mb-6 bg-brand-pink border-4 border-brand-black p-4 shadow-neo-sm opacity-80">
                <p className="font-black text-[10px] text-brand-black uppercase tracking-widest mb-1 flex items-center gap-2"><AlertTriangle className="w-3 h-3" /> Approval Notice</p>
                <p className="text-[11px] text-brand-black font-medium leading-tight">New accounts require manual approval by the Estate Manager.</p>
            </div>
            <div className="bg-white w-full max-w-sm p-8 neo-card border-4 rounded-xl">
                <h2 className="text-xl font-black text-brand-black text-center mb-8 uppercase tracking-tighter">Unit Registry</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <input required placeholder="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full p-3 neo-input text-xs" />
                        <input required placeholder="Last Name" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full p-3 neo-input text-xs" />
                    </div>
                    <input required type="tel" placeholder="Phone Number" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-3 neo-input text-xs" />
                    <input required type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3 neo-input text-xs" />
                    
                    <div className="grid grid-cols-2 gap-3 p-4 bg-brand-gray border-4 border-brand-black">
                        <select value={house} onChange={e => setHouse(e.target.value)} className="w-full p-2 bg-white border-2 border-brand-black text-xs font-bold">
                            {HOUSES.map(h => <option key={h}>{h}</option>)}
                        </select>
                        <select value={sub} onChange={e => setSub(e.target.value)} className="w-full p-2 bg-white border-2 border-brand-black text-xs font-bold">
                            {SUB_OPTIONS.map(s => <option key={s}>{s}</option>)}
                        </select>
                    </div>

                    <div className="space-y-3 pt-2">
                        <p className="text-center text-[10px] font-black text-brand-black uppercase tracking-widest bg-brand-lime inline-block px-2 border-2 border-brand-black mx-auto block">Set Security PIN</p>
                        <div className="relative">
                            <input 
                                type={showPin ? 'text' : 'password'} 
                                required 
                                maxLength={6} 
                                inputMode="numeric" 
                                pattern="[0-9]*" 
                                placeholder="Enter PIN" 
                                value={pin}
                                onChange={e => setPin(e.target.value)}
                                className="w-full p-3 neo-input font-mono text-center tracking-[0.4em] text-lg" 
                            />
                            <button type="button" onClick={() => setShowPin(!showPin)} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-black p-2">
                                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        <div className="relative">
                            <input 
                                type={showConfirmPin ? 'text' : 'password'} 
                                required 
                                maxLength={6} 
                                inputMode="numeric" 
                                pattern="[0-9]*" 
                                placeholder="Confirm PIN" 
                                value={confirmPin}
                                onChange={e => setConfirmPin(e.target.value)}
                                className="w-full p-3 neo-input font-mono text-center tracking-[0.4em] text-lg" 
                            />
                            <button type="button" onClick={() => setShowConfirmPin(!showConfirmPin)} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-black p-2">
                                {showConfirmPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <button type="submit" className="w-full neo-btn-primary py-4 text-sm shadow-neo active:translate-y-1 active:shadow-none transition-all mt-4">Submit Registry</button>
                </form>
            </div>
            <button onClick={() => setView('landing')} className="mt-6 text-gray-500 font-bold text-[10px] uppercase tracking-widest p-2 hover:text-brand-black">Cancel</button>
        </div>
    );
}
