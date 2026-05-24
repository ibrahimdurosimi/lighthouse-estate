import React, { useState, useEffect } from 'react';
import { useApp } from '../lib/context';
import ThemeToggle from './ThemeToggle';
import { db, appId } from '../lib/firebase';
import { collection, onSnapshot, query, where, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { LogOut, Users, BookOpen, Clock, Copy, MessageSquare, Plus, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { generateCode, formatDate } from '../lib/utils';

export default function MadrasaAdmin() {
    const { setView, setProfile, profile, notify } = useApp();
    const [tab, setTab] = useState<'analytics' | 'students' | 'teachers'>('analytics');
    
    const [students, setStudents] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [codes, setCodes] = useState<any[]>([]);

    const [showAddTeacher, setShowAddTeacher] = useState(false);
    const [tName, setTName] = useState('');
    const [tPhone, setTPhone] = useState('');
    const [tRole, setTRole] = useState('Teacher');

    useEffect(() => {
        const studUnsub = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'madrasa_students'), snap => {
            setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        
        const codesUnsub = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'codes'), snap => {
            setCodes(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter((c: any) => c.type === 'Madrasa'));
        });

        // We can store teachers in `madrasa_teachers` or `users` with role=madrasa_teacher
        const tchUnsub = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'users'), snap => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setTeachers(data.filter((u: any) => u.employerId === 'Madrasa'));
        });

        return () => {
            studUnsub();
            codesUnsub();
            tchUnsub();
        };
    }, []);

    const handleAddTeacher = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const inviteCode = generateCode();
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'users'), {
                firstName: tName,
                phone: tPhone,
                staffRole: tRole,
                role: 'staff',
                employerId: 'Madrasa',
                status: 'pending_employee_completion',
                inviteCode,
                createdAt: serverTimestamp()
            });
            notify(`Staff added! Invite Code: ${inviteCode}`);
            setShowAddTeacher(false);
            setTName(''); setTPhone(''); setTRole('Teacher');
        } catch (error) {
            notify("Error adding staff.", "error");
        }
    };

    const handleRemoveTeacher = async (id: string) => {
        if(window.confirm("Remove staff?")) {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', id));
            notify("Staff removed.");
        }
    };

    const generateMadrasaCode = async (forType: 'Guest' | 'Teacher') => {
        const code = generateCode();
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'codes'), {
            appId,
            houseId: 'Madrasa',
            code,
            targetName: forType === 'Guest' ? 'Madrasa Guest' : 'Madrasa Teacher',
            type: 'Madrasa',
            status: 'active',
            createdAt: serverTimestamp(),
            // Set expiry logic here (Weekends 8am-2pm) - but we'll enforce in security
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h default for generation
        });
        notify(`${forType} Pass created: ${code}`);
    };

    const handleLogout = () => {
        setProfile(null);
        setView('login');
    };

    const shareCode = (id: string, mode: 'wa' | 'cp') => {
        const codeObj = codes.find(c => c.id === id);
        if (!codeObj) return;
        const msg = `Madrasa Access Pass\nCode: ${codeObj.code}\nFor: ${codeObj.targetName}\nActive on Weekends 8AM - 2PM`;
        if (mode === 'wa') window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`);
        else { navigator.clipboard.writeText(msg); notify("Copied"); }
    };

    if(!profile) return null;

    return (
        <div className="max-w-xl mx-auto min-h-screen pb-24 animate-fade-in bg-stone-50/50">
            <header className="bg-white/90 backdrop-blur border-b border-brand-gray px-5 py-4 mb-2 flex justify-between items-center sticky top-0 z-20">
                <div className="flex items-center gap-3">
                    <div className="bg-emerald-100 text-emerald-800 w-11 h-11 rounded-full flex items-center justify-center font-bold text-lg"><BookOpen className="w-5 h-5"/></div>
                    <div>
                        <h2 className="font-semibold text-brand-black leading-tight">Madrasa Admin</h2>
                        <p className="text-[10px] font-medium text-emerald-700 uppercase tracking-wider">Management Portal</p>
                    </div>
                </div>
                <div className="flex gap-2 items-center">
                    <ThemeToggle />
                    <button onClick={handleLogout} className="p-2 rounded-full bg-gray-50 text-gray-600 hover:bg-red-50 hover:text-red-500 transition-colors">
                        <LogOut className="w-5 h-5"/>
                    </button>
                </div>
            </header>
            
            <div className="sticky top-[77px] z-10 bg-stone-50/90 backdrop-blur pb-3 pt-1 px-4 mb-4">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                    <button onClick={()=>setTab('analytics')} className={clsx("px-4 py-2 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors", tab==='analytics' ? 'bg-emerald-900 text-white' : 'bg-white text-gray-600 border border-gray-200 shadow-sm')}>Analytics</button>
                    <button onClick={()=>setTab('students')} className={clsx("px-4 py-2 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors", tab==='students' ? 'bg-emerald-900 text-white' : 'bg-white text-gray-600 border border-gray-200 shadow-sm')}>Students</button>
                    <button onClick={()=>setTab('teachers')} className={clsx("px-4 py-2 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors", tab==='teachers' ? 'bg-emerald-900 text-white' : 'bg-white text-gray-600 border border-gray-200 shadow-sm')}>Staff / Passes</button>
                </div>
            </div>

            <div className="px-4">
            {tab === 'analytics' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex flex-col items-center justify-center shadow-sm">
                            <span className="text-3xl font-semibold text-emerald-900">{students.length}</span>
                            <span className="text-[10px] font-medium text-emerald-700 uppercase tracking-wider mt-1 text-center">Registered Students</span>
                        </div>
                        <div className="bg-teal-50 p-4 rounded-xl border border-teal-100 flex flex-col items-center justify-center shadow-sm">
                            <span className="text-3xl font-semibold text-teal-900">{teachers.length}</span>
                            <span className="text-[10px] font-medium text-teal-700 uppercase tracking-wider mt-1 text-center">Teaching Staff</span>
                        </div>
                    </div>
                    
                    <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                        <h3 className="font-semibold text-brand-black text-sm uppercase tracking-wide border-b border-gray-100 pb-3 mb-4">Quick Actions</h3>
                        <div className="grid gap-3">
                            <button onClick={()=>generateMadrasaCode('Guest')} className="w-full bg-stone-50 border border-stone-200 text-stone-700 p-4 rounded-xl shadow-sm hover:bg-stone-100 transition-colors text-xs font-semibold uppercase tracking-wide flex items-center justify-center gap-2"><BookOpen className="w-4 h-4"/> Generate Guest Pass</button>
                            <button onClick={()=>generateMadrasaCode('Teacher')} className="w-full bg-emerald-900 text-white border-2 border-emerald-900 shadow-sm hover:bg-emerald-950 p-4 rounded-xl transition-colors text-xs font-semibold uppercase tracking-wide flex items-center justify-center gap-2"><Clock className="w-4 h-4"/> Generate Teacher Pass</button>
                        </div>
                    </div>
                </div>
            )}

            {tab === 'students' && (
                <div className="space-y-4">
                    <h3 className="font-semibold text-brand-black text-sm uppercase tracking-wide border-b border-gray-100 pb-2 mb-4">Enrolled Kids ({students.length})</h3>
                    <div className="grid gap-3">
                    {students.map(s => (
                        <div key={s.id} className="bg-white p-5 rounded-2xl border border-gray-200 flex gap-4 shadow-sm">
                            <div className="bg-emerald-50 text-emerald-700 w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl shrink-0 uppercase overflow-hidden relative">
                                {s.photo ? <img src={s.photo} className="w-full h-full object-cover" alt="child"/> : s.name[0]}
                            </div>
                            <div className="flex-1">
                                <h4 className="font-semibold text-brand-black uppercase text-sm tracking-wide mb-1">{s.name}</h4>
                                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-widest leading-relaxed mb-2">{s.age} yrs • {s.gender} <br/> Unit: {s.houseId}</p>
                                <div className="space-y-2 mt-3">
                                    {s.allergies && <p className="text-[10px] font-semibold text-rose-700 bg-rose-50 p-2 rounded-lg">Allergies: {s.allergies}</p>}
                                    <p className="text-[10px] font-medium text-sky-800 bg-sky-50 p-2 rounded-lg">ICE: {s.iceName} - <span className="font-mono">{s.icePhone}</span></p>
                                </div>
                            </div>
                        </div>
                    ))}
                    </div>
                    {students.length === 0 && <p className="text-center text-gray-500 font-medium tracking-wide text-xs pt-8">No students enrolled yet.</p>}
                </div>
            )}

            {tab === 'teachers' && (
                <div className="space-y-8">
                    <div>
                        <div className="flex justify-between items-center border-b border-gray-100 pb-2 mb-4">
                            <h3 className="font-semibold text-brand-black text-sm uppercase tracking-wide">Teaching Staff</h3>
                            <button onClick={()=>setShowAddTeacher(true)} className="bg-emerald-900 text-white px-4 py-2 text-[10px] rounded-lg font-semibold shadow-sm uppercase hover:bg-emerald-950 transition-colors">Add Staff</button>
                        </div>
                        <div className="grid gap-3">
                            {teachers.map(t => (
                                <div key={t.id} className="bg-white p-4 rounded-2xl border border-gray-200 flex justify-between items-center shadow-sm">
                                    <div className="space-y-1">
                                        <p className="font-semibold uppercase tracking-wide text-brand-black text-sm">{t.firstName} {t.lastName || ''}</p>
                                        <p className="text-[11px] font-medium text-gray-500 uppercase tracking-widest">{t.staffRole} • {t.phone}</p>
                                        <div className="pt-1.5 flex gap-2 items-center flex-wrap">
                                            <p className="text-[9px] font-semibold bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full uppercase">{t.status.replace(/_/g, ' ')}</p>
                                            {t.inviteCode && t.status === 'pending_employee_completion' && <p className="text-[9px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full uppercase tracking-wider">Invite: {t.inviteCode}</p>}
                                        </div>
                                    </div>
                                    <button onClick={()=>handleRemoveTeacher(t.id)} className="p-2.5 text-rose-500 bg-rose-50 rounded-xl hover:bg-rose-100 transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            {teachers.length === 0 && <p className="text-[11px] uppercase font-medium text-gray-400 tracking-wide">No teachers added.</p>}
                        </div>
                    </div>

                    <div className="pt-6 border-t border-gray-100">
                        <h3 className="font-semibold text-brand-black text-sm uppercase tracking-wide mb-4">Active Madrasa Passes</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {codes.filter(c => c.status === 'active').map(c => (
                                <div key={c.id} className="bg-stone-50 p-4 rounded-2xl border border-stone-200 flex flex-col justify-between">
                                    <div>
                                        <h4 className="text-2xl font-black font-mono tracking-widest text-brand-black mb-1">{c.code}</h4>
                                        <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-4">{c.targetName}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={()=>shareCode(c.id, 'wa')} className="flex-1 bg-emerald-700 text-white py-2 rounded-lg text-[9px] font-semibold uppercase flex items-center justify-center gap-1.5 shadow-sm hover:bg-emerald-800 transition-colors"><MessageSquare className="w-3.5 h-3.5" /> Share</button>
                                        <button onClick={()=>shareCode(c.id, 'cp')} className="bg-white text-gray-700 p-2 rounded-lg border border-gray-200 outline-none hover:bg-gray-50 transition-colors shadow-sm"><Copy className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {codes.filter(c => c.status==='active').length === 0 && <p className="text-[11px] uppercase font-medium text-gray-400 tracking-wide">No active passes.</p>}
                    </div>
                </div>
            )}
            </div>

            {showAddTeacher && (
                <div className="fixed inset-0 z-[300] bg-brand-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-sm p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
                        <h3 className="font-semibold uppercase tracking-wide text-sm border-b border-gray-100 pb-3 mb-5 text-brand-black">Add Teacher</h3>
                        <form onSubmit={handleAddTeacher} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest ml-1 mb-1 block">Name</label>
                                <input required value={tName} onChange={e=>setTName(e.target.value)} className="w-full p-3.5 neo-input text-sm"/>
                            </div>
                            <div>
                                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest ml-1 mb-1 block">Phone</label>
                                <input required type="tel" value={tPhone} onChange={e=>setTPhone(e.target.value)} className="w-full p-3.5 neo-input text-sm font-mono"/>
                            </div>
                            <div>
                                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest ml-1 mb-1 block">Role</label>
                                <select value={tRole} onChange={e=>setTRole(e.target.value)} className="w-full p-3.5 neo-input text-sm uppercase tracking-wide">
                                    <option>Teacher</option>
                                    <option>Headmaster</option>
                                    <option>Admin Assist</option>
                                </select>
                            </div>
                            <div className="flex gap-3 pt-3">
                                <button type="button" onClick={()=>setShowAddTeacher(false)} className="px-6 bg-stone-100 text-stone-600 rounded-xl py-3 text-[11px] font-semibold uppercase shadow-sm hover:bg-stone-200 transition-colors">Cancel</button>
                                <button type="submit" className="flex-1 bg-emerald-900 text-white rounded-xl shadow-md p-3 text-xs font-semibold uppercase hover:bg-emerald-950 transition-colors">{`Save`}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
