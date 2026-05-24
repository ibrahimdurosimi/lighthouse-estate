import React, { useState } from 'react';
import { Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { useApp } from '../lib/context';
import ThemeToggle from './ThemeToggle';
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
            setView('login');
        } catch(err) { 
            notify("System busy.", "error"); 
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 animate-fade-in bg-stone-50/50 py-12">
            <div className="fixed top-6 right-6 z-[100]">
                <ThemeToggle />
            </div>
            <div className="w-full max-w-sm mb-5 bg-amber-50 border border-amber-200 p-4 rounded-xl shadow-sm text-center">
                <p className="font-semibold text-[11px] text-amber-800 uppercase tracking-widest mb-1.5 flex items-center justify-center gap-1.5"><AlertTriangle className="w-4 h-4" /> Approval Required</p>
                <p className="text-xs text-amber-900/80 font-medium leading-relaxed">New accounts require manual approval by the Estate Manager.</p>
            </div>
            
            <div className="bg-white dark:bg-stone-900 w-full max-w-sm p-8 neo-card">
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Unit Registry</h2>
                    <p className="text-sm font-black text-emerald-800 dark:text-emerald-400 mt-1 uppercase tracking-widest">Register your residence</p>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <input required placeholder="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full p-3 neo-input text-sm text-gray-900 dark:text-gray-100" />
                        <input required placeholder="Last Name" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full p-3 neo-input text-sm text-gray-900 dark:text-gray-100" />
                    </div>
                    <input required type="tel" placeholder="Phone Number" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-3 neo-input text-sm text-gray-900 dark:text-gray-100" />
                    <input required type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3 neo-input text-sm text-gray-900 dark:text-gray-100" />
                    
                    <div className="grid grid-cols-2 gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-800/30 transition-colors">
                        <div>
                            <label className="text-[10px] font-black text-emerald-800 dark:text-emerald-400 uppercase block mb-1">House Number</label>
                            <input 
                                required 
                                type="text"
                                placeholder="e.g. 12"
                                value={house} 
                                onChange={e => setHouse(e.target.value)} 
                                className="w-full p-2.5 bg-white dark:bg-stone-800 border border-emerald-200 dark:border-stone-700 rounded-lg text-sm font-bold text-emerald-950 dark:text-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-emerald-800 dark:text-emerald-400 uppercase block mb-1">Sub Unit</label>
                            <select value={sub} onChange={e => setSub(e.target.value)} className="w-full p-2.5 bg-white dark:bg-stone-800 border border-emerald-200 dark:border-stone-700 rounded-lg text-sm font-bold text-emerald-950 dark:text-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
                                {SUB_OPTIONS.map(s => <option key={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-3 pt-2">
                        <p className="text-center text-[10px] font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-widest block">Set Security PIN</p>
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
                                className="w-full p-3 neo-input font-mono text-center tracking-[0.4em] text-lg text-gray-900 dark:text-gray-100" 
                            />
                            <button type="button" onClick={() => setShowPin(!showPin)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 p-2 hover:text-brand-black transition-colors rounded">
                                {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
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
                            <button type="button" onClick={() => setShowConfirmPin(!showConfirmPin)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 p-2 hover:text-brand-black transition-colors rounded">
                                {showConfirmPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <button type="submit" className="w-full neo-btn-primary py-3.5 text-sm mt-4">Submit Registry</button>
                </form>
            </div>
            <button onClick={() => setView('login')} className="mt-6 text-gray-400 font-medium text-sm hover:text-brand-black transition-colors">Cancel & Return</button>
        </div>
    );
}
