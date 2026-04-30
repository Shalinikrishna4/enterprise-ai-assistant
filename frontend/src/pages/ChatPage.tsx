import React, { useRef, useEffect, useState, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import { useAppStore, ChatMessage } from '../store/appStore'
import { api, AgentType } from '../utils/api'

const AGENTS: Record<string, { color: string; glow: string; label: string; hint: string; icon: string }> = {
  query:    { color:'#6366f1', glow:'rgba(99,102,241,0.25)',  label:'Query',    hint:'Factual answers from your knowledge base', icon:'⊕' },
  analysis: { color:'#8b5cf6', glow:'rgba(139,92,246,0.25)', label:'Analysis', hint:'Deep pattern & insight extraction',         icon:'◈' },
  report:   { color:'#06b6d4', glow:'rgba(6,182,212,0.25)',  label:'Report',   hint:'Generate structured enterprise reports',    icon:'▤' },
  action:   { color:'#f59e0b', glow:'rgba(245,158,11,0.25)', label:'Action',   hint:'Decision support & recommendations',        icon:'◆' },
}

const STARTERS = [
  { q:'What are the main causes of shipping delays in Q1 2024?',   agent:'query'    },
  { q:'Analyze vendor risk factors from the vendor master data',    agent:'analysis' },
  { q:'Generate a logistics performance report for this quarter',   agent:'report'   },
  { q:'Should we switch carriers due to Red Sea disruptions?',      agent:'action'   },
]

/* ── Confidence pill ─────────────────────────────── */
function ConfPill({ score }: { score: number }) {
  const [color, label] =
    score >= 0.75 ? ['#22c55e','High'] :
    score >= 0.5  ? ['#f59e0b','Med']  : ['#ef4444','Low']
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:5,
      fontSize:11, padding:'2px 8px', borderRadius:99,
      background:`${color}12`, border:`1px solid ${color}28`, color,
    }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:color, display:'inline-block' }}/>
      {label} {Math.round(score*100)}%
    </span>
  )
}

