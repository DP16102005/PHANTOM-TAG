import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Register from './pages/Register.jsx';
import Scout from './pages/Scout.jsx';
import ViolationDetail from './pages/ViolationDetail.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/register" element={<Register />} />
          <Route path="/scout" element={<Scout />} />
          <Route path="/violation/:id" element={<ViolationDetail />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
