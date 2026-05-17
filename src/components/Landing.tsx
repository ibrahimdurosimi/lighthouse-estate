import { Shield, Home, ScanLine, Settings, Bell } from 'lucide-react';
import { useApp } from '../lib/context';
import { db, appId } from '../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { useState, useEffect } from 'react';

const HADITHS = [
    { text: "Spread Salaam among yourselves to increase love between you.", source: "Sahih Muslim" },
    { text: "None of you truly believes until he loves for his brother what he loves for himself.", source: "Sahih Bukhari" },
    { text: "The most beloved of people to Allah are those who are most beneficial to people.", source: "Al-Mu’jam al-Awsaṭ" },
    { text: "Allah is gentle and He loves gentleness in all matters.", source: "Sahih Bukhari" }
];
const dailyHadith = HADITHS[Math.floor(Math.random() * HADITHS.length)];

export default function Landing() {
    const { setView } = useApp();
    const [notices, setNotices] = useState<any[]>([]);

    useEffect(() => {
        const noticesUnsub = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'notices'), snap => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setNotices(data);
        });
        return () => {
            noticesUnsub();
        };
    }, []);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center animate-fade-in pb-12">
            <div className="mb-10 w-full max-w-sm">
                <div className="inline-flex p-6 bg-brand-lime border-4 border-brand-black rounded-full shadow-neo mb-6">
                    <Shield className="w-10 h-10 text-brand-black" />
                </div>
                <h1 className="text-4xl font-black text-brand-black leading-none uppercase tracking-tighter mb-2">Light House</h1>
                <p className="text-lg font-bold text-brand-black uppercase tracking-widest bg-sky-200 inline-block px-2 border-2 border-brand-black shadow-neo-sm">Estate Portal</p>
                
                <button onClick={async () => {
                    import('firebase/firestore').then(async ({ getDocs, collection }) => {
                        const snap = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'users'));
                        const data = snap.docs.map(d => `${d.role}: ${d.identifier}`).join('\n');
                        alert("Users:\n" + data);
                    });
                }} className="absolute top-0 right-0 w-8 h-8 opacity-0">D</button>
            </div>

            <div className="grid grid-cols-1 gap-5 w-full max-w-sm mb-12">
                <button onClick={() => setView('login', { role: 'resident' })} className="neo-card p-6 flex items-center gap-5 active:translate-y-1 active:shadow-none transition-all group hover:bg-lime-50">
                    <div className="bg-brand-black text-white p-3 rounded-xl border-2 border-brand-black"><Home /></div>
                    <div className="text-left">
                        <h3 className="font-black text-brand-black uppercase text-lg leading-none">Residents</h3>
                        <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mt-1">Manage Access</p>
                    </div>
                </button>
                <button onClick={() => setView('login', { role: 'security' })} className="neo-card p-6 flex items-center gap-5 active:translate-y-1 active:shadow-none transition-all group hover:bg-pink-50">
                    <div className="bg-brand-black text-white p-3 rounded-xl border-2 border-brand-black"><ScanLine /></div>
                    <div className="text-left">
                        <h3 className="font-black text-brand-black uppercase text-lg leading-none">Security</h3>
                        <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mt-1">Verification</p>
                    </div>
                </button>
                <button onClick={() => setView('login', { role: 'admin' })} className="neo-card p-6 flex items-center gap-5 active:translate-y-1 active:shadow-none transition-all group hover:bg-sky-50">
                    <div className="bg-brand-black text-white p-3 rounded-xl border-2 border-brand-black"><Settings /></div>
                    <div className="text-left">
                        <h3 className="font-black text-brand-black uppercase text-lg leading-none">Management</h3>
                        <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mt-1">Admin Console</p>
                    </div>
                </button>
                <div className="grid grid-cols-2 gap-4 mt-1">
                    <button onClick={() => setView('login', { role: 'madrasa_admin' })} className="neo-card p-4 flex flex-col items-center justify-center gap-2 active:translate-y-1 active:shadow-none transition-all hover:bg-purple-50">
                        <h3 className="font-black text-brand-black uppercase text-xs text-center">Madrasa Admin</h3>
                        <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest text-center">Manage School</p>
                    </button>
                    <button onClick={() => setView('login', { role: 'staff' })} className="neo-card p-4 flex flex-col items-center justify-center gap-2 active:translate-y-1 active:shadow-none transition-all hover:bg-orange-50">
                        <h3 className="font-black text-brand-black uppercase text-xs text-center">Staff Portal</h3>
                        <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest text-center">Sign In</p>
                    </button>
                </div>
                <div className="grid grid-cols-1 mt-1">
                    <button onClick={() => setView('staff_register')} className="neo-card p-4 flex flex-col items-center justify-center gap-2 active:translate-y-1 active:shadow-none transition-all hover:bg-gray-100">
                        <h3 className="font-black text-brand-black uppercase text-xs">Staff Join</h3>
                        <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">Register</p>
                    </button>
                </div>
            </div>

            {notices.length > 0 && (
                <div className="w-full max-w-sm mb-6 border-b-4 border-brand-black pb-6 space-y-4 text-left">
                    <div className="flex items-center gap-2 mb-4">
                        <Bell className="w-5 h-5 text-brand-black" />
                        <h3 className="font-black text-lg text-brand-black uppercase">Estate Notices</h3>
                    </div>
                    {notices.slice(0, 3).sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0)).map(n => (
                        <div key={n.id} className="bg-white p-4 neo-card relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-8 h-8 bg-brand-lime border-l-4 border-b-4 border-brand-black" />
                            <h4 className="font-black text-brand-black text-sm uppercase mb-1">{n.title}</h4>
                            <p className="text-[11px] font-bold text-gray-600 line-clamp-2 leading-relaxed">{n.content}</p>
                            <p className="text-[8px] font-bold mt-3 text-brand-black font-mono tracking-widest">{(n.createdAt?.toDate ? n.createdAt.toDate() : new Date(n.createdAt)).toLocaleDateString()}</p>
                        </div>
                    ))}
                </div>
            )}

            <div className="w-full max-w-sm bg-gray-50 border-2 border-brand-black p-6 shadow-none">
                <p className="text-[9px] font-black text-brand-black uppercase tracking-widest mb-3 bg-brand-pink inline-block px-2 border border-brand-black">Daily Hadith</p>
                <p className="text-brand-black text-sm font-bold italic leading-relaxed">"{dailyHadith.text}"</p>
            </div>
        </div>
    );
}