/* ── Sources drawer ──────────────────────────────── */
function Sources({ sources }: { sources: ChatMessage['sources'] }) {
  const [open, setOpen] = useState(false)
  if (!sources?.length) return null
  return (
    <div style={{ marginTop:10, borderRadius:10, overflow:'hidden', border:'1px solid rgba(255,255,255,0.06)' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'8px 13px', background:'rgba(255,255,255,0.02)',
        border:'none', cursor:'pointer', fontSize:12, color:'#6b7280',
      }}>
        <span style={{ display:'flex', alignItems:'center', gap:7 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
          {sources.length} source{sources.length !== 1 ? 's' : ''} cited
        </span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition:'transform 0.2s' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && sources.map((s, i) => (
        <div key={s.chunk_id} style={{
          padding:'10px 13px',
          borderTop:'1px solid rgba(255,255,255,0.05)',
          background: i % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent',
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
            <span style={{ fontSize:11.5, color:'#818cf8', fontWeight:500 }}>{s.filename}</span>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              {s.page_number && <span style={{ fontSize:10, color:'#4b5563' }}>p.{s.page_number}</span>}
              <span style={{
                fontSize:10, padding:'1px 6px', borderRadius:99,
                background:'rgba(99,102,241,0.12)', color:'#818cf8',
              }}>{Math.round(s.relevance_score*100)}%</span>
            </div>
          </div>
          <p style={{ fontSize:12, color:'#6b7280', lineHeight:1.55 }}>{s.content_preview.slice(0,200)}{s.content_preview.length>200?'…':''}</p>
        </div>
      ))}
    </div>
  )
}

/* ── Single message bubble ───────────────────────── */
function Bubble({ msg }: { msg: ChatMessage }) {
  const [copied, setCopied] = useState(false)
  const isUser = msg.role === 'user'
  const ag = AGENTS[msg.agent_type || 'query']

  const copy = () => {
    navigator.clipboard.writeText(msg.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  /* user bubble */
  if (isUser) return (
    <div style={{ display:'flex', justifyContent:'flex-end' }} className="slide-up">
      <div style={{ maxWidth:'68%' }}>
        <div style={{
          background:'linear-gradient(135deg, rgba(99,102,241,0.18) 0%, rgba(139,92,246,0.12) 100%)',
          border:'1px solid rgba(99,102,241,0.25)',
          borderRadius:'18px 18px 5px 18px',
          padding:'11px 16px',
          fontSize:14, color:'#dde1f0', lineHeight:1.65,
        }}>{msg.content}</div>
      </div>
    </div>
  )

  /* typing indicator */
  if (msg.status === 'sending') return (
    <div style={{ display:'flex', gap:11, alignItems:'flex-start' }} className="slide-up">
      <div style={{
        width:30, height:30, borderRadius:9, flexShrink:0,
        background:`${ag.color}14`, border:`1px solid ${ag.color}28`,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:13, color:ag.color,
      }}>{ag.icon}</div>
      <div style={{
        background:'#0f1219', border:'1px solid rgba(255,255,255,0.07)',
        borderRadius:'5px 18px 18px 18px', padding:'14px 18px',
      }}>
        <div style={{ display:'flex', gap:5, alignItems:'center' }}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              width:7, height:7, borderRadius:'50%',
              background:ag.color, opacity:0.7,
              animation:`pulse 1.3s ease-in-out ${i*0.18}s infinite`,
            }}/>
          ))}
        </div>
      </div>
    </div>
  )

  /* assistant bubble */
  return (
    <div style={{ display:'flex', gap:11, alignItems:'flex-start' }} className="slide-up">
      {/* Avatar */}
      <div style={{
        width:30, height:30, borderRadius:9, flexShrink:0, marginTop:2,
        background:`${ag.color}14`, border:`1px solid ${ag.color}28`,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:13, color:ag.color,
      }}>{ag.icon}</div>

      <div style={{ flex:1, minWidth:0 }}>
        {/* Meta row */}
        <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', gap:8, marginBottom:8 }}>
          <span style={{
            fontSize:10.5, fontWeight:700, textTransform:'uppercase',
            letterSpacing:'0.07em', color:ag.color,
          }}>{ag.label}</span>
          {msg.confidence_score !== undefined && <ConfPill score={msg.confidence_score} />}
          {msg.cached && (
            <span style={{
              fontSize:10.5, padding:'2px 7px', borderRadius:99,
              background:'rgba(34,197,94,0.1)', color:'#4ade80',
              border:'1px solid rgba(34,197,94,0.2)',
            }}>⚡ Cached</span>
          )}
          {!!msg.tokens_used && (
            <span style={{ fontSize:10.5, color:'#374151', marginLeft:'auto' }}>
              {msg.tokens_used.toLocaleString()} tokens · {msg.latency_ms}ms
            </span>
          )}
        </div>

        {/* Content card */}
        <div style={{
          background:'#0f1219',
          border:'1px solid rgba(255,255,255,0.07)',
          borderRadius:'5px 18px 18px 18px',
          padding:'14px 18px',
          boxShadow:'0 2px 20px rgba(0,0,0,0.25)',
        }}>
          {msg.status === 'error'
            ? <div style={{ display:'flex', alignItems:'center', gap:8, color:'#f87171', fontSize:13 }}>
                <span>⚠</span>{msg.content}
              </div>
            : <div className="ai-prose"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
          }
        </div>

        <Sources sources={msg.sources} />

        {/* Actions */}
        <div style={{ display:'flex', gap:2, marginTop:6 }}>
          <button onClick={copy} style={{
            display:'flex', alignItems:'center', gap:5,
            fontSize:11, color: copied ? '#4ade80' : '#4b5563',
            background:'none', border:'none', cursor:'pointer',
            padding:'3px 8px', borderRadius:6, transition:'color 0.15s',
          }}>
            {copied
              ? <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg> Copied</>
              : <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Main Chat Page ───────────────────────────────── */
export default function ChatPage() {
  const { messages, isQuerying, activeAgent, sessionId, topK, includeSources, addMessage, updateMessage, setIsQuerying, clearChat } = useAppStore()
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const ag = AGENTS[activeAgent]

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [messages])

  /* Auto-resize textarea */
  useEffect(() => {
    const ta = taRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 140) + 'px'
  }, [input])

  const send = useCallback(async (text?: string, agentOverride?: string) => {
    const q = (text ?? input).trim()
    if (!q || isQuerying) return
    setInput('')
    setIsQuerying(true)
    const agent = (agentOverride || activeAgent) as AgentType
    const uid = crypto.randomUUID(), aid = crypto.randomUUID()
    addMessage({ id:uid, role:'user',      content:q,  timestamp:new Date().toISOString(), status:'complete' })
    addMessage({ id:aid, role:'assistant', content:'', agent_type:agent, timestamp:new Date().toISOString(), status:'sending' })
    try {
      const res = await api.submitQuery({ question:q, session_id:sessionId, agent_type:agent, top_k:topK, include_sources:includeSources })
      updateMessage(aid, { content:res.answer, status:'complete', agent_type:res.agent_type, confidence_score:res.confidence_score, sources:res.sources, tokens_used:res.tokens_used, latency_ms:res.latency_ms, cached:res.cached })
    } catch(err: unknown) {
      updateMessage(aid, { content: err instanceof Error ? err.message : 'Error', status:'error' })
    } finally { setIsQuerying(false) }
  }, [input, isQuerying, activeAgent, sessionId, topK, includeSources])

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', background:'#080a0f', position:'relative', overflow:'hidden' }}>

      {/* Ambient glow behind messages */}
      <div style={{ position:'absolute', top:0, right:0, width:500, height:500, background:'radial-gradient(ellipse at 80% 10%, rgba(99,102,241,0.05) 0%, transparent 60%)', pointerEvents:'none', zIndex:0 }} />

      {/* ── Header ── */}
      <div style={{
        padding:'14px 24px', display:'flex', alignItems:'center', justifyContent:'space-between',
        borderBottom:'1px solid rgba(255,255,255,0.05)', background:'rgba(8,10,15,0.9)',
        backdropFilter:'blur(12px)', zIndex:10, flexShrink:0, position:'relative',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{
            width:8, height:8, borderRadius:'50%',
            background:ag.color, boxShadow:`0 0 8px ${ag.glow}`,
            animation:'glow 2s ease infinite',
          }}/>
          <div>
            <h1 style={{ fontSize:14, fontWeight:600, color:'#eef0f6', letterSpacing:'-0.01em' }}>AI Knowledge Chat</h1>
            <p style={{ fontSize:11.5, color:'#4b5563', marginTop:1 }}>
              <span style={{ color:ag.color }}>{ag.label} Agent</span>
              <span style={{ margin:'0 6px', color:'#1f2937' }}>·</span>
              {ag.hint}
            </p>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {messages.length > 0 && (
            <span style={{ fontSize:11, color:'#374151' }}>{messages.filter(m=>m.role==='user').length} messages</span>
          )}
          <button onClick={clearChat} style={{
            display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#6b7280',
            background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)',
            borderRadius:8, padding:'6px 12px', cursor:'pointer', transition:'all 0.15s',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
            Clear
          </button>
        </div>
      </div>

      {/* ── Messages ── */}
      <div style={{ flex:1, overflowY:'auto', padding:'24px', display:'flex', flexDirection:'column', gap:20, zIndex:1, position:'relative' }}>

        {messages.length === 0 && (
          <div style={{ maxWidth:580, margin:'32px auto 0', textAlign:'center' }} className="fade-in">
            {/* Hero icon */}
            <div style={{
              width:56, height:56, borderRadius:16, margin:'0 auto 20px',
              background:'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.1) 100%)',
              border:'1px solid rgba(99,102,241,0.2)',
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:'0 8px 32px rgba(99,102,241,0.15)',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.8">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            </div>
            <h2 style={{ fontSize:20, fontWeight:700, color:'#eef0f6', marginBottom:8, letterSpacing:'-0.02em' }}>
              Enterprise Knowledge Assistant
            </h2>
            <p style={{ fontSize:13.5, color:'#6b7280', lineHeight:1.7, marginBottom:28, maxWidth:440, margin:'0 auto 28px' }}>
              Ask questions about logistics operations, financial data, vendor performance, and system logs — powered by RAG + multi-agent AI.
            </p>

            {/* Starter prompts grid */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, textAlign:'left' }}>
              {STARTERS.map(s => {
                const a = AGENTS[s.agent]
                return (
                  <button key={s.q} onClick={() => send(s.q, s.agent)} style={{
                    padding:'12px 14px', borderRadius:11, cursor:'pointer', textAlign:'left',
                    background:'#0f1219', border:'1px solid rgba(255,255,255,0.06)',
                    transition:'all 0.2s', display:'flex', flexDirection:'column', gap:6,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = `${a.color}30`
                    e.currentTarget.style.background = `${a.color}08`
                    e.currentTarget.style.transform = 'translateY(-1px)'
                    e.currentTarget.style.boxShadow = `0 4px 20px rgba(0,0,0,0.3)`
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
                    e.currentTarget.style.background = '#0f1219'
                    e.currentTarget.style.transform = 'none'
                    e.currentTarget.style.boxShadow = 'none'
                  }}>
                    <span style={{
                      fontSize:9.5, fontWeight:700, textTransform:'uppercase',
                      letterSpacing:'0.08em', color:a.color,
                      display:'flex', alignItems:'center', gap:4,
                    }}>
                      {a.icon} {a.label}
                    </span>
                    <span style={{ fontSize:12.5, color:'#8892a4', lineHeight:1.5 }}>{s.q}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {messages.map(m => (
          <div key={m.id} style={{ maxWidth:820, width:'100%', margin:'0 auto' }}>
            <Bubble msg={m} />
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* ── Input area ── */}
      <div style={{
        padding:'16px 24px 20px', borderTop:'1px solid rgba(255,255,255,0.05)',
        background:'rgba(8,10,15,0.95)', backdropFilter:'blur(12px)', zIndex:10, flexShrink:0,
      }}>
        <div style={{ maxWidth:820, margin:'0 auto' }}>
          <div style={{
            background:'#0f1219',
            border:`1px solid rgba(255,255,255,0.09)`,
            borderRadius:14,
            boxShadow:'0 0 0 0 transparent',
            transition:'border-color 0.2s, box-shadow 0.2s',
            overflow:'hidden',
          }}
          onFocusCapture={e => {
            e.currentTarget.style.borderColor = `${ag.color}40`
            e.currentTarget.style.boxShadow = `0 0 0 3px ${ag.color}10`
          }}
          onBlurCapture={e => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'
            e.currentTarget.style.boxShadow = '0 0 0 0 transparent'
          }}>

            {/* Textarea */}
            <textarea
              ref={taRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={isQuerying}
              placeholder={`Ask the ${ag.label} agent anything…`}
              style={{
                width:'100%', background:'transparent', border:'none', outline:'none',
                padding:'14px 16px 6px', fontSize:14, color:'#dde1f0',
                resize:'none', lineHeight:1.65, minHeight:50, maxHeight:140,
                fontFamily:'inherit', overflowY:'auto',
              }}
            />

            {/* Bottom bar */}
            <div style={{ display:'flex', alignItems:'center', padding:'6px 10px 10px', gap:4 }}>

              {/* Agent pills */}
              <div style={{ display:'flex', gap:3, flex:1, flexWrap:'wrap' }}>
                {Object.entries(AGENTS).map(([id, a]) => {
                  const isActive = activeAgent === id
                  return (
                    <button key={id}
                      onClick={() => useAppStore.getState().setActiveAgent(id as AgentType)}
                      style={{
                        fontSize:11, padding:'3px 9px', borderRadius:99, border:'none',
                        cursor:'pointer', fontWeight: isActive ? 600 : 400,
                        background: isActive ? `${a.color}18` : 'transparent',
                        color: isActive ? a.color : '#4b5563',
                        transition:'all 0.15s', letterSpacing:'0.01em',
                      }}>
                      {a.label}
                    </button>
                  )
                })}
              </div>

              {/* Char count */}
              {input.length > 100 && (
                <span style={{ fontSize:10.5, color:'#374151', marginRight:4 }}>
                  {input.length}/2000
                </span>
              )}

              {/* Send button */}
              <button onClick={() => send()} disabled={!input.trim() || isQuerying}
                style={{
                  width:34, height:34, borderRadius:9, border:'none', cursor: input.trim()&&!isQuerying ? 'pointer' : 'not-allowed',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  background: input.trim()&&!isQuerying ? `linear-gradient(135deg, ${ag.color}, ${ag.color}cc)` : 'rgba(255,255,255,0.05)',
                  boxShadow: input.trim()&&!isQuerying ? `0 2px 12px ${ag.glow}` : 'none',
                  transition:'all 0.2s', flexShrink:0,
                }}>
                {isQuerying
                  ? <div style={{ width:14, height:14, border:`2px solid ${ag.color}`, borderTopColor:'transparent', borderRadius:'50%' }} className="spin" />
                  : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={input.trim() ? '#fff' : '#374151'} strokeWidth="2.2">
                      <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
                    </svg>
                }
              </button>
            </div>
          </div>
          <p style={{ textAlign:'center', fontSize:10.5, color:'#1f2937', marginTop:8, letterSpacing:'0.01em' }}>
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  )
}