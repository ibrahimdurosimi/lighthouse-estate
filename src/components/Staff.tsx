import React, { useEffect, useState } from 'react';
import { useApp } from '../lib/context';
import { LogOut } from 'lucide-react';
import { db, appId } from '../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

export default function Staff() {
    const { profile, setProfile, setView } = useApp();
    const [noticesData, setNoticesData] = useState<any[]>([]);

    useEffect(() => {
        if (!profile) return;
        const noticesUnsub = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'notices'), snap => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setNoticesData(data);
        });

        return () => {
            noticesUnsub();
        };
    }, [profile]);

    if (!profile) return null;

    return (
        <div className="max-w-xl mx-auto p-4 min-h-screen pb-24 animate-fade-in relative">
            <header className="bg-white p-5 border-b-4 border-brand-black mb-6 flex justify-between items-center sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <div className="bg-brand-black text-white w-10 h-10 flex items-center justify-center font-black text-xl border-2 border-brand-black">{profile.firstName?.[0]}</div>
                    <div>
                        <h2 className="font-black text-sm text-brand-black leading-none uppercase">{profile.firstName || 'Staff Name'}</h2>
                        <p className="text-[9px] font-bold text-gray-500 uppercase mt-1 tracking-widest">{profile.staffRole || 'Staff'}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => { setProfile(null); setView('landing'); }} className="p-2 border-2 border-brand-black bg-brand-pink hover:bg-pink-300 transition-colors"><LogOut className="w-5 h-5 text-brand-black" /></button>
                </div>
            </header>

            <div className="bg-white p-6 neo-card mb-6">
                <h3 className="font-black uppercase text-xl mb-2 text-brand-black">Your Status</h3>
                <div className="flex items-center gap-3">
                    <div className={`px-4 py-2 font-black uppercase text-[10px] tracking-widest border-2 border-brand-black ${
                        profile.status === 'approved' ? 'bg-brand-lime' : 
                        profile.status === 'pending_resident_approval' ? 'bg-brand-cyan text-white' : 'bg-brand-pink'
                    }`}>
                        {profile.status === 'approved' ? 'Active / Approved' : 
                         profile.status === 'pending_resident_approval' ? 'Pending Approval' : 'Action Required'}
                    </div>
                </div>
                <p className="mt-4 text-xs font-bold text-gray-600">
                    Employer: <span className="text-brand-black uppercase">{profile.employerId}</span>
                </p>
                <p className="mt-1 text-xs font-bold text-gray-600">
                    Role: <span className="text-brand-black uppercase">{profile.staffRole}</span>
                </p>
            </div>

            <h3 className="font-black text-brand-black uppercase text-sm border-b-4 border-brand-black pb-2 mb-4 mt-8">Estate Notices</h3>
            <div className="space-y-4">
                {noticesData.map(n => (
                    <div key={n.id} className="bg-white p-5 border-4 border-brand-black shadow-neo-sm mb-4">
                        <h3 className="font-black text-brand-black text-lg mb-1 uppercase">{n.title}</h3>
                        <p className="text-[8px] font-bold text-brand-black bg-brand-pink inline-block px-1 border-2 border-brand-black mb-3 uppercase">{(n.createdAt?.toDate ? n.createdAt.toDate() : new Date(n.createdAt)).toLocaleDateString()}</p>
                        <p className="text-xs text-brand-black leading-relaxed font-medium border-t-2 border-brand-black pt-2">{n.content}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
