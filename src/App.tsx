import { HashRouter, Routes, Route } from "react-router-dom";
import Launcher from "@/pages/Launcher";
import Dashboard from "@/pages/Dashboard";

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Launcher />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
