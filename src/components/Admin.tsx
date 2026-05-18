import React, { useState, useEffect } from 'react';
import { LogOut, Eye, EyeOff } from 'lucide-react';
import { useApp } from '../lib/context';
import ThemeToggle from './ThemeToggle';
import { db, appId } from '../lib/firebase';
import { collection, onSnapshot, updateDoc, deleteDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { filterItemsByDate, formatDate, hashPin, HOUSES, SUB_OPTIONS } from '../lib/utils';
import clsx from 'clsx';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function Admin() {
    const { profile, setView, setProfile, notify } = useApp();
    const [admTab, setAdmTab] = useState<'analytics' | 'directory' | 'ledger' | 'notices' | 'tickets' | 'polls' | 'dues'>('analytics');
    const [admFilter, setAdmFilter] = useState('all');
    
    const [usersData, setUsersData] = useState<any[]>([]);
    const [codesData, setCodesData] = useState<any[]>([]);
    const [noticesData, setNoticesData] = useState<any[]>([]);
    const [madrasaStudentsData, setMadrasaStudentsData] = useState<any[]>([]);
    const [ticketsData, setTicketsData] = useState<any[]>([]);
    const [pollsData, setPollsData] = useState<any[]>([]);
    
    // UI state
    const [directoryFilter, setDirectoryFilter] = useState<'all'|'resident'|'staff'|'admin'|'madrasa'>('all');
    const [viewUserFull, setViewUserFull] = useState<any>(null);
    const [noticeTitle, setNoticeTitle] = useState('');
    const [noticeContent, setNoticeContent] = useState('');
    const [editingNoticeId, setEditingNoticeId] = useState<string | null>(null);

    const [pollTitle, setPollTitle] = useState('');
    const [pollOptA, setPollOptA] = useState('');
    const [pollOptB, setPollOptB] = useState('');

    const [showAddAdmin, setShowAddAdmin] = useState(false);
    const [viewStaff, setViewStaff] = useState<any>(null);

    useEffect(() => {
        const usersUnsub = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'users'), snap => {
            setUsersData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        const codesUnsub = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'codes'), snap => {
            setCodesData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        const noticesUnsub = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'notices'), snap => {
            setNoticesData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        const msUnsub = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'madrasa_students'), snap => {
            setMadrasaStudentsData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        const ticketsUnsub = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'tickets'), snap => {
            setTicketsData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        const pollsUnsub = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'polls'), snap => {
            setPollsData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => {
            usersUnsub();
            codesUnsub();
            noticesUnsub();
            msUnsub();
            ticketsUnsub();
            pollsUnsub();
        };
    }, []);

    const filteredCodes = filterItemsByDate(codesData, 'createdAt', admFilter);

    const approveUser = async (id: string) => {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', id), { status: 'approved' });
        notify("Approved.");
    };

    const deleteUser = async (id: string) => {
        if (window.confirm("Permanently delete?")) {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', id));
            notify("Deleted.");
        }
    };

    const resetPin = async (uid: string, name: string) => {
        const pin = window.prompt(`Enter new 6-digit PIN for ${name}:`);
        if (pin && pin.trim().length === 6) {
            const h = await hashPin(pin.trim());
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', uid), { pin: h });
            notify("PIN reset.");
        }
    };

    // New Admin State
    const [amFn, setAmFn] = useState('');
    const [amLn, setAmLn] = useState('');
    const [amRole, setAmRole] = useState('security');
    const [amPin, setAmPin] = useState('');
    const [showAmPin, setShowAmPin] = useState(false);
    
    const handleAddAdmin = async () => {
        if (!amFn || amPin.trim().length !== 6) return alert("Required info missing.");
        try {
            const hashed = await hashPin(amPin.trim());
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'users'), { 
                firstName: amFn, 
                lastName: amLn, 
                identifier: amFn, 
                pin: hashed, 
                role: amRole, 
                status: 'approved', 
                createdAt: serverTimestamp() 
            });
            setShowAddAdmin(false);
            notify("Account created.");
            setAmFn(''); setAmLn(''); setAmRole('security'); setAmPin('');
        } catch(err) {
            notify("Error creating account.", "error");
        }
    };

    const handleSaveNotice = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!noticeTitle || !noticeContent) return alert("Title and content are required.");
        
        try {
            if (editingNoticeId) {
                await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'notices', editingNoticeId), {
                    title: noticeTitle,
                    content: noticeContent,
                    updatedAt: serverTimestamp()
                });
                notify("Notice updated.");
            } else {
                await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'notices'), {
                    title: noticeTitle,
                    content: noticeContent,
                    createdAt: serverTimestamp()
                });
                notify("Notice created.");
            }
            setNoticeTitle('');
            setNoticeContent('');
            setEditingNoticeId(null);
        } catch(err) {
            notify("Error saving notice.", "error");
        }
    };

    const handleEditNotice = (n: any) => {
        setNoticeTitle(n.title);
        setNoticeContent(n.content);
        setEditingNoticeId(n.id);
        setAdmTab('notices');
        window.scrollTo(0, 0);
    };

    const handleDeleteNotice = async (id: string) => {
        if (window.confirm("Permanently delete notice?")) {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'notices', id));
            notify("Notice deleted.");
        }
    };

    const prepareTypeChart = () => {
        const typeCounts: Record<string, number> = {}; 
        filteredCodes.forEach(x => typeCounts[x.type] = (typeCounts[x.type]||0)+1);
        return Object.keys(typeCounts).map(k => ({ name: k, value: typeCounts[k] }));
    };

    const prepareStatusChart = () => {
        const statusCounts: Record<string, number> = {}; 
        filteredCodes.forEach(x => statusCounts[x.status] = (statusCounts[x.status]||0)+1);
        return Object.keys(statusCounts).map(k => ({ name: k, count: statusCounts[k] }));
    };

    const typeChartData = prepareTypeChart();
    const statusChartData = prepareStatusChart();
    const colors = ['#bef264', '#f9a8d4', '#67e8f9', '#fcd34d'];

    return (
        <div className="max-w-4xl mx-auto min-h-screen pb-24 animate-fade-in relative bg-stone-50/50">
            <header className="flex flex-col gap-2 mb-6">
                <div className="flex justify-between items-center border-b border-gray-200 pb-3 p-4 sticky top-0 bg-white/90 backdrop-blur z-20">
                    <div>
                        <h1 className="text-xl font-semibold text-brand-black tracking-tight">Estate Mgmt</h1>
                        <p className="text-[10px] text-emerald-800 font-medium tracking-widest uppercase mt-0.5">Oversight Console</p>
                    </div>
                    <div className="flex gap-2 items-center">
                        <ThemeToggle />
                        <button onClick={() => { setProfile(null); setView('landing'); }} className="p-2.5 bg-gray-50 text-gray-600 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors">
                            <LogOut className="w-5 h-5"/>
                        </button>
                    </div>
                </div>
                <div className="bg-white px-3 py-1 flex items-center gap-2 overflow-x-auto no-scrollbar shadow-sm sticky top-[69px] z-10 border-b border-gray-100">
                    {admTab !== 'directory' && (
                        <select value={admFilter} onChange={e=>setAdmFilter(e.target.value)} className="bg-stone-50 text-stone-700 text-[11px] font-semibold py-1.5 px-3 rounded-full border border-stone-200 outline-none mr-2 focus:ring-2 focus:ring-emerald-500/20">
                            <option value="all">All</option><option value="today">Today</option><option value="week">Week</option><option value="month">Month</option>
                        </select>
                    )}
                    <button onClick={()=>setAdmTab('analytics')} className={clsx("px-4 py-2 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors", admTab==='analytics' ? 'bg-emerald-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200')}>Analytics</button>
                    <button onClick={()=>setAdmTab('directory')} className={clsx("px-4 py-2 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors", admTab==='directory' ? 'bg-emerald-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200')}>Directory</button>
                    <button onClick={()=>setAdmTab('ledger')} className={clsx("px-4 py-2 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors", admTab==='ledger' ? 'bg-emerald-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200')}>Ledger</button>
                    <button onClick={()=>setAdmTab('notices')} className={clsx("px-4 py-2 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors", admTab==='notices' ? 'bg-emerald-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200')}>Notices</button>
                    <button onClick={()=>setAdmTab('tickets')} className={clsx("px-4 py-2 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors", admTab==='tickets' ? 'bg-emerald-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200')}>Fix-It</button>
                    <button onClick={()=>setAdmTab('polls')} className={clsx("px-4 py-2 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors", admTab==='polls' ? 'bg-emerald-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200')}>Polls</button>
                    <button onClick={()=>setAdmTab('dues')} className={clsx("px-4 py-2 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors", admTab==='dues' ? 'bg-emerald-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200')}>Dues</button>
                </div>
            </header>
            
            <div className="space-y-6 px-4">
                {admTab === 'dues' && (
                    <div className="space-y-4 animate-fade-in">
                        <div className="flex justify-between items-center px-1 mb-2">
                            <h2 className="text-sm text-brand-black font-semibold uppercase tracking-wide">Estate Dues Ledger (Current Year)</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {usersData.filter(x => x.role === 'resident').map(res => (
                                <div key={res.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex justify-between items-center transition-all hover:shadow-md">
                                    <div>
                                        <h3 className="font-semibold text-brand-black text-sm">{res.identifier}</h3>
                                        <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">{res.firstName} {res.lastName}</p>
                                    </div>
                                    <button 
                                        onClick={async () => {
                                            const newStat = res.duesStatus === 'paid' ? 'unpaid' : 'paid';
                                            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', res.id), { duesStatus: newStat });
                                            notify(`Updated ${res.identifier} to ${newStat.toUpperCase()}`);
                                        }}
                                        className={clsx("px-4 py-2 rounded-lg font-semibold uppercase text-[10px] transition-colors shadow-sm", res.duesStatus === 'paid' ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100" : "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100")}
                                    >
                                        {res.duesStatus === 'paid' ? 'Paid' : 'Unpaid'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {admTab === 'polls' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <h3 className="font-semibold uppercase text-sm mb-4 tracking-wide text-brand-black">Create Poll / Townhall Measure</h3>
                            <form 
                                onSubmit={async (e) => {
                                    e.preventDefault();
                                    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'polls'), {
                                        title: pollTitle, optA: pollOptA, optB: pollOptB, votesA: 0, votesB: 0,
                                        status: 'open', createdAt: serverTimestamp(), voters: []
                                    });
                                    setPollTitle(''); setPollOptA(''); setPollOptB('');
                                    notify("Poll Created");
                                }}
                                className="space-y-4"
                            >
                                <div><input required value={pollTitle} onChange={e=>setPollTitle(e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none text-sm" placeholder="Poll Question" /></div>
                                <div className="grid grid-cols-2 gap-3">
                                    <input required value={pollOptA} onChange={e=>setPollOptA(e.target.value)} className="p-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none text-sm" placeholder="Option A" />
                                    <input required value={pollOptB} onChange={e=>setPollOptB(e.target.value)} className="p-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none text-sm" placeholder="Option B" />
                                </div>
                                <button type="submit" className="w-full bg-emerald-900 text-white font-semibold p-3.5 rounded-xl uppercase text-xs shadow-sm hover:bg-emerald-950 transition-colors">Create Poll</button>
                            </form>
                        </div>

                        <div className="space-y-4">
                            {pollsData.map(p => (
                                <div key={p.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                    <div className="flex justify-between items-start mb-3">
                                        <h4 className="font-semibold text-brand-black text-[15px]">{p.title}</h4>
                                        <button onClick={async () => {
                                            const newStat = p.status === 'open' ? 'closed' : 'open';
                                            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'polls', p.id), { status: newStat });
                                        }} className={clsx("px-2.5 py-1 rounded-full font-semibold uppercase text-[9px] transition-colors", p.status === 'open' ? 'bg-emerald-100 text-emerald-800 hover:bg-rose-100 hover:text-rose-800' : 'bg-gray-100 text-gray-600 hover:bg-emerald-100 hover:text-emerald-800')} title="Toggle Status">
                                            {p.status}
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 text-center text-xs font-semibold">
                                        <div className="bg-teal-50 text-teal-800 p-3 rounded-lg border border-teal-100 shadow-sm">{p.optA}: {p.votesA}</div>
                                        <div className="bg-emerald-50 text-emerald-800 p-3 rounded-lg border border-emerald-100 shadow-sm">{p.optB}: {p.votesB}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {admTab === 'tickets' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center px-1 mb-2"><h2 className="text-sm text-brand-black font-semibold uppercase tracking-wide">Maintenance Tickets</h2></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {filterItemsByDate(ticketsData, 'createdAt', admFilter).map(t => (
                                <div key={t.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm transition-all hover:shadow-md">
                                    <div className="flex justify-between items-start mb-3">
                                        <h3 className="font-semibold text-brand-black text-[15px] leading-tight">{t.title}</h3>
                                        <select 
                                            value={t.status}
                                            onChange={async (e) => {
                                                await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tickets', t.id), { status: e.target.value });
                                                notify('Ticket updated');
                                            }}
                                            className={clsx("text-[9px] font-bold uppercase rounded-md p-1.5 outline-none shadow-sm cursor-pointer", t.status==='resolved'?'bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200':'bg-amber-100 border border-amber-200 text-amber-800 hover:bg-amber-200')}
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="in_progress">In Progress</option>
                                            <option value="resolved">Resolved</option>
                                        </select>
                                    </div>
                                    <p className="text-[9px] font-bold bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full mb-3 inline-block uppercase tracking-wider">{t.category}</p>
                                    <p className="text-[10px] font-medium text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1"><span className="text-brand-black font-semibold bg-gray-100 px-1.5 rounded">{t.houseId}</span></p>
                                    <p className="text-sm font-medium text-gray-700 border-l-2 border-emerald-500 pl-3 py-1 mt-3 bg-emerald-50/50 rounded-r-lg">{t.description}</p>
                                    <p className="text-[9px] mt-4 font-semibold text-gray-400 uppercase tracking-widest text-right">{formatDate(t.createdAt?.toDate())}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {admTab === 'notices' && (
                    <div className="space-y-8 animate-fade-in">
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <h3 className="font-semibold text-brand-black uppercase text-sm border-b border-gray-200 pb-3 mb-4 tracking-wide">{editingNoticeId ? 'Edit Notice' : 'Post New Notice'}</h3>
                            <form onSubmit={handleSaveNotice} className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-semibold tracking-wide uppercase text-gray-600 mb-1.5 block">Notice Title</label>
                                    <input required value={noticeTitle} onChange={e=>setNoticeTitle(e.target.value)} className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none text-sm" placeholder="e.g. Water Maintenance" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-semibold tracking-wide uppercase text-gray-600 mb-1.5 block">Content</label>
                                    <textarea required value={noticeContent} onChange={e=>setNoticeContent(e.target.value)} rows={4} className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none text-sm resize-none" placeholder="Details about the notice..." />
                                </div>
                                <div className="flex gap-2 pt-2">
                                    {editingNoticeId && <button type="button" onClick={() => {setEditingNoticeId(null); setNoticeTitle(''); setNoticeContent('');}} className="w-1/3 bg-gray-100 text-gray-600 p-3 rounded-xl font-semibold uppercase text-xs hover:bg-gray-200 transition-colors">Cancel</button>}
                                    <button type="submit" className="flex-1 bg-emerald-900 text-white p-3 rounded-xl font-semibold uppercase text-xs hover:bg-emerald-950 transition-colors shadow-sm">{editingNoticeId ? 'Update Notice' : 'Post Notice'}</button>
                                </div>
                            </form>
                        </div>

                        <div>
                            <h3 className="font-semibold text-brand-black uppercase border-b border-gray-200 pb-2 mb-4 tracking-wide text-sm">Past / Live Notices</h3>
                            <div className="space-y-3">
                                {noticesData.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)).map(n => (
                                    <div key={n.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative group">
                                        <h4 className="font-semibold text-brand-black text-lg mb-2">{n.title}</h4>
                                        <p className="text-sm text-gray-600 leading-relaxed mb-5">{n.content}</p>
                                        <div className="flex justify-between items-end border-t border-gray-100 pt-3">
                                            <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest">{formatDate(n.createdAt)}</p>
                                            <div className="flex gap-3">
                                                <button onClick={()=>handleEditNotice(n)} className="text-[10px] font-bold uppercase text-teal-600 hover:text-teal-700 hover:underline transition-colors">Edit</button>
                                                <button onClick={()=>handleDeleteNotice(n.id)} className="text-[10px] font-bold uppercase text-red-500 hover:text-red-600 hover:underline transition-colors">Delete</button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {noticesData.length === 0 && <p className="text-xs font-medium text-gray-400 text-center py-8">No notices posted yet</p>}
                            </div>
                        </div>
                    </div>
                )}
                {admTab === 'analytics' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white p-5 rounded-xl border border-gray-200 text-center shadow-sm flex flex-col items-center justify-center">
                                <p className="text-4xl font-semibold text-brand-black mb-1">{usersData.filter(x=>x.role==='resident').length}</p>
                                <p className="text-[10px] font-medium text-emerald-800 uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded-full">Houses</p>
                            </div>
                            <div className="bg-white p-5 rounded-xl border border-gray-200 text-center shadow-sm flex flex-col items-center justify-center">
                                <p className="text-4xl font-semibold text-brand-black mb-1">{filteredCodes.filter(x=>x.status==='used').length}</p>
                                <p className="text-[10px] font-medium text-teal-800 uppercase tracking-widest bg-teal-50 px-2 py-1 rounded-full">Inside Now</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white p-5 rounded-xl border border-gray-200 text-center shadow-sm flex flex-col items-center justify-center">
                                <p className="text-4xl font-semibold text-brand-black mb-1">{usersData.filter(x=>x.role==='staff' && x.status === 'approved').length}</p>
                                <p className="text-[10px] font-medium text-blue-800 uppercase tracking-widest bg-blue-50 px-2 py-1 rounded-full">Active Staff</p>
                            </div>
                            <div className="bg-white p-5 rounded-xl border border-gray-200 text-center shadow-sm flex flex-col items-center justify-center">
                                <p className="text-4xl font-semibold text-brand-black mb-1">{usersData.filter(x=>x.role==='staff' && (x.status === 'pending_employee_completion' || x.status === 'pending_resident_approval')).length}</p>
                                <p className="text-[10px] font-medium text-amber-800 uppercase tracking-widest bg-amber-50 px-2 py-1 rounded-full">Pending Staff</p>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mt-6">
                            <h3 className="text-sm font-semibold uppercase text-brand-black mb-6 border-b border-gray-100 pb-2 tracking-wide">Traffic Distribution</h3>
                            <div className="h-[250px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={typeChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={90} label>
                                            {typeChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={['#10b981', '#14b8a6', '#64748b', '#f43f5e'][index % 4]} stroke="none" />)}
                                        </Pie>
                                        <Tooltip contentStyle={{backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <h3 className="text-sm font-semibold uppercase text-brand-black mb-6 border-b border-gray-100 pb-2 tracking-wide">Status Ledger</h3>
                            <div className="h-[250px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={statusChartData}>
                                        <XAxis dataKey="name" tick={{fill:'#64748b', fontSize: 12}} axisLine={{stroke:'#e5e7eb'}} tickLine={false} />
                                        <YAxis tick={{fill:'#64748b', fontSize: 12}} axisLine={{stroke:'#e5e7eb'}} tickLine={false} />
                                        <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                                        <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}

                {admTab === 'directory' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center px-1 mb-2">
                            <h2 className="text-sm text-brand-black font-semibold tracking-wide uppercase">Directory</h2>
                            <button onClick={()=>setShowAddAdmin(true)} className="bg-emerald-900 text-white px-4 py-2 rounded-lg text-[10px] font-semibold uppercase shadow-sm hover:bg-emerald-950 transition-colors">New Account</button>
                        </div>
                        <div className="mb-4 bg-white p-2 rounded-xl border border-gray-200 flex gap-2 overflow-x-auto no-scrollbar shadow-sm">
                            <button onClick={()=>setDirectoryFilter('all')} className={clsx("px-3 py-1.5 font-semibold text-[10px] uppercase rounded-lg whitespace-nowrap transition-colors", directoryFilter==='all'?'bg-emerald-100 text-emerald-800':'text-gray-600 hover:bg-gray-50')}>All</button>
                            <button onClick={()=>setDirectoryFilter('resident')} className={clsx("px-3 py-1.5 font-semibold text-[10px] uppercase rounded-lg whitespace-nowrap transition-colors", directoryFilter==='resident'?'bg-emerald-100 text-emerald-800':'text-gray-600 hover:bg-gray-50')}>Residents</button>
                            <button onClick={()=>setDirectoryFilter('staff')} className={clsx("px-3 py-1.5 font-semibold text-[10px] uppercase rounded-lg whitespace-nowrap transition-colors", directoryFilter==='staff'?'bg-emerald-100 text-emerald-800':'text-gray-600 hover:bg-gray-50')}>Staff</button>
                            <button onClick={()=>setDirectoryFilter('madrasa')} className={clsx("px-3 py-1.5 font-semibold text-[10px] uppercase rounded-lg whitespace-nowrap transition-colors", directoryFilter==='madrasa'?'bg-emerald-100 text-emerald-800':'text-gray-600 hover:bg-gray-50')}>Madrasa</button>
                            <button onClick={()=>setDirectoryFilter('admin')} className={clsx("px-3 py-1.5 font-semibold text-[10px] uppercase rounded-lg whitespace-nowrap transition-colors", directoryFilter==='admin'?'bg-emerald-100 text-emerald-800':'text-gray-600 hover:bg-gray-50')}>Admins</button>
                        </div>

                        {directoryFilter === 'resident' ? (
                            <div className="space-y-4">
                                {Array.from(new Set(usersData.filter(u => u.role === 'resident').map(u => u.identifier))).map(houseUnit => {
                                    const houseUsers = usersData.filter(u => u.role === 'resident' && u.identifier === houseUnit);
                                    return (
                                        <div key={houseUnit} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                            <h3 className="font-semibold text-emerald-900 uppercase text-sm border-b border-gray-100 pb-2 mb-3">{houseUnit}</h3>
                                            <div className="space-y-2">
                                                {houseUsers.map(u => (
                                                    <div key={u.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                                                        <div>
                                                            <p className="font-semibold text-brand-black text-[11px] uppercase">{u.firstName} {u.lastName}</p>
                                                            <p className="text-[10px] font-medium text-gray-500 uppercase">{u.phone} • <span className={clsx(u.status === 'approved' ? 'text-emerald-600' : 'text-amber-600')}>{u.status}</span></p>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            {u.status === 'pending' && <button onClick={()=>approveUser(u.id)} className="text-[9px] uppercase font-bold px-3 py-1.5 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors">Approve</button>}
                                                            <button onClick={()=>setViewUserFull(u)} className="text-[9px] uppercase font-bold px-3 py-1.5 rounded bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">View</button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : directoryFilter === 'madrasa' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {madrasaStudentsData.map(m => (
                                    <div key={m.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                        <h4 className="font-semibold text-brand-black uppercase text-[13px]">{m.name}</h4>
                                        <p className="text-[11px] font-medium text-emerald-700 uppercase mb-1">House: {m.houseId}</p>
                                        <p className="text-[10px] font-medium text-gray-500 uppercase">{m.age} yrs • {m.gender} • {m.dob}</p>
                                        <p className="text-[10px] font-medium bg-gray-50 text-gray-700 p-2 rounded-lg border border-gray-100 mt-3 flex items-center justify-between">
                                            <span>ICE: {m.iceName}</span>
                                            <span className="font-mono">{m.icePhone}</span>
                                        </p>
                                    </div>
                                ))}
                                {madrasaStudentsData.length === 0 && <p className="text-center font-medium text-[11px] uppercase text-gray-400 py-8 col-span-full">No madrasa students found.</p>}
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-[11px] text-left">
                                        <thead className="bg-stone-50 text-stone-600 font-semibold uppercase tracking-wider border-b border-gray-200">
                                            <tr>
                                                <th className="p-4 whitespace-nowrap">Identity</th>
                                                <th className="p-4 whitespace-nowrap">Contact</th>
                                                <th className="p-4 text-right whitespace-nowrap">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {usersData.filter(u => u.id !== 'master' && (directoryFilter === 'all' || u.role === directoryFilter)).map(u => (
                                                <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="p-4 text-brand-black">
                                                        {u.role === 'staff' ? (
                                                            <><span className="font-semibold">{u.firstName}</span><br/><span className="mt-1 text-[9px] font-semibold uppercase tracking-wider bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full inline-block">{u.role}</span></>
                                                        ) : (
                                                            <><span className="font-semibold">{u.identifier}</span><br/><span className="mt-1 text-[9px] font-semibold uppercase tracking-wider bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full inline-block">{u.role}</span></>
                                                        )}
                                                    </td>
                                                    <td className="p-4 text-brand-black">
                                                        {u.role === 'staff' ? (
                                                            <><p className="font-medium text-emerald-800">Employer: {u.employerId}</p><p className="text-gray-500 font-medium">{u.staffRole} - <span className="font-mono">{u.phone}</span></p><p className={clsx("text-[9px] mt-1 uppercase font-semibold", u.status === 'approved' ? 'text-emerald-600': 'text-amber-600')}>{u.status.replace(/_/g, ' ')}</p></>
                                                        ) : (
                                                            <><p className="font-medium text-gray-900">{u.firstName} {u.lastName}</p><p className="text-gray-500 font-medium font-mono">{u.phone}</p></>
                                                        )}
                                                    </td>
                                                    <td className="p-4 text-right space-y-2">
                                                        <div className="flex flex-col items-end gap-1">
                                                            {u.role === 'staff' && <button onClick={()=>setViewStaff(u)} className="text-teal-600 font-semibold uppercase text-[9px] hover:text-teal-700 transition-colors">View Info</button>}
                                                            {u.role === 'resident' && <button onClick={()=>setViewUserFull(u)} className="text-teal-600 font-semibold uppercase text-[9px] hover:text-teal-700 transition-colors">View Info</button>}
                                                            {u.status === 'pending' && u.role === 'resident' && <button onClick={()=>approveUser(u.id)} className="text-emerald-600 font-semibold uppercase text-[9px] hover:text-emerald-700 transition-colors">Approve</button>}
                                                            {u.status !== 'pending_employee_completion' && <button onClick={()=>resetPin(u.id, u.firstName)} className="text-gray-500 font-semibold uppercase text-[9px] hover:text-gray-700 transition-colors">Reset PIN</button>}
                                                            <button onClick={()=>deleteUser(u.id)} className="text-rose-500 font-semibold uppercase text-[9px] hover:text-rose-600 transition-colors">Delete</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {admTab === 'ledger' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center px-1 mb-2"><h2 className="text-sm text-brand-black font-semibold tracking-wide uppercase">Master Ledger</h2></div>
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-[11px] text-left">
                                    <thead className="bg-stone-50 text-stone-600 font-semibold uppercase tracking-wider border-b border-gray-200">
                                        <tr>
                                            <th className="p-4 whitespace-nowrap">Code</th>
                                            <th className="p-4 whitespace-nowrap">Unit</th>
                                            <th className="p-4 whitespace-nowrap">Exit Note</th>
                                            <th className="p-4 text-right whitespace-nowrap">Movement</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredCodes.sort((a,b)=> (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0)).map(c => (
                                            <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="p-4 text-brand-black"><span className="font-mono font-semibold text-[13px]">{c.code}</span><br/><span className={clsx("mt-1 text-[9px] font-semibold px-2 py-0.5 rounded-full inline-block uppercase", c.type === 'Gate-Pass' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700')}>{c.type}</span></td>
                                                <td className="p-4 font-semibold text-emerald-800">{c.houseId}</td>
                                                <td className="p-4 text-gray-500 italic font-medium">{c.note||'-'}</td>
                                                <td className="p-4 text-right text-gray-600 whitespace-nowrap font-medium text-[10px]">
                                                    <div className="flex flex-col gap-1 items-end">
                                                        <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[9px]">IN: {formatDate(c.usedAt)}</span>
                                                        <span className="bg-stone-100 text-stone-600 px-2 py-0.5 rounded text-[9px]">OUT: {formatDate(c.checkedOutAt)}</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredCodes.length === 0 && <tr><td colSpan={4} className="p-10 text-center font-medium text-gray-400">No activity logged</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {showAddAdmin && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-sm p-6 rounded-2xl shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-semibold border-b border-gray-100 text-brand-black pb-3 uppercase tracking-wide">New Admin Profile</h3>
                        <div className="space-y-3">
                            <input className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none text-sm" placeholder="First Name" value={amFn} onChange={e=>setAmFn(e.target.value)}/>
                            <input className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none text-sm" placeholder="Last Name" value={amLn} onChange={e=>setAmLn(e.target.value)}/>
                            <select className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none text-sm" value={amRole} onChange={e=>setAmRole(e.target.value)}>
                                <option value="security">Security Guard</option>
                                <option value="admin">Administrator</option>
                                <option value="madrasa_admin">Madrasa Admin</option>
                            </select>
                            <div className="relative">
                                <input type={showAmPin ? "text" : "password"} maxLength={6} inputMode="numeric" pattern="[0-9]*" placeholder="Initial 6-Digit PIN" value={amPin} onChange={e=>setAmPin(e.target.value)} className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none font-mono text-center tracking-widest text-lg"/>
                                <button onClick={()=>setShowAmPin(!showAmPin)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-700 p-2 transition-colors">{showAmPin ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}</button>
                            </div>
                        </div>
                        <div className="flex gap-3 pt-4">
                            <button onClick={()=>setShowAddAdmin(false)} className="flex-1 font-semibold text-gray-500 uppercase text-[11px] hover:bg-gray-50 rounded-xl transition-colors">Cancel</button>
                            <button onClick={handleAddAdmin} className="flex-[2] bg-emerald-900 text-white rounded-xl py-3.5 font-semibold text-xs shadow-sm uppercase hover:bg-emerald-950 transition-colors">Create</button>
                        </div>
                    </div>
                </div>
            )}

            {viewUserFull && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-sm p-6 rounded-2xl shadow-xl space-y-5 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-start border-b border-gray-100 pb-3 mb-2">
                            <h3 className="text-sm font-semibold tracking-wide uppercase text-brand-black">Resident Profile</h3>
                            <button onClick={()=>setViewUserFull(null)} className="text-gray-400 hover:text-red-500 font-bold text-xl leading-none transition-colors">&times;</button>
                        </div>
                        <div className="space-y-5">
                            <div>
                                <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-1">Identity Name</p>
                                <p className="font-semibold text-sm uppercase text-brand-black">{viewUserFull.firstName} {viewUserFull.lastName}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-1">Unit Identifier</p>
                                <span className="font-semibold text-sm uppercase bg-teal-50 text-teal-800 px-3 py-1 rounded-lg inline-block border border-teal-100">{viewUserFull.identifier}</span>
                            </div>
                            <div>
                                <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-1">Contact</p>
                                <p className="font-semibold text-[13px] font-mono text-gray-700 mb-0.5">{viewUserFull.phone}</p>
                                <p className="font-medium text-xs text-gray-600">{viewUserFull.email}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-2">Status</p>
                                <div>
                                    <span className={clsx("text-[10px] uppercase font-semibold px-2.5 py-1 rounded-full", viewUserFull.status === 'approved' ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800")}>{viewUserFull.status}</span>
                                </div>
                            </div>
                            <div className="pt-2 border-t border-gray-100">
                                <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-3">Actions</p>
                                <div className="space-y-2">
                                    {viewUserFull.status === 'pending' && <button onClick={()=>{approveUser(viewUserFull.id); setViewUserFull(null);}} className="w-full bg-emerald-50 text-emerald-700 border border-emerald-200 py-3 rounded-xl text-[10px] font-semibold uppercase hover:bg-emerald-100 transition-colors">Approve Application</button>}
                                    <button onClick={()=>{resetPin(viewUserFull.id, viewUserFull.firstName); setViewUserFull(null);}} className="w-full bg-gray-50 text-gray-700 border border-gray-200 py-3 rounded-xl text-[10px] font-semibold uppercase hover:bg-gray-100 transition-colors">Reset PIN</button>
                                    <button onClick={()=>{deleteUser(viewUserFull.id); setViewUserFull(null);}} className="w-full bg-red-50 text-red-600 border border-red-200 py-3 rounded-xl text-[10px] font-semibold uppercase hover:bg-red-100 transition-colors">Delete Record</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {viewStaff && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-md p-6 rounded-2xl shadow-xl max-h-[85vh] overflow-y-auto">
                        <h3 className="text-base font-semibold tracking-wide border-b border-gray-100 text-brand-black pb-3 mb-5 uppercase">Staff Identity Profile</h3>
                        
                        <div className="space-y-5">
                            <div className="flex gap-4 items-center">
                                {viewStaff.passportPhoto ? (
                                    <img src={viewStaff.passportPhoto} alt="Passport" className="w-24 h-24 object-cover rounded-2xl border border-gray-200 shadow-sm" />
                                ) : (
                                    <div className="w-24 h-24 bg-gray-50 rounded-2xl border border-gray-200 flex items-center justify-center text-[10px] font-semibold uppercase text-gray-400 text-center p-2">NO PHOTO</div>
                                )}
                                <div>
                                    <p className="font-semibold text-lg uppercase text-brand-black">{viewStaff.firstName}</p>
                                    <p className="text-[11px] font-medium text-emerald-700 uppercase tracking-wide">{viewStaff.staffRole} • <span className="font-mono text-gray-600">{viewStaff.phone}</span></p>
                                    <p className="text-[11px] font-medium mt-1 text-gray-600">Employer: <span className="font-semibold text-brand-black">{viewStaff.employerId}</span></p>
                                    <p className="text-[11px] font-medium mt-1 text-gray-600">DOB: {viewStaff.dob} ({viewStaff.gender})</p>
                                    <p className="text-[11px] font-medium mt-1 text-gray-500 line-clamp-1">{viewStaff.address}</p>
                                    <div className="mt-2 block">
                                        <span className={`text-[9px] px-2.5 py-1 rounded-full uppercase font-semibold tracking-wider ${viewStaff.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                            {viewStaff.status.replace(/_/g, ' ')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 flex flex-col gap-2">
                                <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-500 mb-1">National IDs</p>
                                <p className="font-mono text-[13px] tracking-widest text-brand-black font-semibold">NIN: {viewStaff.nin || 'N/A'}</p>
                                <p className="font-mono text-[13px] tracking-widest text-brand-black font-semibold">BVN: {viewStaff.bvn || 'N/A'}</p>
                            </div>

                            {viewStaff.idDocument && (
                                <div>
                                    <p className="text-[10px] font-semibold tracking-widest uppercase mb-2 text-gray-400">Staff ID Document</p>
                                    <img src={viewStaff.idDocument} alt="Staff ID" className="w-full h-auto max-h-48 object-contain rounded-xl border border-gray-200" />
                                </div>
                            )}

                            <div className="border-t border-gray-100 pt-5">
                                <p className="text-[10px] font-semibold tracking-widest uppercase text-emerald-700 bg-emerald-50 inline-block px-2.5 py-1 rounded-full mb-3">Guarantor / NOK</p>
                                <p className="text-[15px] font-semibold text-brand-black">{viewStaff.nextOfKin?.name || 'N/A'}</p>
                                <p className="text-[13px] font-medium text-gray-600 mt-1">{viewStaff.nextOfKin?.relationship} • <span className="font-mono">{viewStaff.nextOfKin?.phone}</span></p>
                            </div>

                            {viewStaff.nextOfKin?.idDocument && (
                                <div>
                                    <p className="text-[10px] font-semibold tracking-widest uppercase mb-2 text-gray-400">Guarantor ID</p>
                                    <img src={viewStaff.nextOfKin.idDocument} alt="Guarantor ID" className="w-full h-auto max-h-48 object-contain rounded-xl border border-gray-200" />
                                </div>
                            )}

                            {viewStaff.employerComment && (
                                <div className="border-t border-gray-100 pt-5">
                                    <p className="text-[10px] font-semibold tracking-widest uppercase text-blue-700 bg-blue-50 inline-block px-2.5 py-1 rounded-full mb-3">Employer Comment</p>
                                    <p className="text-[13px] font-medium text-gray-700 italic border-l-2 border-blue-500 pl-3">"{viewStaff.employerComment}"</p>
                                </div>
                            )}
                        </div>

                        <div className="flex pt-6 mt-6 border-t border-gray-100 justify-end">
                            <button onClick={()=>setViewStaff(null)} className="font-semibold text-gray-600 bg-gray-50 uppercase text-[11px] hover:bg-gray-100 transition-colors px-6 py-2.5 rounded-xl border border-gray-200">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
