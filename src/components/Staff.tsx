import React, { useEffect, useState } from 'react';
import { useApp } from '../lib/context';
import ThemeToggle from './ThemeToggle';
import { LogOut } from 'lucide-react';
import { db, appId } from '../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import clsx from 'clsx';

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
        <div className="max-w-xl mx-auto p-4 min-h-screen pb-24 animate-fade-in relative bg-stone-50/50">
            <header className="bg-white/90 backdrop-blur rounded-3xl p-5 border border-gray-200 mb-6 flex justify-between items-center sticky top-4 z-10 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="bg-emerald-100 text-emerald-800 w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl uppercase shadow-sm">{profile.firstName?.[0]}</div>
                    <div>
                        <h2 className="font-semibold text-lg text-brand-black leading-none uppercase tracking-wide">{profile.firstName || 'Staff Name'}</h2>
                        <p className="text-[11px] font-medium text-emerald-700 uppercase mt-1 tracking-widest">{profile.staffRole || 'Staff'}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <ThemeToggle />
                    <button onClick={() => { setProfile(null); setView('login'); }} className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-600 hover:bg-rose-50 hover:text-rose-500 transition-colors shadow-sm"><LogOut className="w-5 h-5 cursor-pointer" /></button>
                </div>
            </header>

            <div className="bg-white p-6 rounded-3xl border border-gray-200 mb-8 shadow-sm">
                <h3 className="font-semibold uppercase text-sm tracking-wide text-gray-500 mb-4">Your Status</h3>
                <div className="flex items-center gap-3 mb-6">
                    <div className={clsx("px-4 py-2 font-semibold uppercase text-[11px] tracking-widest rounded-lg", 
                        profile.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : 
                        profile.status === 'pending_resident_approval' ? 'bg-sky-50 text-sky-700' : 'bg-rose-50 text-rose-700'
                    )}>
                        {profile.status === 'approved' ? 'Active / Approved' : 
                         profile.status === 'pending_resident_approval' ? 'Pending Approval' : 'Action Required'}
                    </div>
                </div>
                <div className="pt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest mb-1">Employer</p>
                        <p className="font-semibold text-brand-black uppercase text-sm">{profile.employerId}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest mb-1">Role</p>
                        <p className="font-semibold text-brand-black uppercase text-sm">{profile.staffRole}</p>
                    </div>
                </div>
            </div>

            <h3 className="font-semibold text-brand-black uppercase text-sm border-b border-gray-200 pb-2 mb-6 mt-8 tracking-wide">Estate Notices</h3>
            <div className="space-y-4">
                {noticesData.map(n => (
                    <div key={n.id} className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm relative overflow-hidden">
                        <div className="absolute left-0 top-0 w-2 h-full bg-emerald-500"></div>
                        <h3 className="font-semibold text-brand-black text-base mb-2 uppercase tracking-wide">{n.title}</h3>
                        <p className="text-[10px] font-medium text-gray-500 tracking-widest mb-4 uppercase">{(n.createdAt?.toDate ? n.createdAt.toDate() : new Date(n.createdAt)).toLocaleDateString()}</p>
                        <p className="text-sm text-gray-600 leading-relaxed font-medium">{n.content}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
