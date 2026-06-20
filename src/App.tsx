import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { EditorPage } from '@/pages/EditorPage';
import { ToastContainer } from '@/components/common/Toast';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<EditorPage />} />
      </Routes>
      <ToastContainer />
    </Router>
  );
}
