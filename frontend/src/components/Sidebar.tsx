import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAppStore } from '../store/appStore'
import { api } from '../utils/api'
import type { AgentType } from '../utils/api'

const NAV = [
  { id: 'chat',      label: 'Chat',      icon: (a:boolean) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={a?'#818cf8':'#4b5563'} strokeWidth="1.8">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  )},
  { id: 'documents', label: 'Documents', icon: (a:boolean) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={a?'#818cf8':'#4b5563'} strokeWidth="1.8">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
    </svg>
  )},
  { id: 'insights',  label: 'Insights',  icon: (a:boolean) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={a?'#818cf8':'#4b5563'} strokeWidth="1.8">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  )},
  { id: 'history',   label: 'History',   icon: (a:boolean) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={a?'#818cf8':'#4b5563'} strokeWidth="1.8">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  )},
] as const

const AGENTS: { id: AgentType; label: string; color: string; icon: string; desc: string }[] = [
  { id: 'query',    label: 'Query',    color: '#6366f1', icon: '⊕', desc: 'Factual Q&A' },
  { id: 'analysis', label: 'Analysis', color: '#8b5cf6', icon: '◈', desc: 'Deep insights' },
  { id: 'report',   label: 'Report',   color: '#06b6d4', icon: '▤', desc: 'Generate docs' },
  { id: 'action',   label: 'Action',   color: '#f59e0b', icon: '◆', desc: 'Decisions' },
]

export default function Sidebar() {
  const { activeTab, setActiveTab, activeAgent, setActiveAgent } = useAppStore()
  const { data: health } = useQuery({ queryKey:['health'], queryFn:api.getHealth, refetchInterval:30000, retry:false })
  const online = health?.status === 'healthy'

  return (
    <aside style={{
      width: 230, minWidth: 230, height: '100vh', display: 'flex', flexDirection: 'column',
      background: '#0b0d14', borderRight: '1px solid rgba(255,255,255,0.05)',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Subtle gradient top */}
      <div style={{ position:'absolute', top:0, left:0, right:0, height:200, background:'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.08) 0%, transparent 70%)', pointerEvents:'none' }} />

      {/* Logo */}
      <div style={{ padding:'22px 18px 18px', borderBottom:'1px solid rgba(255,255,255,0.05)', position:'relative' }}>
        <div style={{ display:'flex', alignItems:'center', gap:11 }}>
          <div style={{
            width:34, height:34, borderRadius:10,
            background:'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 4px 12px rgba(99,102,241,0.35)',
          }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:'#eef0f6', letterSpacing:'-0.01em' }}>Enterprise AI</div>
            <div style={{ fontSize:10.5, color:'#4b5563', marginTop:1, letterSpacing:'0.01em' }}>Knowledge Platform</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <div style={{ padding:'14px 10px 8px', position:'relative' }}>
        <div style={{ fontSize:9.5, fontWeight:600, color:'#374151', textTransform:'uppercase', letterSpacing:'0.1em', padding:'0 8px 8px' }}>Menu</div>
        {NAV.map(({ id, label, icon }) => {
          const active = activeTab === id
          return (
            <button key={id} onClick={() => setActiveTab(id)} style={{
              width:'100%', display:'flex', alignItems:'center', gap:10,
              padding:'8.5px 10px', borderRadius:8, border:'none', cursor:'pointer',
              marginBottom:1, fontSize:13, fontWeight: active?500:400, textAlign:'left',
              background: active ? 'rgba(99,102,241,0.12)' : 'transparent',
              color: active ? '#a5b4fc' : '#6b7280',
              transition:'all 0.15s',
              outline: 'none',
            }}>
              {icon(active)}
              {label}
              {active && <div style={{ marginLeft:'auto', width:4, height:4, borderRadius:'50%', background:'#6366f1' }} />}
            </button>
          )
        })}
      </div>

      {/* Divider */}
      <div style={{ height:1, background:'rgba(255,255,255,0.04)', margin:'4px 10px' }} />

      {/* Agents */}
      <div style={{ padding:'10px 10px', flex:1 }}>
        <div style={{ fontSize:9.5, fontWeight:600, color:'#374151', textTransform:'uppercase', letterSpacing:'0.1em', padding:'0 8px 8px' }}>Agent Mode</div>
        {AGENTS.map(agent => {
          const active = activeAgent === agent.id
          return (
            <button key={agent.id} onClick={() => setActiveAgent(agent.id)} style={{
              width:'100%', display:'flex', alignItems:'center', gap:10,
              padding:'8px 10px', borderRadius:8, marginBottom:2,
              border: active ? `1px solid ${agent.color}25` : '1px solid transparent',
              background: active ? `${agent.color}0e` : 'transparent',
              cursor:'pointer', textAlign:'left', transition:'all 0.15s', outline:'none',
            }}>
              <div style={{
                width:26, height:26, borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center',
                background: active ? `${agent.color}20` : 'rgba(255,255,255,0.04)',
                border: active ? `1px solid ${agent.color}30` : '1px solid rgba(255,255,255,0.06)',
                fontSize:12, color: active ? agent.color : '#4b5563',
                transition:'all 0.15s', flexShrink:0,
              }}>
                {agent.icon}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12.5, fontWeight:active?500:400, color:active?agent.color:'#6b7280', lineHeight:1.2 }}>{agent.label}</div>
                <div style={{ fontSize:10.5, color:'#374151', marginTop:1 }}>{agent.desc}</div>
              </div>
              {active && (
                <div style={{ fontSize:9, fontWeight:600, color:agent.color, background:`${agent.color}15`, padding:'2px 6px', borderRadius:99, letterSpacing:'0.05em' }}>ON</div>
              )}
            </button>
          )
        })}
      </div>

      {/* Footer */}
      <div style={{ padding:'12px 18px 16px', borderTop:'1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
          <div style={{
            width:7, height:7, borderRadius:'50%', flexShrink:0,
            background: online ? '#22c55e' : '#ef4444',
            boxShadow: online ? '0 0 0 3px rgba(34,197,94,0.15)' : 'none',
          }} />
          <span style={{ fontSize:11, color: online ? '#4ade80' : '#f87171', fontWeight:500 }}>
            {online ? 'Systems operational' : 'Backend offline'}
          </span>
        </div>
        <div style={{ fontSize:10.5, color:'#374151', lineHeight:1.5 }}>
          Vector DB · Redis · PostgreSQL
        </div>
      </div>
    </aside>
  )
}