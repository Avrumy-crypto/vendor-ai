import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import ChatPage from './pages/ChatPage';
import KnowledgePage from './pages/KnowledgePage';
import AdminPage from './pages/AdminPage';
import AuditPage from './pages/AuditPage';
import InvitePage from './pages/InvitePage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/invite/:token" element={<InvitePage />} />
          <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
          <Route path="/chat/:convId" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
          <Route path="/knowledge" element={<ProtectedRoute roles={['manager', 'admin']}><KnowledgePage /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminPage /></ProtectedRoute>} />
          <Route path="/audit" element={<ProtectedRoute roles={['admin']}><AuditPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/chat" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
