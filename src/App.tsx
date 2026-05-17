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
        <main>
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
