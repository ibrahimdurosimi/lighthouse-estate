import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, initAuthFlow } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import SplashScreen from '../components/SplashScreen';

type View = 'landing' | 'login' | 'register' | 'resident' | 'security' | 'admin' | 'staff_register' | 'staff' | 'madrasa_admin';
import { Lang, getTranslation } from './i18n';

interface AppContextType {
    view: View;
    setView: (view: View, params?: any) => void;
    viewParams: any;
    profile: any;
    setProfile: (profile: any) => void;
    notify: (msg: string, type?: 'success' | 'error') => void;
    isDarkMode: boolean;
    toggleDarkMode: () => void;
    lang: Lang;
    setLang: (l: Lang) => void;
    t: (key: any) => string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
    const [view, setViewState] = useState<View>('login');
    const [viewParams, setViewParams] = useState<any>({});
    const [profile, setProfile] = useState<any>(null);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [loading, setLoading] = useState(true);
    const [showSplash, setShowSplash] = useState(true);
    const [lang, setLangState] = useState<Lang>(() => {
        return (localStorage.getItem('appLang') as Lang) || 'en';
    });
    const [isDarkMode, setIsDarkMode] = useState(() => {
        const saved = localStorage.getItem('isDarkMode');
        return saved ? JSON.parse(saved) : true;
    });

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('isDarkMode', JSON.stringify(isDarkMode));
    }, [isDarkMode]);

    useEffect(() => {
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
        localStorage.setItem('appLang', lang);
    }, [lang]);

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

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const inviteCode = urlParams.get('inviteCode');
        const viewOverride = urlParams.get('view');
        
        if (viewOverride === 'staff_onboarding' && inviteCode) {
            setView('staff_register', { inviteCode });
        }
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

    const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

    const t = (key: any) => getTranslation(lang, key);

    if (loading) {
        return (
            <div className="fixed inset-0 flex flex-col items-center justify-center bg-white dark:bg-stone-950 z-[200]">
                <div className="w-16 h-16 border-4 border-gray-200 border-t-emerald-600 rounded-full animate-spin"></div>
                <p className="mt-6 text-gray-800 dark:text-gray-200 font-black tracking-widest uppercase text-xs">Loading System...</p>
            </div>
        );
    }

    return (
        <AppContext.Provider value={{ view, setView, viewParams, profile, setProfile, notify, isDarkMode, toggleDarkMode, lang, setLang: setLangState, t }}>
            {showSplash ? (
                <SplashScreen onFinish={() => {
                    localStorage.setItem('hasSeenSplash', 'true');
                    setShowSplash(false);
                }} />
            ) : children}
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
