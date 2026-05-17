import { useState, useEffect } from 'react';
import { Settings, LogOut, Clock, Truck, Calendar, MessageSquare, Copy, Trash2, Eye, EyeOff, AlertTriangle, Wrench } from 'lucide-react';
import { useApp } from '../lib/context';
import { db, appId } from '../lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import { generateCode, formatDate, filterItemsByDate, hashPin } from '../lib/utils';
import clsx from 'clsx';

export default function Resident() {
    const { profile, setProfile, setView, notify } = useApp();
    const [viewTab, setViewTab] = useState<'auth' | 'hist' | 'bc' | 'staff' | 'dir' | 'svcs' | 'kids' | 'tickets' | 'polls'>('auth');
    const [dateFilter, setDateFilter] = useState('all');
    
    const [codesData, setCodesData] = useState<any[]>([]);
    const [noticesData, setNoticesData] = useState<any[]>([]);
    const [staffData, setStaffData] = useState<any[]>([]);
    const [servicesData, setServicesData] = useState<any[]>([]);
    const [kidsData, setKidsData] = useState<any[]>([]);
    const [ticketsData, setTicketsData] = useState<any[]>([]);
    const [pollsData, setPollsData] = useState<any[]>([]);

    const [isSosActive, setIsSosActive] = useState(false);

    const [showAddTicket, setShowAddTicket] = useState(false);
    const [ticketTitle, setTicketTitle] = useState('');
    const [ticketDesc, setTicketDesc] = useState('');
    const [ticketCat, setTicketCat] = useState('Electrical');

    const [showAddSvc, setShowAddSvc] = useState(false);
    const [svcTitle, setSvcTitle] = useState('');
    const [svcDesc, setSvcDesc] = useState('');
    const [svcCat, setSvcCat] = useState('General');
    const [svcPhone, setSvcPhone] = useState('');

    const [showAddKid, setShowAddKid] = useState(false);
    const [kidName, setKidName] = useState('');
    const [kidAge, setKidAge] = useState('');
    const [kidDob, setKidDob] = useState('');
    const [kidGender, setKidGender] = useState('Male');
    const [kidAllergies, setKidAllergies] = useState('');
    const [kidIceName, setKidIceName] = useState('');
    const [kidIcePhone, setKidIcePhone] = useState('');

    // Modals state
    const [showChangePin, setShowChangePin] = useState(false);
    const [showLS, setShowLS] = useState(false);
    const [showGatePass, setShowGatePass] = useState(false);
    const [showAddStaff, setShowAddStaff] = useState(false);
    const [reviewStaff, setReviewStaff] = useState<any>(null);
    const [staffComment, setStaffComment] = useState('');
    const [staffPassHours, setStaffPassHours] = useState('24');
    const [exitNoteCodeId, setExitNoteCodeId] = useState<string | null>(null);
    const [exitNoteText, setExitNoteText] = useState('');
    const [staffFn, setStaffFn] = useState('');
    const [staffRole, setStaffRole] = useState('');
    const [staffPhone, setStaffPhone] = useState('');

    useEffect(() => {
        if (!profile) return;
        const codesUnsub = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'codes'), snap => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter((c: any) => c.houseId === profile.identifier);
            setCodesData(data);
        });
        
        const noticesUnsub = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'notices'), snap => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setNoticesData(data);
        });
        
        const svcsUnsub = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'services'), snap => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setServicesData(data);
        });
        
        const kidsUnsub = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'madrasa_students'), snap => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter((k: any) => k.houseId === profile.identifier);
            setKidsData(data);
        });

        const ticketsUnsub = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'tickets'), snap => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter((t: any) => t.houseId === profile.identifier);
            setTicketsData(data);
        });

        const sosUnsub = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'sos'), snap => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter((s: any) => s.houseId === profile.identifier && s.status === 'active');
            setIsSosActive(data.length > 0);
        });
        
        const pollsUnsub = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'polls'), snap => {
            setPollsData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        const usersUnsub = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'users'), snap => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                                  .filter((u: any) => u.appId === appId && u.role === 'staff');
            setStaffData(data);
        });

        return () => {
            codesUnsub();
            noticesUnsub();
            usersUnsub();
            svcsUnsub();
            kidsUnsub();
            ticketsUnsub();
            sosUnsub();
            pollsUnsub();
        };
    }, [profile]);

    const filteredCodes = filterItemsByDate(codesData, 'createdAt', dateFilter);
    const filteredNotices = filterItemsByDate(noticesData, 'createdAt', dateFilter);

    const activeCount = filteredCodes.filter(c => c.status === 'active').length;
    const historyCount = filteredCodes.filter(c => c.status === 'used' || c.status === 'checked-out').length;

    const issueCode = async (type: string) => {
        let durationMinutes = 60;
        let targetName = 'Visitor';
        let note = '';
        if (type === 'Guest') durationMinutes = 30;
        else if (type === 'Delivery') durationMinutes = 15;
        else if (type === 'Jumat') {
            durationMinutes = 180; // 3 hours
            targetName = 'Jumat Guest';
            note = `Has authorized guest to come pray Jumat service in the estate mosque.`;
        }

        const exp = new Date(Date.now() + durationMinutes * 60000);
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'codes'), {
            code: generateCode(), type, targetName, houseId: profile.identifier, status: 'active',
            createdAt: serverTimestamp(), expiresAt: exp.toISOString(), generatedBy: profile.firstName,
            note
        });
        notify("Access code issued.");
    };

    const revokeCode = async (id: string) => {
        if (window.confirm("Void this code?")) {
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'codes', id), { status: 'revoked' });
        }
    };

    const shareCode = async (id: string, mode: 'wa' | 'cp') => {
        const snap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'codes', id));
        const c = snap.data();
        if(!c) return;
        
        let msg = `Assalamu Alaikum Warahmatullahi Wabarakatuh,

Welcome to LightHouse Estate.

Your Gate Access Details are as follows:

Access Code: ${c.code}
Host: ${profile.identifier}
Valid Until: ${formatDate(c.expiresAt)}

If you require any assistance, kindly contact your host directly.

Please note that LightHouse Estate is a Muslim residential community. Residents and visitors are kindly expected to uphold the values and peaceful environment of the estate. Alcohol, indecent dressing, and loud music are strictly prohibited.

Thank you for your understanding and cooperation`;

        if (c.type === 'Jumat' || c.type === 'Madrasa') {
            msg = `Assalamu Alaikum Warahmatullahi Wabarakatuh,

Welcome to LightHouse Estate.

Your ${c.type === 'Jumat' ? 'Jumat' : 'Madrasa'} Access Details are as follows:

Access Code: ${c.code}
Host: ${profile.identifier}
Valid Until: ${formatDate(c.expiresAt)}
Note: Your host has authorized you to come to the estate ${c.type === 'Jumat' ? 'mosque for Jumat service' : 'Madrasa'}.

Please note that LightHouse Estate is a Muslim residential community. Residents and visitors are kindly expected to uphold the values and peaceful environment of the estate. Alcohol, indecent dressing, and loud music are strictly prohibited.

Thank you for your understanding and cooperation`;
        }
        
        if (mode === 'wa') {
            window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`);
        } else {
            try {
                await navigator.clipboard.writeText(msg);
                notify("Template copied.");
            } catch (err) {
                notify("Copy failed.", "error");
            }
        }
    };

    // Change PIN Modal
    const [oldPin, setOldPin] = useState('');
    const [newPin, setNewPin] = useState('');
    const [confPin, setConfPin] = useState('');
    const [showOld, setShowOld] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConf, setShowConf] = useState(false);

    const handleChangePin = async () => {
        if (newPin !== confPin) return notify("New PINs mismatch.", "error");
        const ho = await hashPin(oldPin);
        if (ho !== profile.pin) return notify("Old PIN incorrect.", "error");
        const hn = await hashPin(newPin);
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', profile.id), { pin: hn });
        setProfile({ ...profile, pin: hn });
        setShowChangePin(false);
        notify("PIN updated.");
        setOldPin(''); setNewPin(''); setConfPin('');
    };

    // Long Stay Modal
    const [lsName, setLsName] = useState('');
    const [lsDate, setLsDate] = useState('');
    const handleLongStay = async () => {
        if (!lsName || !lsDate) return alert("Missing info.");
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'codes'), {
            code: generateCode(), type: 'Long-Stay', targetName: lsName, houseId: profile.identifier, status: 'active',
            createdAt: serverTimestamp(), expiresAt: new Date(lsDate).toISOString(), generatedBy: profile.firstName
        });
        setShowLS(false);
        notify("Long-stay active.");
        setLsName(''); setLsDate('');
    };

    // Gate Pass Modal
    const [gpName, setGpName] = useState('');
    const [gpNote, setGpNote] = useState('');
    const handleGatePass = async () => {
        if (!gpName || !gpNote) return alert("Detail required.");
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'codes'), {
            code: generateCode(), type: 'Gate-Pass', targetName: gpName, note: gpNote, houseId: profile.identifier, status: 'active',
            createdAt: serverTimestamp(), expiresAt: new Date(Date.now() + 180 * 60000).toISOString(), generatedBy: profile.firstName
        });
        setShowGatePass(false);
        notify("Exit pass issued.");
        setGpName(''); setGpNote('');
    };

    const handleAddStaff = async () => {
        if (!staffFn || !staffRole || !staffPhone) return alert("Missing info.");
        const inviteCode = generateCode();
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'users'), {
            appId,
            role: 'staff',
            firstName: staffFn,
            staffRole: staffRole,
            phone: staffPhone,
            employerId: profile.identifier,
            status: 'pending_employee_completion',
            inviteCode,
            createdAt: serverTimestamp()
        });
        setShowAddStaff(false);
        notify(`Staff invited! Code: ${inviteCode}`);
        setStaffFn(''); setStaffRole(''); setStaffPhone('');
    };

    const handleApproveStaff = async (id: string) => {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', id), {
            status: 'approved',
            updatedAt: new Date()
        });
        notify("Staff profile approved.");
    };

    const handleUnapproveStaff = async (id: string) => {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', id), {
            status: 'pending_resident_approval',
            updatedAt: new Date()
        });
        notify("Staff unapproved.");
    };

    const handleSaveComment = async (id: string) => {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', id), {
            employerComment: staffComment,
            updatedAt: new Date()
        });
        notify("Comment saved.");
    };

    const handleStaffGatePass = async (staff: any) => {
        const codeStr = generateCode();
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'codes'), {
            appId,
            houseId: profile.identifier,
            code: codeStr,
            targetName: `[STAFF] ${staff.firstName} (${staff.staffRole})`,
            type: 'single', // Security expects single/event usually, but 'single' works, just adding note
            note: "Staff Pass generated by Employer",
            status: 'active',
            createdAt: serverTimestamp(),
            expiresAt: new Date(Date.now() + parseInt(staffPassHours) * 60 * 60 * 1000)
        });
        notify(`Staff Pass Created: ${codeStr}`);
        setReviewStaff(null);
    };

    const handleRevokePass = async (id: string) => {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'codes', id), {
            status: 'used', // Setting to used so it clears from active list and prevents entry
            note: exitNoteText || 'Deactivated by Resident',
            updatedAt: serverTimestamp()
        });
        notify("Pass deactivated.");
        setExitNoteCodeId(null);
        setExitNoteText('');
    };

    const [searchQuery, setSearchQuery] = useState('');

    const handleAddService = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'services'), {
                providerHouseId: profile.identifier,
                title: svcTitle,
                description: svcDesc,
                category: svcCat,
                phone: svcPhone,
                createdAt: serverTimestamp()
            });
            notify("Service active in marketplace.");
            setShowAddSvc(false);
            setSvcTitle(''); setSvcDesc(''); setSvcPhone('');
        } catch (error) {
            notify("Error listing service.", "error");
        }
    };

    const handleEnrollKid = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'madrasa_students'), {
                appId, houseId: profile.identifier,
                name: kidName, age: kidAge, dob: kidDob, gender: kidGender,
                allergies: kidAllergies, iceName: kidIceName, icePhone: kidIcePhone,
                createdAt: serverTimestamp()
            });
            notify("Child enrolled in Madrasa.");
            setShowAddKid(false);
            setKidName(''); setKidAge(''); setKidDob(''); setKidAllergies(''); setKidIceName(''); setKidIcePhone('');
        } catch (error) {
            notify("Error enrolling child.", "error");
        }
    };

    const handleTriggerSOS = async () => {
        if (window.confirm("TRIGGER EMERGENCY SOS? This will immediately alert security.")) {
            try {
                await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'sos'), {
                    houseId: profile.identifier,
                    status: 'active',
                    createdAt: serverTimestamp()
                });
                notify("SOS Alert Sent! Security is on the way.", "error");
            } catch(e) {
                notify("Failed to send SOS.", "error");
            }
        }
    };

    const handleAddTicket = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'tickets'), {
                houseId: profile.identifier,
                title: ticketTitle,
                description: ticketDesc,
                category: ticketCat,
                status: 'pending',
                createdAt: serverTimestamp()
            });
            notify("Maintenance ticket submitted.");
            setShowAddTicket(false);
            setTicketTitle(''); setTicketDesc(''); setTicketCat('Electrical');
        } catch (error) {
            notify("Error submitting ticket.", "error");
        }
    };

    const handleVote = async (pollId: string, choice: 'A' | 'B') => {
        try {
            const pollRef = doc(db, 'artifacts', appId, 'public', 'data', 'polls', pollId);
            const snap = await getDoc(pollRef);
            if(snap.exists()) {
                const data = snap.data();
                if (data.status !== 'open') return notify("Poll is closed", "error");
                if (data.voters && data.voters.includes(profile.id)) return notify("You already voted", "error");
                
                await updateDoc(pollRef, {
                    [choice === 'A' ? 'votesA' : 'votesB']: (data[choice === 'A' ? 'votesA' : 'votesB'] || 0) + 1,
                    voters: [...(data.voters || []), profile.id]
                });
                notify("Vote cast successfully!");
            }
        } catch (e) {
            notify("Error voting", "error");
        }
    };

    if(!profile) return null;

    const myStaffData = staffData.filter(x => x.employerId === profile.identifier);
    const dirStaffData = staffData.filter(x => x.employerId !== profile.identifier && x.status === 'approved' && (!searchQuery || x.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) || x.staffRole?.toLowerCase().includes(searchQuery.toLowerCase())));

    return (
        <div className="max-w-xl mx-auto p-4 min-h-screen pb-24 animate-fade-in relative">
            <header className="bg-white p-5 border-b-4 border-brand-black mb-6 flex justify-between items-center sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <div className="bg-brand-black text-white w-10 h-10 flex items-center justify-center font-black text-xl border-2 border-brand-black">{profile.firstName[0]}</div>
                    <div>
                        <h2 className="font-black text-sm text-brand-black leading-none uppercase">{profile.firstName}</h2>
                        <p className="text-[9px] font-bold text-gray-500 uppercase mt-1 tracking-widest">{profile.identifier}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleTriggerSOS} className={clsx("p-2 border-2 shadow-neo-sm transition-all", isSosActive ? "bg-red-500 text-white border-brand-black animate-pulse" : "bg-white text-red-500 border-red-500 hover:bg-red-50")} title="TRIGGER SOS">
                        <AlertTriangle className="w-5 h-5" />
                    </button>
                    <button onClick={() => setShowChangePin(true)} className="p-2 border-2 border-brand-black bg-white hover:bg-brand-lime transition-colors"><Settings className="w-5 h-5 text-brand-black" /></button>
                    <button onClick={() => { setProfile(null); setView('landing'); }} className="p-2 border-2 border-brand-black bg-brand-pink hover:bg-pink-300 transition-colors"><LogOut className="w-5 h-5 text-brand-black" /></button>
                </div>
            </header>

            {profile.duesStatus !== 'paid' && (
                <div className="bg-red-100 border-4 border-red-500 p-3 mb-6 mx-4 md:mx-0 shadow-neo-sm text-center">
                    <AlertTriangle className="w-6 h-6 text-red-500 mx-auto mb-1 animate-pulse" />
                    <h3 className="font-black text-red-700 uppercase text-[10px] tracking-widest">Estate Dues Outstanding</h3>
                    <p className="text-[10px] text-red-900 font-bold mt-1">Please pay your annual estate dues to ensure uninterrupted access to amenities.</p>
                </div>
            )}

            <div className="border-4 border-brand-black p-1 mb-6 flex items-center gap-2 bg-brand-gray">
                <select value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="bg-white text-[10px] font-black uppercase p-2 border-2 border-brand-black outline-none shadow-neo-sm">
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">Week</option>
                    <option value="month">Month</option>
                </select>
                <div className="h-8 w-0.5 bg-brand-black mx-1"></div>
                <div className="flex flex-wrap gap-2 flex-1">
                    <button onClick={() => setViewTab('auth')} className={clsx("px-4 py-2 border-2 border-brand-black text-[10px] font-black uppercase whitespace-nowrap", viewTab === 'auth' ? "bg-brand-black text-white shadow-neo-sm" : "bg-white text-brand-black hover:bg-brand-gray")}>Access</button>
                    <button onClick={() => setViewTab('tickets')} className={clsx("px-4 py-2 border-2 border-brand-black text-[10px] font-black uppercase whitespace-nowrap", viewTab === 'tickets' ? "bg-brand-black text-white shadow-neo-sm" : "bg-white text-brand-black hover:bg-brand-gray")}>Fix It</button>
                    <button onClick={() => setViewTab('polls')} className={clsx("px-4 py-2 border-2 border-brand-black text-[10px] font-black uppercase whitespace-nowrap", viewTab === 'polls' ? "bg-brand-black text-white shadow-neo-sm" : "bg-white text-brand-black hover:bg-brand-gray")}>Townhall</button>
                    <button onClick={() => setViewTab('staff')} className={clsx("px-4 py-2 border-2 border-brand-black text-[10px] font-black uppercase whitespace-nowrap", viewTab === 'staff' ? "bg-brand-black text-white shadow-neo-sm" : "bg-white text-brand-black hover:bg-brand-gray")}>My Staff</button>
                    <button onClick={() => setViewTab('kids')} className={clsx("px-4 py-2 border-2 border-brand-black text-[10px] font-black uppercase whitespace-nowrap", viewTab === 'kids' ? "bg-brand-black text-white shadow-neo-sm" : "bg-white text-brand-black hover:bg-brand-gray")}>Madrasa</button>
                    <button onClick={() => setViewTab('svcs')} className={clsx("px-4 py-2 border-2 border-brand-black text-[10px] font-black uppercase whitespace-nowrap", viewTab === 'svcs' ? "bg-brand-black text-white shadow-neo-sm" : "bg-white text-brand-black hover:bg-brand-gray")}>Market</button>
                    <button onClick={() => setViewTab('dir')} className={clsx("px-4 py-2 border-2 border-brand-black text-[10px] font-black uppercase whitespace-nowrap", viewTab === 'dir' ? "bg-brand-black text-white shadow-neo-sm" : "bg-white text-brand-black hover:bg-brand-gray")}>Directory</button>
                    <button onClick={() => setViewTab('hist')} className={clsx("px-4 py-2 border-2 border-brand-black text-[10px] font-black uppercase whitespace-nowrap", viewTab === 'hist' ? "bg-brand-black text-white shadow-neo-sm" : "bg-white text-brand-black hover:bg-brand-gray")}>Logbook</button>
                    <button onClick={() => setViewTab('bc')} className={clsx("px-4 py-2 border-2 border-brand-black text-[10px] font-black uppercase whitespace-nowrap", viewTab === 'bc' ? "bg-brand-black text-white shadow-neo-sm" : "bg-white text-brand-black hover:bg-brand-gray")}>Notices</button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-brand-lime p-4 border-4 border-brand-black shadow-neo flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-brand-black">{activeCount}</span>
                    <span className="text-[9px] font-bold text-brand-black uppercase tracking-widest mt-1 bg-white px-2 border-2 border-brand-black">Active</span>
                </div>
                <div className="bg-brand-cyan p-4 border-4 border-brand-black shadow-neo flex flex-col items-center justify-center text-white">
                    <span className="text-3xl font-black">{historyCount}</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest mt-1 bg-white px-2 border-2 border-brand-black text-brand-cyan">History</span>
                </div>
            </div>

            <div className="space-y-6">
                {viewTab === 'polls' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center border-b-4 border-brand-black pb-2 mb-4">
                            <h3 className="font-black text-brand-black uppercase text-sm">Townhall Polls</h3>
                        </div>
                        {pollsData.map(p => {
                            const hasVoted = p.voters?.includes(profile.id);
                            const total = (p.votesA || 0) + (p.votesB || 0);
                            const pctA = total ? Math.round(((p.votesA || 0)/total)*100) : 0;
                            const pctB = total ? Math.round(((p.votesB || 0)/total)*100) : 0;
                            
                            return (
                            <div key={p.id} className="bg-white p-4 neo-card border-4 border-brand-black">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-black uppercase text-brand-black text-sm">{p.title}</h4>
                                    <span className={clsx("text-white border-2 border-brand-black text-[8px] font-black uppercase px-2 py-1", p.status === 'open' ? 'bg-brand-lime text-brand-black' : 'bg-gray-500')}>{p.status}</span>
                                </div>
                                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-4">Total Votes: {total}</p>
                                
                                {hasVoted || p.status === 'closed' ? (
                                    <div className="space-y-2">
                                        <div className="relative h-10 border-2 border-brand-black bg-brand-gray flex items-center overflow-hidden">
                                            <div className="absolute top-0 left-0 bottom-0 bg-brand-cyan" style={{width: `${pctA}%`}}></div>
                                            <span className="relative z-10 px-2 font-black text-[10px] text-brand-black uppercase mix-blend-difference text-white">{p.optA} ({pctA}%)</span>
                                        </div>
                                        <div className="relative h-10 border-2 border-brand-black bg-brand-gray flex items-center overflow-hidden">
                                            <div className="absolute top-0 left-0 bottom-0 bg-brand-lime" style={{width: `${pctB}%`}}></div>
                                            <span className="relative z-10 px-2 font-black text-[10px] text-brand-black uppercase">{p.optB} ({pctB}%)</span>
                                        </div>
                                        {hasVoted && <p className="text-[9px] uppercase font-bold text-brand-lime bg-brand-black px-2 py-1 inline-block mt-2">Vote Recorded</p>}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-2">
                                        <button onClick={()=>handleVote(p.id, 'A')} className="w-full bg-brand-cyan text-white border-2 border-brand-black p-3 font-black text-[10px] uppercase shadow-neo-sm hover:bg-cyan-400">{p.optA}</button>
                                        <button onClick={()=>handleVote(p.id, 'B')} className="w-full bg-brand-lime text-brand-black border-2 border-brand-black p-3 font-black text-[10px] uppercase shadow-neo-sm hover:bg-lime-400">{p.optB}</button>
                                    </div>
                                )}
                            </div>
                        )})}
                        {pollsData.length === 0 && <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest text-center py-6">No active polls.</p>}
                    </div>
                )}
                {viewTab === 'auth' && (
                    <>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <button onClick={() => issueCode('Guest')} className="bg-brand-black text-white p-5 border-4 border-brand-black shadow-neo active:translate-y-1 active:shadow-none transition-all flex flex-col items-center gap-2 hover:bg-gray-800">
                                <Clock className="w-6 h-6 text-brand-lime" />
                                <span className="font-black text-[10px] uppercase tracking-widest">Guest</span>
                            </button>
                            <button onClick={() => issueCode('Delivery')} className="bg-white text-brand-black p-5 border-4 border-brand-black shadow-neo active:translate-y-1 active:shadow-none transition-all flex flex-col items-center gap-2 hover:bg-brand-cyan hover:text-white group">
                                <Truck className="w-6 h-6 group-hover:text-white" />
                                <span className="font-black text-[10px] uppercase tracking-widest">Delivery</span>
                            </button>
                            <button onClick={() => setShowLS(true)} className="bg-white text-brand-black p-5 border-4 border-brand-black shadow-neo active:translate-y-1 active:shadow-none transition-all flex flex-col items-center gap-2 hover:bg-brand-pink group">
                                <Calendar className="w-6 h-6" />
                                <span className="font-black text-[10px] uppercase tracking-widest">Long-Stay</span>
                            </button>
                            <button onClick={() => setShowGatePass(true)} className="bg-white text-brand-black p-5 border-4 border-brand-black shadow-neo active:translate-y-1 active:shadow-none transition-all flex flex-col items-center gap-2 hover:bg-brand-gray">
                                <LogOut className="w-6 h-6" />
                                <span className="font-black text-[10px] uppercase tracking-widest">Exit Pass</span>
                            </button>
                            <button onClick={() => issueCode('Jumat')} className="bg-brand-pink text-brand-black p-4 border-4 border-brand-black shadow-neo active:translate-y-1 active:shadow-none transition-all flex flex-col items-center justify-center gap-1 hover:bg-pink-300 col-span-2">
                                <span className="font-black text-xs uppercase tracking-widest text-center">Jumat Guest Pass (3hrs)</span>
                                <span className="text-[9px] font-bold tracking-widest opacity-70 text-center">Valid only on Fridays (1pm - 3pm)</span>
                            </button>
                        </div>
                        <h3 className="font-black text-brand-black uppercase text-sm border-b-4 border-brand-black pb-2 mb-4">Active Passes</h3>
                        <div className="space-y-4">
                            {filteredCodes.filter(c => c.status === 'active').sort((a,b) => b.createdAt?.seconds - a.createdAt?.seconds).map(c => (
                                <div key={c.id} className="bg-white p-5 border-4 border-brand-black shadow-neo-sm relative">
                                    <div className="flex justify-between items-start mb-4">
                                        <span className={clsx("text-[9px] font-black uppercase px-2 py-1 border-2 border-brand-black", c.type === 'Gate-Pass' ? 'bg-brand-pink' : 'bg-brand-lime')}>{c.type}</span>
                                        <button onClick={() => revokeCode(c.id)} className="text-brand-black hover:bg-red-200 border border-transparent hover:border-brand-black p-1 transition-all"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                    <h3 className="text-4xl font-mono font-black text-brand-black mb-1 tracking-tighter">{c.code}</h3>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase italic mb-4">{c.targetName}</p>
                                    {c.note && <p className="text-[10px] bg-brand-gray text-brand-black p-2 border-l-4 border-brand-black mb-4 font-bold">Note: "{c.note}"</p>}
                                    <div className="flex gap-2">
                                        {exitNoteCodeId === c.id ? (
                                            <div className="w-full space-y-2">
                                                <input placeholder="Add exit/reason comment" value={exitNoteText} onChange={e=>setExitNoteText(e.target.value)} className="w-full text-[10px] p-2 border-2 border-brand-black" />
                                                <div className="flex gap-2">
                                                    <button onClick={()=>setExitNoteCodeId(null)} className="flex-1 text-[8px] uppercase font-bold py-2 border-2 border-brand-black hover:bg-gray-100">Cancel</button>
                                                    <button onClick={()=>handleRevokePass(c.id)} className="flex-1 bg-red-500 text-white text-[8px] uppercase font-bold py-2 border-2 border-brand-black hover:bg-red-600">Confirm Deactivate</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <button onClick={() => shareCode(c.id, 'wa')} className="flex-1 bg-brand-black text-white py-3 border-4 border-brand-black font-black uppercase text-[10px] flex items-center justify-center gap-2 active:scale-95">Share <MessageSquare className="w-3 h-3 text-brand-lime" /></button>
                                                <button onClick={() => shareCode(c.id, 'cp')} className="bg-white text-brand-black px-4 py-3 border-4 border-brand-black active:scale-95"><Copy className="w-4 h-4" /></button>
                                                <button onClick={() => setExitNoteCodeId(c.id)} className="flex-1 bg-brand-pink text-brand-black py-3 border-4 border-brand-black font-black uppercase text-[10px] flex items-center justify-center active:scale-95 text-center px-1">📝 / ❌</button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {filteredCodes.filter(c => c.status === 'active').length === 0 && (
                                <p className="text-center py-10 opacity-40 font-black text-[10px] uppercase tracking-widest">No Active Clearances</p>
                            )}
                        </div>
                    </>
                )}

                {viewTab === 'staff' && (
                    <>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-black text-brand-black uppercase text-sm border-b-4 border-brand-black pb-2">Domestic Staff</h3>
                            <button onClick={() => setShowAddStaff(true)} className="bg-brand-black text-white px-4 py-2 border-2 border-brand-black text-[9px] font-black uppercase shadow-neo-sm hover:bg-gray-800">Assign Staff</button>
                        </div>
                        <div className="space-y-4">
                            {myStaffData.map(s => (
                                <div key={s.id} className="bg-white p-5 border-4 border-brand-black shadow-neo-sm relative">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-black text-lg text-brand-black uppercase">{s.firstName || 'Pending Reg.'}</h3>
                                        {s.status === 'pending_employee_completion' && <span className="text-[8px] font-black uppercase px-2 py-1 border-2 border-brand-black bg-brand-pink">Invited</span>}
                                        {s.status === 'pending_resident_approval' && <span className="text-[8px] font-black uppercase px-2 py-1 border-2 border-brand-black bg-brand-cyan text-white">Review Needed</span>}
                                        {s.status === 'approved' && <span className="text-[8px] font-black uppercase px-2 py-1 border-2 border-brand-black bg-brand-lime">Active</span>}
                                    </div>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase italic mb-2">{s.staffRole} • {s.phone}</p>
                                    
                                    {s.status === 'pending_employee_completion' && (
                                        <div className="mt-4 bg-brand-gray p-3 border-2 border-brand-black border-dashed text-center">
                                            <p className="text-[9px] font-black uppercase mb-1">Invite Code</p>
                                            <p className="text-2xl font-mono font-black tracking-[0.2em]">{s.inviteCode}</p>
                                        </div>
                                    )}

                                    {s.status === 'pending_resident_approval' && (
                                        <div className="mt-4 pt-4 border-t-2 border-brand-black space-y-2">
                                            <p className="text-[9px] font-bold text-gray-500">Profile complete. Verify identity before approval.</p>
                                            <button onClick={() => { setReviewStaff(s); setStaffComment(s.employerComment||''); setStaffPassHours('24'); }} className="w-full bg-brand-cyan text-white py-3 border-4 border-brand-black font-black uppercase text-[10px] active:scale-95">Review Information</button>
                                        </div>
                                    )}

                                    {s.status === 'approved' && (
                                        <div className="mt-4 pt-4 border-t-2 border-brand-black space-y-2">
                                            <button onClick={() => { setReviewStaff(s); setStaffComment(s.employerComment||''); setStaffPassHours('24'); }} className="w-full bg-brand-black text-brand-lime py-3 border-4 border-brand-black font-black uppercase text-[10px] shadow-neo-sm hover:bg-gray-800 active:translate-y-1 active:shadow-none transition-all">Manage Options / View Info</button>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {myStaffData.length === 0 && (
                                <p className="text-center py-10 opacity-40 font-black text-[10px] uppercase tracking-widest">No Staff Assigned</p>
                            )}
                        </div>
                    </>
                )}

                {viewTab === 'dir' && (
                    <>
                        <h3 className="font-black text-brand-black uppercase text-sm border-b-4 border-brand-black pb-2 mb-4">Estate Staff Directory</h3>
                        <p className="text-xs text-gray-600 font-bold mb-4">Browse accredited domestic staff working within the estate.</p>
                        
                        <div className="mb-6">
                            <input 
                                type="text"
                                placeholder="Search by name or role..." 
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full p-3 neo-input text-xs tracking-widest"
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            {dirStaffData.map((su: any) => (
                                <div key={su.id} className="bg-white border-4 border-brand-black p-4 flex gap-4 neo-card">
                                    <div className="w-16 h-16 bg-gray-200 border-2 border-brand-black shrink-0 relative">
                                        {su.passportPhoto ? <img src={su.passportPhoto} className="w-full h-full object-cover" alt="Staff" /> : <p className="text-center text-[8px] font-black uppercase pt-5">No img</p>}
                                    </div>
                                    <div>
                                        <p className="font-black text-brand-black uppercase text-sm leading-tight">{su.firstName}</p>
                                        <p className="text-[9px] font-bold uppercase text-gray-500 tracking-widest mb-1">{su.staffRole}</p>
                                        <p className="text-[10px] font-bold text-gray-600">Employer: <span className="text-brand-black">{su.employerId}</span></p>
                                        {su.employerComment && (
                                            <p className="text-[10px] mt-2 bg-brand-lime/30 p-2 border-l-2 border-brand-black italic text-gray-700 font-medium">"{su.employerComment}"</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {dirStaffData.length === 0 && <p className="text-center py-10 opacity-40 font-black text-[10px] uppercase tracking-widest col-span-2">No other approved staff in the estate.</p>}
                        </div>
                    </>
                )}

                {viewTab === 'hist' && (
                    <div className="table-container border-4 border-brand-black">
                        <table className="w-full text-[10px] text-left">
                            <thead className="bg-brand-black text-white uppercase font-black tracking-widest">
                                <tr><th className="p-3 whitespace-nowrap">Identity</th><th className="p-3 whitespace-nowrap">Status</th><th className="p-3 text-right whitespace-nowrap">Time Log</th></tr>
                            </thead>
                            <tbody className="divide-y-2 divide-brand-black bg-white">
                                {filteredCodes.filter(c => c.status !== 'active').sort((a,b) => (b.usedAt?.seconds || 0) - (a.usedAt?.seconds || 0)).map(c => (
                                    <tr key={c.id}>
                                        <td className="p-3 font-bold text-brand-black border-r-4 border-brand-black">
                                            {c.code}<br/><span className="text-[8px] text-gray-500 uppercase">{c.targetName}</span>
                                        </td>
                                        <td className="p-3 border-r-4 border-brand-black">
                                            <span className={clsx("px-2 py-0.5 border-2 border-brand-black text-[8px] uppercase font-black text-brand-black", c.status === 'used' ? 'bg-brand-lime' : c.status === 'checked-out' ? 'bg-brand-gray' : 'bg-gray-200')}>{c.status}</span>
                                        </td>
                                        <td className="p-3 text-right italic text-brand-black whitespace-nowrap">
                                            IN: {formatDate(c.usedAt)}<br/>OUT: {formatDate(c.checkedOutAt)}
                                        </td>
                                    </tr>
                                ))}
                                {filteredCodes.filter(c => c.status !== 'active').length === 0 && (
                                    <tr><td colSpan={3} className="p-10 text-center italic text-gray-400">No logs found</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {viewTab === 'bc' && (
                    <>
                        {filteredNotices.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).map(n => (
                            <div key={n.id} className="bg-white p-5 border-4 border-brand-black shadow-neo-sm mb-4">
                                <h3 className="font-black text-brand-black text-lg mb-1 uppercase">{n.title}</h3>
                                <p className="text-[8px] font-bold text-brand-black bg-brand-pink inline-block px-1 border-2 border-brand-black mb-3 uppercase">{formatDate(n.createdAt)}</p>
                                <p className="text-xs text-brand-black leading-relaxed font-medium border-t-2 border-brand-black pt-2">{n.content}</p>
                            </div>
                        ))}
                        {filteredNotices.length === 0 && (
                            <p className="text-center py-10 opacity-40 font-black text-[10px] uppercase tracking-widest">No Community Notices</p>
                        )}
                    </>
                )}

                {viewTab === 'svcs' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center border-b-4 border-brand-black pb-2 mb-4">
                            <h3 className="font-black text-brand-black uppercase text-sm">Estate Marketplace</h3>
                            <button onClick={()=>setShowAddSvc(true)} className="bg-brand-black text-white px-3 py-1 font-black shadow-neo-sm uppercase text-[9px] border-2 border-brand-black">List Service</button>
                        </div>
                        {servicesData.map(s => (
                            <div key={s.id} className="bg-white p-4 neo-card border-4 border-brand-black">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-black uppercase text-brand-black">{s.title}</h4>
                                    <span className="bg-brand-cyan text-white border-2 border-brand-black text-[8px] font-black uppercase px-2 py-1">{s.category}</span>
                                </div>
                                <p className="text-[10px] text-gray-700 font-bold mb-3">{s.description}</p>
                                <p className="text-[10px] font-bold text-gray-500 uppercase">Provider: {s.providerHouseId}</p>
                                <p className="text-[10px] font-bold mt-1 bg-brand-pink border-2 border-brand-black px-2 py-2 inline-block shadow-neo-sm">Contact: {s.phone}</p>
                            </div>
                        ))}
                        {servicesData.length === 0 && <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest text-center py-6">No services listed.</p>}
                    </div>
                )}

                {viewTab === 'kids' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center border-b-4 border-brand-black pb-2 mb-4">
                            <h3 className="font-black text-brand-black uppercase text-sm">My Madrasa Kids</h3>
                            <button onClick={()=>setShowAddKid(true)} className="bg-brand-black text-brand-lime px-3 py-1 font-black shadow-neo-sm uppercase text-[9px] border-2 border-brand-black">Enroll Child</button>
                        </div>
                        {kidsData.map(k => (
                            <div key={k.id} className="bg-white p-4 border-4 border-brand-black flex gap-3">
                                <div className="flex-1">
                                    <h4 className="font-black uppercase text-brand-black mb-1 text-sm">{k.name}</h4>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase">{k.age} yrs • {k.gender} • DOB: {k.dob}</p>
                                    {k.allergies && <p className="text-[9px] font-bold mt-2 bg-red-100 text-red-700 border-l-4 border-red-500 p-1">Allergies: {k.allergies}</p>}
                                    <p className="text-[9px] font-bold text-gray-700 mt-2 p-1 border-2 border-brand-black inline-block bg-gray-50">ICE: {k.iceName} - {k.icePhone}</p>
                                </div>
                            </div>
                        ))}
                        {kidsData.length === 0 && <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest text-center py-6">No children enrolled.</p>}
                        
                        <div className="bg-sky-50 border-4 border-brand-black p-4 mt-6">
                            <h4 className="font-black text-brand-black uppercase text-[10px] mb-2 border-b-2 border-brand-black pb-1">Madrasa Passes</h4>
                            <p className="text-[10px] font-bold text-gray-700 mb-4">You can issue a guest pass specific to Madrasa access from the Access tab. It will be valid for 6 hours.</p>
                            <button onClick={()=> { setViewTab('auth'); issueCode('Madrasa'); }} className="w-full bg-brand-black text-white font-black text-[10px] p-2 border-2 border-brand-black uppercase shadow-neo-sm">Generate Madrasa Pass</button>
                        </div>
                    </div>
                )}
                
                {viewTab === 'tickets' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center border-b-4 border-brand-black pb-2 mb-4">
                            <h3 className="font-black text-brand-black uppercase text-sm flex items-center gap-2"><Wrench className="w-5 h-5"/> Fix-It Tickets</h3>
                            <button onClick={()=>setShowAddTicket(true)} className="bg-brand-black text-white px-3 py-1 font-black shadow-neo-sm uppercase text-[9px] border-2 border-brand-black">Report Issue</button>
                        </div>
                        {ticketsData.map(t => (
                            <div key={t.id} className="bg-white p-4 neo-card border-4 border-brand-black">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-black uppercase text-brand-black text-sm">{t.title}</h4>
                                    <span className={clsx("text-white border-2 border-brand-black text-[8px] font-black uppercase px-2 py-1", t.status === 'pending' ? 'bg-orange-500' : t.status === 'resolved' ? 'bg-brand-lime text-brand-black' : 'bg-brand-cyan')}>{t.status}</span>
                                </div>
                                <p className="text-[10px] font-bold bg-brand-gray px-2 py-1 border-2 border-brand-black inline-block mb-3 uppercase shadow-neo-sm">{t.category}</p>
                                <p className="text-[10px] text-gray-700 font-bold mb-1 border-l-4 border-brand-black pl-2 py-1">{t.description}</p>
                                <p className="text-[8px] text-gray-400 font-black uppercase mt-3 tracking-widest">{formatDate(t.createdAt?.toDate())}</p>
                            </div>
                        ))}
                        {ticketsData.length === 0 && <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest text-center py-6">No active tickets.</p>}
                    </div>
                )}
            </div>

            {/* Modals */}
            {showChangePin && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[250] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-sm p-8 neo-card border-4 relative space-y-4">
                        <h3 className="text-lg font-black text-brand-black uppercase border-b-4 border-brand-black pb-2">Change Security PIN</h3>
                        <div className="space-y-4">
                            <div className="relative"><input type={showOld ? 'text' : 'password'} maxLength={6} placeholder="Old PIN" value={oldPin} onChange={e=>setOldPin(e.target.value)} className="w-full p-3 neo-input text-center tracking-widest"/><button onClick={()=>setShowOld(!showOld)} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-black">{showOld ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}</button></div>
                            <div className="relative"><input type={showNew ? 'text' : 'password'} maxLength={6} placeholder="New PIN" value={newPin} onChange={e=>setNewPin(e.target.value)} className="w-full p-3 neo-input text-center tracking-widest"/><button onClick={()=>setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-black">{showNew ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}</button></div>
                            <div className="relative"><input type={showConf ? 'text' : 'password'} maxLength={6} placeholder="Confirm New PIN" value={confPin} onChange={e=>setConfPin(e.target.value)} className="w-full p-3 neo-input text-center tracking-widest"/><button onClick={()=>setShowConf(!showConf)} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-black">{showConf ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}</button></div>
                        </div>
                        <div className="flex gap-3 pt-4">
                            <button onClick={()=>setShowChangePin(false)} className="flex-1 font-bold text-gray-500 uppercase text-[10px] hover:text-brand-black">Cancel</button>
                            <button onClick={handleChangePin} className="flex-[2] neo-btn-primary py-3 shadow-neo active:translate-y-1 active:shadow-none">Update PIN</button>
                        </div>
                    </div>
                </div>
            )}

            {showLS && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[250] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-sm p-8 neo-card border-4 space-y-4">
                        <div className="bg-brand-pink border-4 border-brand-black p-2 mb-2 text-center shadow-neo-sm">
                            <h3 className="text-lg font-black uppercase text-brand-black">Long-Stay Clearance</h3>
                        </div>
                        <input className="w-full p-3 neo-input text-xs" placeholder="Guest Name" value={lsName} onChange={e=>setLsName(e.target.value)} />
                        <div><label className="text-[9px] font-black uppercase text-brand-black block ml-1 mb-1">Expiry Date</label><input type="date" className="w-full p-3 neo-input text-xs" value={lsDate} onChange={e=>setLsDate(e.target.value)} /></div>
                        <div className="flex gap-3 pt-4"><button onClick={()=>setShowLS(false)} className="flex-1 font-bold text-gray-500 uppercase text-[10px] hover:text-brand-black">Cancel</button><button onClick={handleLongStay} className="flex-[2] neo-btn-primary py-3 shadow-neo active:translate-y-1 active:shadow-none">Activate</button></div>
                    </div>
                </div>
            )}

            {showGatePass && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[250] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-sm p-8 neo-card border-4 space-y-4">
                        <div className="bg-brand-lime border-4 border-brand-black p-2 mb-2 text-center shadow-neo-sm">
                            <h3 className="text-lg font-black uppercase text-brand-black">Exit Gate Pass</h3>
                        </div>
                        <input className="w-full p-3 neo-input text-xs" placeholder="Mover/Item description" value={gpName} onChange={e=>setGpName(e.target.value)} />
                        <textarea className="w-full p-3 neo-input text-xs h-24" placeholder="Instructions..." value={gpNote} onChange={e=>setGpNote(e.target.value)}></textarea>
                        <div className="flex gap-3 pt-4"><button onClick={()=>setShowGatePass(false)} className="flex-1 font-bold text-gray-500 uppercase text-[10px] hover:text-brand-black">Cancel</button><button onClick={handleGatePass} className="flex-[2] neo-btn-primary py-3 shadow-neo active:translate-y-1 active:shadow-none">Issue Pass</button></div>
                    </div>
                </div>
            )}

            {showAddStaff && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[250] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-sm p-8 neo-card border-4 space-y-4">
                        <div className="bg-brand-cyan border-4 border-brand-black p-2 mb-2 text-center shadow-neo-sm text-white">
                            <h3 className="text-lg font-black uppercase">Assign Staff</h3>
                        </div>
                        <input className="w-full p-3 neo-input text-xs" placeholder="Staff Full Name" value={staffFn} onChange={e=>setStaffFn(e.target.value)} />
                        <input className="w-full p-3 neo-input text-xs" placeholder="Role (e.g. Driver, Chef)" value={staffRole} onChange={e=>setStaffRole(e.target.value)} />
                        <input className="w-full p-3 neo-input text-xs font-mono" inputMode="numeric" placeholder="Phone Number" value={staffPhone} onChange={e=>setStaffPhone(e.target.value)} />
                        
                        <div className="bg-gray-50 border-2 border-brand-black p-3 text-[9px] font-bold text-gray-600">
                            Upon creating, a unique Invite Code will be generated. The staff member must use this code to register and complete their profile for your approval.
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button onClick={()=>setShowAddStaff(false)} className="flex-1 font-bold text-gray-500 uppercase text-[10px] hover:text-brand-black">Cancel</button>
                            <button onClick={handleAddStaff} className="flex-[2] neo-btn-primary py-3 shadow-neo active:translate-y-1 active:shadow-none">Generate Invite</button>
                        </div>
                    </div>
                </div>
            )}

            {reviewStaff && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[250] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-md p-6 neo-card border-4 max-h-[85vh] overflow-y-auto">
                        <h3 className="text-lg font-black italic border-b-4 border-brand-black text-brand-black pb-2 mb-4 uppercase">Profile / Identity</h3>
                        
                        <div className="space-y-4">
                            <div className="flex gap-4 items-center">
                                {reviewStaff.passportPhoto ? (
                                    <img src={reviewStaff.passportPhoto} alt="Passport" className="w-24 h-24 object-cover border-4 border-brand-black" />
                                ) : (
                                    <div className="w-24 h-24 bg-gray-200 border-4 border-brand-black flex items-center justify-center text-xs font-bold text-gray-500 text-center p-2">NO PHOTO</div>
                                )}
                                <div>
                                    <p className="font-black text-lg uppercase text-brand-black">{reviewStaff.firstName}</p>
                                    <p className="text-xs font-bold text-gray-500">{reviewStaff.staffRole} • {reviewStaff.phone}</p>
                                    <p className="text-[10px] font-bold mt-1">DOB: {reviewStaff.dob} ({reviewStaff.gender})</p>
                                    <p className="text-[10px] font-bold mt-1 text-gray-600">Address: {reviewStaff.address}</p>
                                </div>
                            </div>
                            
                            <div className="bg-brand-gray p-3 border-2 border-brand-black">
                                <p className="text-[9px] font-black uppercase text-brand-black mb-1">National IDs</p>
                                <p className="font-mono text-sm tracking-widest text-brand-black">NIN: {reviewStaff.nin || 'N/A'} | BVN: {reviewStaff.bvn || 'N/A'}</p>
                            </div>

                            {reviewStaff.idDocument && (
                                <div>
                                    <p className="text-[9px] font-black uppercase mb-1 text-gray-500">Staff ID Document</p>
                                    <img src={reviewStaff.idDocument} alt="Staff ID" className="w-full h-auto max-h-48 object-contain border-4 border-brand-black" />
                                </div>
                            )}

                            <div className="border-t-4 border-brand-black pt-4">
                                <p className="text-[10px] font-black uppercase text-brand-black bg-brand-pink inline-block px-1 border-2 border-brand-black mb-2">Guarantor / NOK</p>
                                <p className="text-sm font-bold">{reviewStaff.nextOfKin?.name || 'N/A'}</p>
                                <p className="text-xs font-bold text-gray-600">{reviewStaff.nextOfKin?.relationship} • {reviewStaff.nextOfKin?.phone}</p>
                            </div>

                            {reviewStaff.nextOfKin?.idDocument && (
                                <div>
                                    <p className="text-[9px] font-black uppercase mb-1 text-gray-500">Guarantor ID</p>
                                    <img src={reviewStaff.nextOfKin.idDocument} alt="Guarantor ID" className="w-full h-auto max-h-48 object-contain border-4 border-brand-black" />
                                </div>
                            )}
                            
                            {reviewStaff.status === 'approved' && (
                                <div className="border-t-4 border-brand-black pt-4 space-y-4">
                                    <div>
                                        <label className="text-[9px] font-black uppercase mb-1 block">Comment on Staff Profile</label>
                                        <div className="flex gap-2">
                                            <input className="flex-1 p-2 neo-input text-[10px]" value={staffComment} onChange={e=>setStaffComment(e.target.value)} placeholder="Visible to other residents in directory" />
                                            <button onClick={()=>handleSaveComment(reviewStaff.id)} className="px-3 bg-brand-lime border-2 border-brand-black text-[9px] font-black uppercase shadow-neo-sm active:translate-y-1 hover:bg-lime-400">Save</button>
                                        </div>
                                    </div>
                                    <div className="bg-blue-50 p-3 border-2 border-brand-black">
                                        <label className="text-[9px] font-black uppercase mb-2 block">Generate Gate Pass (For {reviewStaff.firstName})</label>
                                        <div className="flex gap-2">
                                            <select value={staffPassHours} onChange={e=>setStaffPassHours(e.target.value)} className="p-2 border-2 border-brand-black text-[10px] font-black bg-white flex-1 outline-none">
                                                <option value="12">12 Hours Expires</option>
                                                <option value="24">24 Hours Expires</option>
                                                <option value="72">3 Days Expires</option>
                                            </select>
                                            <button onClick={()=>handleStaffGatePass(reviewStaff)} className="px-3 bg-brand-black text-white border-2 border-brand-black text-[9px] font-black uppercase shadow-neo-sm hover:bg-gray-800">Generate Pass</button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-2 mt-6">
                            {reviewStaff.status === 'pending_resident_approval' ? (
                                <div className="flex gap-3 mt-4 border-t-4 border-brand-black pt-4">
                                    <button onClick={()=>setReviewStaff(null)} className="flex-1 font-bold text-gray-500 uppercase text-[10px] hover:text-brand-black bg-gray-100 border-2 border-brand-black p-2">Close</button>
                                    <button onClick={()=>{ handleApproveStaff(reviewStaff.id); setReviewStaff(null); }} className="flex-[2] bg-brand-black text-brand-lime border-4 border-brand-black font-black uppercase text-[12px] shadow-neo hover:bg-gray-800 active:translate-y-1 active:shadow-none p-3">Approve Staff</button>
                                </div>
                            ) : (
                                <div className="flex gap-3 justify-between items-center mt-2 border-t-4 border-brand-black pt-4">
                                    <button onClick={()=>{ handleUnapproveStaff(reviewStaff.id); setReviewStaff(null); }} className="text-[9px] font-bold text-red-500 uppercase hover:underline">Revoke Approval</button>
                                    <button onClick={()=>setReviewStaff(null)} className="bg-brand-black text-white border-4 border-brand-black font-black uppercase text-[12px] shadow-neo px-6 py-2 hover:bg-gray-800 active:translate-y-1 active:shadow-none">Close Window</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {showAddSvc && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[250] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-sm p-6 neo-card border-4 border-brand-black max-h-[90vh] overflow-y-auto">
                        <h3 className="font-black italic uppercase text-brand-black border-b-4 border-brand-black pb-2 mb-4">List a Service</h3>
                        <form onSubmit={handleAddService} className="space-y-4">
                            <div><label className="text-[10px] font-bold uppercase text-brand-black block mb-1">Service Title</label><input required value={svcTitle} onChange={e=>setSvcTitle(e.target.value)} className="w-full p-2 neo-input text-sm" placeholder="e.g. Plumbing Services"/></div>
                            <div><label className="text-[10px] font-bold uppercase text-brand-black block mb-1">Description</label><textarea required value={svcDesc} onChange={e=>setSvcDesc(e.target.value)} className="w-full p-2 neo-input text-sm" placeholder="Details about your offering..." rows={3}/></div>
                            <div>
                                <label className="text-[10px] font-bold uppercase text-brand-black block mb-1">Category</label>
                                <select value={svcCat} onChange={e=>setSvcCat(e.target.value)} className="w-full p-2 neo-input text-sm uppercase">
                                    <option>General</option>
                                    <option>Repairs</option>
                                    <option>Food & Catering</option>
                                    <option>Tutoring</option>
                                    <option>Others</option>
                                </select>
                            </div>
                            <div><label className="text-[10px] font-bold uppercase text-brand-black block mb-1">Contact Phone</label><input required type="tel" value={svcPhone} onChange={e=>setSvcPhone(e.target.value)} className="w-full p-2 neo-input text-sm font-mono"/></div>
                            <div className="flex gap-2 pt-2">
                                <button type="button" onClick={()=>setShowAddSvc(false)} className="w-1/3 bg-gray-200 text-brand-black border-2 border-brand-black p-2 text-[10px] font-black uppercase shadow-neo-sm">Cancel</button>
                                <button type="submit" className="flex-1 bg-brand-black text-brand-lime border-2 border-brand-black p-2 text-[11px] font-black uppercase shadow-neo-sm">List Service</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showAddKid && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[250] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-sm p-6 neo-card border-4 border-brand-black max-h-[90vh] overflow-y-auto">
                        <h3 className="font-black italic uppercase text-brand-black border-b-4 border-brand-black pb-2 mb-4">Enroll Child</h3>
                        <form onSubmit={handleEnrollKid} className="space-y-3">
                            <div><label className="text-[10px] font-bold uppercase text-brand-black block mb-1">Full Name</label><input required value={kidName} onChange={e=>setKidName(e.target.value)} className="w-full p-2 neo-input text-sm"/></div>
                            <div className="grid grid-cols-2 gap-2">
                                <div><label className="text-[10px] font-bold uppercase text-brand-black block mb-1">Age</label><input required type="number" value={kidAge} onChange={e=>setKidAge(e.target.value)} className="w-full p-2 neo-input text-sm"/></div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-brand-black block mb-1">Gender</label>
                                    <select value={kidGender} onChange={e=>setKidGender(e.target.value)} className="w-full p-2 neo-input text-sm uppercase">
                                        <option>Male</option><option>Female</option>
                                    </select>
                                </div>
                            </div>
                            <div><label className="text-[10px] font-bold uppercase text-brand-black block mb-1">Date of Birth</label><input required type="date" value={kidDob} onChange={e=>setKidDob(e.target.value)} className="w-full p-2 neo-input text-sm"/></div>
                            <div><label className="text-[10px] font-bold uppercase text-brand-black block mb-1">Allergies / Special Prep</label><input value={kidAllergies} onChange={e=>setKidAllergies(e.target.value)} className="w-full p-2 neo-input text-sm" placeholder="Optional"/></div>
                            <div className="bg-sky-50 p-2 border-2 border-brand-black mt-2">
                                <h4 className="font-black uppercase text-[10px] mb-2 text-brand-black">In Case of Emergency</h4>
                                <div className="space-y-2">
                                    <input required value={kidIceName} onChange={e=>setKidIceName(e.target.value)} className="w-full py-1 px-2 border-2 border-brand-black text-xs" placeholder="ICE Contact Name"/>
                                    <input required type="tel" value={kidIcePhone} onChange={e=>setKidIcePhone(e.target.value)} className="w-full py-1 px-2 border-2 border-brand-black text-xs font-mono" placeholder="ICE Contact Phone"/>
                                </div>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button type="button" onClick={()=>setShowAddKid(false)} className="w-1/3 bg-gray-200 text-brand-black border-2 border-brand-black p-2 text-[10px] font-black uppercase shadow-neo-sm">Cancel</button>
                                <button type="submit" className="flex-1 bg-brand-black text-white border-2 border-brand-black p-2 text-[11px] font-black uppercase shadow-neo-sm">Enroll Child</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showAddTicket && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[250] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-sm p-6 neo-card border-4 border-brand-black max-h-[90vh] overflow-y-auto">
                        <h3 className="font-black italic uppercase text-brand-black border-b-4 border-brand-black pb-2 mb-4">Report an Issue</h3>
                        <form onSubmit={handleAddTicket} className="space-y-4">
                            <div><label className="text-[10px] font-bold uppercase text-brand-black block mb-1">Issue Title</label><input required value={ticketTitle} onChange={e=>setTicketTitle(e.target.value)} className="w-full p-2 neo-input text-sm" placeholder="e.g. Broken Streetlight"/></div>
                            <div>
                                <label className="text-[10px] font-bold uppercase text-brand-black block mb-1">Category</label>
                                <select value={ticketCat} onChange={e=>setTicketCat(e.target.value)} className="w-full p-2 neo-input text-sm uppercase">
                                    <option>Electrical</option>
                                    <option>Plumbing</option>
                                    <option>Estate Grounds</option>
                                    <option>Security</option>
                                    <option>Waste Management</option>
                                    <option>Others</option>
                                </select>
                            </div>
                            <div><label className="text-[10px] font-bold uppercase text-brand-black block mb-1">Description</label><textarea required value={ticketDesc} onChange={e=>setTicketDesc(e.target.value)} className="w-full p-2 neo-input text-sm" placeholder="Provide details about the issue..." rows={3}/></div>
                            <div className="flex gap-2 pt-2">
                                <button type="button" onClick={()=>setShowAddTicket(false)} className="w-1/3 bg-gray-200 text-brand-black border-2 border-brand-black p-2 text-[10px] font-black uppercase shadow-neo-sm">Cancel</button>
                                <button type="submit" className="flex-1 bg-brand-black text-brand-lime border-2 border-brand-black p-2 text-[11px] font-black uppercase shadow-neo-sm">Submit Ticket</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
