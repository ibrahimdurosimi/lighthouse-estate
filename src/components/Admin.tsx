import { useState, useEffect } from 'react';
import { LogOut, Eye, EyeOff } from 'lucide-react';
import { useApp } from '../lib/context';
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
        <div className="max-w-4xl mx-auto p-4 min-h-screen pb-24 animate-fade-in relative">
            <header className="flex flex-col gap-4 mb-8">
                <div className="flex justify-between items-center border-b-4 border-brand-black pb-4 sticky top-0 bg-brand-bg z-20">
                    <div>
                        <h1 className="text-2xl font-black text-brand-black italic uppercase">Estate Mgmt</h1>
                        <p className="text-[9px] text-white font-black tracking-widest uppercase bg-brand-cyan inline-block px-1 border-2 border-brand-black">Oversight Console</p>
                    </div>
                    <button onClick={() => { setProfile(null); setView('landing'); }} className="p-3 bg-brand-black text-white border-2 border-brand-black hover:bg-gray-800 transition-colors">
                        <LogOut className="w-5 h-5"/>
                    </button>
                </div>
                <div className="bg-brand-gray p-2 border-4 border-brand-black flex items-center gap-2 overflow-x-auto no-scrollbar shadow-neo-sm">
                    {admTab !== 'directory' && (
                        <select value={admFilter} onChange={e=>setAdmFilter(e.target.value)} className="bg-white text-brand-black text-[10px] font-black uppercase p-2 border-2 border-brand-black outline-none mr-2">
                            <option value="all">All</option><option value="today">Today</option><option value="week">Week</option><option value="month">Month</option>
                        </select>
                    )}
                    <button onClick={()=>setAdmTab('analytics')} className={clsx("px-4 py-2 border-2 border-brand-black text-[10px] font-black uppercase whitespace-nowrap", admTab==='analytics' ? 'bg-brand-black text-white shadow-neo-sm' : 'bg-white text-brand-black')}>Analytics</button>
                    <button onClick={()=>setAdmTab('directory')} className={clsx("px-4 py-2 border-2 border-brand-black text-[10px] font-black uppercase whitespace-nowrap", admTab==='directory' ? 'bg-brand-black text-white shadow-neo-sm' : 'bg-white text-brand-black')}>Directory</button>
                    <button onClick={()=>setAdmTab('ledger')} className={clsx("px-4 py-2 border-2 border-brand-black text-[10px] font-black uppercase whitespace-nowrap", admTab==='ledger' ? 'bg-brand-black text-white shadow-neo-sm' : 'bg-white text-brand-black')}>Ledger</button>
                    <button onClick={()=>setAdmTab('notices')} className={clsx("px-4 py-2 border-2 border-brand-black text-[10px] font-black uppercase whitespace-nowrap", admTab==='notices' ? 'bg-brand-black text-white shadow-neo-sm' : 'bg-white text-brand-black')}>Notices</button>
                    <button onClick={()=>setAdmTab('tickets')} className={clsx("px-4 py-2 border-2 border-brand-black text-[10px] font-black uppercase whitespace-nowrap", admTab==='tickets' ? 'bg-brand-black text-white shadow-neo-sm' : 'bg-white text-brand-black')}>Fix-It Tickets</button>
                    <button onClick={()=>setAdmTab('polls')} className={clsx("px-4 py-2 border-2 border-brand-black text-[10px] font-black uppercase whitespace-nowrap", admTab==='polls' ? 'bg-brand-black text-white shadow-neo-sm' : 'bg-white text-brand-black')}>Polls</button>
                    <button onClick={()=>setAdmTab('dues')} className={clsx("px-4 py-2 border-2 border-brand-black text-[10px] font-black uppercase whitespace-nowrap", admTab==='dues' ? 'bg-brand-black text-white shadow-neo-sm' : 'bg-white text-brand-black')}>Estate Dues</button>
                </div>
            </header>
            
            <div className="space-y-10">
                {admTab === 'dues' && (
                    <div className="space-y-4 animate-fade-in">
                        <div className="flex justify-between items-center px-2 mb-4">
                            <h2 className="text-sm text-brand-black font-black italic uppercase">Estate Dues Ledger (Current Year)</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {usersData.filter(x => x.role === 'resident').map(res => (
                                <div key={res.id} className="bg-white border-4 border-brand-black p-4 neo-card flex justify-between items-center">
                                    <div>
                                        <h3 className="font-black text-brand-black uppercase text-sm">{res.identifier}</h3>
                                        <p className="text-[10px] font-bold text-gray-500 uppercase">{res.firstName} {res.lastName}</p>
                                    </div>
                                    <button 
                                        onClick={async () => {
                                            const newStat = res.duesStatus === 'paid' ? 'unpaid' : 'paid';
                                            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', res.id), { duesStatus: newStat });
                                            notify(`Updated ${res.identifier} to ${newStat.toUpperCase()}`);
                                        }}
                                        className={clsx("px-4 py-2 border-2 border-brand-black font-black uppercase text-[10px] shadow-neo-sm", res.duesStatus === 'paid' ? "bg-brand-lime text-brand-black" : "bg-red-500 text-white")}
                                    >
                                        {res.duesStatus === 'paid' ? 'Paid' : 'Unpaid'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {admTab === 'polls' && (
                    <div className="space-y-8 animate-fade-in">
                        <div className="bg-white p-6 neo-card border-4 border-brand-black shadow-neo-sm">
                            <h3 className="font-black uppercase text-sm mb-4">Create Poll / Townhall Measure</h3>
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
                                <div><input required value={pollTitle} onChange={e=>setPollTitle(e.target.value)} className="w-full p-2 neo-input" placeholder="Poll Question" /></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <input required value={pollOptA} onChange={e=>setPollOptA(e.target.value)} className="p-2 neo-input" placeholder="Option A" />
                                    <input required value={pollOptB} onChange={e=>setPollOptB(e.target.value)} className="p-2 neo-input" placeholder="Option B" />
                                </div>
                                <button type="submit" className="w-full bg-brand-black text-white font-black p-3 border-2 border-brand-black uppercase shadow-neo-sm text-[10px]">Create Poll</button>
                            </form>
                        </div>

                        <div className="space-y-4">
                            {pollsData.map(p => (
                                <div key={p.id} className="bg-white p-4 neo-card border-4 border-brand-black">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-black uppercase text-brand-black text-sm">{p.title}</h4>
                                        <button onClick={async () => {
                                            const newStat = p.status === 'open' ? 'closed' : 'open';
                                            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'polls', p.id), { status: newStat });
                                        }} className={clsx("px-2 py-1 border-2 border-brand-black font-black uppercase text-[8px]", p.status === 'open' ? 'bg-brand-lime hover:bg-brand-pink text-brand-black' : 'bg-brand-gray text-gray-500 hover:bg-brand-lime')} title="Toggle Status">
                                            {p.status}
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-center text-xs font-bold font-mono">
                                        <div className="bg-brand-cyan text-white p-2 border-2 border-brand-black">{p.optA}: {p.votesA}</div>
                                        <div className="bg-brand-lime text-brand-black p-2 border-2 border-brand-black">{p.optB}: {p.votesB}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {admTab === 'tickets' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center px-2 mb-4"><h2 className="text-sm text-brand-black font-black italic uppercase">Maintenance Tickets</h2></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filterItemsByDate(ticketsData, 'createdAt', admFilter).map(t => (
                                <div key={t.id} className="bg-white p-4 neo-card border-4 border-brand-black shadow-neo-sm">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-black text-brand-black uppercase text-sm leading-tight">{t.title}</h3>
                                        <select 
                                            value={t.status}
                                            onChange={async (e) => {
                                                await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tickets', t.id), { status: e.target.value });
                                                notify('Ticket updated');
                                            }}
                                            className={clsx("text-[8px] font-black uppercase border-2 p-1 outline-none", t.status==='resolved'?'bg-brand-lime border-brand-black':'bg-orange-100 border-orange-500 text-orange-700')}
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="in_progress">In Progress</option>
                                            <option value="resolved">Resolved</option>
                                        </select>
                                    </div>
                                    <p className="text-[10px] font-bold bg-brand-gray px-2 py-1 mb-2 inline-block border-2 border-brand-black uppercase shadow-neo-sm">{t.category}</p>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">House: <span className="text-brand-black">{t.houseId}</span></p>
                                    <p className="text-xs font-bold text-gray-800 border-l-4 border-brand-black pl-2 py-1 mt-2">{t.description}</p>
                                    <p className="text-[8px] mt-4 font-black text-gray-400 uppercase tracking-widest text-right">{formatDate(t.createdAt?.toDate())}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {admTab === 'notices' && (
                    <div className="space-y-8 animate-fade-in">
                        <div className="bg-white p-6 neo-card border-4 border-brand-black shadow-neo-sm">
                            <h3 className="font-black italic text-brand-black uppercase border-b-4 border-brand-black pb-2 mb-4">{editingNoticeId ? 'Edit Notice' : 'Post New Notice'}</h3>
                            <form onSubmit={handleSaveNotice} className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-brand-black mb-1 block">Notice Title</label>
                                    <input required value={noticeTitle} onChange={e=>setNoticeTitle(e.target.value)} className="w-full p-3 neo-input text-sm" placeholder="e.g. Water Maintenance" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-brand-black mb-1 block">Content</label>
                                    <textarea required value={noticeContent} onChange={e=>setNoticeContent(e.target.value)} rows={4} className="w-full p-3 neo-input text-sm" placeholder="Details about the notice..." />
                                </div>
                                <div className="flex gap-2 pt-2">
                                    {editingNoticeId && <button type="button" onClick={() => {setEditingNoticeId(null); setNoticeTitle(''); setNoticeContent('');}} className="w-1/3 bg-gray-200 text-brand-black p-3 border-4 border-brand-black font-black uppercase text-[10px] shadow-neo-sm active:translate-y-1">Cancel</button>}
                                    <button type="submit" className="flex-1 bg-brand-black text-brand-lime p-3 border-4 border-brand-black font-black uppercase text-[11px] shadow-neo active:translate-y-1 active:shadow-none">{editingNoticeId ? 'Update Notice' : 'Post Notice'}</button>
                                </div>
                            </form>
                        </div>

                        <div>
                            <h3 className="font-black italic text-brand-black uppercase border-b-4 border-brand-black pb-2 mb-4">Past / Live Notices</h3>
                            <div className="space-y-4">
                                {noticesData.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)).map(n => (
                                    <div key={n.id} className="bg-white p-5 neo-card border-4 border-brand-black relative">
                                        <h4 className="font-black text-brand-black text-lg uppercase mb-2">{n.title}</h4>
                                        <p className="text-sm font-medium text-gray-700 leading-relaxed mb-4">{n.content}</p>
                                        <div className="flex justify-between items-end border-t-2 border-brand-black pt-2">
                                            <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">{formatDate(n.createdAt)}</p>
                                            <div className="flex gap-4">
                                                <button onClick={()=>handleEditNotice(n)} className="text-[10px] font-black uppercase text-brand-cyan hover:underline">Edit</button>
                                                <button onClick={()=>handleDeleteNotice(n.id)} className="text-[10px] font-black uppercase text-red-500 hover:underline">Delete</button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {noticesData.length === 0 && <p className="text-[10px] font-black uppercase text-gray-400 text-center py-8 tracking-widest">No notices posted yet</p>}
                            </div>
                        </div>
                    </div>
                )}
                {admTab === 'analytics' && (
                    <>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white p-6 neo-card text-center"><p className="text-3xl font-black text-brand-black">{usersData.filter(x=>x.role==='resident').length}</p><p className="text-[9px] font-bold text-brand-black uppercase mt-1 bg-brand-lime inline-block px-1 border-2 border-brand-black">Houses</p></div>
                            <div className="bg-white p-6 neo-card text-center"><p className="text-3xl font-black text-brand-black">{filteredCodes.filter(x=>x.status==='used').length}</p><p className="text-[9px] font-bold text-brand-black uppercase mt-1 bg-brand-pink inline-block px-1 border-2 border-brand-black">Inside Now</p></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white p-6 neo-card text-center"><p className="text-3xl font-black text-brand-black">{usersData.filter(x=>x.role==='staff' && x.status === 'approved').length}</p><p className="text-[9px] font-bold text-brand-black uppercase mt-1 bg-brand-cyan inline-block text-white px-1 border-2 border-brand-black">Active Staff</p></div>
                            <div className="bg-white p-6 neo-card text-center"><p className="text-3xl font-black text-brand-black">{usersData.filter(x=>x.role==='staff' && (x.status === 'pending_employee_completion' || x.status === 'pending_resident_approval')).length}</p><p className="text-[9px] font-bold text-brand-black uppercase mt-1 bg-yellow-300 inline-block px-1 border-2 border-brand-black">Pending Staff</p></div>
                        </div>
                        <div className="bg-white p-6 neo-card">
                            <h3 className="text-sm font-black italic text-brand-black mb-6 border-b-4 border-brand-black pb-2">Traffic Distribution</h3>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={typeChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                                            {typeChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={colors[index % colors.length]} stroke="#1A1A1A" strokeWidth={4} />)}
                                        </Pie>
                                        <Tooltip contentStyle={{backgroundColor: '#fff', border: '4px solid #1A1A1A', fontWeight: 'bold', borderRadius: 0}} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div className="bg-white p-6 neo-card">
                            <h3 className="text-sm font-black italic text-brand-black mb-6 border-b-4 border-brand-black pb-2">Status Ledger</h3>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={statusChartData}>
                                        <XAxis dataKey="name" tick={{fill:'#1A1A1A', fontWeight: 'bold'}} axisLine={{stroke:'#1A1A1A', strokeWidth: 4}} tickLine={false} />
                                        <YAxis tick={{fill:'#1A1A1A'}} axisLine={{stroke:'#1A1A1A', strokeWidth: 4}} tickLine={false} />
                                        <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{backgroundColor: '#fff', border: '4px solid #1A1A1A', fontWeight: 'bold', borderRadius: 0}} />
                                        <Bar dataKey="count" fill="#1A1A1A" stroke="#1A1A1A" strokeWidth={4} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </>
                )}

                {admTab === 'directory' && (
                    <>
                        <div className="flex justify-between items-center px-2 mb-4">
                            <h2 className="text-sm text-brand-black font-black italic uppercase">Directory</h2>
                            <button onClick={()=>setShowAddAdmin(true)} className="bg-brand-black text-white px-5 py-2 border-4 border-brand-black text-[9px] font-black uppercase shadow-neo-sm hover:bg-gray-800">New Account</button>
                        </div>
                        <div className="mb-4 bg-brand-gray p-2 border-4 border-brand-black flex gap-2 overflow-x-auto no-scrollbar shadow-neo-sm">
                            <button onClick={()=>setDirectoryFilter('all')} className={clsx("px-3 py-1 font-black text-[9px] uppercase border-2 border-brand-black whitespace-nowrap", directoryFilter==='all'?'bg-brand-black text-white':'bg-white text-brand-black')}>All</button>
                            <button onClick={()=>setDirectoryFilter('resident')} className={clsx("px-3 py-1 font-black text-[9px] uppercase border-2 border-brand-black whitespace-nowrap", directoryFilter==='resident'?'bg-brand-black text-white':'bg-white text-brand-black')}>Residents</button>
                            <button onClick={()=>setDirectoryFilter('staff')} className={clsx("px-3 py-1 font-black text-[9px] uppercase border-2 border-brand-black whitespace-nowrap", directoryFilter==='staff'?'bg-brand-black text-white':'bg-white text-brand-black')}>Staff</button>
                            <button onClick={()=>setDirectoryFilter('madrasa')} className={clsx("px-3 py-1 font-black text-[9px] uppercase border-2 border-brand-black whitespace-nowrap", directoryFilter==='madrasa'?'bg-brand-black text-white':'bg-white text-brand-black')}>Madrasa</button>
                            <button onClick={()=>setDirectoryFilter('admin')} className={clsx("px-3 py-1 font-black text-[9px] uppercase border-2 border-brand-black whitespace-nowrap", directoryFilter==='admin'?'bg-brand-black text-white':'bg-white text-brand-black')}>Admins</button>
                        </div>

                        {directoryFilter === 'resident' ? (
                            <div className="space-y-4">
                                {Array.from(new Set(usersData.filter(u => u.role === 'resident').map(u => u.identifier))).map(houseUnit => {
                                    const houseUsers = usersData.filter(u => u.role === 'resident' && u.identifier === houseUnit);
                                    return (
                                        <div key={houseUnit} className="bg-white p-4 neo-card border-4 border-brand-black shadow-neo-sm">
                                            <h3 className="font-black text-brand-black uppercase text-sm border-b-2 border-brand-black pb-2 mb-3">{houseUnit}</h3>
                                            <div className="space-y-2">
                                                {houseUsers.map(u => (
                                                    <div key={u.id} className="flex justify-between items-center bg-brand-gray p-2 border-2 border-brand-black">
                                                        <div>
                                                            <p className="font-black text-brand-black text-[10px] uppercase">{u.firstName} {u.lastName}</p>
                                                            <p className="text-[8px] font-bold text-gray-500 uppercase">{u.phone} • {u.status}</p>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            {u.status === 'pending' && <button onClick={()=>approveUser(u.id)} className="text-[8px] uppercase font-black px-2 py-1 bg-brand-lime border-2 border-brand-black">Approve</button>}
                                                            <button onClick={()=>setViewUserFull(u)} className="text-[8px] uppercase font-black px-2 py-1 bg-white border-2 border-brand-black">View</button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : directoryFilter === 'madrasa' ? (
                            <div className="space-y-4">
                                {madrasaStudentsData.map(m => (
                                    <div key={m.id} className="bg-white p-4 neo-card border-4 border-brand-black shadow-neo-sm flex gap-3">
                                        <div className="flex-1">
                                            <h4 className="font-black text-brand-black uppercase text-sm">{m.name}</h4>
                                            <p className="text-[10px] font-bold text-gray-600 uppercase">House: {m.houseId}</p>
                                            <p className="text-[9px] font-bold text-gray-500 uppercase">{m.age} yrs • {m.gender} • {m.dob}</p>
                                            <p className="text-[9px] font-bold bg-brand-gray p-1 border-2 border-brand-black inline-block mt-2">ICE: {m.iceName} ({m.icePhone})</p>
                                        </div>
                                    </div>
                                ))}
                                {madrasaStudentsData.length === 0 && <p className="text-center font-bold text-[10px] uppercase opacity-50 py-8">No madrasa students found.</p>}
                            </div>
                        ) : (
                            <div className="table-container border-4 border-brand-black bg-white">
                                <table className="w-full text-[10px] text-left">
                                    <thead className="bg-brand-black text-white font-black uppercase tracking-widest"><tr><th className="p-4 whitespace-nowrap">Identity</th><th className="p-4 whitespace-nowrap">Contact</th><th className="p-4 text-right whitespace-nowrap">Action</th></tr></thead>
                                    <tbody className="divide-y-4 divide-brand-black">
                                        {usersData.filter(u => u.id !== 'master' && (directoryFilter === 'all' || u.role === directoryFilter)).map(u => (
                                            <tr key={u.id}>
                                                <td className="p-4 font-black text-brand-black border-r-4 border-brand-black">
                                                    {u.role === 'staff' ? (
                                                        <>{u.firstName}<br/><span className="text-[8px] text-brand-black font-bold uppercase tracking-tighter bg-brand-cyan px-1 border-2 border-brand-black text-white">{u.role}</span></>
                                                    ) : (
                                                        <>{u.identifier}<br/><span className="text-[8px] text-brand-black font-bold uppercase tracking-tighter bg-brand-gray px-1 border-2 border-brand-black">{u.role}</span></>
                                                    )}
                                                </td>
                                                <td className="p-4 border-r-4 border-brand-black text-brand-black">
                                                    {u.role === 'staff' ? (
                                                        <><p className="font-bold">Employer: {u.employerId}</p><p className="text-gray-500 italic">{u.staffRole} - {u.phone}</p><p className="text-[8px] mt-1 uppercase text-black font-black">{u.status.replace(/_/g, ' ')}</p></>
                                                    ) : (
                                                        <><p className="font-bold">{u.firstName} {u.lastName}</p><p className="text-gray-500 italic">{u.phone}</p></>
                                                    )}
                                                </td>
                                                <td className="p-4 text-right space-y-2">
                                                    {u.role === 'staff' && <button onClick={()=>setViewStaff(u)} className="text-brand-black font-black underline uppercase text-[8px] block w-full text-right hover:text-brand-cyan mb-2">View Info</button>}
                                                    {u.role === 'resident' && <button onClick={()=>setViewUserFull(u)} className="text-brand-black font-black underline uppercase text-[8px] block w-full text-right hover:text-brand-cyan mb-2">View Info</button>}
                                                    {u.status === 'pending' && u.role === 'resident' && <button onClick={()=>approveUser(u.id)} className="text-brand-black font-black underline uppercase text-[8px] block w-full text-right hover:text-brand-lime">Approve</button>}
                                                    {u.status !== 'pending_employee_completion' && <button onClick={()=>resetPin(u.id, u.firstName)} className="text-brand-black font-black underline uppercase text-[8px] block w-full text-right hover:text-brand-cyan">Reset PIN</button>}
                                                    <button onClick={()=>deleteUser(u.id)} className="text-red-500 font-black underline uppercase text-[8px] block w-full text-right hover:text-red-600">Delete</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}

                {admTab === 'ledger' && (
                    <>
                        <div className="flex justify-between items-center px-2 mb-4"><h2 className="text-sm text-brand-black font-black italic uppercase">Master Ledger</h2></div>
                        <div className="table-container border-4 border-brand-black bg-white">
                            <table className="w-full text-[10px] text-left">
                                <thead className="bg-brand-black text-white font-black uppercase tracking-widest"><tr><th className="p-4 whitespace-nowrap">Code</th><th className="p-4 whitespace-nowrap">Unit</th><th className="p-4 whitespace-nowrap">Exit Note</th><th className="p-4 text-right whitespace-nowrap">Movement</th></tr></thead>
                                <tbody className="divide-y-4 divide-brand-black">
                                    {filteredCodes.sort((a,b)=> (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0)).map(c => (
                                        <tr key={c.id}>
                                            <td className="p-4 font-black text-brand-black border-r-4 border-brand-black">{c.code}<br/><span className="text-[8px] text-brand-black bg-brand-lime inline-block px-1 border-2 border-brand-black uppercase">{c.type}</span></td>
                                            <td className="p-4 font-bold border-r-4 border-brand-black text-brand-black">{c.houseId}</td>
                                            <td className="p-4 text-brand-black italic border-r-4 border-brand-black">{c.note||'-'}</td>
                                            <td className="p-4 text-right italic text-brand-black whitespace-nowrap">IN: {formatDate(c.usedAt)}<br/>OUT: {formatDate(c.checkedOutAt)}</td>
                                        </tr>
                                    ))}
                                    {filteredCodes.length === 0 && <tr><td colSpan={4} className="p-10 text-center italic text-gray-400">No activity logged</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            {showAddAdmin && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[250] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-sm p-8 neo-card border-4 space-y-4 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-black italic border-b-4 border-brand-black text-brand-black pb-2">New Admin Profile</h3>
                        <div className="space-y-3">
                            <input className="w-full p-3 neo-input text-xs" placeholder="First Name" value={amFn} onChange={e=>setAmFn(e.target.value)}/>
                            <input className="w-full p-3 neo-input text-xs" placeholder="Last Name" value={amLn} onChange={e=>setAmLn(e.target.value)}/>
                            <select className="w-full p-3 neo-input text-xs" value={amRole} onChange={e=>setAmRole(e.target.value)}>
                                <option value="security">Security Guard</option>
                                <option value="admin">Administrator</option>
                                <option value="madrasa_admin">Madrasa Admin</option>
                            </select>
                            <div className="relative">
                                <input type={showAmPin ? "text" : "password"} maxLength={6} inputMode="numeric" pattern="[0-9]*" placeholder="Initial 6-Digit PIN" value={amPin} onChange={e=>setAmPin(e.target.value)} className="w-full p-3 neo-input font-mono text-center tracking-widest"/>
                                <button onClick={()=>setShowAmPin(!showAmPin)} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-black p-2">{showAmPin ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}</button>
                            </div>
                        </div>
                        <div className="flex gap-3 pt-4">
                            <button onClick={()=>setShowAddAdmin(false)} className="flex-1 font-bold text-gray-500 uppercase text-[10px] hover:text-brand-black">Cancel</button>
                            <button onClick={handleAddAdmin} className="flex-[2] neo-btn-primary py-3 shadow-neo active:translate-y-1 active:shadow-none">Create</button>
                        </div>
                    </div>
                </div>
            )}

            {viewUserFull && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[250] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-sm p-6 neo-card border-4 space-y-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-start border-b-4 border-brand-black pb-2 mb-4">
                            <h3 className="text-sm font-black italic uppercase text-brand-black">Resident Profile</h3>
                            <button onClick={()=>setViewUserFull(null)} className="text-gray-500 hover:text-black font-black text-xl leading-none">&times;</button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <p className="text-[10px] font-black tracking-widest text-gray-500 uppercase">Identity Name</p>
                                <p className="font-bold text-sm uppercase text-brand-black">{viewUserFull.firstName} {viewUserFull.lastName}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black tracking-widest text-gray-500 uppercase">Unit Identifier</p>
                                <p className="font-bold text-sm uppercase bg-brand-cyan text-white p-1 inline-block border-2 border-brand-black mt-1">{viewUserFull.identifier}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black tracking-widest text-gray-500 uppercase">Contact</p>
                                <p className="font-bold text-xs font-mono">{viewUserFull.phone}</p>
                                <p className="font-bold text-xs">{viewUserFull.email}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black tracking-widest text-gray-500 uppercase">Status</p>
                                <div className="mt-1">
                                    <span className={clsx("text-[9px] uppercase font-black px-2 py-1 border-2 border-brand-black shadow-neo-sm", viewUserFull.status === 'approved' ? "bg-brand-lime" : "bg-brand-gray")}>{viewUserFull.status}</span>
                                </div>
                            </div>
                            <div>
                                <p className="text-[10px] font-black tracking-widest text-gray-500 uppercase mb-2">Actions</p>
                                {viewUserFull.status === 'pending' && <button onClick={()=>{approveUser(viewUserFull.id); setViewUserFull(null);}} className="w-full mb-2 bg-brand-lime border-2 border-brand-black p-2 text-[10px] font-black uppercase shadow-neo-sm hover:bg-lime-400">Approve Application</button>}
                                <button onClick={()=>{resetPin(viewUserFull.id, viewUserFull.firstName); setViewUserFull(null);}} className="w-full mb-2 bg-white border-2 border-brand-black p-2 text-[10px] font-black uppercase shadow-neo-sm hover:bg-gray-100">Reset PIN</button>
                                <button onClick={()=>{deleteUser(viewUserFull.id); setViewUserFull(null);}} className="w-full bg-red-100 text-red-600 border-2 border-brand-black p-2 text-[10px] font-black uppercase shadow-neo-sm hover:bg-red-200">Delete Record</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {viewStaff && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[250] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-md p-6 neo-card border-4 max-h-[85vh] overflow-y-auto">
                        <h3 className="text-lg font-black italic border-b-4 border-brand-black text-brand-black pb-2 mb-4 uppercase">Staff Identity Profile</h3>
                        
                        <div className="space-y-4">
                            <div className="flex gap-4 items-center">
                                {viewStaff.passportPhoto ? (
                                    <img src={viewStaff.passportPhoto} alt="Passport" className="w-24 h-24 object-cover border-4 border-brand-black" />
                                ) : (
                                    <div className="w-24 h-24 bg-gray-200 border-4 border-brand-black flex items-center justify-center text-xs font-bold text-gray-500 text-center p-2">NO PHOTO</div>
                                )}
                                <div>
                                    <p className="font-black text-lg uppercase text-brand-black">{viewStaff.firstName}</p>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase">{viewStaff.staffRole} • {viewStaff.phone}</p>
                                    <p className="text-[10px] font-bold mt-1">Employer: {viewStaff.employerId}</p>
                                    <p className="text-[10px] font-bold mt-1">DOB: {viewStaff.dob} ({viewStaff.gender})</p>
                                    <p className="text-[10px] font-bold mt-1 text-gray-600">Address: {viewStaff.address}</p>
                                    <div className="mt-2 block">
                                        <span className={`text-[8px] px-1 border-2 border-brand-black uppercase font-black tracking-widest ${viewStaff.status === 'approved' ? 'bg-brand-lime text-brand-black' : 'bg-brand-gray text-brand-black'}`}>
                                            {viewStaff.status.replace(/_/g, ' ')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-brand-gray p-3 border-2 border-brand-black">
                                <p className="text-[9px] font-black uppercase text-brand-black mb-1">National IDs</p>
                                <p className="font-mono text-sm tracking-widest text-brand-black">NIN: {viewStaff.nin || 'N/A'}</p>
                                <p className="font-mono text-sm tracking-widest text-brand-black">BVN: {viewStaff.bvn || 'N/A'}</p>
                            </div>

                            {viewStaff.idDocument && (
                                <div>
                                    <p className="text-[9px] font-black uppercase mb-1 text-gray-500">Staff ID Document</p>
                                    <img src={viewStaff.idDocument} alt="Staff ID" className="w-full h-auto max-h-48 object-contain border-4 border-brand-black" />
                                </div>
                            )}

                            <div className="border-t-4 border-brand-black pt-4">
                                <p className="text-[10px] font-black uppercase text-brand-black bg-brand-pink inline-block px-1 border-2 border-brand-black mb-2">Guarantor / NOK</p>
                                <p className="text-sm font-bold">{viewStaff.nextOfKin?.name || 'N/A'}</p>
                                <p className="text-xs font-bold text-gray-600">{viewStaff.nextOfKin?.relationship} • {viewStaff.nextOfKin?.phone}</p>
                            </div>

                            {viewStaff.nextOfKin?.idDocument && (
                                <div>
                                    <p className="text-[9px] font-black uppercase mb-1 text-gray-500">Guarantor ID</p>
                                    <img src={viewStaff.nextOfKin.idDocument} alt="Guarantor ID" className="w-full h-auto max-h-48 object-contain border-4 border-brand-black" />
                                </div>
                            )}

                            {viewStaff.employerComment && (
                                <div className="border-t-4 border-brand-black pt-4">
                                    <p className="text-[10px] font-black uppercase text-brand-black bg-brand-lime inline-block px-1 border-2 border-brand-black mb-2">Employer Comment</p>
                                    <p className="text-xs font-bold text-gray-700 italic">"{viewStaff.employerComment}"</p>
                                </div>
                            )}
                        </div>

                        <div className="flex pt-6 mt-6 border-t-4 border-brand-black justify-end">
                            <button onClick={()=>setViewStaff(null)} className="font-black text-white bg-brand-black uppercase text-[12px] hover:bg-gray-800 border-4 border-brand-black px-6 py-2 shadow-neo active:translate-y-1 active:shadow-none">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
