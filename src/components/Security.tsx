import { useState, useEffect } from 'react';
import { LogOut, XCircle, AlertTriangle } from 'lucide-react';
import { useApp } from '../lib/context';
import ThemeToggle from './ThemeToggle';
import { db, appId } from '../lib/firebase';
import { collection, getDocs, updateDoc, doc, serverTimestamp, onSnapshot, query, where } from 'firebase/firestore';
import clsx from 'clsx';

export default function Security() {
    const { profile, setView, setProfile, notify } = useApp();
    const [codeInput, setCodeInput] = useState('');
    const [result, setResult] = useState<any>(null);
    const [activeSos, setActiveSos] = useState<any[]>([]);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'sos'), snap => {
            const alarms = snap.docs.map(d => ({id: d.id, ...d.data()})).filter((s:any) => s.status === 'active');
            setActiveSos(alarms);
        });
        return () => unsub();
    }, []);

    const handleClearSos = async (id: string) => {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sos', id), {
            status: 'resolved',
            resolvedAt: serverTimestamp(),
            resolvedBy: profile?.identifier
        });
    };

    const handleVerify = async () => {
        const val = codeInput.toUpperCase();
        if (!val) return;
        
        try {
            const snap = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'codes'));
            const codes = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
            const found: any = codes.find((c: any) => c.code === val);
            
            if (!found || (found.status !== 'active' && found.status !== 'used') || new Date(found.expiresAt) < new Date()) {
                setResult({ status: 'denied' });
            } else {
                setResult({ status: 'verified', data: found });
            }
        } catch (err) {
            notify("Network error.", "error");
        }
    };

    const handleConfirm = async () => {
        if (!result || result.status !== 'verified') return;
        const found = result.data;
        const isInside = found.status === 'used';
        const isGatePass = found.type === 'Gate-Pass';

        try {
            if (isInside || isGatePass) {
                const nextStat = found.type === 'Long-Stay' ? 'active' : 'checked-out';
                await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'codes', found.id), { 
                    status: nextStat, 
                    checkedOutAt: serverTimestamp(), 
                    checkedOutBy: profile?.identifier 
                });
                notify("Check-out logged.");
            } else {
                await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'codes', found.id), { 
                    status: 'used', 
                    usedAt: serverTimestamp(), 
                    validatedBy: profile?.identifier 
                });
                notify("Check-in logged.");
            }
            // Reset
            setResult(null);
            setCodeInput('');
        } catch(err) {
            notify("System busy.", "error");
        }
    };

    const cancel = () => {
        setResult(null);
        setCodeInput('');
    }

    if (!profile) return null;

    return (
        <div className="max-w-md mx-auto min-h-screen flex flex-col p-6 animate-fade-in bg-stone-50/50">
            <header className="flex justify-between items-center mb-12 border-b border-gray-200 pb-5">
                <div className="flex items-center gap-3">
                    <div className="bg-emerald-900 text-white w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-sm">
                        <Lock className="w-5 h-5"/>
                    </div>
                    <div>
                        <h2 className="text-[17px] font-semibold text-brand-black leading-none mb-1">Gate Hub</h2>
                        <p className="text-[10px] text-gray-500 font-medium tracking-widest uppercase">Guard: {profile.identifier}</p>
                    </div>
                </div>
                <div className="flex gap-2 items-center">
                    <ThemeToggle />
                    <button onClick={() => { setProfile(null); setView('landing'); }} className="p-2.5 rounded-xl bg-white text-gray-600 border border-gray-200 shadow-sm hover:bg-red-50 hover:text-red-500 transition-colors">
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </header>

            {activeSos.length > 0 && (
                <div className="mb-8 space-y-4">
                    {activeSos.map(sos => (
                        <div key={sos.id} className="bg-rose-500 rounded-2xl p-5 text-white shadow-[0_8px_30px_rgb(225,29,72,0.3)] animate-pulse">
                            <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle className="w-6 h-6 shrink-0 text-rose-200" />
                                <h3 className="font-bold text-lg uppercase leading-none mt-1">SOS Alert: {sos.houseId}</h3>
                            </div>
                            <p className="text-[11px] font-medium uppercase tracking-widest mb-4 text-rose-100">Immediate Assistance Required at Unit {sos.houseId}</p>
                            <button onClick={()=>handleClearSos(sos.id)} className="w-full bg-white/20 backdrop-blur text-white font-semibold rounded-xl p-3 hover:bg-white/30 transition-colors uppercase text-xs">Acknowledge & Clear</button>
                        </div>
                    ))}
                </div>
            )}
            
            <div className="flex-1 flex flex-col justify-center gap-8 pb-10">
                {!result ? (
                    <div className="space-y-6">
                        <div className="text-center">
                            <label className="text-[11px] font-semibold uppercase text-gray-500 tracking-widest block mb-4">Enter Access Code</label>
                            <input 
                                value={codeInput}
                                onChange={e => setCodeInput(e.target.value)}
                                maxLength={6} 
                                className="w-full py-8 rounded-3xl bg-white border border-gray-200 text-5xl font-mono text-center shadow-sm uppercase placeholder:text-gray-200 text-stone-800 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all" 
                                placeholder="------" 
                            />
                        </div>
                        <button onClick={handleVerify} className="w-full bg-emerald-900 text-white rounded-2xl py-5 text-[15px] shadow-md hover:bg-emerald-950 font-semibold uppercase tracking-wide transition-all">Verify Code</button>
                    </div>
                ) : (
                    <div className="animate-fade-in">
                        {result.status === 'denied' ? (
                            <div className="bg-white rounded-3xl border border-rose-100 p-8 text-center space-y-6 shadow-[0_8px_30px_rgb(225,29,72,0.06)] relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-2 bg-rose-500"></div>
                                <XCircle className="w-20 h-20 mx-auto text-rose-500 mb-2" />
                                <h3 className="text-2xl font-bold uppercase text-stone-800 tracking-wide">Access Denied</h3>
                                <button onClick={cancel} className="w-full bg-stone-100 text-stone-600 font-semibold rounded-xl py-4 uppercase text-sm hover:bg-stone-200 transition-colors">Discard</button>
                            </div>
                        ) : (
                            <div className={clsx("bg-white rounded-3xl p-8 text-center shadow-[0_8px_30px_rgb(0,0,0,0.06)] relative overflow-hidden", result.data.status === 'used' ? "border border-sky-100" : "border border-emerald-100")}>
                                <div className={clsx("absolute top-0 left-0 w-full h-2", result.data.status === 'used' ? 'bg-sky-500' : 'bg-emerald-500')}></div>
                                <div className="space-y-1 mb-8">
                                    <span className={clsx("text-[10px] font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-6 inline-block", result.data.status === 'used' ? 'bg-sky-50 text-sky-700' : 'bg-emerald-50 text-emerald-700')}>Verification Passed</span>
                                    <h3 className="text-4xl font-bold text-stone-800">{result.data.houseId}</h3>
                                    <p className="text-[13px] font-medium text-gray-500 uppercase tracking-widest mt-2">{result.data.targetName} • <span className="text-stone-400">{result.data.type}</span></p>
                                    
                                    {result.data.note && <div className="mt-8 bg-stone-50 p-4 rounded-xl border border-stone-100 text-[13px] text-stone-600 font-medium">"{result.data.note}"</div>}
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={cancel} className="w-1/3 bg-stone-100 text-stone-600 font-semibold rounded-2xl py-5 uppercase text-sm hover:bg-stone-200 transition-colors">Cancel</button>
                                    <button onClick={handleConfirm} className="flex-1 bg-emerald-900 text-white rounded-2xl py-5 text-[15px] shadow-md hover:bg-emerald-950 font-semibold uppercase tracking-wide transition-all">
                                        {result.data.status === 'used' ? 'Check-Out' : result.data.type === 'Gate-Pass' ? 'Authorize Exit' : 'Check-In'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
