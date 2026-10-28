import { Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ChallengePage from './pages/ChallengePage';
import CreateChallengePage from './pages/CreateChallengePage';
import PrivacyIncidentNoticePage from './pages/PrivacyIncidentNoticePage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/create" element={<CreateChallengePage />} />
      <Route path="/notice/privacy" element={<PrivacyIncidentNoticePage />} />
      <Route path="/c/:code" element={<ChallengePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
