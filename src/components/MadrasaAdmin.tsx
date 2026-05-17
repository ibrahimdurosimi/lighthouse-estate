import React, { useState, useEffect } from 'react';
import { useApp } from '../lib/context';
import { db, appId } from '../lib/firebase';
import { collection, onSnapshot, query, where, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { LogOut, Users, BookOpen, Clock, Copy, MessageSquare, Plus, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { generateCode, formatDate, uploadImage } from '../lib/utils'; // if uploadImage is exported

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
            setCodes(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(c => c.type === 'Madrasa'));
        });

        // We can store teachers in `madrasa_teachers` or `users` with role=madrasa_teacher
        const tchUnsub = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'users'), snap => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setTeachers(data.filter(u => u.employerId === 'Madrasa'));
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
        setView('landing');
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
        <div className="max-w-xl mx-auto p-4 min-h-screen pb-24 animate-fade-in">
            <header className="bg-white border-4 border-brand-black mb-6 sticky top-0 z-10">
                <div className="p-3 border-b-4 border-brand-black flex justify-between items-center bg-brand-lime">
                    <div>
                        <h2 className="text-xl font-black text-brand-black uppercase leading-none tracking-tighter">Madrasa Admin</h2>
                        <p className="text-[10px] font-bold text-gray-700 uppercase tracking-widest mt-1">Management Portal</p>
                    </div>
                    <button onClick={handleLogout} className="bg-white text-brand-black p-2 border-2 border-brand-black hover:bg-gray-100 shadow-neo-sm">
                        <LogOut className="w-5 h-5"/>
                    </button>
                </div>
                <div className="bg-brand-gray p-2 flex gap-2 overflow-x-auto no-scrollbar">
                    <button onClick={()=>setTab('analytics')} className={clsx("px-4 py-2 border-2 border-brand-black text-[10px] font-black uppercase", tab==='analytics'?'bg-brand-black text-white shadow-neo-sm':'bg-white text-brand-black')}>Analytics</button>
                    <button onClick={()=>setTab('students')} className={clsx("px-4 py-2 border-2 border-brand-black text-[10px] font-black uppercase", tab==='students'?'bg-brand-black text-white shadow-neo-sm':'bg-white text-brand-black')}>Students</button>
                    <button onClick={()=>setTab('teachers')} className={clsx("px-4 py-2 border-2 border-brand-black text-[10px] font-black uppercase", tab==='teachers'?'bg-brand-black text-white shadow-neo-sm':'bg-white text-brand-black')}>Staff / Passes</button>
                </div>
            </header>

            {tab === 'analytics' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-4 border-4 border-brand-black shadow-neo flex flex-col justify-center items-center">
                            <span className="text-5xl font-black text-brand-black">{students.length}</span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mt-2">Registered Students</span>
                        </div>
                        <div className="bg-white p-4 border-4 border-brand-black shadow-neo flex flex-col justify-center items-center">
                            <span className="text-5xl font-black text-brand-black">{teachers.length}</span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mt-2">Teaching Staff</span>
                        </div>
                    </div>
                    
                    <div className="bg-brand-pink p-5 border-4 border-brand-black shadow-neo-sm">
                        <h3 className="font-black text-brand-black uppercase border-b-2 border-brand-black pb-2 mb-4">Quick Actions</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={()=>generateMadrasaCode('Guest')} className="bg-white p-4 border-2 border-brand-black shadow-neo-sm active:translate-y-1 hover:bg-gray-50 text-[10px] font-bold uppercase">Generate Guest Pass</button>
                            <button onClick={()=>generateMadrasaCode('Teacher')} className="bg-brand-black text-white p-4 border-2 border-brand-black shadow-neo-sm active:translate-y-1 hover:bg-gray-800 text-[10px] font-bold uppercase">Generate Teacher Pass</button>
                        </div>
                    </div>
                </div>
            )}

            {tab === 'students' && (
                <div className="space-y-4">
                    <h3 className="font-black text-brand-black uppercase border-b-4 border-brand-black pb-2">Enrolled Kids ({students.length})</h3>
                    {students.map(s => (
                        <div key={s.id} className="bg-white p-4 border-4 border-brand-black neo-card flex gap-4">
                            <div className="w-16 h-16 bg-gray-200 border-2 border-brand-black shrink-0 relative">
                                {s.photo ? <img src={s.photo} className="w-full h-full object-cover" alt="child"/> : <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[8px] font-black uppercase text-gray-500 text-center w-full">NO IMG</span>}
                            </div>
                            <div className="flex-1">
                                <h4 className="font-black text-brand-black uppercase text-sm leading-tight">{s.name}</h4>
                                <p className="text-[10px] font-bold text-gray-600 uppercase mb-1">{s.age} yrs • {s.gender} • {s.houseId}</p>
                                <p className="text-[10px] font-bold text-gray-700 bg-gray-100 p-1 border border-brand-black inline-block mb-1">DOB: {s.dob}</p>
                                {s.allergies && <p className="text-[10px] font-bold text-red-600 bg-red-100 p-1 border-l-4 border-red-500 mt-1">Allergies: {s.allergies}</p>}
                                <div className="mt-2 text-[10px] font-bold text-brand-black p-2 bg-brand-lime/20 border-2 border-brand-black">
                                    ICE: {s.iceName} • {s.icePhone}
                                </div>
                            </div>
                        </div>
                    ))}
                    {students.length === 0 && <p className="text-center text-gray-500 font-bold uppercase text-[10px] pt-8">No students enrolled yet.</p>}
                </div>
            )}

            {tab === 'teachers' && (
                <div className="space-y-6">
                    <div>
                        <div className="flex justify-between items-center border-b-4 border-brand-black pb-2 mb-4">
                            <h3 className="font-black text-brand-black uppercase">Teaching Staff</h3>
                            <button onClick={()=>setShowAddTeacher(true)} className="bg-brand-black text-white px-3 py-1 text-[9px] font-black border-2 border-brand-black shadow-neo-sm uppercase hover:bg-gray-800">Add Staff</button>
                        </div>
                        <div className="space-y-3">
                            {teachers.map(t => (
                                <div key={t.id} className="bg-white p-3 border-2 border-brand-black flex justify-between items-center shadow-neo-sm">
                                    <div>
                                        <p className="font-black uppercase text-brand-black text-sm">{t.firstName} {t.lastName || ''}</p>
                                        <p className="text-[10px] font-bold text-gray-600 uppercase">{t.staffRole} • {t.phone}</p>
                                        <p className="text-[9px] font-bold mt-1 bg-brand-gray px-1 border-2 border-brand-black w-max uppercase">{t.status.replace(/_/g, ' ')}</p>
                                        {t.inviteCode && t.status === 'pending_employee_completion' && <p className="text-[9px] font-black mt-1 text-brand-lime bg-brand-black px-1 border-2 border-brand-black w-max uppercase">Invite: {t.inviteCode}</p>}
                                    </div>
                                    <button onClick={()=>handleRemoveTeacher(t.id)} className="p-2 text-red-500 hover:bg-red-50 border border-transparent hover:border-red-500">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            {teachers.length === 0 && <p className="text-[10px] uppercase font-bold text-gray-500 opacity-60">No teachers added.</p>}
                        </div>
                    </div>

                    <div className="pt-6 border-t-4 border-brand-black">
                        <h3 className="font-black text-brand-black uppercase border-b-4 border-brand-black pb-2 mb-4">Active Madrasa Passes</h3>
                        <div className="space-y-3">
                            {codes.filter(c => c.status === 'active').map(c => (
                                <div key={c.id} className="bg-white p-4 border-4 border-brand-black neo-card">
                                    <h4 className="text-2xl font-black font-mono tracking-tighter text-brand-black">{c.code}</h4>
                                    <p className="text-[10px] font-bold text-gray-600 uppercase mb-2">{c.targetName}</p>
                                    <div className="flex gap-2">
                                        <button onClick={()=>shareCode(c.id, 'wa')} className="flex-1 bg-brand-black text-white py-2 border-2 border-brand-black text-[9px] uppercase font-black uppercase flex items-center justify-center gap-1"><MessageSquare className="w-3 h-3 text-brand-lime" /> Share</button>
                                        <button onClick={()=>shareCode(c.id, 'cp')} className="bg-white text-brand-black px-3 py-2 border-2 border-brand-black hover:bg-gray-100"><Copy className="w-3 h-3" /></button>
                                    </div>
                                </div>
                            ))}
                            {codes.filter(c => c.status==='active').length === 0 && <p className="text-[10px] uppercase font-bold text-gray-500 opacity-60">No active passes.</p>}
                        </div>
                    </div>
                </div>
            )}

            {showAddTeacher && (
                <div className="fixed inset-0 z-[300] bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-sm p-6 neo-card border-4 border-brand-black">
                        <h3 className="font-black italic uppercase border-b-4 border-brand-black pb-2 mb-4 text-brand-black">Add Teacher</h3>
                        <form onSubmit={handleAddTeacher} className="space-y-4">
                            <div><label className="text-[10px] font-bold uppercase">Name</label><input required value={tName} onChange={e=>setTName(e.target.value)} className="w-full p-2 neo-input text-xs"/></div>
                            <div><label className="text-[10px] font-bold uppercase">Phone</label><input required type="tel" value={tPhone} onChange={e=>setTPhone(e.target.value)} className="w-full p-2 neo-input text-xs font-mono"/></div>
                            <div>
                                <label className="text-[10px] font-bold uppercase">Role</label>
                                <select value={tRole} onChange={e=>setTRole(e.target.value)} className="w-full p-2 neo-input text-xs uppercase">
                                    <option>Teacher</option>
                                    <option>Headmaster</option>
                                    <option>Admin Assist</option>
                                </select>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button type="button" onClick={()=>setShowAddTeacher(false)} className="w-1/3 bg-gray-200 text-brand-black border-2 border-brand-black p-2 text-[10px] font-black uppercase shadow-neo-sm">Cancel</button>
                                <button type="submit" className="flex-1 bg-brand-black text-brand-lime border-2 border-brand-black p-2 text-[11px] font-black uppercase shadow-neo-sm">{`Save`}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
