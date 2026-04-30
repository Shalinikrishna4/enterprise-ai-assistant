
import React from 'react'
import { useAppStore } from './store/appStore'
import Sidebar from './components/Sidebar'
import ChatPage from './pages/ChatPage'
import DocumentsPage from './pages/DocumentsPage'
import InsightsPage from './pages/InsightsPage'
import HistoryPage from './pages/HistoryPage'

export default function App() {
  const { activeTab } = useAppStore()
  const pages: Record<string, React.ReactNode> = {
    chat: <ChatPage />,
    documents: <DocumentsPage />,
    insights: <InsightsPage />,
    history: <HistoryPage />,
  }
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#080a0f' }}>
      <Sidebar />
      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {pages[activeTab] ?? <ChatPage />}
      </main>
    </div>
  )
}