import React, { useState } from 'react';
import { useApp } from '../lib/context';
import { db, appId } from '../lib/firebase';
import { collection, getDocs, updateDoc, doc, query, where } from 'firebase/firestore';
import { hashPin } from '../lib/utils';
import { AlertTriangle, Eye, EyeOff } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

export default function StaffRegister() {
    const { setView, viewParams, notify } = useApp();
    const [inviteCode, setInviteCode] = useState(viewParams.inviteCode || '');
    const [staffDocId, setStaffDocId] = useState<string | null>(null);
    const [staffData, setStaffData] = useState<any>(null);

    const [dob, setDob] = useState('');
    const [gender, setGender] = useState('');
    const [address, setAddress] = useState('');
    const [nin, setNin] = useState('');
    const [bvn, setBvn] = useState('');
    const [nokName, setNokName] = useState('');
    const [nokPhone, setNokPhone] = useState('');
    const [nokRel, setNokRel] = useState('');
    const [passportPhoto, setPassportPhoto] = useState<string>('');
    const [idDocument, setIdDocument] = useState<string>('');
    const [nokIdDocument, setNokIdDocument] = useState<string>('');
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [showPin, setShowPin] = useState(false);
    const [showConfirmPin, setShowConfirmPin] = useState(false);
    const [loading, setLoading] = useState(false);

    React.useEffect(() => {
        if (viewParams.inviteCode) {
            verifyCode(viewParams.inviteCode);
        }
    }, [viewParams.inviteCode]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string>>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (ev) => {
                const img = document.createElement('img');
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 600;
                    const scaleSize = img.width > MAX_WIDTH ? (MAX_WIDTH / img.width) : 1;
                    canvas.width = img.width * scaleSize;
                    canvas.height = img.height * scaleSize;
                    const ctx = canvas.getContext('2d');
                    if (ctx) ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    setter(canvas.toDataURL('image/jpeg', 0.6));
                };
                if (ev.target?.result) img.src = ev.target.result as string;
            };
            reader.readAsDataURL(file);
        }
    };

    const verifyCode = async (code: string) => {
        setLoading(true);
        try {
            const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'users'), where('appId', '==', appId), where('inviteCode', '==', code), where('role', '==', 'staff'));
            const snap = await getDocs(q);
            if (snap.empty) {
                notify('Invalid Invite Code', 'error');
                setLoading(false);
                return;
            }
            const docData = snap.docs[0];
            const data = docData.data();
            if (data.status !== 'pending_employee_completion') {
                notify('This invite code has already been used.', 'error');
                setLoading(false);
                return;
            }
            setStaffDocId(docData.id);
            setStaffData(data);
        } catch (error) {
            console.error(error);
            notify('Verification failed. Try again.', 'error');
        }
        setLoading(false);
    }

    const checkInviteCode = async (e: React.FormEvent) => {
        e.preventDefault();
        verifyCode(inviteCode);
    };

    const handleCompleteProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (pin.trim() !== confirmPin.trim()) return notify('PINs do not match', 'error');
        if (pin.trim().length !== 6) return notify('PIN must be 6 digits', 'error');
        if (nin.length !== 11) return notify('NIN must be 11 digits', 'error');
        if (bvn.length !== 11) return notify('BVN must be 11 digits', 'error');
        if (!passportPhoto || !idDocument || !nokIdDocument) return notify('Please upload all required photos & documents.', 'error');
        
        setLoading(true);
        try {
            const hashedPin = await hashPin(pin.trim());
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', staffDocId!), {
                dob, gender, address, nin, bvn, 
                nextOfKin: { name: nokName, phone: nokPhone, relationship: nokRel, idDocument: nokIdDocument },
                passportPhoto,
                idDocument,
                pin: hashedPin,
                status: 'pending_resident_approval',
                inviteCode: null, // Clear invite code so it can't be reused
                updatedAt: new Date()
            });
            notify('Profile completed! Pending approval from your employer.');
            setView('login');
        } catch (error) {
            console.error(error);
            notify('Failed to complete profile.', 'error');
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 animate-fade-in relative bg-stone-50/50">
            <div className="fixed top-6 right-6 z-[100]">
                <ThemeToggle />
            </div>
            <div className="w-full max-w-sm mb-6 bg-brand-pink border-4 border-brand-black p-4 shadow-neo-sm opacity-80">
                <p className="font-black text-[10px] text-brand-black uppercase tracking-widest mb-1 flex items-center gap-2"><AlertTriangle className="w-3 h-3" /> Identity Verification</p>
                <p className="text-[11px] text-brand-black font-medium leading-tight">Staff onboarding requires verified national credentials.</p>
            </div>
            
            <div className="bg-white w-full max-w-sm p-8 neo-card border-4 rounded-xl">
                <h2 className="text-xl font-black text-brand-black text-center mb-8 uppercase tracking-tighter">Staff Onboarding</h2>
                
                {!staffDocId ? (
                    <form onSubmit={checkInviteCode} className="space-y-4">
                        <label className="text-[10px] font-black uppercase text-brand-black mb-1 block">Enter your Invite Code</label>
                        <input required placeholder="6-Digit Invite Code" value={inviteCode} onChange={e => setInviteCode(e.target.value.toUpperCase())} className="w-full p-4 neo-input text-center text-xl font-mono tracking-widest uppercase" maxLength={6} disabled={loading} />
                        <button type="submit" disabled={loading} className="w-full neo-btn-primary py-4 text-sm shadow-neo active:translate-y-1 active:shadow-none transition-all mt-4">{loading ? 'Verifying...' : 'Verify Code'}</button>
                    </form>
                ) : (
                    <form onSubmit={handleCompleteProfile} className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                        <div className="bg-brand-lime p-3 border-2 border-brand-black mb-4">
                            <p className="text-[10px] font-black uppercase">Employer: {staffData.employerId}</p>
                            <p className="text-[10px] font-black uppercase">Role: {staffData.staffRole}</p>
                        </div>
                        
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-brand-black bg-brand-gray inline-block px-1 border-2 border-brand-black">Personal Info</label>
                            <div className="grid grid-cols-2 gap-2">
                                <input required type="date" value={dob} onChange={e => setDob(e.target.value)} className="w-full p-3 neo-input text-xs" />
                                <select required value={gender} onChange={e => setGender(e.target.value)} className="w-full p-3 neo-input text-xs bg-white">
                                    <option value="" disabled>Gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                </select>
                            </div>
                            <input required placeholder="Residential Address (outside estate)" value={address} onChange={e => setAddress(e.target.value)} className="w-full p-3 neo-input text-xs" />
                        </div>

                        <div className="space-y-2 mt-4">
                            <label className="text-[10px] font-black uppercase text-brand-black bg-brand-lime inline-block px-1 border-2 border-brand-black">Passport Photograph</label>
                            <input required type="file" accept="image/*" onChange={e => handleImageUpload(e, setPassportPhoto)} className="w-full p-2 neo-input text-xs bg-white" />
                            {passportPhoto && <img src={passportPhoto} alt="Passport" className="w-24 h-24 object-cover border-4 border-brand-black mt-2" />}
                        </div>

                        <div className="space-y-2 mt-4">
                            <label className="text-[10px] font-black uppercase text-brand-black bg-brand-cyan text-white inline-block px-1 border-2 border-brand-black">National IDs</label>
                            <input required inputMode="numeric" pattern="[0-9]*" maxLength={11} placeholder="11-Digit NIN" value={nin} onChange={e => setNin(e.target.value)} className="w-full p-3 neo-input text-xs font-mono" />
                            <input required inputMode="numeric" pattern="[0-9]*" maxLength={11} placeholder="11-Digit BVN" value={bvn} onChange={e => setBvn(e.target.value)} className="w-full p-3 neo-input text-xs font-mono" />
                            <div className="mt-2">
                                <label className="text-[9px] font-black uppercase text-gray-500 mb-1 block">Upload NIN/Driver's License/Int. Passport</label>
                                <input required type="file" accept="image/*" onChange={e => handleImageUpload(e, setIdDocument)} className="w-full p-2 neo-input text-xs bg-white" />
                                {idDocument && <img src={idDocument} alt="ID Document" className="w-full h-32 object-cover border-4 border-brand-black mt-2" />}
                            </div>
                        </div>

                        <div className="space-y-2 mt-4">
                            <label className="text-[10px] font-black uppercase text-brand-black bg-brand-pink inline-block px-1 border-2 border-brand-black">Next of Kin / Guarantor</label>
                            <input required placeholder="Full Name" value={nokName} onChange={e => setNokName(e.target.value)} className="w-full p-3 neo-input text-xs" />
                            <div className="grid grid-cols-2 gap-2">
                                <input required type="tel" placeholder="Phone" value={nokPhone} onChange={e => setNokPhone(e.target.value)} className="w-full p-3 neo-input text-xs" />
                                <input required placeholder="Relationship" value={nokRel} onChange={e => setNokRel(e.target.value)} className="w-full p-3 neo-input text-xs" />
                            </div>
                            <div className="mt-2">
                                <label className="text-[9px] font-black uppercase text-gray-500 mb-1 block">Upload Guarantor's ID (NIN/Driver's/Int. Passport)</label>
                                <input required type="file" accept="image/*" onChange={e => handleImageUpload(e, setNokIdDocument)} className="w-full p-2 neo-input text-xs bg-white" />
                                {nokIdDocument && <img src={nokIdDocument} alt="NOK ID Document" className="w-full h-32 object-cover border-4 border-brand-black mt-2" />}
                            </div>
                        </div>

                        <div className="space-y-2 pt-4 border-t-4 border-brand-black mt-4">
                            <p className="text-center text-[10px] font-black text-brand-black uppercase tracking-widest bg-brand-lime inline-block px-2 border-2 border-brand-black mx-auto block">Set App PIN</p>
                            <div className="relative">
                                <input type={showPin ? 'text' : 'password'} maxLength={6} inputMode="numeric" pattern="[0-9]*" placeholder="6-Digit PIN" value={pin} onChange={e => setPin(e.target.value)} className="w-full p-3 neo-input font-mono text-center tracking-[0.4em] text-lg" />
                                <button type="button" onClick={() => setShowPin(!showPin)} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-black p-2">{showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                            </div>
                            <div className="relative">
                                <input type={showConfirmPin ? 'text' : 'password'} maxLength={6} inputMode="numeric" pattern="[0-9]*" placeholder="Confirm PIN" value={confirmPin} onChange={e => setConfirmPin(e.target.value)} className="w-full p-3 neo-input font-mono text-center tracking-[0.4em] text-lg" />
                                <button type="button" onClick={() => setShowConfirmPin(!showConfirmPin)} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-black p-2">{showConfirmPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                            </div>
                        </div>

                        <button type="submit" disabled={loading} className="w-full neo-btn-primary py-4 text-sm shadow-neo active:translate-y-1 active:shadow-none transition-all mt-4">{loading ? 'Submitting...' : 'Submit Profile'}</button>
                    </form>
                )}
            </div>
            <button onClick={() => setView('login')} className="mt-6 text-gray-500 font-bold text-[10px] uppercase tracking-widest p-2 hover:text-brand-black">Cancel</button>
        </div>
    );
}
