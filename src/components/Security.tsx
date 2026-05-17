import { useState, useEffect } from 'react';
import { LogOut, XCircle, AlertTriangle } from 'lucide-react';
import { useApp } from '../lib/context';
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
        <div className="max-w-md mx-auto min-h-screen flex flex-col p-6 animate-fade-in">
            <header className="flex justify-between items-center mb-16 border-b-4 border-brand-black pb-4">
                <div>
                    <h2 className="text-xl font-black italic text-brand-black uppercase leading-none bg-brand-lime inline-block px-2 border-4 border-brand-black">Gate Hub</h2>
                    <p className="text-[9px] text-brand-black font-bold tracking-widest uppercase mt-2">Staff: {profile.identifier}</p>
                </div>
                <button onClick={() => { setProfile(null); setView('landing'); }} className="p-2 bg-brand-black text-white border-2 border-brand-black shadow-neo-sm">
                    <LogOut className="w-5 h-5" />
                </button>
            </header>

            {activeSos.length > 0 && (
                <div className="mb-8 space-y-4">
                    {activeSos.map(sos => (
                        <div key={sos.id} className="bg-red-500 border-4 border-brand-black p-4 text-white shadow-neo animate-bounce">
                            <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle className="w-6 h-6 shrink-0" />
                                <h3 className="font-black text-lg uppercase leading-none mt-1">SOS Alert: {sos.houseId}</h3>
                            </div>
                            <p className="text-[10px] font-bold uppercase tracking-widest mb-4">Immediate Assistance Required at Unit {sos.houseId}</p>
                            <button onClick={()=>handleClearSos(sos.id)} className="w-full bg-white text-red-500 font-black p-3 border-2 border-brand-black shadow-neo-sm hover:bg-brand-gray active:translate-y-1 active:shadow-none uppercase text-xs">Acknowledge & Clear</button>
                        </div>
                    ))}
                </div>
            )}
            
            <div className="flex-1 flex flex-col justify-center gap-8">
                {!result ? (
                    <div className="space-y-8">
                        <div className="text-center">
                            <label className="text-[10px] font-black uppercase text-brand-black tracking-widest block mb-4">Code Input</label>
                            <input 
                                value={codeInput}
                                onChange={e => setCodeInput(e.target.value)}
                                maxLength={6} 
                                className="w-full neo-input p-6 text-4xl font-mono text-center shadow-neo uppercase" 
                                placeholder="------" 
                            />
                        </div>
                        <button onClick={handleVerify} className="w-full neo-btn-primary py-6 text-sm shadow-neo active:translate-y-1 active:shadow-none transition-all">Verify Code</button>
                    </div>
                ) : (
                    <div className="animate-fade-in">
                        {result.status === 'denied' ? (
                            <div className="bg-red-50 border-4 border-brand-black p-8 text-center space-y-6 shadow-neo">
                                <XCircle className="w-16 h-16 mx-auto text-red-600" />
                                <h3 className="text-3xl font-black uppercase text-brand-black">Denied</h3>
                                <button onClick={cancel} className="neo-btn-secondary px-6 py-3 text-xs w-full">Back</button>
                            </div>
                        ) : (
                            <div className={`${result.data.status === 'used' ? 'bg-brand-cyan text-white' : 'bg-brand-lime text-brand-black'} border-4 border-brand-black p-8 text-center space-y-6 shadow-neo`}>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-brand-black mb-4 bg-white inline-block px-2 border-2 border-brand-black">Verified</p>
                                    <h3 className="text-3xl font-black">{result.data.houseId}</h3>
                                    <p className="text-xs font-bold mt-2 uppercase border-t-4 border-brand-black pt-2">{result.data.targetName} • {result.data.type}</p>
                                    {result.data.note && <div className="mt-6 bg-white p-4 border-4 border-brand-black text-xs text-brand-black font-bold italic">"{result.data.note}"</div>}
                                </div>
                                <button onClick={handleConfirm} className="w-full neo-btn-primary py-5 text-sm shadow-neo active:translate-y-1 active:shadow-none transition-all">
                                    {result.data.status === 'used' ? 'Check-Out' : result.data.type === 'Gate-Pass' ? 'Authorize Exit' : 'Check-In'}
                                </button>
                                <button onClick={cancel} className="text-[10px] font-bold uppercase tracking-widest hover:underline block w-full">Cancel</button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
