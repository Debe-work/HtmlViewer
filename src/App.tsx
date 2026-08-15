import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { HomePage } from './pages/HomePage.tsx'
import { OpenPage } from './pages/OpenPage.tsx'
import { RepoPage } from './pages/RepoPage.tsx'
import { SettingsPage } from './pages/SettingsPage.tsx'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/open" element={<OpenPage />} />
        <Route path="/r/:owner/:repo" element={<RepoPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
