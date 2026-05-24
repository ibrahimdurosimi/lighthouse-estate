import React, { useState, useEffect } from 'react';
import { Settings, LogOut, Clock, Truck, Calendar, MessageSquare, Copy, Trash2, Eye, EyeOff, AlertTriangle, Wrench, Bell, UserPlus, Info, Shield, BookOpen, Users, ScanLine, ArrowRight, Search, X, Menu, Home } from 'lucide-react';
import { useApp } from '../lib/context';
import ThemeToggle from './ThemeToggle';
import { db, appId } from '../lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import { generateCode, formatDate, filterItemsByDate, hashPin, generateOfflineCode } from '../lib/utils';
import { EmailTriggers } from '../lib/email';
import clsx from 'clsx';

export default function Resident() {
    const { profile, setProfile, setView, notify, isDarkMode, lang, t } = useApp();
    const [viewTab, setViewTab] = useState<'dash' | 'auth' | 'hist' | 'bc' | 'staff' | 'dir' | 'svcs' | 'kids' | 'tickets' | 'polls'>('dash');
    const [menuOpen, setMenuOpen] = useState(false);
    const [activeCategory, setActiveCategory] = useState<'home' | 'security' | 'services'>('home');
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

    const [showAddKid, setShowAddKid] = useState(false);
    const [kidName, setKidName] = useState('');
    const [kidAge, setKidAge] = useState('');
    const [kidDob, setKidDob] = useState('');
    const [kidGender, setKidGender] = useState('Male');
    const [kidAllergies, setKidAllergies] = useState('');
    const [kidIceName, setKidIceName] = useState('');
    const [kidIcePhone, setKidIcePhone] = useState('');

    const [showAddSvc, setShowAddSvc] = useState(false);
    const [svcTitle, setSvcTitle] = useState('');
    const [svcDesc, setSvcDesc] = useState('');
    const [svcCat, setSvcCat] = useState('General');
    const [svcPhone, setSvcPhone] = useState('');

    // Modals state
    const [showChangePin, setShowChangePin] = useState(false);
    const [showLS, setShowLS] = useState(false);
    const [showGatePass, setShowGatePass] = useState(false);
    const [showGuestPass, setShowGuestPass] = useState(false);
    const [guestName, setGuestName] = useState('');
    const [guestTime, setGuestTime] = useState('');
    const [showAddStaff, setShowAddStaff] = useState(false);
    const [staffInvite, setStaffInvite] = useState<{name: string, code: string, role: string} | null>(null);
    const [reviewStaff, setReviewStaff] = useState<any>(null);
    const [staffComment, setStaffComment] = useState('');
    const [staffPassHours, setStaffPassHours] = useState('24');
    const [exitNoteCodeId, setExitNoteCodeId] = useState<string | null>(null);
    const [exitNoteText, setExitNoteText] = useState('');
    const [staffFn, setStaffFn] = useState('');
    const [staffRole, setStaffRole] = useState('');
    const [staffPhone, setStaffPhone] = useState('');
    
    // Staff Pass config
    const [showStaffPassConfig, setShowStaffPassConfig] = useState(false);
    const [selectedStaffUserId, setSelectedStaffUserId] = useState('');
    const [staffPassDays, setStaffPassDays] = useState<string[]>([]);
    const [staffClockIn, setStaffClockIn] = useState('');
    const [staffClockOut, setStaffClockOut] = useState('');

    // Offline Pass
    const [showOfflinePass, setShowOfflinePass] = useState(false);
    const [offlineCode, setOfflineCode] = useState('');

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

    const issueCode = async (type: string, name?: string, expectedTime?: string) => {
        let durationMinutes = 60;
        let targetName = name || (type === 'Delivery' ? 'Delivery' : 'Visitor');
        let note = expectedTime ? `Expected at ${expectedTime}. ` : '';
        if (type === 'Guest') {
            durationMinutes = 30;
            if (!name) targetName = 'Guest';
        }
        else if (type === 'Delivery') durationMinutes = 15;
        else if (type === 'Jumat') {
            durationMinutes = 180; // 3 hours
            targetName = 'Jumat Guest';
            note += `Has authorized guest to come pray Jumat service in the estate mosque.`;
        }

        const code = generateCode();
        const exp = new Date(Date.now() + durationMinutes * 60000);
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'codes'), {
            code, type, targetName, houseId: profile.identifier, status: 'active',
            createdAt: serverTimestamp(), expiresAt: exp.toISOString(), generatedBy: profile.firstName,
            note
        });

        if (profile.email) {
            EmailTriggers.accessCodeGenerated(profile.email, profile.firstName, targetName, code, exp.toLocaleString());
        }

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

        if (c.type === 'Jumat') {
            msg = `Assalamu Alaikum Warahmatullahi Wabarakatuh,

Welcome to LightHouse Estate.

Your Jumat Access Details are as follows:

Access Code: ${c.code}
Host: ${profile.identifier}
Valid Until: ${formatDate(c.expiresAt)}
Note: Your host has authorized you to come to the estate mosque for Jumat service.

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
        if (!lsName || !lsDate) return notify("Missing info.", "error");
        const code = generateCode();
        const expiry = new Date(lsDate);
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'codes'), {
            code, type: 'Long-Stay', targetName: lsName, houseId: profile.identifier, status: 'active',
            createdAt: serverTimestamp(), expiresAt: expiry.toISOString(), generatedBy: profile.firstName
        });

        if (profile.email) {
            EmailTriggers.accessCodeGenerated(profile.email, profile.firstName, lsName, code, expiry.toLocaleString());
        }

        setShowLS(false);
        notify("Long-stay active.");
        setLsName(''); setLsDate('');
    };

    // Gate Pass Modal
    const [gpName, setGpName] = useState('');
    const [gpNote, setGpNote] = useState('');
    const handleGatePass = async () => {
        if (!gpName || !gpNote) return notify("Detail required.", "error");
        const code = generateCode();
        const exp = new Date(Date.now() + 180 * 60000);
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'codes'), {
            code, type: 'Gate-Pass', targetName: gpName, note: gpNote, houseId: profile.identifier, status: 'active',
            createdAt: serverTimestamp(), expiresAt: exp.toISOString(), generatedBy: profile.firstName
        });

        if (profile.email) {
            EmailTriggers.accessCodeGenerated(profile.email, profile.firstName, gpName, code, exp.toLocaleString());
        }

        setShowGatePass(false);
        notify("Exit pass issued.");
        setGpName(''); setGpNote('');
    };

    const handleAddStaff = async () => {
        if (!staffFn || !staffRole || !staffPhone) return notify("Missing info.", "error");
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
        setStaffInvite({ name: staffFn, code: inviteCode, role: staffRole });
        setStaffFn(''); setStaffRole(''); setStaffPhone('');
    };

    const shareStaffInvite = async (mode: 'wa' | 'cp') => {
        if (!staffInvite) return;
        const url = `${window.location.origin}/?view=staff_onboarding&inviteCode=${staffInvite.code}`;
        const msg = `Assalamu Alaikum ${staffInvite.name},
        
You have been invited as a ${staffInvite.role} at Lighthouse Estate.

Please complete your registration and onboarding using the link below:
${url}

Invite Code: ${staffInvite.code}

Thank you.`;

        if (mode === 'wa') {
            window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`);
        } else {
            await navigator.clipboard.writeText(msg);
            notify("Invite link copied!");
        }
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
        const exp = new Date(Date.now() + parseInt(staffPassHours) * 60 * 60 * 1000);
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'codes'), {
            appId,
            houseId: profile.identifier,
            code: codeStr,
            targetName: `[STAFF] ${staff.firstName} (${staff.staffRole})`,
            type: 'single', 
            note: "Staff Pass generated by Employer",
            status: 'active',
            createdAt: serverTimestamp(),
            expiresAt: exp.toISOString()
        });

        if (profile.email) {
            EmailTriggers.accessCodeGenerated(
                profile.email, 
                profile.firstName, 
                `Staff: ${staff.firstName}`, 
                codeStr, 
                exp.toLocaleString()
            );
        }

        notify(`Staff Pass Created: ${codeStr}`);
        setReviewStaff(null);
    };

    const handleConfigStaffPass = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStaffUserId) return notify("Select a staff member.", "error");
        try {
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', selectedStaffUserId), {
                scheduleDays: staffPassDays,
                clockIn: staffClockIn,
                clockOut: staffClockOut
            });
            setShowStaffPassConfig(false);
            notify("Staff pass configured.");
            setSelectedStaffUserId('');
            setStaffPassDays([]);
            setStaffClockIn('');
            setStaffClockOut('');
        } catch (err) {
            console.error(err);
            notify("Failed to configure staff pass.", "error");
        }
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
                
                // Trigger Email Notification
                EmailTriggers.sosAlert(profile.identifier, profile.firstName, 'admin@estate-magic.com');
                
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
    const dirStaffData = staffData.filter(x => x.employerId !== profile.identifier && x.status === 'approved' && (!searchQuery || x.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) || x.staffRole?.toLowerCase().includes(searchQuery.toLowerCase()) || x.employerId?.toLowerCase().includes(searchQuery.toLowerCase())));

    return (
        <div className="absolute inset-0 flex flex-col bg-stone-50/50 dark:bg-stone-950/50 transition-colors">
            <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
                <header className="bg-white/90 dark:bg-stone-900/90 backdrop-blur border-b border-brand-gray dark:border-stone-800 px-5 py-4 mb-2 flex justify-between items-center sticky top-0 z-20">
                    <div className="flex items-center gap-3 w-full">
                    <div className="bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-100 w-11 h-11 rounded-full flex items-center justify-center font-bold text-lg">{profile.firstName[0]}</div>
                    <div className="flex flex-col flex-1">
                        <h2 className="font-bold text-gray-900 dark:text-gray-100 leading-tight">{profile.firstName} {profile.lastName}</h2>
                        <p className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-widest">{profile.identifier}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <ThemeToggle />
                    <button onClick={handleTriggerSOS} className={clsx("p-2 rounded-full transition-all flex-shrink-0", isSosActive ? "bg-red-500 text-white animate-pulse shadow-md shadow-red-500/30" : "bg-red-50 dark:bg-red-950/30 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40")} title="TRIGGER SOS">
                        <AlertTriangle className="w-5 h-5" />
                    </button>
                    <button onClick={() => setShowChangePin(true)} className="p-2 rounded-full bg-gray-50 dark:bg-stone-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-stone-700 transition-colors flex-shrink-0"><Settings className="w-5 h-5" /></button>
                    <button onClick={() => { setProfile(null); setView('login'); }} className="p-2 rounded-full bg-gray-50 dark:bg-stone-800 text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 transition-colors flex-shrink-0"><LogOut className="w-5 h-5" /></button>
                </div>
            </header>

            {profile.duesStatus !== 'paid' && (
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 p-3 mx-4 rounded-xl shadow-sm text-center mb-4 space-y-1">
                    <AlertTriangle className="w-5 h-5 text-red-500 mx-auto animate-pulse" />
                    <h3 className="font-semibold text-red-800 dark:text-red-400 text-xs tracking-wide uppercase">Estate Dues Outstanding</h3>
                    <p className="text-[10px] text-red-700/80 dark:text-red-500/80 font-medium">Please pay your annual estate dues to ensure uninterrupted access.</p>
                </div>
            )}

            <div className="sticky top-[77px] z-10 bg-stone-50/90 dark:bg-stone-900/90 backdrop-blur pb-3 px-4 mb-4 border-b border-gray-100 dark:border-stone-800">
                {/* Tier 1: Parent Categories - HIDDEN as per request for more compact vertical grouping */}
                {/* 
                <div className="flex bg-gray-100/50 dark:bg-stone-800/50 p-1 rounded-2xl mb-3">
                    ...
                </div>
                */}

                {/* Vertical Categories Overview REMOVED as per user request */}
                {/* Header for non-dash tabs */}
                {viewTab !== 'dash' && (
                    <div className="flex bg-gray-100/50 dark:bg-stone-800/50 p-1 rounded-2xl mb-3">
                        <button 
                            onClick={() => { setActiveCategory('home'); setViewTab('dash'); }}
                            className="bg-white dark:bg-stone-700 py-2.5 px-4 text-[10px] font-black uppercase tracking-widest rounded-xl shadow-sm text-emerald-900 dark:text-emerald-100 flex items-center justify-center gap-2"
                        >
                            <ArrowRight className="w-4 h-4 rotate-180" /> Back to Dashboard
                        </button>
                    </div>
                )}
            </div>
            
            <div className="px-4">
                {viewTab !== 'dash' && (
                    <div className="flex items-center gap-2 mb-4">
                        <select value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="bg-white dark:bg-stone-800 text-xs font-medium text-gray-700 dark:text-gray-200 py-2.5 px-3 rounded-xl border border-gray-200 dark:border-stone-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-colors">
                            <option value="all">All Time</option>
                            <option value="today">Today</option>
                            <option value="week">This Week</option>
                            <option value="month">This Month</option>
                        </select>
                    </div>
                )}



            <div className="space-y-6">
                {viewTab === 'dash' && (
                    <div className="space-y-6 animate-fade-in pl-1 pr-1">
                        {/* Stats Section */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-gray-100 dark:border-stone-800 shadow-sm transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="bg-emerald-50 dark:bg-emerald-900/30 p-2 rounded-lg text-emerald-600 dark:text-emerald-400">
                                        <Clock className="w-4 h-4" />
                                    </div>
                                    <span className="text-2xl font-bold text-brand-black dark:text-gray-100">{activeCount}</span>
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-stone-500 mt-1">Active Visitor Passes</p>
                            </div>
                            <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-gray-100 dark:border-stone-800 shadow-sm transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="bg-amber-50 dark:bg-amber-900/30 p-2 rounded-lg text-amber-600 dark:text-amber-400">
                                        <AlertTriangle className="w-4 h-4" />
                                    </div>
                                    <span className="text-2xl font-bold text-brand-black dark:text-gray-100">{ticketsData.filter(t => t.status === 'pending').length}</span>
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-stone-500 mt-1">Open Tickets</p>
                            </div>
                        </div>

                        {/* Quick Action Grid */}
                        <div>
                            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-stone-500 mb-3 px-1">Quick Actions</h3>
                            <div className="grid grid-cols-3 gap-3">
                                <button onClick={() => { setActiveCategory('security'); setViewTab('auth'); }} className="bg-white dark:bg-stone-900 mb-0.5 p-4 rounded-2xl border border-gray-100 dark:border-stone-800 shadow-sm flex flex-col items-center gap-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors group">
                                    <div className="bg-emerald-100 dark:bg-emerald-900/50 p-2.5 rounded-xl text-emerald-700 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                                        <UserPlus className="w-5 h-5" />
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">Visitors</span>
                                </button>
                                <button onClick={() => { setActiveCategory('services'); setViewTab('tickets'); setShowAddTicket(true); }} className="bg-white dark:bg-stone-900 mb-0.5 p-4 rounded-2xl border border-gray-100 dark:border-stone-800 shadow-sm flex flex-col items-center gap-2 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors group">
                                    <div className="bg-amber-100 dark:bg-amber-900/50 p-2.5 rounded-xl text-amber-700 dark:text-amber-400 group-hover:scale-110 transition-transform">
                                        <Wrench className="w-5 h-5" />
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">Fix It</span>
                                </button>
                                <button onClick={() => { setActiveCategory('home'); setViewTab('bc'); }} className="bg-white dark:bg-stone-900 mb-0.5 p-4 rounded-2xl border border-gray-100 dark:border-stone-800 shadow-sm flex flex-col items-center gap-2 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-colors group">
                                    <div className="bg-sky-100 dark:bg-sky-900/50 p-2.5 rounded-xl text-sky-700 dark:text-sky-400 group-hover:scale-110 transition-transform">
                                        <Bell className="w-5 h-5" />
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">Notices</span>
                                </button>
                            </div>
                        </div>

                        {/* Latest Notices ListView */}
                        <div className="pt-2">
                            <div className="flex justify-between items-center mb-4 px-1">
                                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-stone-500">Latest Notices</h3>
                                <button onClick={() => { setActiveCategory('home'); setViewTab('bc'); }} className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">View All</button>
                            </div>
                            {noticesData.length > 0 ? (
                                <div className="space-y-3">
                                    {noticesData.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).slice(0, 5).map(n => (
                                        <div key={n.id} className="bg-white dark:bg-stone-900 p-4 rounded-xl border border-gray-100 dark:border-stone-800 shadow-sm flex flex-col gap-2 relative overflow-hidden group">
                                            {n.category === 'emergency' && <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>}
                                            {n.category === 'event' && <div className="absolute top-0 left-0 w-1 h-full bg-sky-500"></div>}
                                            {n.category === 'info' && <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>}
                                            <div className="flex justify-between items-start gap-4">
                                                <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{n.title}</h4>
                                                <span className="text-[9px] whitespace-nowrap text-gray-400 dark:text-stone-500 uppercase tracking-wider font-medium">{formatDate(n.createdAt)}</span>
                                            </div>
                                            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">{n.content}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-white dark:bg-stone-900 border border-gray-100 dark:border-stone-800 rounded-xl p-8 text-center">
                                    <Bell className="w-8 h-8 text-gray-200 dark:text-stone-700 mx-auto mb-3" />
                                    <p className="text-gray-400 dark:text-stone-500 text-sm font-medium">No recent notices given</p>
                                </div>
                            )}
                        </div>
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
                            <button onClick={() => setShowGuestPass(true)} className="bg-white dark:bg-stone-900 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-900 dark:text-emerald-400 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/50 shadow-sm transition-all flex flex-col items-center gap-2 group">
                                <span className="bg-emerald-100 dark:bg-emerald-900/50 p-2.5 rounded-full group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/80 transition-colors">
                                    <Clock className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
                                </span>
                                <span className="font-semibold text-xs tracking-wide">Guest Pass</span>
                            </button>
                            <button onClick={() => issueCode('Delivery')} className="bg-white dark:bg-stone-900 hover:bg-teal-50 dark:hover:bg-teal-900/20 text-teal-900 dark:text-teal-400 p-4 rounded-xl border border-teal-100 dark:border-teal-900/50 shadow-sm transition-all flex flex-col items-center gap-2 group">
                                <span className="bg-teal-100 dark:bg-teal-900/50 p-2.5 rounded-full group-hover:bg-teal-200 dark:group-hover:bg-teal-900/80 transition-colors">
                                    <Truck className="w-5 h-5 text-teal-700 dark:text-teal-400" />
                                </span>
                                <span className="font-semibold text-xs tracking-wide">Delivery</span>
                            </button>
                            <button onClick={() => setShowLS(true)} className="bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 p-4 rounded-xl border border-stone-200 dark:border-stone-700 shadow-sm transition-all flex flex-col items-center gap-2 group">
                                <span className="bg-stone-100 dark:bg-stone-800 p-2.5 rounded-full group-hover:bg-stone-200 dark:group-hover:bg-stone-700 transition-colors">
                                    <Calendar className="w-5 h-5 text-stone-600 dark:text-stone-400" />
                                </span>
                                <span className="font-semibold text-xs tracking-wide">Long-Stay</span>
                            </button>
                            <button onClick={() => setShowGatePass(true)} className="bg-white dark:bg-stone-900 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-700 dark:text-rose-400 p-4 rounded-xl border border-rose-100 dark:border-rose-900/50 shadow-sm transition-all flex flex-col items-center gap-2 group">
                                <span className="bg-rose-100 dark:bg-rose-900/50 p-2.5 rounded-full group-hover:bg-rose-200 dark:group-hover:bg-rose-900/80 transition-colors">
                                    <LogOut className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                                </span>
                                <span className="font-semibold text-xs tracking-wide">Exit Pass</span>
                            </button>
                            <button onClick={() => setShowStaffPassConfig(true)} className="bg-white dark:bg-stone-900 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/50 shadow-sm transition-all flex flex-col items-center gap-2 group">
                                <span className="bg-indigo-100 dark:bg-indigo-900/50 p-2.5 rounded-full group-hover:bg-indigo-200 dark:group-hover:bg-indigo-900/80 transition-colors">
                                    <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                </span>
                                <span className="font-semibold text-xs tracking-wide">Staff Pass</span>
                            </button>
                            <button onClick={() => {
                                setOfflineCode(generateOfflineCode(profile.identifier));
                                setShowOfflinePass(true);
                            }} className="bg-white dark:bg-stone-900 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-purple-700 dark:text-purple-400 p-4 rounded-xl border border-purple-100 dark:border-purple-900/50 shadow-sm transition-all flex flex-col items-center gap-2 group">
                                <span className="bg-purple-100 dark:bg-purple-900/50 p-2.5 rounded-full group-hover:bg-purple-200 dark:group-hover:bg-purple-900/80 transition-colors">
                                    <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                </span>
                                <span className="font-semibold text-xs tracking-wide">Offline Pass</span>
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
                    <div className="space-y-4 animate-fade-in">
                        <div className="pb-3 border-b border-gray-100 dark:border-stone-800 mb-4 transition-colors">
                            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm uppercase tracking-wide mb-1">Estate Staff Directory</h3>
                            <p className="text-[11px] text-gray-500 dark:text-stone-400 font-medium">Browse accredited domestic staff working within the estate.</p>
                        </div>
                        
                        <div className="mb-6 relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                            <input 
                                type="text"
                                placeholder="Search by name or role..." 
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-11 pr-11 py-3.5 rounded-2xl border border-gray-200 dark:border-stone-800 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-stone-900 shadow-sm transition-all"
                            />
                            {searchQuery && (
                                <button 
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-stone-800 rounded-full transition-colors"
                                >
                                    <X className="w-3.5 h-3.5 text-gray-400" />
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            {dirStaffData.map((su: any) => (
                                <div key={su.id} className="bg-white dark:bg-stone-900 border border-gray-200 dark:border-stone-800 rounded-2xl p-4 flex gap-4 shadow-sm hover:shadow-md transition-all">
                                    <div className="w-16 h-16 bg-gray-100 dark:bg-stone-800 rounded-xl shrink-0 overflow-hidden relative border border-gray-100 dark:border-stone-700">
                                        {su.passportPhoto ? <img src={su.passportPhoto} className="w-full h-full object-cover" alt="Staff" /> : <div className="flex flex-col items-center justify-center h-full opacity-30"><Users className="w-6 h-6" /></div>}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-1">
                                            <p className="font-black text-gray-900 dark:text-gray-100 uppercase text-sm leading-tight italic">{su.firstName}</p>
                                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50">Verified</span>
                                        </div>
                                        <p className="text-[10px] font-bold uppercase text-emerald-800 dark:text-emerald-400 tracking-widest mb-2">{su.staffRole}</p>
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="bg-stone-100 dark:bg-stone-800 p-1 rounded-md">
                                                <Info className="w-3 h-3 text-stone-500" />
                                            </div>
                                            <p className="text-[10px] font-bold text-gray-500 dark:text-stone-400">Employer: <span className="text-gray-900 dark:text-gray-200">{su.employerId}</span></p>
                                        </div>
                                        {su.employerComment && (
                                            <div className="mt-2 bg-stone-50 dark:bg-stone-800/50 p-2.5 rounded-xl border-l-4 border-emerald-500 transition-colors">
                                                <p className="text-[10px] italic text-gray-700 dark:text-gray-300 font-medium leading-relaxed">"{su.employerComment}"</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {dirStaffData.length === 0 && (
                                <div className="text-center py-16 opacity-40">
                                    <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                    <p className="font-black text-[10px] uppercase tracking-widest">No matching staff found</p>
                                </div>
                            )}
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
                    <div className="space-y-4 animate-fade-in content-area">
                        <div className="flex justify-between items-center border-b border-gray-100 dark:border-stone-800 pb-2 mb-4">
                            <h3 className="font-semibold text-brand-black dark:text-gray-100 text-sm uppercase tracking-wide">My Madrasa Kids</h3>
                            <button onClick={()=>setShowAddKid(true)} className="bg-emerald-900 text-white px-4 py-2 text-[10px] rounded-lg font-semibold uppercase shadow-sm hover:bg-emerald-950 transition-colors">Enroll Child</button>
                        </div>
                        <div className="grid gap-3">
                        {kidsData.map(k => (
                            <div key={k.id} className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-gray-200 dark:border-stone-800 flex gap-4 shadow-sm">
                                <div className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl shrink-0 uppercase">
                                    {k.name[0]}
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-semibold uppercase text-brand-black dark:text-gray-100 mb-0.5 text-sm tracking-wide">{k.name}</h4>
                                    <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-widest">{k.age} yrs • {k.gender} • <span className="text-gray-400">DOB: {k.dob}</span></p>
                                    <div className="mt-3 space-y-2">
                                        {k.allergies && <p className="text-[10px] font-semibold bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 rounded-lg p-2">Allergies: {k.allergies}</p>}
                                        <p className="text-[10px] font-medium text-sky-800 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/20 rounded-lg p-2">ICE: {k.iceName} - <span className="font-mono">{k.icePhone}</span></p>
                                    </div>
                                </div>
                            </div>
                        ))}
                        </div>
                        {kidsData.length === 0 && <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium tracking-wide text-center py-10">No children enrolled.</p>}
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
            {staffInvite && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[255] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-sm p-8 rounded-[2rem] shadow-2xl text-center space-y-6">
                        <div className="bg-emerald-100 text-emerald-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-inner">
                            <Copy className="w-10 h-10" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-brand-black tracking-tight mb-2">Staff Invite Ready</h3>
                            <p className="text-gray-500 text-sm font-medium leading-relaxed">Share this link with <span className="text-brand-black font-bold">{staffInvite.name}</span> to complete their onboarding.</p>
                        </div>

                        <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 font-mono text-emerald-800 font-bold tracking-widest text-lg">
                            {staffInvite.code}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <button onClick={()=>shareStaffInvite('cp')} className="neo-btn-secondary py-4 flex items-center justify-center gap-2">
                                <Copy className="w-4 h-4" />
                                Copy Link
                            </button>
                            <button onClick={()=>shareStaffInvite('wa')} className="bg-[#25D366] text-white rounded-xl py-4 font-bold text-xs shadow-md hover:bg-[#128C7E] transition-all flex items-center justify-center gap-2">
                                WhatsApp
                            </button>
                        </div>
                        <button onClick={()=>setStaffInvite(null)} className="text-xs font-black uppercase tracking-widest text-gray-400 hover:text-brand-black transition-colors">Done</button>
                    </div>
                </div>
            )}
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

            {showOfflinePass && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white dark:bg-stone-900 border border-transparent dark:border-stone-800 w-full max-w-sm p-8 rounded-[2rem] shadow-2xl text-center space-y-6">
                        <div className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-inner">
                            <Clock className="w-10 h-10" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-brand-black dark:text-gray-100 uppercase tracking-tight mb-2">Offline Pass</h2>
                            <p className="text-gray-500 dark:text-stone-400 text-sm font-medium">This code is valid for today. Security will verify it mathematically offline.</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-stone-800 p-6 rounded-2xl border border-gray-100 dark:border-stone-700">
                            <p className="text-5xl font-mono font-black text-brand-black dark:text-gray-100 tracking-[0.2em]">{offlineCode}</p>
                        </div>
                        <button onClick={() => setShowOfflinePass(false)} className="w-full bg-brand-black dark:bg-stone-700 text-white dark:text-gray-200 rounded-xl py-4 font-semibold text-sm shadow-md hover:bg-black dark:hover:bg-stone-600 active:scale-95 transition-all uppercase tracking-wide">Close</button>
                    </div>
                </div>
            )}

            {showGuestPass && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white dark:bg-stone-900 border border-transparent dark:border-stone-800 w-full max-w-sm p-6 rounded-2xl shadow-xl space-y-4">
                        <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-3 mb-2 text-center shadow-sm text-emerald-800 dark:text-emerald-300">
                            <h3 className="text-sm font-semibold tracking-wide uppercase">Guest Pass</h3>
                        </div>
                        <input className="w-full p-3 rounded-lg border border-gray-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-stone-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none text-sm" placeholder="Guest Name (Optional)" value={guestName} onChange={e=>setGuestName(e.target.value)} />
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 dark:text-stone-400 uppercase tracking-widest block pl-1 mb-1">Expected Time (Optional)</label>
                            <input type="time" className="w-full p-3 rounded-lg border border-gray-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none text-sm" value={guestTime} onChange={e=>setGuestTime(e.target.value)} />
                        </div>
                        <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-stone-800">
                            <button onClick={()=>setShowGuestPass(false)} className="flex-1 font-semibold text-gray-500 dark:text-stone-400 uppercase text-[11px] hover:bg-gray-50 dark:hover:bg-stone-800 rounded-xl transition-colors">Cancel</button>
                            <button onClick={() => { setShowGuestPass(false); issueCode('Guest', guestName, guestTime); setGuestName(''); setGuestTime(''); }} className="flex-[2] bg-emerald-600 text-white rounded-xl py-3 font-semibold text-xs shadow-sm uppercase hover:bg-emerald-700 transition-colors">Generate Pass</button>
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
                    <div className="bg-white dark:bg-stone-900 border border-transparent dark:border-stone-800 w-full max-w-sm p-6 rounded-2xl shadow-xl space-y-4">
                        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800/50 rounded-xl p-3 mb-2 text-center shadow-sm text-blue-800 dark:text-blue-300">
                            <h3 className="text-sm font-semibold tracking-wide uppercase">Assign Staff</h3>
                        </div>
                        <input className="w-full p-3 rounded-lg border border-gray-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-stone-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none text-sm" placeholder="Staff Full Name" value={staffFn} onChange={e=>setStaffFn(e.target.value)} />
                        <input className="w-full p-3 rounded-lg border border-gray-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-stone-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none text-sm" placeholder="Role (e.g. Driver, Chef)" value={staffRole} onChange={e=>setStaffRole(e.target.value)} />
                        <input className="w-full p-3 rounded-lg border border-gray-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-stone-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none text-sm font-mono" inputMode="numeric" placeholder="Phone Number" value={staffPhone} onChange={e=>setStaffPhone(e.target.value)} />
                        
                        <div className="bg-stone-50 dark:bg-stone-800/50 rounded-xl border border-stone-200 dark:border-stone-700 p-4 text-[11px] text-stone-600 dark:text-stone-400 font-medium leading-relaxed">
                            Upon creating, a unique Invite Code will be generated. The staff member must use this code to register and complete their profile for your approval.
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-stone-800">
                            <button onClick={()=>setShowAddStaff(false)} className="flex-1 font-semibold text-gray-500 dark:text-stone-400 uppercase text-[11px] hover:bg-gray-50 dark:hover:bg-stone-800 rounded-xl transition-colors">Cancel</button>
                            <button onClick={handleAddStaff} className="flex-[2] bg-blue-700 text-white rounded-xl py-3 font-semibold text-xs shadow-sm uppercase hover:bg-blue-800 transition-colors">Generate Invite</button>
                        </div>
                    </div>
                </div>
            )}

            {showStaffPassConfig && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4 animate-fade-in">
                    <form onSubmit={handleConfigStaffPass} className="bg-white dark:bg-stone-900 border border-transparent dark:border-stone-800 w-full max-w-sm p-6 rounded-2xl shadow-xl space-y-4">
                        <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800/50 rounded-xl p-3 mb-2 text-center shadow-sm text-indigo-800 dark:text-indigo-300">
                            <h3 className="text-sm font-semibold tracking-wide uppercase">Staff Pass config</h3>
                        </div>
                        <select className="w-full p-3 rounded-lg border border-gray-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none text-sm" value={selectedStaffUserId} onChange={e=>setSelectedStaffUserId(e.target.value)} required>
                            <option value="" disabled>Select Staff Member</option>
                            {myStaffData.map(s => <option key={s.id} value={s.id}>{s.firstName} ({s.staffRole})</option>)}
                        </select>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-500 dark:text-stone-400 uppercase tracking-widest block pl-1">Expected Days</label>
                            <div className="flex flex-wrap gap-2">
                                {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day => (
                                    <button type="button" key={day} onClick={() => setStaffPassDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])} className={clsx("px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors", staffPassDays.includes(day) ? "bg-indigo-100 border-indigo-300 dark:bg-indigo-900/50 dark:border-indigo-700 text-indigo-800 dark:text-indigo-300" : "bg-gray-50 border-gray-200 dark:bg-stone-800 dark:border-stone-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-stone-700")}>
                                        {day}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 dark:text-stone-400 uppercase tracking-widest block pl-1 mb-1">Clock In</label>
                                <input type="time" className="w-full p-3 rounded-lg border border-gray-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none text-sm" value={staffClockIn} onChange={e=>setStaffClockIn(e.target.value)} required />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 dark:text-stone-400 uppercase tracking-widest block pl-1 mb-1">Clock Out</label>
                                <input type="time" className="w-full p-3 rounded-lg border border-gray-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none text-sm" value={staffClockOut} onChange={e=>setStaffClockOut(e.target.value)} required />
                            </div>
                        </div>
                        
                        <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-stone-800">
                            <button type="button" onClick={()=>setShowStaffPassConfig(false)} className="flex-1 font-semibold text-gray-500 dark:text-stone-400 uppercase text-[11px] hover:bg-gray-50 dark:hover:bg-stone-800 rounded-xl transition-colors">Cancel</button>
                            <button type="submit" className="flex-[2] bg-indigo-700 text-white rounded-xl py-3 font-semibold text-xs shadow-sm uppercase hover:bg-indigo-800 transition-colors">Save Schedule</button>
                        </div>
                    </form>
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
                    <div className="bg-white dark:bg-stone-900 w-full max-w-sm p-6 rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto space-y-4">
                        <h3 className="font-semibold tracking-wide uppercase text-brand-black dark:text-gray-100 border-b border-gray-100 dark:border-stone-800 pb-3 mb-2">Enroll Child</h3>
                        <form onSubmit={handleEnrollKid} className="space-y-4">
                            <div><label className="text-[10px] font-semibold tracking-wide uppercase text-gray-500 mb-1 block">Full Name</label><input required value={kidName} onChange={e=>setKidName(e.target.value)} className="w-full p-3 neo-input text-sm"/></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-[10px] font-semibold tracking-wide uppercase text-gray-500 mb-1 block">Age</label><input required type="number" value={kidAge} onChange={e=>setKidAge(e.target.value)} className="w-full p-3 neo-input text-sm"/></div>
                                <div>
                                    <label className="text-[10px] font-semibold tracking-wide uppercase text-gray-500 mb-1 block">Gender</label>
                                    <select value={kidGender} onChange={e=>setKidGender(e.target.value)} className="w-full p-3 neo-input text-sm uppercase">
                                        <option>Male</option><option>Female</option>
                                    </select>
                                </div>
                            </div>
                            <div><label className="text-[10px] font-semibold tracking-wide uppercase text-gray-500 mb-1 block">Date of Birth</label><input required type="date" value={kidDob} onChange={e=>setKidDob(e.target.value)} className="w-full p-3 neo-input text-sm"/></div>
                            <div><label className="text-[10px] font-semibold tracking-wide uppercase text-gray-500 mb-1 block">Allergies / Special Prep</label><input value={kidAllergies} onChange={e=>setKidAllergies(e.target.value)} className="w-full p-3 neo-input text-sm" placeholder="Optional"/></div>
                            <div className="bg-sky-50 dark:bg-sky-900/20 rounded-xl border border-sky-100 dark:border-sky-800 p-4 mt-2">
                                <h4 className="font-semibold uppercase tracking-wide text-[10px] mb-3 text-sky-800 dark:text-sky-400">In Case of Emergency</h4>
                                <div className="space-y-3">
                                    <input required value={kidIceName} onChange={e=>setKidIceName(e.target.value)} className="w-full p-2.5 rounded-lg border border-sky-200 dark:border-sky-800 bg-white dark:bg-stone-800 focus:ring-2 focus:ring-sky-500/20 focus:outline-none text-xs dark:text-white" placeholder="ICE Contact Name"/>
                                    <input required type="tel" value={kidIcePhone} onChange={e=>setKidIcePhone(e.target.value)} className="w-full p-2.5 rounded-lg border border-sky-200 dark:border-sky-800 bg-white dark:bg-stone-800 focus:ring-2 focus:ring-sky-500/20 focus:outline-none text-xs font-mono dark:text-white" placeholder="ICE Contact Phone"/>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-stone-800">
                                <button type="button" onClick={()=>setShowAddKid(false)} className="flex-1 font-semibold text-gray-500 uppercase text-[11px] hover:bg-gray-50 dark:hover:bg-stone-800 rounded-xl transition-colors py-3">Cancel</button>
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

            {/* iOS Style Bottom Navigation */}
            <div className="absolute bottom-0 w-full bg-white/90 dark:bg-stone-900/90 backdrop-blur-md border-t border-gray-100 dark:border-stone-800 flex items-center justify-around pb-6 pt-3 px-2 z-40 transition-colors">
                <button onClick={() => setViewTab('dash')} className={`flex flex-col items-center gap-1 p-2 ${viewTab === 'dash' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-stone-500'}`}>
                    <Home className="w-6 h-6" />
                    <span className="text-[10px] h-[12px] font-bold">{t('home')}</span>
                </button>
                <button onClick={() => setViewTab('auth')} className={`flex flex-col items-center gap-1 p-2 ${viewTab === 'auth' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-stone-500'}`}>
                    <UserPlus className="w-6 h-6" />
                    <span className="text-[10px] h-[12px] font-bold">{t('pass')}</span>
                </button>
                <div className="-mt-8">
                    <button onClick={handleTriggerSOS} className="bg-red-500 hover:bg-red-600 text-white p-4 rounded-full shadow-lg shadow-red-500/30 transform transition-transform active:scale-95 border-4 border-stone-100 dark:border-stone-950">
                        <Shield className="w-6 h-6" />
                    </button>
                </div>
                <button onClick={() => setViewTab('bc')} className={`flex flex-col items-center gap-1 p-2 ${viewTab === 'bc' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-stone-500'}`}>
                    <Bell className="w-6 h-6" />
                    <span className="text-[10px] h-[12px] font-bold">{t('notices')}</span>
                </button>
                <button onClick={() => setMenuOpen(true)} className={`flex flex-col items-center gap-1 p-2 text-gray-400 dark:text-stone-500 hover:text-gray-600 dark:hover:text-stone-400`}>
                    <Menu className="w-6 h-6" />
                    <span className="text-[10px] h-[12px] font-bold">{t('menu')}</span>
                </button>
            </div>

            {/* Sliding Side Menu */}
            {menuOpen && (
                <div className="fixed inset-0 z-[300] flex">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={() => setMenuOpen(false)}></div>
                    <div className={"relative w-64 bg-white dark:bg-stone-900 border-x border-gray-100 dark:border-stone-800 h-full flex flex-col shadow-2xl transition-transform duration-300 " + (lang === 'ar' ? 'animate-slide-in-right left-auto right-0' : 'animate-slide-in-left')}>
                        <div className="p-5 border-b border-gray-100 dark:border-stone-800 flex justify-between items-center bg-gray-50/50 dark:bg-stone-800/50">
                            <span className="font-bold text-gray-900 dark:text-gray-100">{t('menu')}</span>
                            <button onClick={() => setMenuOpen(false)} className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-stone-300 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
                            <button onClick={() => { setViewTab('tickets'); setMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${viewTab === 'tickets' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'text-gray-600 dark:text-stone-400 hover:bg-gray-50 dark:hover:bg-stone-800'}`}>
                                <Wrench className="w-5 h-5" /> <span className="font-semibold text-sm">{t('tickets')}</span>
                            </button>
                            <button onClick={() => { setViewTab('kids'); setMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${viewTab === 'kids' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'text-gray-600 dark:text-stone-400 hover:bg-gray-50 dark:hover:bg-stone-800'}`}>
                                <BookOpen className="w-5 h-5" /> <span className="font-semibold text-sm">{t('madrasa')}</span>
                            </button>
                            <button onClick={() => { setViewTab('staff'); setMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${viewTab === 'staff' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'text-gray-600 dark:text-stone-400 hover:bg-gray-50 dark:hover:bg-stone-800'}`}>
                                <Users className="w-5 h-5" /> <span className="font-semibold text-sm">{t('my_staff')}</span>
                            </button>
                            <button onClick={() => { setViewTab('polls'); setMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${viewTab === 'polls' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'text-gray-600 dark:text-stone-400 hover:bg-gray-50 dark:hover:bg-stone-800'}`}>
                                <MessageSquare className="w-5 h-5" /> <span className="font-semibold text-sm">{t('townhall')}</span>
                            </button>
                            <button onClick={() => { setViewTab('svcs'); setMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${viewTab === 'svcs' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'text-gray-600 dark:text-stone-400 hover:bg-gray-50 dark:hover:bg-stone-800'}`}>
                                <ScanLine className="w-5 h-5" /> <span className="font-semibold text-sm">{t('marketplace')}</span>
                            </button>
                            <button onClick={() => { setViewTab('hist'); setMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${viewTab === 'hist' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'text-gray-600 dark:text-stone-400 hover:bg-gray-50 dark:hover:bg-stone-800'}`}>
                                <Clock className="w-5 h-5" /> <span className="font-semibold text-sm">{t('activity_logs')}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
