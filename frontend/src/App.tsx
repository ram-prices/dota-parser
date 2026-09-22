import { Link, Route, Routes } from "react-router-dom";
import { Dashboard } from "./pages/Dashboard";
import { MatchDetail } from "./pages/MatchDetail";
import { Player } from "./pages/Player";

export function App() {
  return (
    <div className="app">
      <header className="app-header">
        <Link to="/" className="brand">
          Dota Parser
        </Link>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/matches/:matchId" element={<MatchDetail />} />
          <Route path="/player/:accountId" element={<Player />} />
        </Routes>
      </main>
    </div>
  );
}
