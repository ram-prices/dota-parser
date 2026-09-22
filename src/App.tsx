import { useState } from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Dashboard } from "./pages/Dashboard";
import { MatchDetail } from "./pages/MatchDetail";
import { HeroStats } from "./pages/HeroStats";
import { Peers } from "./pages/Peers";
import { PlayerVs } from "./pages/PlayerVs";
import { Trends } from "./pages/Trends";
import { ChatSearch } from "./pages/ChatSearch";
import { Settings } from "./pages/Settings";
import { getAccountId } from "./settings";

function RequireAccount({ children }: { children: (accountId: number) => React.ReactNode }) {
  const [accountId] = useState(getAccountId);
  const location = useLocation();
  if (accountId == null) {
    return <Navigate to="/settings" state={{ from: location }} replace />;
  }
  return <>{children(accountId)}</>;
}

export function App() {
  return (
    <div className="app">
      <header className="app-header">
        <Link to="/" className="brand">
          Dota Stats
        </Link>
        <nav>
          <Link to="/">Matches</Link>
          <Link to="/trends">Trends</Link>
          <Link to="/heroes">Heroes</Link>
          <Link to="/peers">Teammates</Link>
          <Link to="/search">Chat search</Link>
          <Link to="/settings">Settings</Link>
        </nav>
      </header>
      <main className="app-main">
        <Routes>
          <Route
            path="/"
            element={<RequireAccount>{(accountId) => <Dashboard accountId={accountId} />}</RequireAccount>}
          />
          <Route
            path="/trends"
            element={<RequireAccount>{(accountId) => <Trends accountId={accountId} />}</RequireAccount>}
          />
          <Route
            path="/heroes"
            element={<RequireAccount>{(accountId) => <HeroStats accountId={accountId} />}</RequireAccount>}
          />
          <Route
            path="/peers"
            element={<RequireAccount>{(accountId) => <Peers accountId={accountId} />}</RequireAccount>}
          />
          <Route path="/search" element={<ChatSearch />} />
          <Route path="/matches/:matchId" element={<MatchDetail />} />
          <Route
            path="/vs/:targetAccountId"
            element={<RequireAccount>{(accountId) => <PlayerVs accountId={accountId} />}</RequireAccount>}
          />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}
