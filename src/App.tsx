import { HashRouter, Routes, Route } from "react-router-dom";
import Launcher from "@/pages/Launcher";
import Dashboard from "@/pages/Dashboard";
import NewProject from "@/pages/NewProject";

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Launcher />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/new-project" element={<NewProject />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
