import React, { useState, useEffect } from 'react';
import { Settings, LogOut, Clock, Truck, Calendar, MessageSquare, Copy, Trash2, Eye, EyeOff, AlertTriangle, Wrench, Bell, UserPlus, Info } from 'lucide-react';
import { useApp } from '../lib/context';
import ThemeToggle from './ThemeToggle';
import { db, appId } from '../lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import { generateCode, formatDate, filterItemsByDate, hashPin } from '../lib/utils';
import clsx from 'clsx';

export default function Resident() {
    const { profile, setProfile, setView, notify } = useApp();
    const [viewTab, setViewTab] = useState<'dash' | 'auth' | 'hist' | 'bc' | 'staff' | 'dir' | 'svcs' | 'kids' | 'tickets' | 'polls'>('dash');
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

    const handleAddService = async (e: any) => {
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

    const handleEnrollKid = async (e: any) => {
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

    const handleAddTicket = async (e: any) => {
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
        <div className="max-w-xl mx-auto min-h-screen pb-24 animate-fade-in relative bg-stone-50/50">
            <header className="bg-white/90 backdrop-blur border-b border-brand-gray px-5 py-4 mb-2 flex justify-between items-center sticky top-0 z-20">
                <div className="flex items-center gap-3 w-full">
                    <div className="bg-emerald-100 text-emerald-800 w-11 h-11 rounded-full flex items-center justify-center font-bold text-lg">{profile.firstName[0]}</div>
                    <div className="flex flex-col flex-1">
                        <h2 className="font-semibold text-brand-black leading-tight">{profile.firstName} {profile.lastName}</h2>
                        <p className="text-[10px] font-medium text-emerald-700 uppercase tracking-wider">{profile.identifier}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <ThemeToggle />
                    <button onClick={handleTriggerSOS} className={clsx("p-2 rounded-full transition-all flex-shrink-0", isSosActive ? "bg-red-500 text-white animate-pulse shadow-md shadow-red-500/30" : "bg-red-50 text-red-500 hover:bg-red-100")} title="TRIGGER SOS">
                        <AlertTriangle className="w-5 h-5" />
                    </button>
                    <button onClick={() => setShowChangePin(true)} className="p-2 rounded-full bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0"><Settings className="w-5 h-5" /></button>
                    <button onClick={() => { setProfile(null); setView('landing'); }} className="p-2 rounded-full bg-gray-50 text-gray-600 hover:bg-red-50 hover:text-red-500 transition-colors flex-shrink-0"><LogOut className="w-5 h-5" /></button>
                </div>
            </header>

            {profile.duesStatus !== 'paid' && (
                <div className="bg-red-50 border border-red-200 p-3 mx-4 rounded-xl shadow-sm text-center mb-4 space-y-1">
                    <AlertTriangle className="w-5 h-5 text-red-500 mx-auto animate-pulse" />
                    <h3 className="font-semibold text-red-800 text-xs tracking-wide uppercase">Estate Dues Outstanding</h3>
                    <p className="text-[10px] text-red-700/80 font-medium">Please pay your annual estate dues to ensure uninterrupted access.</p>
                </div>
            )}

            <div className="sticky top-[77px] z-10 bg-stone-50/90 backdrop-blur pb-3 pt-1 px-4 mb-4">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                    <button onClick={() => setViewTab('dash')} className={clsx("px-4 py-2 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors", viewTab === 'dash' ? "bg-emerald-900 text-white" : "bg-white text-gray-600 border border-gray-200 shadow-sm")}>Overview</button>
                    <button onClick={() => setViewTab('auth')} className={clsx("px-4 py-2 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors", viewTab === 'auth' ? "bg-emerald-900 text-white" : "bg-white text-gray-600 border border-gray-200 shadow-sm")}>Access</button>
                    <button onClick={() => setViewTab('tickets')} className={clsx("px-4 py-2 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors", viewTab === 'tickets' ? "bg-emerald-900 text-white" : "bg-white text-gray-600 border border-gray-200 shadow-sm")}>Fix It</button>
                    <button onClick={() => setViewTab('polls')} className={clsx("px-4 py-2 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors", viewTab === 'polls' ? "bg-emerald-900 text-white" : "bg-white text-gray-600 border border-gray-200 shadow-sm")}>Townhall</button>
                    <button onClick={() => setViewTab('bc')} className={clsx("px-4 py-2 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors", viewTab === 'bc' ? "bg-emerald-900 text-white" : "bg-white text-gray-600 border border-gray-200 shadow-sm")}>Notices</button>
                    <button onClick={() => setViewTab('hist')} className={clsx("px-4 py-2 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors", viewTab === 'hist' ? "bg-emerald-900 text-white" : "bg-white text-gray-600 border border-gray-200 shadow-sm")}>Logbook</button>
                    <button onClick={() => setViewTab('dir')} className={clsx("px-4 py-2 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors", viewTab === 'dir' ? "bg-emerald-900 text-white" : "bg-white text-gray-600 border border-gray-200 shadow-sm")}>Directory</button>
                    <button onClick={() => setViewTab('svcs')} className={clsx("px-4 py-2 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors", viewTab === 'svcs' ? "bg-emerald-900 text-white" : "bg-white text-gray-600 border border-gray-200 shadow-sm")}>Market</button>
                    <button onClick={() => setViewTab('staff')} className={clsx("px-4 py-2 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors", viewTab === 'staff' ? "bg-emerald-900 text-white" : "bg-white text-gray-600 border border-gray-200 shadow-sm")}>My Staff</button>
                    <button onClick={() => setViewTab('kids')} className={clsx("px-4 py-2 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors", viewTab === 'kids' ? "bg-emerald-900 text-white" : "bg-white text-gray-600 border border-gray-200 shadow-sm")}>Madrasa</button>
                </div>
            </div>
            
            <div className="px-4">
                {viewTab !== 'dash' && (
                    <div className="flex items-center gap-2 mb-4">
                        <select value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="bg-white text-xs font-medium text-gray-700 py-2.5 px-3 rounded-xl border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
                            <option value="all">All Time</option>
                            <option value="today">Today</option>
                            <option value="week">This Week</option>
                            <option value="month">This Month</option>
                        </select>
                    </div>
                )}



            <div className="space-y-6">
                {viewTab === 'dash' && (
                    <div className="space-y-6 animate-fade-in">
                        {/* Quick Action Grid */}
                        <div className="grid grid-cols-3 gap-3">
                            <button onClick={() => setViewTab('auth')} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center gap-2 hover:bg-emerald-50 transition-colors group">
                                <div className="bg-emerald-100 p-2.5 rounded-xl text-emerald-700 group-hover:scale-110 transition-transform">
                                    <UserPlus className="w-5 h-5" />
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600">Visitor</span>
                            </button>
                            <button onClick={() => { setViewTab('tickets'); setShowAddTicket(true); }} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center gap-2 hover:bg-amber-50 transition-colors group">
                                <div className="bg-amber-100 p-2.5 rounded-xl text-amber-700 group-hover:scale-110 transition-transform">
                                    <Wrench className="w-5 h-5" />
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600">Fix It</span>
                            </button>
                            <button onClick={() => setViewTab('bc')} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center gap-2 hover:bg-sky-50 transition-colors group">
                                <div className="bg-sky-100 p-2.5 rounded-xl text-sky-700 group-hover:scale-110 transition-transform">
                                    <Bell className="w-5 h-5" />
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600">Notices</span>
                            </button>
                        </div>

                        {/* Recent Community Notice */}
                        {noticesData.length > 0 && (
                            <div className="bg-emerald-900 text-white rounded-[2rem] p-6 shadow-xl relative overflow-hidden">
                                <div className="absolute -right-10 -top-10 bg-white/10 w-40 h-40 rounded-full blur-3xl"></div>
                                <div className="flex items-center gap-2 mb-4">
                                    <Bell className="w-4 h-4 text-emerald-300" />
                                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300">Latest Notice</span>
                                </div>
                                <h3 className="text-lg font-semibold mb-2 leading-tight">{noticesData.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))[0].title}</h3>
                                <p className="text-xs text-emerald-50/80 leading-relaxed mb-4 line-clamp-2">{noticesData.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))[0].content}</p>
                                <button onClick={() => setViewTab('bc')} className="text-[10px] font-black uppercase tracking-widest bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors">Read More</button>
                            </div>
                        )}

                        {/* Stats Section */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600">
                                        <Clock className="w-4 h-4" />
                                    </div>
                                    <span className="text-2xl font-bold text-brand-black">{activeCount}</span>
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Active Visitor Passes</p>
                            </div>
                            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="bg-amber-50 p-2 rounded-lg text-amber-600">
                                        <AlertTriangle className="w-4 h-4" />
                                    </div>
                                    <span className="text-2xl font-bold text-brand-black">{ticketsData.filter(t => t.status === 'pending').length}</span>
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Open Tickets</p>
                            </div>
                        </div>

                        {/* Active Pass Preview Snippet */}
                        {filteredCodes.filter(c => c.status === 'active').length > 0 && (
                            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="text-[11px] font-black uppercase tracking-widest text-gray-500">Latest Active Pass</h4>
                                    <button onClick={() => setViewTab('auth')} className="text-[10px] font-bold text-emerald-700">View All</button>
                                </div>
                                {filteredCodes.filter(c => c.status === 'active').sort((a,b) => b.createdAt?.seconds - a.createdAt?.seconds).slice(0, 1).map(c => (
                                    <div key={c.id} className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-emerald-50 w-10 h-10 rounded-xl flex items-center justify-center font-mono font-bold text-emerald-700">{c.code[0]}</div>
                                            <div>
                                                <p className="text-xs font-bold text-brand-black">{c.code}</p>
                                                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">{c.targetName}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => shareCode(c.id, 'cp')} className="p-2 text-gray-400 hover:text-emerald-700 transition-colors">
                                            <Copy className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        {!isSosActive && (
                            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5 flex items-center gap-4">
                                <div className="bg-white p-3 rounded-xl text-rose-500 shadow-sm">
                                    <AlertTriangle className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-xs font-bold text-rose-900 uppercase tracking-tight">Security SOS</h4>
                                    <p className="text-[10px] text-rose-800/70 font-medium">In case of emergency, trigger the silent alarm.</p>
                                </div>
                                <button onClick={handleTriggerSOS} className="bg-rose-500 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-500/30 active:scale-95 transition-all">Trigger</button>
                            </div>
                        )}
                    </div>
                )}
                {viewTab === 'polls' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center pb-2 mb-2 border-b border-gray-200">
                            <h3 className="font-semibold text-brand-black text-sm uppercase tracking-wide">Townhall Polls</h3>
                        </div>
                        {pollsData.map(p => {
                            const hasVoted = p.voters?.includes(profile.id);
                            const total = (p.votesA || 0) + (p.votesB || 0);
                            const pctA = total ? Math.round(((p.votesA || 0)/total)*100) : 0;
                            const pctB = total ? Math.round(((p.votesB || 0)/total)*100) : 0;
                            
                            return (
                            <div key={p.id} className="bg-white p-5 neo-card">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-semibold text-brand-black text-[15px]">{p.title}</h4>
                                    <span className={clsx("text-[9px] font-bold uppercase px-2 py-0.5 rounded-full text-white", p.status === 'open' ? 'bg-emerald-500' : 'bg-gray-400')}>{p.status}</span>
                                </div>
                                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-5">Total Votes: {total}</p>
                                
                                {hasVoted || p.status === 'closed' ? (
                                    <div className="space-y-3">
                                        <div className="relative h-11 rounded-lg bg-gray-100 flex items-center overflow-hidden">
                                            <div className="absolute top-0 left-0 bottom-0 bg-teal-500/20" style={{width: `${pctA}%`}}></div>
                                            <span className="relative z-10 px-3 font-semibold text-xs text-teal-900">{p.optA} ({pctA}%)</span>
                                        </div>
                                        <div className="relative h-11 rounded-lg bg-gray-100 flex items-center overflow-hidden">
                                            <div className="absolute top-0 left-0 bottom-0 bg-emerald-500/20" style={{width: `${pctB}%`}}></div>
                                            <span className="relative z-10 px-3 font-semibold text-xs text-emerald-900">{p.optB} ({pctB}%)</span>
                                        </div>
                                        {hasVoted && <p className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded inline-block mt-2">Vote Recorded</p>}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-3">
                                        <button onClick={()=>handleVote(p.id, 'A')} className="w-full bg-teal-50 text-teal-700 border border-teal-200 rounded-xl p-3 font-semibold text-xs shadow-sm hover:bg-teal-100 transition-colors">{p.optA}</button>
                                        <button onClick={()=>handleVote(p.id, 'B')} className="w-full bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl p-3 font-semibold text-xs shadow-sm hover:bg-emerald-100 transition-colors">{p.optB}</button>
                                    </div>
                                )}
                            </div>
                        )})}
                        {pollsData.length === 0 && <p className="text-xs text-gray-400 font-medium text-center py-6">No active polls.</p>}
                    </div>
                )}
                {viewTab === 'auth' && (
                    <>
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex flex-col items-center justify-center shadow-sm">
                                <span className="text-2xl font-bold text-emerald-900">{activeCount}</span>
                                <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider mt-1">Active Now</span>
                            </div>
                            <div className="bg-teal-50 p-4 rounded-xl border border-teal-100 flex flex-col items-center justify-center shadow-sm">
                                <span className="text-2xl font-bold text-teal-900">{historyCount}</span>
                                <span className="text-[9px] font-bold text-teal-700 uppercase tracking-wider mt-1">History</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <button onClick={() => issueCode('Guest')} className="bg-white hover:bg-emerald-50 text-emerald-900 p-4 rounded-xl border border-emerald-100 shadow-sm transition-all flex flex-col items-center gap-2 group">
                                <span className="bg-emerald-100 p-2.5 rounded-full group-hover:bg-emerald-200 transition-colors">
                                    <Clock className="w-5 h-5 text-emerald-700" />
                                </span>
                                <span className="font-semibold text-xs tracking-wide">Guest</span>
                            </button>
                            <button onClick={() => issueCode('Delivery')} className="bg-white hover:bg-teal-50 text-teal-900 p-4 rounded-xl border border-teal-100 shadow-sm transition-all flex flex-col items-center gap-2 group">
                                <span className="bg-teal-100 p-2.5 rounded-full group-hover:bg-teal-200 transition-colors">
                                    <Truck className="w-5 h-5 text-teal-700" />
                                </span>
                                <span className="font-semibold text-xs tracking-wide">Delivery</span>
                            </button>
                            <button onClick={() => setShowLS(true)} className="bg-white hover:bg-stone-50 text-stone-700 p-4 rounded-xl border border-stone-200 shadow-sm transition-all flex flex-col items-center gap-2 group">
                                <span className="bg-stone-100 p-2.5 rounded-full group-hover:bg-stone-200 transition-colors">
                                    <Calendar className="w-5 h-5 text-stone-600" />
                                </span>
                                <span className="font-semibold text-xs tracking-wide">Long-Stay</span>
                            </button>
                            <button onClick={() => setShowGatePass(true)} className="bg-white hover:bg-rose-50 text-rose-700 p-4 rounded-xl border border-rose-100 shadow-sm transition-all flex flex-col items-center gap-2 group">
                                <span className="bg-rose-100 p-2.5 rounded-full group-hover:bg-rose-200 transition-colors">
                                    <LogOut className="w-5 h-5 text-rose-600" />
                                </span>
                                <span className="font-semibold text-xs tracking-wide">Exit Pass</span>
                            </button>
                            <button onClick={() => issueCode('Jumat')} className="bg-emerald-600 text-white p-4 rounded-xl shadow-md transition-all flex flex-col items-center justify-center gap-1 hover:bg-emerald-700 col-span-2">
                                <span className="font-semibold text-sm tracking-wide text-center">Jumat Guest Pass (3hrs)</span>
                                <span className="text-[10px] font-medium tracking-wide opacity-80 text-center">Valid only on Fridays (1pm - 3pm)</span>
                            </button>
                        </div>
                        <h3 className="font-semibold text-brand-black uppercase text-sm border-b border-gray-200 pb-2 mb-4 tracking-wide">Active Passes</h3>
                        <div className="space-y-4">
                            {filteredCodes.filter(c => c.status === 'active').sort((a,b) => b.createdAt?.seconds - a.createdAt?.seconds).map(c => (
                                <div key={c.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative">
                                    <div className="flex justify-between items-start mb-4">
                                        <span className={clsx("text-[9px] font-bold uppercase px-2.5 py-1 rounded-full", c.type === 'Gate-Pass' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800')}>{c.type}</span>
                                        <button onClick={() => revokeCode(c.id)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full p-1.5 transition-all"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                    <h3 className="text-4xl font-mono font-bold text-brand-black mb-1 tracking-widest text-center py-2">{c.code}</h3>
                                    <p className="text-[11px] font-medium text-gray-500 uppercase mb-4 text-center">{c.targetName}</p>
                                    {c.note && <p className="text-xs bg-stone-50 text-stone-700 p-3 rounded-lg border border-stone-200 mb-4 font-medium italic">"{c.note}"</p>}
                                    <div className="flex gap-2">
                                        {exitNoteCodeId === c.id ? (
                                            <div className="w-full space-y-2">
                                                <input placeholder="Add exit/reason comment" value={exitNoteText} onChange={e=>setExitNoteText(e.target.value)} className="w-full text-xs p-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none" />
                                                <div className="flex gap-2">
                                                    <button onClick={()=>setExitNoteCodeId(null)} className="flex-1 text-[10px] uppercase font-semibold py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
                                                    <button onClick={()=>handleRevokePass(c.id)} className="flex-1 bg-red-500 text-white text-[10px] uppercase font-semibold py-2.5 rounded-lg hover:bg-red-600 shadow-sm">Confirm Deactivate</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <button onClick={() => shareCode(c.id, 'wa')} className="flex-[2] bg-emerald-600 text-white py-2.5 rounded-lg font-semibold uppercase text-[10px] flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-sm transition-colors">Share <MessageSquare className="w-3.5 h-3.5" /></button>
                                                <button onClick={() => shareCode(c.id, 'cp')} className="bg-white text-gray-600 px-4 py-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 shadow-sm transition-colors"><Copy className="w-4 h-4" /></button>
                                                <button onClick={() => setExitNoteCodeId(c.id)} className="flex-1 bg-rose-50 text-rose-600 py-2.5 rounded-lg border border-rose-100 font-semibold uppercase text-[10px] flex items-center justify-center hover:bg-rose-100 transition-colors text-center shadow-sm">📝/❌</button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {filteredCodes.filter(c => c.status === 'active').length === 0 && (
                                <p className="text-center py-12 text-gray-400 font-medium text-xs">No Active Clearances</p>
                            )}
                        </div>
                    </>
                )}

                {viewTab === 'staff' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center pb-2 mb-4 border-b border-gray-100">
                            <h3 className="font-semibold text-brand-black text-sm uppercase tracking-wide">Domestic Staff</h3>
                            <button onClick={() => setShowAddStaff(true)} className="bg-emerald-900 text-white px-4 py-2 text-[10px] rounded-lg font-semibold uppercase shadow-sm hover:bg-emerald-950 transition-colors">Assign Staff</button>
                        </div>
                        <div className="space-y-4">
                            {myStaffData.map(s => (
                                <div key={s.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm relative">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-semibold text-lg text-brand-black uppercase tracking-wide">{s.firstName || 'Pending Reg.'}</h3>
                                        {s.status === 'pending_employee_completion' && <span className="text-[9px] font-bold uppercase px-2 py-1 rounded-full bg-stone-100 text-stone-600">Invited</span>}
                                        {s.status === 'pending_resident_approval' && <span className="text-[9px] font-bold uppercase px-2 py-1 rounded-full bg-sky-100 text-sky-700">Review Needed</span>}
                                        {s.status === 'approved' && <span className="text-[9px] font-bold uppercase px-2 py-1 rounded-full bg-emerald-100 text-emerald-800">Active</span>}
                                    </div>
                                    <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-2">{s.staffRole} • {s.phone}</p>
                                    
                                    {s.status === 'pending_employee_completion' && (
                                        <div className="mt-4 bg-stone-50 p-4 rounded-xl border border-stone-200 text-center">
                                            <p className="text-[9px] font-semibold uppercase tracking-widest text-stone-500 mb-1">Invite Code</p>
                                            <p className="text-2xl font-mono font-black text-stone-800 tracking-[0.2em]">{s.inviteCode}</p>
                                        </div>
                                    )}

                                    {s.status === 'pending_resident_approval' && (
                                        <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                                            <p className="text-[10px] font-medium text-amber-700 bg-amber-50 rounded-lg p-2">Profile complete. Verify identity before approval.</p>
                                            <button onClick={() => { setReviewStaff(s); setStaffComment(s.employerComment||''); setStaffPassHours('24'); }} className="w-full bg-sky-700 text-white rounded-xl py-3 font-semibold uppercase text-xs hover:bg-sky-800 transition-colors">Review Information</button>
                                        </div>
                                    )}

                                    {s.status === 'approved' && (
                                        <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                                            <button onClick={() => { setReviewStaff(s); setStaffComment(s.employerComment||''); setStaffPassHours('24'); }} className="w-full bg-stone-800 text-white rounded-xl py-3 font-semibold uppercase text-[11px] shadow-sm hover:bg-stone-900 transition-all">Manage Options / View Info</button>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {myStaffData.length === 0 && (
                                <p className="text-center py-10 text-gray-400 font-medium text-xs tracking-wide">No Staff Assigned</p>
                            )}
                        </div>
                    </div>
                )}

                {viewTab === 'dir' && (
                    <div className="space-y-4">
                        <div className="pb-2 border-b border-gray-100 mb-4">
                            <h3 className="font-semibold text-brand-black text-sm uppercase tracking-wide mb-1">Estate Staff Directory</h3>
                            <p className="text-xs text-gray-500 font-medium">Browse accredited domestic staff working within the estate.</p>
                        </div>
                        
                        <div className="mb-6">
                            <input 
                                type="text"
                                placeholder="Search by name or role..." 
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full p-3.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none text-sm text-brand-black bg-white shadow-sm"
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            {dirStaffData.map((su: any) => (
                                <div key={su.id} className="bg-white border border-gray-200 rounded-2xl p-4 flex gap-4 shadow-sm">
                                    <div className="w-16 h-16 bg-gray-100 rounded-xl shrink-0 overflow-hidden relative">
                                        {su.passportPhoto ? <img src={su.passportPhoto} className="w-full h-full object-cover" alt="Staff" /> : <p className="text-center text-[9px] font-semibold text-gray-400 uppercase pt-5">No img</p>}
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
                    </div>
                )}

                {viewTab === 'hist' && (
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                        <table className="w-full text-[11px] text-left">
                            <thead className="bg-stone-50 text-stone-600 uppercase font-semibold tracking-wider">
                                <tr><th className="p-4 whitespace-nowrap font-semibold border-b border-gray-200">Identity</th><th className="p-4 whitespace-nowrap font-semibold border-b border-gray-200">Status</th><th className="p-4 text-right whitespace-nowrap font-semibold border-b border-gray-200">Time Log</th></tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {filteredCodes.filter(c => c.status !== 'active').sort((a,b) => (b.usedAt?.seconds || 0) - (a.usedAt?.seconds || 0)).map(c => (
                                    <tr key={c.id} className="hover:bg-stone-50/50 transition-colors">
                                        <td className="p-4">
                                            <span className="font-mono font-bold tracking-widest text-[13px] text-brand-black">{c.code}</span><br/><span className="text-[9px] text-gray-500 uppercase tracking-wide">{c.targetName}</span>
                                        </td>
                                        <td className="p-4">
                                            <span className={clsx("px-2.5 py-1 rounded-full text-[9px] uppercase font-semibold shadow-sm", c.status === 'used' ? 'bg-emerald-100 text-emerald-800' : c.status === 'checked-out' ? 'bg-stone-100 text-stone-600' : 'bg-gray-100 text-gray-600')}>{c.status}</span>
                                        </td>
                                        <td className="p-4 text-right text-gray-500 whitespace-nowrap text-[10px] font-medium leading-relaxed">
                                            <span className="text-emerald-700">IN:</span> {formatDate(c.usedAt)}<br/><span className="text-stone-500">OUT:</span> {formatDate(c.checkedOutAt)}
                                        </td>
                                    </tr>
                                ))}
                                {filteredCodes.filter(c => c.status !== 'active').length === 0 && (
                                    <tr><td colSpan={3} className="p-10 text-center italic text-gray-400 font-medium tracking-wide">No logs found</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {viewTab === 'bc' && (
                    <div className="space-y-4">
                        <div className="pb-2 border-b border-gray-100 mb-4">
                            <h3 className="font-semibold text-brand-black text-sm uppercase tracking-wide">Community Notices</h3>
                        </div>
                        {filteredNotices.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).map(n => (
                            <div key={n.id} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500"></div>
                                <h3 className="font-semibold text-brand-black text-[15px] mb-1.5 uppercase tracking-wide">{n.title}</h3>
                                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest mb-4 inline-block">{formatDate(n.createdAt)}</p>
                                <p className="text-xs text-gray-600 leading-relaxed font-medium">{n.content}</p>
                            </div>
                        ))}
                        {filteredNotices.length === 0 && (
                            <p className="text-center py-12 text-gray-400 font-medium text-xs tracking-wide">No Community Notices</p>
                        )}
                    </div>
                )}

                {viewTab === 'svcs' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-2 mb-4">
                            <h3 className="font-semibold text-brand-black text-sm uppercase tracking-wide">Estate Marketplace</h3>
                            <button onClick={()=>setShowAddSvc(true)} className="bg-emerald-900 text-white px-4 py-2 text-[10px] rounded-lg font-semibold uppercase shadow-sm hover:bg-emerald-950 transition-colors">List Service</button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {servicesData.map(s => (
                                <div key={s.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start mb-3">
                                            <h4 className="font-semibold uppercase text-brand-black tracking-wide pr-2 text-sm">{s.title}</h4>
                                            <span className="bg-emerald-50 text-emerald-700 text-[9px] font-semibold uppercase px-2 py-1 rounded whitespace-nowrap shrink-0">{s.category}</span>
                                        </div>
                                        <p className="text-[11px] text-gray-500 font-medium leading-relaxed mb-4">{s.description}</p>
                                    </div>
                                    <div className="pt-3 border-t border-gray-100">
                                        <p className="text-[10px] font-medium text-gray-400 uppercase mb-1">Provider: {s.providerHouseId}</p>
                                        <p className="text-[12px] font-semibold text-brand-black font-mono bg-stone-50 rounded-lg p-2 text-center">{s.phone}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {servicesData.length === 0 && <p className="text-[11px] text-gray-400 font-medium tracking-wide text-center py-10">No services listed.</p>}
                    </div>
                )}

                {viewTab === 'kids' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-2 mb-4">
                            <h3 className="font-semibold text-brand-black text-sm uppercase tracking-wide">My Madrasa Kids</h3>
                            <button onClick={()=>setShowAddKid(true)} className="bg-emerald-900 text-white px-4 py-2 text-[10px] rounded-lg font-semibold uppercase shadow-sm hover:bg-emerald-950 transition-colors">Enroll Child</button>
                        </div>
                        <div className="grid gap-3">
                        {kidsData.map(k => (
                            <div key={k.id} className="bg-white p-5 rounded-2xl border border-gray-200 flex gap-4 shadow-sm">
                                <div className="bg-emerald-50 text-emerald-700 w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl shrink-0 uppercase">
                                    {k.name[0]}
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-semibold uppercase text-brand-black mb-0.5 text-sm tracking-wide">{k.name}</h4>
                                    <p className="text-[11px] font-medium text-gray-500 uppercase tracking-widest">{k.age} yrs • {k.gender} • <span className="text-gray-400">DOB: {k.dob}</span></p>
                                    <div className="mt-3 space-y-2">
                                        {k.allergies && <p className="text-[10px] font-semibold bg-rose-50 text-rose-700 rounded-lg p-2">Allergies: {k.allergies}</p>}
                                        <p className="text-[10px] font-medium text-sky-800 bg-sky-50 rounded-lg p-2">ICE: {k.iceName} - <span className="font-mono">{k.icePhone}</span></p>
                                    </div>
                                </div>
                            </div>
                        ))}
                        </div>
                        {kidsData.length === 0 && <p className="text-[11px] text-gray-400 font-medium tracking-wide text-center py-10">No children enrolled.</p>}
                        
                        <div className="bg-stone-50 rounded-2xl border border-stone-200 p-5 mt-8">
                            <h4 className="font-semibold text-stone-800 uppercase text-xs mb-2">Madrasa Passes</h4>
                            <p className="text-[11px] font-medium text-stone-500 mb-4 leading-relaxed">You can issue a guest pass specific to Madrasa access from the Access tab. It will be valid for 6 hours.</p>
                            <button onClick={()=> { setViewTab('auth'); issueCode('Madrasa'); }} className="w-full bg-stone-800 text-white font-semibold text-xs py-3 rounded-xl uppercase shadow-sm hover:bg-stone-900 transition-colors">Generate Madrasa Pass</button>
                        </div>
                    </div>
                )}
                
                {viewTab === 'tickets' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-2 mb-4">
                            <h3 className="font-semibold text-brand-black text-sm uppercase tracking-wide flex items-center gap-2">Fix-It Tickets</h3>
                            <button onClick={()=>setShowAddTicket(true)} className="bg-emerald-900 text-white px-4 py-2 text-[10px] rounded-lg font-semibold uppercase shadow-sm hover:bg-emerald-950 transition-colors">Report Issue</button>
                        </div>
                        <div className="space-y-3">
                        {ticketsData.map(t => (
                            <div key={t.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden">
                                <div className={clsx("absolute top-0 left-0 w-2 h-full", t.status === 'pending' ? 'bg-amber-400' : t.status === 'resolved' ? 'bg-emerald-500' : 'bg-sky-400')}></div>
                                <div className="flex justify-between items-start mb-3 pl-2">
                                    <h4 className="font-semibold uppercase text-brand-black text-sm tracking-wide">{t.title}</h4>
                                    <span className={clsx("text-[9px] font-semibold uppercase px-2.5 py-1 rounded-full whitespace-nowrap", t.status === 'pending' ? 'bg-amber-100 text-amber-800' : t.status === 'resolved' ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800')}>{t.status}</span>
                                </div>
                                <div className="pl-2">
                                    <p className="text-[9px] font-semibold bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full inline-block mb-3 uppercase shadow-sm">{t.category}</p>
                                    <p className="text-[11px] text-gray-500 font-medium leading-relaxed mb-3">{t.description}</p>
                                    <p className="text-[9px] text-gray-400 font-medium uppercase tracking-widest border-t border-gray-100 pt-3">{formatDate(t.createdAt?.toDate())}</p>
                                </div>
                            </div>
                        ))}
                        </div>
                        {ticketsData.length === 0 && <p className="text-[11px] text-gray-400 font-medium tracking-wide text-center py-10">No active tickets.</p>}
                    </div>
                )}
            </div>
            </div>

            {/* Modals */}
            {showChangePin && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-sm p-6 rounded-2xl shadow-xl relative space-y-5">
                        <h3 className="text-lg font-semibold tracking-wide text-brand-black uppercase border-b border-gray-100 pb-3">Change Security PIN</h3>
                        <div className="space-y-4">
                            <div className="relative"><input type={showOld ? 'text' : 'password'} maxLength={6} placeholder="Old PIN" value={oldPin} onChange={e=>setOldPin(e.target.value)} className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none text-center tracking-widest font-mono text-lg"/><button onClick={()=>setShowOld(!showOld)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-700 transition-colors">{showOld ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}</button></div>
                            <div className="relative"><input type={showNew ? 'text' : 'password'} maxLength={6} placeholder="New PIN" value={newPin} onChange={e=>setNewPin(e.target.value)} className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none text-center tracking-widest font-mono text-lg"/><button onClick={()=>setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-700 transition-colors">{showNew ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}</button></div>
                            <div className="relative"><input type={showConf ? 'text' : 'password'} maxLength={6} placeholder="Confirm New PIN" value={confPin} onChange={e=>setConfPin(e.target.value)} className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none text-center tracking-widest font-mono text-lg"/><button onClick={()=>setShowConf(!showConf)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-700 transition-colors">{showConf ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}</button></div>
                        </div>
                        <div className="flex gap-3 pt-4 border-t border-gray-100">
                            <button onClick={()=>setShowChangePin(false)} className="flex-1 font-semibold text-gray-500 uppercase text-[11px] hover:bg-gray-50 rounded-xl transition-colors">Cancel</button>
                            <button onClick={handleChangePin} className="flex-[2] bg-emerald-900 text-white rounded-xl py-3.5 font-semibold text-xs shadow-sm uppercase hover:bg-emerald-950 transition-colors">Update PIN</button>
                        </div>
                    </div>
                </div>
            )}

            {showLS && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-sm p-6 rounded-2xl shadow-xl space-y-4">
                        <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 mb-2 text-center shadow-sm">
                            <h3 className="text-sm font-semibold tracking-wide uppercase text-stone-800">Long-Stay Clearance</h3>
                        </div>
                        <input className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-stone-500/20 focus:outline-none text-sm" placeholder="Guest Name" value={lsName} onChange={e=>setLsName(e.target.value)} />
                        <div><label className="text-[10px] font-semibold uppercase text-gray-500 block ml-1 mb-1 tracking-widest">Expiry Date</label><input type="date" className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-stone-500/20 focus:outline-none text-sm text-gray-700" value={lsDate} onChange={e=>setLsDate(e.target.value)} /></div>
                        <div className="flex gap-3 pt-4 border-t border-gray-100">
                            <button onClick={()=>setShowLS(false)} className="flex-1 font-semibold text-gray-500 uppercase text-[11px] hover:bg-gray-50 rounded-xl transition-colors">Cancel</button>
                            <button onClick={handleLongStay} className="flex-[2] bg-stone-800 text-white rounded-xl py-3 font-semibold text-xs shadow-sm uppercase hover:bg-stone-900 transition-colors">Activate</button>
                        </div>
                    </div>
                </div>
            )}

            {showGatePass && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-sm p-6 rounded-2xl shadow-xl space-y-4">
                        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 mb-2 text-center shadow-sm">
                            <h3 className="text-sm font-semibold tracking-wide uppercase text-rose-800">Exit Gate Pass</h3>
                        </div>
                        <input className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-rose-500/20 focus:outline-none text-sm" placeholder="Mover/Item description" value={gpName} onChange={e=>setGpName(e.target.value)} />
                        <textarea className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-rose-500/20 focus:outline-none text-sm h-24 resize-none" placeholder="Instructions..." value={gpNote} onChange={e=>setGpNote(e.target.value)}></textarea>
                        <div className="flex gap-3 pt-4 border-t border-gray-100">
                            <button onClick={()=>setShowGatePass(false)} className="flex-1 font-semibold text-gray-500 uppercase text-[11px] hover:bg-gray-50 rounded-xl transition-colors">Cancel</button>
                            <button onClick={handleGatePass} className="flex-[2] bg-rose-600 text-white rounded-xl py-3 font-semibold text-xs shadow-sm uppercase hover:bg-rose-700 transition-colors">Issue Pass</button>
                        </div>
                    </div>
                </div>
            )}

            {showAddStaff && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-sm p-6 rounded-2xl shadow-xl space-y-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-2 text-center shadow-sm text-blue-800">
                            <h3 className="text-sm font-semibold tracking-wide uppercase">Assign Staff</h3>
                        </div>
                        <input className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:outline-none text-sm" placeholder="Staff Full Name" value={staffFn} onChange={e=>setStaffFn(e.target.value)} />
                        <input className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:outline-none text-sm" placeholder="Role (e.g. Driver, Chef)" value={staffRole} onChange={e=>setStaffRole(e.target.value)} />
                        <input className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:outline-none text-sm font-mono" inputMode="numeric" placeholder="Phone Number" value={staffPhone} onChange={e=>setStaffPhone(e.target.value)} />
                        
                        <div className="bg-stone-50 rounded-xl border border-stone-200 p-4 text-[11px] text-stone-600 font-medium leading-relaxed">
                            Upon creating, a unique Invite Code will be generated. The staff member must use this code to register and complete their profile for your approval.
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-gray-100">
                            <button onClick={()=>setShowAddStaff(false)} className="flex-1 font-semibold text-gray-500 uppercase text-[11px] hover:bg-gray-50 rounded-xl transition-colors">Cancel</button>
                            <button onClick={handleAddStaff} className="flex-[2] bg-blue-700 text-white rounded-xl py-3 font-semibold text-xs shadow-sm uppercase hover:bg-blue-800 transition-colors">Generate Invite</button>
                        </div>
                    </div>
                </div>
            )}

            {reviewStaff && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-md p-6 rounded-2xl shadow-xl max-h-[85vh] overflow-y-auto">
                        <h3 className="text-base font-semibold tracking-wide border-b border-gray-100 text-brand-black pb-3 mb-5 uppercase">Profile / Identity</h3>
                        
                        <div className="space-y-5">
                            <div className="flex gap-4 items-center">
                                {reviewStaff.passportPhoto ? (
                                    <img src={reviewStaff.passportPhoto} alt="Passport" className="w-24 h-24 object-cover rounded-2xl border border-gray-200 shadow-sm" />
                                ) : (
                                    <div className="w-24 h-24 bg-gray-50 rounded-2xl border border-gray-200 flex items-center justify-center text-[10px] font-semibold uppercase text-gray-400 text-center p-2">NO PHOTO</div>
                                )}
                                <div>
                                    <p className="font-semibold text-lg uppercase text-brand-black">{reviewStaff.firstName}</p>
                                    <p className="text-[11px] font-medium text-emerald-700 uppercase tracking-wide">{reviewStaff.staffRole} • <span className="font-mono text-gray-600">{reviewStaff.phone}</span></p>
                                    <p className="text-[11px] font-medium mt-1 text-gray-600">DOB: {reviewStaff.dob} ({reviewStaff.gender})</p>
                                    <p className="text-[11px] font-medium mt-1 text-gray-500 line-clamp-1">{reviewStaff.address}</p>
                                </div>
                            </div>
                            
                            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 flex flex-col gap-2">
                                <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-500 mb-1">National IDs</p>
                                <p className="font-mono text-[13px] tracking-widest text-brand-black font-semibold">NIN: {reviewStaff.nin || 'N/A'} | BVN: {reviewStaff.bvn || 'N/A'}</p>
                            </div>

                            {reviewStaff.idDocument && (
                                <div>
                                    <p className="text-[10px] font-semibold tracking-widest uppercase mb-2 text-gray-400">Staff ID Document</p>
                                    <img src={reviewStaff.idDocument} alt="Staff ID" className="w-full h-auto max-h-48 object-contain rounded-xl border border-gray-200" />
                                </div>
                            )}

                            <div className="border-t border-gray-100 pt-5">
                                <p className="text-[10px] font-semibold tracking-widest uppercase text-emerald-700 bg-emerald-50 inline-block px-2.5 py-1 rounded-full mb-3">Guarantor / NOK</p>
                                <p className="text-[15px] font-semibold text-brand-black">{reviewStaff.nextOfKin?.name || 'N/A'}</p>
                                <p className="text-[13px] font-medium text-gray-600 mt-1">{reviewStaff.nextOfKin?.relationship} • <span className="font-mono">{reviewStaff.nextOfKin?.phone}</span></p>
                            </div>

                            {reviewStaff.nextOfKin?.idDocument && (
                                <div>
                                    <p className="text-[10px] font-semibold tracking-widest uppercase mb-2 text-gray-400">Guarantor ID</p>
                                    <img src={reviewStaff.nextOfKin.idDocument} alt="Guarantor ID" className="w-full h-auto max-h-48 object-contain rounded-xl border border-gray-200" />
                                </div>
                            )}
                            
                            {reviewStaff.status === 'approved' && (
                                <div className="border-t border-gray-100 pt-5 space-y-4">
                                    <div className="bg-white border text-brand-black border-gray-200 p-4 rounded-xl shadow-sm">
                                        <label className="text-[10px] font-semibold tracking-widest text-gray-500 uppercase mb-2 block">Comment on Staff Profile</label>
                                        <div className="flex gap-2">
                                            <input className="flex-1 p-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none text-xs" value={staffComment} onChange={e=>setStaffComment(e.target.value)} placeholder="Visible to other residents in directory" />
                                            <button onClick={()=>handleSaveComment(reviewStaff.id)} className="px-4 bg-emerald-100 text-emerald-800 rounded-lg text-[10px] font-semibold uppercase hover:bg-emerald-200 transition-colors">Save</button>
                                        </div>
                                    </div>
                                    <div className="bg-sky-50 border border-sky-100 p-4 rounded-xl">
                                        <label className="text-[10px] font-semibold tracking-widest text-sky-800 uppercase mb-3 block">Generate Gate Pass (For {reviewStaff.firstName})</label>
                                        <div className="flex gap-2">
                                            <select value={staffPassHours} onChange={e=>setStaffPassHours(e.target.value)} className="p-2.5 rounded-lg border border-sky-200 focus:ring-2 focus:ring-sky-500/20 focus:outline-none text-xs text-sky-900 bg-white flex-1">
                                                <option value="12">12 Hours Expires</option>
                                                <option value="24">24 Hours Expires</option>
                                                <option value="72">3 Days Expires</option>
                                            </select>
                                            <button onClick={()=>handleStaffGatePass(reviewStaff)} className="px-4 bg-sky-700 text-white rounded-lg text-[10px] font-semibold uppercase hover:bg-sky-800 transition-colors">Generate Pass</button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-2 mt-6 border-t border-gray-100 pt-5">
                            {reviewStaff.status === 'pending_resident_approval' ? (
                                <div className="flex gap-3">
                                    <button onClick={()=>setReviewStaff(null)} className="flex-1 font-semibold text-gray-500 uppercase text-[11px] hover:bg-gray-50 rounded-xl transition-colors py-3">Close</button>
                                    <button onClick={()=>{ handleApproveStaff(reviewStaff.id); setReviewStaff(null); }} className="flex-[2] bg-emerald-600 text-white rounded-xl font-semibold uppercase text-xs shadow-sm hover:bg-emerald-700 transition-colors py-3">Approve Staff</button>
                                </div>
                            ) : (
                                <div className="flex gap-3 justify-between items-center">
                                    <button onClick={()=>{ handleUnapproveStaff(reviewStaff.id); setReviewStaff(null); }} className="text-[10px] font-semibold text-rose-500 uppercase hover:text-rose-600 transition-colors">Revoke Approval</button>
                                    <button onClick={()=>setReviewStaff(null)} className="bg-stone-800 text-white rounded-xl font-semibold uppercase text-[11px] shadow-sm px-6 py-2.5 hover:bg-stone-900 transition-colors">Close</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {showAddSvc && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-sm p-6 rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto space-y-4">
                        <h3 className="font-semibold tracking-wide uppercase text-brand-black border-b border-gray-100 pb-3 mb-2">List a Service</h3>
                        <form onSubmit={handleAddService} className="space-y-4">
                            <div><label className="text-[10px] font-semibold tracking-wide uppercase text-gray-500 block mb-1">Service Title</label><input required value={svcTitle} onChange={e=>setSvcTitle(e.target.value)} className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none text-sm" placeholder="e.g. Plumbing Services"/></div>
                            <div><label className="text-[10px] font-semibold tracking-wide uppercase text-gray-500 block mb-1">Description</label><textarea required value={svcDesc} onChange={e=>setSvcDesc(e.target.value)} className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none text-sm resize-none" placeholder="Details about your offering..." rows={3}/></div>
                            <div>
                                <label className="text-[10px] font-semibold tracking-wide uppercase text-gray-500 block mb-1">Category</label>
                                <select value={svcCat} onChange={e=>setSvcCat(e.target.value)} className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none text-sm uppercase">
                                    <option>General</option>
                                    <option>Repairs</option>
                                    <option>Food & Catering</option>
                                    <option>Tutoring</option>
                                    <option>Others</option>
                                </select>
                            </div>
                            <div><label className="text-[10px] font-semibold tracking-wide uppercase text-gray-500 block mb-1">Contact Phone</label><input required type="tel" value={svcPhone} onChange={e=>setSvcPhone(e.target.value)} className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none text-sm font-mono"/></div>
                            <div className="flex gap-3 pt-4 border-t border-gray-100">
                                <button type="button" onClick={()=>setShowAddSvc(false)} className="flex-1 font-semibold text-gray-500 uppercase text-[11px] hover:bg-gray-50 rounded-xl transition-colors py-3">Cancel</button>
                                <button type="submit" className="flex-[2] bg-emerald-900 text-white rounded-xl py-3 font-semibold text-xs shadow-sm uppercase hover:bg-emerald-950 transition-colors">List Service</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showAddKid && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-sm p-6 rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto space-y-4">
                        <h3 className="font-semibold tracking-wide uppercase text-brand-black border-b border-gray-100 pb-3 mb-2">Enroll Child</h3>
                        <form onSubmit={handleEnrollKid} className="space-y-4">
                            <div><label className="text-[10px] font-semibold tracking-wide uppercase text-gray-500 block mb-1">Full Name</label><input required value={kidName} onChange={e=>setKidName(e.target.value)} className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none text-sm"/></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-[10px] font-semibold tracking-wide uppercase text-gray-500 block mb-1">Age</label><input required type="number" value={kidAge} onChange={e=>setKidAge(e.target.value)} className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none text-sm"/></div>
                                <div>
                                    <label className="text-[10px] font-semibold tracking-wide uppercase text-gray-500 block mb-1">Gender</label>
                                    <select value={kidGender} onChange={e=>setKidGender(e.target.value)} className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none text-sm uppercase">
                                        <option>Male</option><option>Female</option>
                                    </select>
                                </div>
                            </div>
                            <div><label className="text-[10px] font-semibold tracking-wide uppercase text-gray-500 block mb-1">Date of Birth</label><input required type="date" value={kidDob} onChange={e=>setKidDob(e.target.value)} className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none text-sm"/></div>
                            <div><label className="text-[10px] font-semibold tracking-wide uppercase text-gray-500 block mb-1">Allergies / Special Prep</label><input value={kidAllergies} onChange={e=>setKidAllergies(e.target.value)} className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none text-sm" placeholder="Optional"/></div>
                            <div className="bg-sky-50 rounded-xl border border-sky-100 p-4 mt-2">
                                <h4 className="font-semibold uppercase tracking-wide text-[10px] mb-3 text-sky-800">In Case of Emergency</h4>
                                <div className="space-y-3">
                                    <input required value={kidIceName} onChange={e=>setKidIceName(e.target.value)} className="w-full p-2.5 rounded-lg border border-sky-200 focus:ring-2 focus:ring-sky-500/20 focus:outline-none text-xs" placeholder="ICE Contact Name"/>
                                    <input required type="tel" value={kidIcePhone} onChange={e=>setKidIcePhone(e.target.value)} className="w-full p-2.5 rounded-lg border border-sky-200 focus:ring-2 focus:ring-sky-500/20 focus:outline-none text-xs font-mono" placeholder="ICE Contact Phone"/>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4 border-t border-gray-100">
                                <button type="button" onClick={()=>setShowAddKid(false)} className="flex-1 font-semibold text-gray-500 uppercase text-[11px] hover:bg-gray-50 rounded-xl transition-colors py-3">Cancel</button>
                                <button type="submit" className="flex-[2] bg-emerald-900 text-white rounded-xl py-3 font-semibold text-xs shadow-sm uppercase hover:bg-emerald-950 transition-colors">Enroll Child</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showAddTicket && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-sm p-6 rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto space-y-4">
                        <h3 className="font-semibold tracking-wide uppercase text-brand-black border-b border-gray-100 pb-3 mb-2">Report an Issue</h3>
                        <form onSubmit={handleAddTicket} className="space-y-4">
                            <div><label className="text-[10px] font-semibold tracking-wide uppercase text-gray-500 block mb-1">Issue Title</label><input required value={ticketTitle} onChange={e=>setTicketTitle(e.target.value)} className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none text-sm" placeholder="e.g. Broken Streetlight"/></div>
                            <div>
                                <label className="text-[10px] font-semibold tracking-wide uppercase text-gray-500 block mb-1">Category</label>
                                <select value={ticketCat} onChange={e=>setTicketCat(e.target.value)} className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none text-sm uppercase">
                                    <option>Electrical</option>
                                    <option>Plumbing</option>
                                    <option>Estate Grounds</option>
                                    <option>Security</option>
                                    <option>Waste Management</option>
                                    <option>Others</option>
                                </select>
                            </div>
                            <div><label className="text-[10px] font-semibold tracking-wide uppercase text-gray-500 block mb-1">Description</label><textarea required value={ticketDesc} onChange={e=>setTicketDesc(e.target.value)} className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none text-sm resize-none" placeholder="Provide details about the issue..." rows={3}/></div>
                            <div className="flex gap-3 pt-4 border-t border-gray-100">
                                <button type="button" onClick={()=>setShowAddTicket(false)} className="flex-1 font-semibold text-gray-500 uppercase text-[11px] hover:bg-gray-50 rounded-xl transition-colors py-3">Cancel</button>
                                <button type="submit" className="flex-[2] bg-emerald-900 text-white rounded-xl py-3 font-semibold text-xs shadow-sm uppercase hover:bg-emerald-950 transition-colors">Submit Ticket</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
