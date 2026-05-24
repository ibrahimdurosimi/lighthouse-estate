import { Shield, Home, ScanLine, Settings, Bell, BookOpen, Users, UserPlus } from 'lucide-react';
import { useApp } from '../lib/context';
import ThemeToggle from './ThemeToggle';
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
        <div className="min-h-screen flex flex-col items-center p-6 text-center animate-fade-in pb-12 pt-12 md:pt-20">
            <div className="fixed top-6 right-6 z-[100]">
                <ThemeToggle />
            </div>
            <div className="mb-10 w-full max-w-sm">
                <div className="inline-flex p-5 bg-brand-lime/10 rounded-2xl mb-5 text-brand-lime">
                    <Shield className="w-10 h-10" />
                </div>
                <h1 className="text-4xl font-semibold text-brand-black leading-tight tracking-tight mb-2">Lighthouse</h1>
                <p className="text-sm font-medium text-emerald-700 tracking-wider uppercase">Estate Portal</p>
            </div>

            <div className="grid grid-cols-1 gap-4 w-full max-w-sm mb-10">
                <button onClick={() => setView('login', { role: 'resident' })} className="neo-card p-5 flex items-center gap-4 transition-all hover:border-brand-lime/30 group">
                    <div className="bg-emerald-50 text-emerald-700 p-3 rounded-[1rem] group-hover:bg-brand-lime group-hover:text-white transition-colors"><Home size={22} /></div>
                    <div className="text-left">
                        <h3 className="font-semibold text-brand-black text-lg">Residents</h3>
                        <p className="text-xs text-gray-500 font-medium mt-0.5">Manage Access & Home</p>
                    </div>
                </button>
                <button onClick={() => setView('login', { role: 'security' })} className="neo-card p-5 flex items-center gap-4 transition-all hover:border-amber-500/30 group">
                    <div className="bg-amber-50 text-amber-700 p-3 rounded-[1rem] group-hover:bg-amber-500 group-hover:text-white transition-colors"><ScanLine size={22} /></div>
                    <div className="text-left">
                        <h3 className="font-semibold text-brand-black text-lg">Security</h3>
                        <p className="text-xs text-gray-500 font-medium mt-0.5">Verify Visitors & SOS</p>
                    </div>
                </button>
                <button onClick={() => setView('login', { role: 'admin' })} className="neo-card p-5 flex items-center gap-4 transition-all hover:border-brand-cyan/30 group">
                    <div className="bg-teal-50 text-teal-700 p-3 rounded-[1rem] group-hover:bg-brand-cyan group-hover:text-white transition-colors"><Settings size={22} /></div>
                    <div className="text-left">
                        <h3 className="font-semibold text-brand-black text-lg">Management</h3>
                        <p className="text-xs text-gray-500 font-medium mt-0.5">Admin Console</p>
                    </div>
                </button>
                <div className="grid grid-cols-1 mt-2">
                    <button onClick={() => setView('login', { role: 'madrasa_admin' })} className="neo-card p-4 flex items-center justify-center gap-4 transition-all hover:border-indigo-500/30 group">
                        <div className="bg-indigo-50 text-indigo-700 p-3 rounded-xl group-hover:bg-indigo-500 group-hover:text-white transition-colors"><BookOpen size={22} /></div>
                        <h3 className="font-semibold text-brand-black text-lg">Madrasa Portal</h3>
                    </button>
                </div>
            </div>

            {notices.length > 0 && (
                <div className="w-full max-w-sm mb-8 space-y-4 text-left">
                    <div className="flex items-center gap-2 mb-2 px-1">
                        <Bell className="w-5 h-5 text-emerald-700" />
                        <h3 className="font-semibold text-lg text-brand-black">Estate Notices</h3>
                    </div>
                    {notices.slice(0, 3).sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0)).map(n => (
                        <div key={n.id} className="bg-white p-5 rounded-2xl border border-brand-gray/50 shadow-sm">
                            <h4 className="font-semibold text-brand-black text-sm mb-1.5">{n.title}</h4>
                            <p className="text-[13px] text-gray-600 line-clamp-2 leading-relaxed">{n.content}</p>
                            <p className="text-[10px] text-gray-400 font-medium mt-3 uppercase tracking-wider">
                                {(n.createdAt?.toDate ? n.createdAt.toDate() : new Date(n.createdAt)).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            <div className="w-full max-w-sm bg-brand-pink/10 rounded-2xl p-6 border border-brand-pink/20 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <BookOpen size={48} className="text-brand-pink" />
                </div>
                <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-widest mb-2 relative z-10">Daily Reminder</p>
                <p className="text-brand-black text-[15px] font-medium italic leading-relaxed relative z-10 transition-colors">"{dailyHadith.text}"</p>
                <p className="text-xs text-amber-700/80 mt-3 font-medium relative z-10">— {dailyHadith.source}</p>
            </div>
        </div>
    );
}
