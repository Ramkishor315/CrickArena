import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import LiveActionOverlay from './components/LiveActionOverlay';
import Home from './pages/Home';
import NewMatch from './pages/NewMatch';
import Scoring from './pages/Scoring';
import Scoreboard from './pages/Scoreboard';
import History from './pages/History';
import Players from './pages/Players';
import PlayerProfile from './pages/PlayerProfile';
import Teams from './pages/Teams';

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#1c2534',
            color: '#f1f5f9',
            border: '1.5px solid #243044',
            borderRadius: '12px',
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.9rem',
          },
        }}
      />
      
      {/* Temporarily commented out to verify if it was causing render issues */}
      <LiveActionOverlay />

      <Routes>
        <Route element={<Layout />}>
          <Route path="/"                      element={<Home />} />
          <Route path="/match/new"             element={<NewMatch />} />
          <Route path="/match/:id/score"       element={<Scoring />} />
          <Route path="/match/:id"             element={<Scoreboard />} />
          <Route path="/history"               element={<History />} />
          <Route path="/players"               element={<Players />} />
          <Route path="/players/:id"           element={<PlayerProfile />} />
          <Route path="/teams"                 element={<Teams />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
