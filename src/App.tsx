import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DataProvider } from './contexts/DataContext';
import { AuthProvider } from './contexts/AuthContext';
import { Layout } from './components/layout/Layout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';

// Pages
import { Dashboard } from './pages/Dashboard';
import { Transactions } from './pages/Transactions';
import { Reports } from './pages/Reports';
import { Manage } from './pages/Manage';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { Profile } from './pages/Profile';
import { Admin } from './pages/Admin';
import { Commitments } from './pages/Commitments';
import { Savings } from './pages/Savings';
import { Investments } from './pages/Investments';
import { Help } from './pages/Help';
import { LandingPage } from './pages/LandingPage';
import { DemoPage } from './pages/DemoPage';

import { OrientationLock } from './components/ui/OrientationLock';
import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';

function App() {
    useEffect(() => {
        // Attempt to lock orientation to portrait on mobile devices
        const lockOrientation = async () => {
            if (window.innerWidth <= 768 && 'orientation' in screen && 'lock' in (screen.orientation as any)) {
                try {
                    await (screen.orientation as any).lock('portrait');
                } catch (e) {
                    console.warn('Orientation lock failed:', e);
                }
            }
        };

        lockOrientation();
    }, []);

    return (
        <AuthProvider>
            <DataProvider>
                <Toaster position="top-right" reverseOrder={false} />
                <OrientationLock />
                <BrowserRouter>
                    <Routes>
                        <Route path="/" element={<LandingPage />} />
                        <Route path="/demo" element={<DemoPage />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/forgot-password" element={<ForgotPassword />} />
                        <Route path="/reset-password" element={<ResetPassword />} />

                        <Route element={<ProtectedRoute />}>
                            <Route element={<Layout />}>
                                <Route path="/dashboard" element={<Dashboard />} />
                                <Route path="/transactions" element={<Transactions />} />
                                <Route path="/commitments" element={<Commitments />} />
                                <Route path="/savings" element={<Savings />} />
                                <Route path="/investments" element={<Investments />} />
                                <Route path="/reports" element={<Reports />} />
                                <Route path="/manage" element={<Manage />} />
                                <Route path="/settings" element={<Settings />} />
                                <Route path="/profile" element={<Profile />} />
                                <Route path="/help" element={<Help />} />
                                <Route path="/admin" element={<Admin />} />
                            </Route>
                        </Route>

                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </BrowserRouter>
            </DataProvider>
        </AuthProvider>
    );
}

export default App;
