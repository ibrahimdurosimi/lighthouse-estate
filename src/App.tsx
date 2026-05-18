import { AppProvider, useApp } from './lib/context';
import Landing from './components/Landing';
import Login from './components/Login';
import Register from './components/Register';
import Resident from './components/Resident';
import Security from './components/Security';
import Admin from './components/Admin';
import MadrasaAdmin from './components/MadrasaAdmin';
import StaffRegister from './components/StaffRegister';

function AppContent() {
    const { view } = useApp();

    return (
        <div className="min-h-screen bg-stone-100 dark:bg-stone-900 flex items-center justify-center font-sans transition-colors">
            <main className="w-full max-w-[430px] h-[932px] md:h-[844px] bg-white dark:bg-stone-950 text-gray-900 dark:text-gray-100 shadow-[0_2.8px_2.2px_rgba(0,0,0,0.034),0_6.7px_5.3px_rgba(0,0,0,0.048),0_12.5px_10px_rgba(0,0,0,0.06),0_22.3px_17.9px_rgba(0,0,0,0.072),0_41.8px_33.4px_rgba(0,0,0,0.086),0_100px_80px_rgba(0,0,0,0.12)] relative overflow-hidden flex flex-col md:rounded-[3rem] md:border-[8px] md:border-stone-800 transition-all">
                <div className="flex-1 overflow-y-auto no-scrollbar relative">
                    {view === 'landing' && <Landing />}
                    {view === 'login' && <Login />}
                    {view === 'register' && <Register />}
                    {view === 'resident' && <Resident />}
                    {view === 'security' && <Security />}
                    {view === 'admin' && <Admin />}
                    {view === 'madrasa_admin' && <MadrasaAdmin />}
                    {view === 'staff_register' && <StaffRegister />}
                </div>
            </main>
        </div>
    );
}

export default function App() {
    return (
        <AppProvider>
            <AppContent />
        </AppProvider>
    );
}
