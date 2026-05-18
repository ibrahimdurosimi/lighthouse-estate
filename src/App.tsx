import { AppProvider, useApp } from './lib/context';
import Landing from './components/Landing';
import Login from './components/Login';
import Register from './components/Register';
import Resident from './components/Resident';
import Security from './components/Security';
import Admin from './components/Admin';
import StaffRegister from './components/StaffRegister';
import Staff from './components/Staff';
import MadrasaAdmin from './components/MadrasaAdmin';

function AppContent() {
    const { view } = useApp();

    return (
        <main className="max-w-md mx-auto bg-brand-bg min-h-screen relative shadow-2xl overflow-x-hidden md:border-x md:border-brand-gray/30">
            {view === 'landing' && <Landing />}
            {view === 'login' && <Login />}
            {view === 'register' && <Register />}
            {view === 'resident' && <Resident />}
            {view === 'security' && <Security />}
            {view === 'admin' && <Admin />}
            {view === 'staff_register' && <StaffRegister />}
            {view === 'staff' && <Staff />}
            {view === 'madrasa_admin' && <MadrasaAdmin />}
        </main>
    );
}

export default function App() {
    return (
        <AppProvider>
            <AppContent />
        </AppProvider>
    );
}
