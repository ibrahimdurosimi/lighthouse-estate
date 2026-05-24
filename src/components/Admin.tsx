import React, { useState, useEffect } from 'react';
import { LogOut, Eye, EyeOff, Menu, Home, Users, Bell, X, Wrench, MessageSquare, BookOpen, Clock, Activity, Building, CircleDollarSign, PlusCircle } from 'lucide-react';
import { useApp } from '../lib/context';
import ThemeToggle from './ThemeToggle';
import { db, appId } from '../lib/firebase';
import { collection, onSnapshot, updateDoc, deleteDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { filterItemsByDate, formatDate, hashPin, HOUSES, SUB_OPTIONS } from '../lib/utils';
import { EmailTriggers } from '../lib/email';
import clsx from 'clsx';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Legend, AreaChart, Area } from 'recharts';
import { startOfDay, startOfWeek, startOfMonth, format, eachDayOfInterval, eachHourOfInterval, isWithinInterval, subDays, subWeeks } from 'date-fns';

export default function Admin() {
    const { profile, setView, setProfile, notify, isDarkMode } = useApp();
    const [admTab, setAdmTab] = useState<'analytics' | 'directory' | 'ledger' | 'notices' | 'tickets' | 'polls' | 'dues'>('analytics');
    const [menuOpen, setMenuOpen] = useState(false);
    const [admFilter, setAdmFilter] = useState('all');
    
    const [usersData, setUsersData] = useState<any[]>([]);
    const [codesData, setCodesData] = useState<any[]>([]);
    const [noticesData, setNoticesData] = useState<any[]>([]);
    const [madrasaStudentsData, setMadrasaStudentsData] = useState<any[]>([]);
    const [ticketsData, setTicketsData] = useState<any[]>([]);
    const [pollsData, setPollsData] = useState<any[]>([]);
    const [sosData, setSosData] = useState<any[]>([]);
    
    // UI state
    const [directoryFilter, setDirectoryFilter] = useState<'all'|'resident'|'staff'|'admin'|'madrasa'>('all');
    const [viewUserFull, setViewUserFull] = useState<any>(null);
    const [noticeTitle, setNoticeTitle] = useState('');
    const [noticeContent, setNoticeContent] = useState('');
    const [editingNoticeId, setEditingNoticeId] = useState<string | null>(null);

    const [pollTitle, setPollTitle] = useState('');
    const [pollOptA, setPollOptA] = useState('');
    const [pollOptB, setPollOptB] = useState('');
    const [logsData, setLogsData] = useState<any[]>([]);

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

        const logsUnsub = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'logs'), snap => {
            setLogsData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        const sosUnsub = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'sos'), snap => {
            setSosData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => {
            usersUnsub();
            codesUnsub();
            noticesUnsub();
            msUnsub();
            ticketsUnsub();
            pollsUnsub();
            logsUnsub();
            sosUnsub();
        };
    }, []);

    const filteredCodes = filterItemsByDate(codesData, 'createdAt', admFilter);

    const approveUser = async (id: string) => {
        const user = usersData.find(u => u.id === id);
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', id), { status: 'approved' });
        
        if (user && user.email) {
            EmailTriggers.accountApproved(user.email, user.firstName || user.identifier);
        }
        
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
    const [amId, setAmId] = useState('');
    const [amRole, setAmRole] = useState('security');
    const [amEmail, setAmEmail] = useState('');
    const [amPin, setAmPin] = useState('');
    const [showAmPin, setShowAmPin] = useState(false);
    
    const handleAddAdmin = async () => {
        if (!amFn) return notify("First name required.", "error");
        
        if (amRole === 'admin') {
            if (!amId) return notify("Administrative ID required.", "error");
            if (amPin.trim().length < 8) return notify("Admin passphrase must be at least 8 characters.", "error"); 
            if (!amEmail) return notify("Admin email required for 2FA.", "error");
        } else if (amRole !== 'madrasa') {
            if (amPin.trim().length !== 6) return notify("Security PIN must be exactly 6 digits.", "error");
        }

        const finalId = amRole === 'admin' ? amId : amFn;
        
        try {
            const hashed = await hashPin(amPin.trim());
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'users'), { 
                firstName: amFn, 
                lastName: amLn, 
                identifier: finalId, 
                pin: hashed, 
                role: amRole, 
                status: 'approved', 
                email: amEmail,
                createdAt: serverTimestamp() 
            });
            setShowAddAdmin(false);
            notify("Account created.");
            setAmFn(''); setAmLn(''); setAmId(''); setAmRole('security'); setAmPin(''); setAmEmail('');
        } catch(err) {
            notify("Error creating account.", "error");
        }
    };

    const handleSaveNotice = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!noticeTitle || !noticeContent) return notify("Title and content are required.", "error");
        
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

    const totalEntries = codesData.filter(x => x.status === 'used').length;
    const totalStaff = usersData.filter(x => x.role === 'staff' && x.status === 'approved').length;
    const totalHouses = usersData.filter(x => x.role === 'resident').length;

    const typeChartData = prepareTypeChart();
    const statusChartData = prepareStatusChart();

    const getTimelineData = () => {
        const now = new Date();
        let interval: { start: Date; end: Date };
        let formatStr = 'HH:00';
        let steps: Date[] = [];

        if (admFilter === 'today') {
            interval = { start: startOfDay(now), end: now };
            steps = eachHourOfInterval(interval);
            formatStr = 'HH:00';
        } else if (admFilter === 'week') {
            interval = { start: startOfWeek(now), end: now };
            steps = eachDayOfInterval(interval);
            formatStr = 'EEE';
        } else {
            interval = { start: subDays(now, 30), end: now };
            steps = eachDayOfInterval(interval);
            formatStr = 'dd MMM';
        }

        return steps.map(step => {
            const nextStep = new Date(step);
            if (admFilter === 'today') nextStep.setHours(step.getHours() + 1);
            else nextStep.setDate(step.getDate() + 1);

            const range = { start: step, end: nextStep };

            const logins = logsData.filter(l => {
                const d = l.timestamp?.toDate ? l.timestamp.toDate() : new Date(l.timestamp);
                return l.type === 'login' && isWithinInterval(d, range);
            }).length;

            const activeUsers = new Set(logsData.filter(l => {
                const d = l.timestamp?.toDate ? l.timestamp.toDate() : new Date(l.timestamp);
                return l.type === 'login' && isWithinInterval(d, range);
            }).map(l => l.identifier)).size;

            const codes = codesData.filter(c => {
                const d = c.createdAt?.toDate ? c.createdAt.toDate() : new Date(c.createdAt);
                return isWithinInterval(d, range);
            }).length;

            const entries = codesData.filter(c => {
                const d = c.usedAt?.toDate ? c.usedAt.toDate() : (c.usedAt ? new Date(c.usedAt) : null);
                return d && isWithinInterval(d, range);
            }).length;

            const sos = sosData.filter(s => {
                const d = s.createdAt?.toDate ? s.createdAt.toDate() : new Date(s.createdAt);
                return isWithinInterval(d, range);
            }).length;

            return {
                time: format(step, formatStr),
                logins,
                activeUsers,
                codes,
                entries,
                sos
            };
        });
    };

    const timelineData = getTimelineData();

    return (
        <div className="max-w-4xl mx-auto min-h-screen pb-24 animate-fade-in relative bg-stone-50/50 dark:bg-stone-950/50 transition-colors">
            <header className="flex flex-col gap-2 mb-6 text-brand-black dark:text-gray-100">
                <div className="flex justify-between items-center border-b border-gray-200 dark:border-stone-800 pb-3 p-4 sticky top-0 bg-white dark:bg-stone-900/95 backdrop-blur z-20 transition-colors shadow-sm">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Estate Mgmt</h1>
                        <p className="text-[10px] text-emerald-800 dark:text-emerald-400 font-bold tracking-widest uppercase mt-0.5">Oversight Console</p>
                    </div>
                    <div className="flex gap-3 items-center">
                        <ThemeToggle />
                        <button onClick={() => { setProfile(null); setView('landing'); }} className="p-2.5 bg-gray-50 dark:bg-stone-800 text-gray-600 dark:text-stone-400 rounded-full hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 transition-colors">
                            <LogOut className="w-5 h-5"/>
                        </button>
                    </div>
                </div>
                
                {/* Redesigned Navigation: Filter + Grid */}
                <div className="px-4 py-4 bg-white dark:bg-stone-900 border-b border-gray-100 dark:border-stone-800 shadow-sm transition-colors sticky top-[69px] z-10">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-stone-500">Period:</span>
                        <div className="flex gap-1 overflow-x-auto no-scrollbar">
                            {['today', 'week', 'month', 'all'].map(f => (
                                <button 
                                    key={f}
                                    onClick={() => setAdmFilter(f)}
                                    className={clsx(
                                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all whitespace-nowrap",
                                        admFilter === f ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800" : "bg-gray-50 dark:bg-stone-800 text-gray-500 dark:text-stone-500 border border-transparent hover:bg-gray-100 dark:hover:bg-stone-700"
                                    )}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </header>
            
            <div className="space-y-6 px-4 pb-28">
                {admTab === 'dues' && (
                    <div className="space-y-4 animate-fade-in">
                        <div className="flex justify-between items-center px-1 mb-2">
                            <h2 className="text-sm text-gray-900 dark:text-gray-100 font-bold uppercase tracking-wide">Estate Dues Ledger</h2>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            {usersData.filter(x => x.role === 'resident').map(res => (
                                <div key={res.id} className="bg-white dark:bg-stone-900 rounded-2xl border border-gray-200 dark:border-stone-800 p-4 shadow-sm flex justify-between items-center transition-all hover:shadow-md">
                                    <div>
                                        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm italic">{res.identifier}</h3>
                                        <p className="text-[10px] font-bold text-gray-400 dark:text-stone-500 uppercase tracking-widest">{res.firstName} {res.lastName}</p>
                                    </div>
                                    <button 
                                        onClick={async () => {
                                            const newStat = res.duesStatus === 'paid' ? 'unpaid' : 'paid';
                                            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', res.id), { duesStatus: newStat });
                                            notify(`Updated ${res.identifier} to ${newStat.toUpperCase()}`);
                                        }}
                                        className={clsx(
                                            "px-4 py-2 rounded-xl font-black uppercase text-[10px] transition-all shadow-sm border", 
                                            res.duesStatus === 'paid' 
                                                ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100" 
                                                : "bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900 hover:bg-red-100"
                                        )}
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
                    <div className="space-y-6 animate-fade-in pb-12">
                        {/* Summary Metrics */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {[
                                { label: 'Houses', value: usersData.filter(x=>x.role==='resident').length, color: 'text-gray-900', bg: 'bg-white' },
                                { label: 'Inside', value: filteredCodes.filter(x=>x.status==='used').length, color: 'text-emerald-700', bg: 'bg-emerald-50/30' },
                                { label: 'Staff', value: usersData.filter(x=>x.role==='staff' && x.status === 'approved').length, color: 'text-blue-700', bg: 'bg-blue-50/30' },
                                { label: 'Logins', value: logsData.filter(l => l.type === 'login').length, color: 'text-amber-700', bg: 'bg-amber-50/30' }
                            ].map((stat, idx) => (
                                <div key={idx} className={clsx("p-4 rounded-3xl border border-gray-100 dark:border-stone-800 shadow-sm flex flex-col items-center justify-center transition-all", stat.bg, "dark:bg-stone-900")}>
                                    <p className={clsx("text-2xl font-black italic", stat.color, "dark:text-gray-100")}>{stat.value}</p>
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">{stat.label}</p>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Access Timeline */}
                            <div className="bg-white dark:bg-stone-900 p-5 rounded-[2rem] border border-gray-100 dark:border-stone-800 shadow-sm transition-colors">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h3 className="text-[11px] font-black uppercase text-gray-900 dark:text-gray-100 tracking-widest">Active Access</h3>
                                        <p className="text-[9px] text-gray-400 font-bold">Engagement Trends</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div><span className="text-[8px] font-black uppercase text-gray-400">Codes</span></div>
                                        <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div><span className="text-[8px] font-black uppercase text-gray-400">Active</span></div>
                                    </div>
                                </div>
                                <div className="h-[220px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={timelineData}>
                                            <defs>
                                                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                                </linearGradient>
                                                <linearGradient id="colorCodes" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <XAxis dataKey="time" tick={{fill:'#94a3b8', fontSize: 9}} axisLine={false} tickLine={false} />
                                            <YAxis hide />
                                            <Tooltip 
                                                contentStyle={{backgroundColor: isDarkMode ? '#1c1917' : '#fff', border: 'none', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}}
                                                itemStyle={{fontSize: '10px', fontWeight: '900', textTransform: 'uppercase'}}
                                            />
                                            <Area type="monotone" dataKey="activeUsers" name="Users" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
                                            <Area type="monotone" dataKey="codes" name="Codes" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorCodes)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* SOS Alerting */}
                            <div className="bg-white dark:bg-stone-900 p-5 rounded-[2rem] border border-gray-100 dark:border-stone-800 shadow-sm transition-colors">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h3 className="text-[11px] font-black uppercase text-rose-600 tracking-widest">SOS Alerts</h3>
                                        <p className="text-[9px] text-gray-400 font-bold">Emergency Trends</p>
                                    </div>
                                    <div className="bg-rose-50 dark:bg-rose-900/20 px-2 py-0.5 rounded-full">
                                        <span className="text-[8px] font-black text-rose-600 uppercase">{sosData.length} PK</span>
                                    </div>
                                </div>
                                <div className="h-[220px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={timelineData}>
                                            <XAxis dataKey="time" hide />
                                            <YAxis hide />
                                            <Tooltip 
                                                contentStyle={{backgroundColor: isDarkMode ? '#1c1917' : '#fff', border: 'none', borderRadius: '16px'}}
                                                itemStyle={{fontSize: '10px', fontWeight: '900'}}
                                            />
                                            <Line type="stepAfter" dataKey="sos" name="SOS" stroke="#f43f5e" strokeWidth={4} dot={{ r: 3, fill: '#f43f5e', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Traffic Pie */}
                            <div className="bg-white dark:bg-stone-900 p-5 rounded-[2rem] border border-gray-100 dark:border-stone-800 shadow-sm transition-colors">
                                <h3 className="text-[11px] font-black uppercase text-gray-900 dark:text-gray-100 mb-4 tracking-widest">Category Mix</h3>
                                <div className="h-[200px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={typeChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={8}>
                                                {typeChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={['#10b981', '#14b8a6', '#3b82f6', '#8b5cf6', '#f43f5e'][index % 5]} stroke="none" />)}
                                            </Pie>
                                            <Tooltip contentStyle={{backgroundColor: isDarkMode ? '#1c1917' : '#fff', border: 'none', borderRadius: '16px'}} />
                                            <Legend verticalAlign="bottom" height={30} iconType="circle" formatter={(value) => <span className="text-[8px] font-black uppercase text-gray-400">{value}</span>}/>
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            
                            {/* Movement Bar */}
                            <div className="bg-white dark:bg-stone-900 p-5 rounded-[2rem] border border-gray-100 dark:border-stone-800 shadow-sm transition-colors">
                                <h3 className="text-[11px] font-black uppercase text-gray-900 dark:text-gray-100 mb-4 tracking-widest">Velocity</h3>
                                <div className="h-[200px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={statusChartData}>
                                            <XAxis dataKey="name" tick={{fill:'#94a3b8', fontSize: 8}} axisLine={false} tickLine={false} />
                                            <YAxis hide />
                                            <Tooltip cursor={false} contentStyle={{backgroundColor: isDarkMode ? '#1c1917' : '#fff', border: 'none', borderRadius: '16px'}} />
                                            <Bar dataKey="count" fill="#10b981" radius={[12, 12, 12, 12]} barSize={24} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Recent Logs List - Simplified */}
                            <div className="bg-white dark:bg-stone-900 p-5 rounded-[2rem] border border-gray-100 dark:border-stone-800 shadow-sm transition-colors">
                                <h3 className="text-[11px] font-black uppercase text-gray-900 dark:text-gray-100 mb-4 tracking-widest">Entry Chain</h3>
                                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 no-scrollbar">
                                    {codesData.filter(c => c.status === 'used').sort((a,b) => (b.usedAt?.seconds || 0) - (a.usedAt?.seconds || 0)).slice(0, 10).map(c => (
                                        <div key={c.id} className="flex justify-between items-center bg-stone-50/50 dark:bg-stone-900/50 p-2.5 rounded-2xl border border-stone-100 dark:border-stone-800">
                                            <div className="flex-1 min-w-0 mr-3">
                                                <p className="text-[10px] font-black text-stone-800 dark:text-gray-100 uppercase truncate italic">{c.targetName}</p>
                                                <p className="text-[8px] text-stone-400 font-bold uppercase tracking-tighter">{formatDate(c.usedAt)} • {c.houseId}</p>
                                            </div>
                                            <span className="text-[8px] font-black bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-xl uppercase border border-emerald-100 dark:border-emerald-800">IN</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="bg-white dark:bg-stone-900 p-5 rounded-[2rem] border border-gray-100 dark:border-stone-800 shadow-sm transition-colors">
                                <h3 className="text-[11px] font-black uppercase text-gray-900 dark:text-gray-100 mb-4 tracking-widest">Login Chain</h3>
                                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 no-scrollbar">
                                    {logsData.filter(l => l.type === 'login').sort((a,b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)).slice(0, 10).map(l => (
                                        <div key={l.id} className="flex justify-between items-center bg-stone-50/50 dark:bg-stone-900/50 p-2.5 rounded-2xl border border-stone-100 dark:border-stone-800">
                                            <div className="flex-1 min-w-0 mr-3">
                                                <p className="text-[10px] font-black text-stone-800 dark:text-gray-100 uppercase truncate italic">{l.identifier}</p>
                                                <p className="text-[8px] text-stone-400 font-bold uppercase tracking-tighter">{formatDate(l.timestamp)} • {l.role}</p>
                                            </div>
                                            <span className="text-[8px] font-black bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 px-2.5 py-1 rounded-xl uppercase border border-sky-100 dark:border-sky-800">ON</span>
                                        </div>
                                    ))}
                                </div>
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
                                                            {u.status !== 'pending_employee_completion' && u.identifier !== 'master' && u.id !== 'master' && <button onClick={()=>resetPin(u.id, u.firstName)} className="text-gray-500 font-semibold uppercase text-[9px] hover:text-gray-700 transition-colors">Reset PIN</button>}
                                                            {u.identifier !== 'master' && u.id !== 'master' && u.identifier !== 'Master_Admin' && <button onClick={()=>deleteUser(u.id)} className="text-rose-500 font-semibold uppercase text-[9px] hover:text-rose-600 transition-colors">Delete</button>}
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
                            <div className="grid grid-cols-2 gap-2">
                                <input className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none text-sm" placeholder="First Name" value={amFn} onChange={e=>setAmFn(e.target.value)}/>
                                <input className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none text-sm" placeholder="Last Name" value={amLn} onChange={e=>setAmLn(e.target.value)}/>
                            </div>
                            {amRole === 'admin' && (
                                <input className="w-full p-3 rounded-xl border-2 border-emerald-500/20 bg-emerald-50/10 focus:border-emerald-500 focus:outline-none text-sm font-bold" placeholder="Administrative Login ID (e.g. Ibrahim_Mgmt)" value={amId} onChange={e=>setAmId(e.target.value)}/>
                            )}
                            <select className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none text-sm font-semibold" value={amRole} onChange={e=>setAmRole(e.target.value)}>
                                <option value="security">Security Guard</option>
                                <option value="admin">Estate Administrator</option>
                                <option value="madrasa_admin">Madrasa Official</option>
                            </select>
                            {amRole === 'admin' && (
                                <input type="email" placeholder="Administrator Email (Required for 2FA)" value={amEmail} onChange={e=>setAmEmail(e.target.value)} className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none placeholder-gray-400 font-medium"/>
                            )}
                            <div className="relative">
                                <input 
                                    type={showAmPin ? "text" : "password"} 
                                    maxLength={amRole === 'admin' ? 64 : 6} 
                                    inputMode={amRole === 'admin' ? "text" : "numeric"} 
                                    pattern={amRole === 'admin' ? undefined : "[0-9]*"} 
                                    placeholder={amRole === 'admin' ? "Assign Passphrase (min 8 chars)" : "Assign 6-Digit PIN"} 
                                    value={amPin} 
                                    onChange={e=>setAmPin(e.target.value)} 
                                    className={`w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none text-center ${amRole === 'admin' ? 'font-sans text-base' : 'font-mono tracking-widest text-lg'}`}
                                />
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

            {/* iOS Style Bottom Navigation */}
            <div className="fixed sm:absolute bottom-0 left-0 w-full bg-white/90 dark:bg-stone-900/90 backdrop-blur-md border-t border-gray-100 dark:border-stone-800 flex items-center justify-around pb-6 pt-3 px-2 z-40 transition-colors">
                <button onClick={() => setAdmTab('analytics')} className={`flex flex-col items-center gap-1 p-2 ${admTab === 'analytics' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-stone-500'}`}>
                    <Activity className="w-6 h-6" />
                    <span className="text-[10px] h-[12px] font-bold">Stats</span>
                </button>
                <button onClick={() => setAdmTab('directory')} className={`flex flex-col items-center gap-1 p-2 ${admTab === 'directory' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-stone-500'}`}>
                    <Users className="w-6 h-6" />
                    <span className="text-[10px] h-[12px] font-bold">Users</span>
                </button>
                <div className="-mt-8">
                    <button onClick={() => setShowAddAdmin(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white p-4 rounded-full shadow-lg shadow-emerald-500/30 transform transition-transform active:scale-95 border-4 border-stone-100 dark:border-stone-950">
                        <PlusCircle className="w-6 h-6" />
                    </button>
                </div>
                <button onClick={() => setAdmTab('notices')} className={`flex flex-col items-center gap-1 p-2 ${admTab === 'notices' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-stone-500'}`}>
                    <Bell className="w-6 h-6" />
                    <span className="text-[10px] h-[12px] font-bold">News</span>
                </button>
                <button onClick={() => setMenuOpen(true)} className={`flex flex-col items-center gap-1 p-2 text-gray-400 dark:text-stone-500 hover:text-gray-600 dark:hover:text-stone-400`}>
                    <Menu className="w-6 h-6" />
                    <span className="text-[10px] h-[12px] font-bold">Menu</span>
                </button>
            </div>

            {/* Sliding Side Menu */}
            {menuOpen && (
                <div className="fixed inset-0 z-[300] flex">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={() => setMenuOpen(false)}></div>
                    <div className="relative w-64 bg-white dark:bg-stone-900 border-r border-gray-100 dark:border-stone-800 h-full flex flex-col shadow-2xl transition-transform duration-300 animate-slide-in-left">
                        <div className="p-5 border-b border-gray-100 dark:border-stone-800 flex justify-between items-center bg-gray-50/50 dark:bg-stone-800/50">
                            <span className="font-bold text-gray-900 dark:text-gray-100">Admin Menu</span>
                            <button onClick={() => setMenuOpen(false)} className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-stone-300 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
                            <button onClick={() => { setAdmTab('ledger'); setMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${admTab === 'ledger' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'text-gray-600 dark:text-stone-400 hover:bg-gray-50 dark:hover:bg-stone-800'}`}>
                                <BookOpen className="w-5 h-5" /> <span className="font-semibold text-sm">Ledger</span>
                            </button>
                            <button onClick={() => { setAdmTab('dues'); setMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${admTab === 'dues' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'text-gray-600 dark:text-stone-400 hover:bg-gray-50 dark:hover:bg-stone-800'}`}>
                                <CircleDollarSign className="w-5 h-5" /> <span className="font-semibold text-sm">Estate Dues</span>
                            </button>
                            <button onClick={() => { setAdmTab('tickets'); setMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${admTab === 'tickets' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'text-gray-600 dark:text-stone-400 hover:bg-gray-50 dark:hover:bg-stone-800'}`}>
                                <Wrench className="w-5 h-5" /> <span className="font-semibold text-sm">Tickets & Fix-It</span>
                            </button>
                            <button onClick={() => { setAdmTab('polls'); setMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${admTab === 'polls' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'text-gray-600 dark:text-stone-400 hover:bg-gray-50 dark:hover:bg-stone-800'}`}>
                                <MessageSquare className="w-5 h-5" /> <span className="font-semibold text-sm">Townhall</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
