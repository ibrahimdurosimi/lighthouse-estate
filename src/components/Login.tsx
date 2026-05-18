import React, { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useApp } from '../lib/context';
import ThemeToggle from './ThemeToggle';
import { db, appId } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { hashPin, HOUSES, SUB_OPTIONS } from '../lib/utils';

export default function Login() {
    const { viewParams, setView, setProfile, notify } = useApp();
    const role = viewParams.role;
    const [pin, setPin] = useState('');
    const [showPin, setShowPin] = useState(false);
    
    // Resident specifics
    const [house, setHouse] = useState(HOUSES[0]);
    const [sub, setSub] = useState(SUB_OPTIONS[0]);

    // Admin/Security specifics
    const [users, setUsers] = useState<any[]>([]);
    const [selectedUser, setSelectedUser] = useState<string>('');
    const [staffPhone, setStaffPhone] = useState<string>('');
    const [num1] = useState(Math.floor(Math.random() * 9) + 1);
    const [num2] = useState(Math.floor(Math.random() * 9) + 1);
    const [captcha, setCaptcha] = useState('');
    const captchaResult = num1 + num2;

    useEffect(() => {
        if (role !== 'resident' && role !== 'staff') {
            getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'users')).then(snap => {
                const fetchedUsers = snap.docs.map(d => d.data()).filter(u => u.role === role);
                setUsers(fetchedUsers);
                if (role === 'admin') {
                    setSelectedUser('@Opensaysme');
                } else if (fetchedUsers.length > 0) {
                    setSelectedUser(fetchedUsers[0].identifier);
                }
            });
        }
    }, [role]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (role === 'admin' && parseInt(captcha) !== captchaResult) {
            return notify("CAPTCHA failed.", "error");
        }
        
        const id = role === 'resident' ? `${house} - ${sub}` : role === 'staff' ? staffPhone : selectedUser;
        
        if (role === 'admin' && id === '@Opensaysme' && pin.trim() === '041586') {
            setProfile({ identifier: 'Master Admin', role: 'admin', id: 'master' });
            return setView('admin');
        }

        try {
            const hashed = await hashPin(pin.trim());
            const snap = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'users'));
            const found = snap.docs.find(d => {
                const data = d.data();
                if (role === 'security') {
                    return data.pin === hashed && data.role === role;
                }
                if (role === 'staff') {
                    return data.phone === id && data.pin === hashed && data.role === role;
                }
                return data.identifier === id && data.pin === hashed && data.role === role;
            });

            if (found) {
                const data = found.data();
                if (data.status === 'pending') return notify("Awaiting approval.", "error");
                setProfile({ id: found.id, ...data });
                setView(role as any);
            } else {
                notify("Invalid credentials.", "error");
            }
        } catch (err: any) {
            notify("Error: " + err.message, "error");
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 animate-fade-in bg-stone-50/50">
            <div className="fixed top-6 right-6 z-[100]">
                <ThemeToggle />
            </div>
            <div className="w-full max-w-sm p-8 neo-card relative">
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-semibold text-brand-black tracking-tight">Welcome Back</h2>
                    <p className="text-sm font-medium text-emerald-700 mt-1 uppercase tracking-wider">{role} Portal</p>
                </div>
                <form onSubmit={handleLogin} className="space-y-5">
                    {role === 'resident' ? (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">House</label>
                                <select value={house} onChange={e => setHouse(e.target.value)} className="w-full p-3 neo-input">
                                    {HOUSES.map(h => <option key={h}>{h}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Unit</label>
                                <select value={sub} onChange={e => setSub(e.target.value)} className="w-full p-3 neo-input">
                                    {SUB_OPTIONS.map(s => <option key={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>
                    ) : role === 'staff' ? (
                        <div>
                            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Phone Number</label>
                            <input 
                                type="tel" 
                                required 
                                value={staffPhone}
                                onChange={e => setStaffPhone(e.target.value)}
                                className="w-full p-3 neo-input font-mono" 
                                placeholder="080..." 
                            />
                        </div>
                    ) : role === 'security' ? null : (
                        <div>
                            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Select Identity</label>
                            <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)} className="w-full p-3 neo-input">
                                {role === 'admin' && <option value="@Opensaysme">@Opensaysme (Master)</option>}
                                {users.length === 0 && role !== 'admin' ? <option disabled>Fetching Users...</option> : null}
                                {users.map(u => <option key={u.identifier} value={u.identifier}>{u.identifier}</option>)}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Security PIN</label>
                        <div className="relative">
                            <input 
                                type={showPin ? 'text' : 'password'} 
                                required 
                                maxLength={6} 
                                inputMode="numeric" 
                                pattern="[0-9]*" 
                                value={pin}
                                onChange={e => setPin(e.target.value)}
                                className="w-full p-3 neo-input font-mono text-center tracking-[0.4em] text-lg" 
                                placeholder="••••••" 
                            />
                            <button type="button" onClick={() => setShowPin(!showPin)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 p-2 hover:text-brand-black transition-colors rounded">
                                {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    {role === 'admin' && (
                        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                            <p className="text-xs font-semibold text-emerald-800 mb-3 text-center">Security Check</p>
                            <div className="flex items-center justify-center gap-3">
                                <span className="font-semibold text-emerald-900 text-lg">{num1} + {num2} = </span>
                                <input 
                                    type="number" 
                                    required 
                                    inputMode="numeric" 
                                    pattern="[0-9]*"
                                    value={captcha}
                                    onChange={e => setCaptcha(e.target.value)}
                                    className="w-20 p-2 neo-input text-center font-semibold" 
                                    placeholder="?" 
                                />
                            </div>
                        </div>
                    )}

                    <button type="submit" className="w-full neo-btn-primary py-3.5 mt-2 text-sm">Authenticate</button>
                </form>
            </div>
            {role === 'resident' && (
                <button onClick={() => setView('register')} className="mt-8 text-emerald-700 font-semibold text-sm hover:text-emerald-900 transition-colors">New Unit Registration →</button>
            )}
            <button onClick={() => setView('landing')} className="mt-4 text-gray-400 font-medium text-sm hover:text-brand-black transition-colors">Return Home</button>
        </div>
    );
}
