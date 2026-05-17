import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, initAuthFlow } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

type View = 'landing' | 'login' | 'register' | 'resident' | 'security' | 'admin' | 'staff_register' | 'staff' | 'madrasa_admin';

interface AppContextType {
    view: View;
    setView: (view: View, params?: any) => void;
    viewParams: any;
    profile: any;
    setProfile: (profile: any) => void;
    notify: (msg: string, type?: 'success' | 'error') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
    const [view, setViewState] = useState<View>('landing');
    const [viewParams, setViewParams] = useState<any>({});
    const [profile, setProfile] = useState<any>(null);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setLoading(false);
            } else {
                initAuthFlow();
            }
        });
        return () => unsubscribe();
    }, []);

    const setView = (v: View, params: any = {}) => {
        setViewState(v);
        setViewParams(params);
        window.scrollTo(0, 0);
    };

    const notify = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    };

    if (loading) {
        return (
            <div className="fixed inset-0 flex flex-col items-center justify-center bg-white z-[200]">
                <div className="w-16 h-16 border-4 border-black border-t-brand-lime rounded-full animate-spin"></div>
                <p className="mt-6 text-black font-black tracking-widest uppercase text-xs">Loading System...</p>
            </div>
        );
    }

    return (
        <AppContext.Provider value={{ view, setView, viewParams, profile, setProfile, notify }}>
            {children}
            <div className={`fixed bottom-6 left-4 right-4 z-[300] transform transition-all duration-500 pointer-events-none ${toast ? 'translate-y-0' : 'translate-y-40'}`}>
                {toast && (
                    <div className="bg-black text-white px-6 py-4 border-2 border-black shadow-neo mx-auto max-w-sm pointer-events-auto flex items-center gap-4">
                        {toast.type === 'error' ? (
                            <svg className="w-5 h-5 flex-shrink-0 text-brand-pink" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5 flex-shrink-0 text-brand-lime" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        )}
                        <span className="font-bold text-xs uppercase tracking-wider leading-tight">{toast.msg}</span>
                    </div>
                )}
            </div>
        </AppContext.Provider>
    );
}

export const useApp = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
};
