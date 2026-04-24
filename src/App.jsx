import { useState, useRef, useCallback, useEffect } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'https://YOUR-HF-SPACE.hf.space/generate'

// ─── icons (inline SVG) ────────────────────────────────────────────────────
const IconUpload = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 16 12 12 8 16" />
    <line x1="12" y1="12" x2="12" y2="21" />
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
  </svg>
)

const IconDoc = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
)

const IconCopy = ({ done }) => done ? (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
) : (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
)

const IconX = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

// ─── small components ──────────────────────────────────────────────────────
function StatusDot({ status }) {
  const colors = { idle: '#44535f', ready: '#00c9a7', loading: '#f0a500', error: '#e05c5c' }
  const labels = { idle: 'Awaiting image', ready: 'Ready', loading: 'Generating...', error: 'Error' }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <span style={{
        display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
        background: colors[status],
        animation: status === 'loading' ? 'pulse-ring 1.5s ease-out infinite' : 'none',
      }} />
      <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>
        {labels[status]}
      </span>
    </div>
  )
}

function SkeletonLine({ width }) {
  return (
    <div style={{
      height: 11, width, borderRadius: 4,
      background: 'linear-gradient(90deg, var(--bg-border) 25%, var(--bg-hover) 50%, var(--bg-border) 75%)',
      backgroundSize: '400px 100%',
      animation: 'shimmer 1.4s infinite linear',
      marginBottom: 10,
    }} />
  )
}

function Tag({ children }) {
  return (
    <span style={{
      fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 500,
      padding: '2px 8px', borderRadius: 4,
      background: 'var(--accent-dim)', color: 'var(--accent)',
      border: '0.5px solid var(--accent-border)', letterSpacing: '0.06em',
    }}>{children}</span>
  )
}

// ─── main app ─────────────────────────────────────────────────────────────
export default function App() {
  const [file, setFile]           = useState(null)
  const [preview, setPreview]     = useState(null)
  const [status, setStatus]       = useState('idle')   // idle | ready | loading | error
  const [report, setReport]       = useState('')
  const [displayed, setDisplayed] = useState('')
  const [meta, setMeta]           = useState(null)     // { ms }
  const [error, setError]         = useState('')
  const [copied, setCopied]       = useState(false)
  const [dragging, setDragging]   = useState(false)
  const inputRef = useRef(null)
  const reportRef = useRef(null)

  // typewriter effect
  useEffect(() => {
    if (!report) return
    setDisplayed('')
    let i = 0
    const id = setInterval(() => {
      setDisplayed(report.slice(0, i + 1))
      i++
      if (i >= report.length) clearInterval(id)
    }, 14)
    return () => clearInterval(id)
  }, [report])

  // auto-scroll report
  useEffect(() => {
    if (reportRef.current) reportRef.current.scrollTop = reportRef.current.scrollHeight
  }, [displayed])

  const loadFile = useCallback((f) => {
    if (!f || !f.type.startsWith('image/')) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setStatus('ready')
    setReport('')
    setDisplayed('')
    setError('')
    setMeta(null)
  }, [])

  const reset = () => {
    setFile(null); setPreview(null); setStatus('idle')
    setReport(''); setDisplayed(''); setError(''); setMeta(null)
  }

  const onDrop = (e) => {
    e.preventDefault(); setDragging(false)
    loadFile(e.dataTransfer.files[0])
  }

  const generate = async () => {
    if (!file) return
    setStatus('loading'); setReport(''); setDisplayed(''); setError(''); setMeta(null)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await fetch(API_URL, { method: 'POST', body: fd })
      if (!res.ok) throw new Error(`Server responded with ${res.status}`)
      const data = await res.json()
      const text = data.text || data.report || data.output || JSON.stringify(data)
      setReport(text)
      setMeta({ ms: data.ms ?? null })
      setStatus('ready')
    } catch (err) {
      setError(err.message.includes('fetch') ? 'Could not reach the model API. Is the HuggingFace Space running?' : err.message)
      setStatus('error')
    }
  }

  const copyReport = () => {
    navigator.clipboard.writeText(report).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // ─── styles ──────────────────────────────────────────────────────────────
  const s = {
    app: {
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      animation: 'fadeUp 0.4s ease both',
    },

    header: {
      borderBottom: '0.5px solid var(--bg-border)',
      padding: '18px 40px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    },
    logo: {
      display: 'flex', alignItems: 'baseline', gap: 10,
    },
    logoText: {
      fontFamily: 'var(--font-ui)', fontSize: 17, fontWeight: 700,
      letterSpacing: '-0.5px', color: 'var(--text-primary)',
    },
    logoSub: {
      fontFamily: 'var(--font-mono)', fontSize: 10,
      color: 'var(--text-muted)', letterSpacing: '0.08em',
    },
    headerRight: {
      display: 'flex', alignItems: 'center', gap: 16,
    },

    main: {
      flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr',
      gap: 1, padding: 0,
    },

    panel: {
      background: 'var(--bg-surface)',
      display: 'flex', flexDirection: 'column',
    },
    panelHead: {
      padding: '16px 28px', borderBottom: '0.5px solid var(--bg-border)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    },
    panelLabel: {
      fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500,
      color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase',
    },
    panelBody: {
      flex: 1, padding: 28, display: 'flex', flexDirection: 'column', gap: 20,
    },

    dropZone: {
      flex: 1, border: `1.5px dashed ${dragging ? 'var(--accent)' : 'var(--bg-border)'}`,
      borderRadius: 'var(--radius-lg)',
      background: dragging ? 'var(--accent-dim)' : 'var(--bg-elevated)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 14, cursor: 'pointer', transition: 'all 0.18s',
      minHeight: 260, padding: 24,
    },
    dropIcon: { color: dragging ? 'var(--accent)' : 'var(--text-muted)', transition: 'color 0.18s' },
    dropTitle: { fontSize: 14, fontWeight: 500, color: dragging ? 'var(--accent)' : 'var(--text-secondary)' },
    dropSub: { fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.04em' },

    previewWrap: {
      position: 'relative', borderRadius: 'var(--radius-lg)', overflow: 'hidden',
      background: '#000', border: '0.5px solid var(--bg-border)',
    },
    previewImg: {
      display: 'block', width: '100%', maxHeight: 300,
      objectFit: 'contain', filter: 'brightness(0.95) contrast(1.05)',
    },
    previewOverlay: {
      position: 'absolute', top: 10, right: 10,
    },
    removeBtn: {
      width: 28, height: 28, borderRadius: '50%',
      background: 'rgba(0,0,0,0.65)', border: '0.5px solid var(--bg-border)',
      color: 'var(--text-secondary)', cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'background 0.15s',
    },

    fileMeta: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 14px', borderRadius: 'var(--radius-sm)',
      background: 'var(--bg-elevated)', border: '0.5px solid var(--bg-border)',
    },
    fileMetaLeft: { display: 'flex', alignItems: 'center', gap: 10 },
    fileMetaName: { fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' },
    fileMetaSize: { fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' },

    genBtn: {
      padding: '13px 0', borderRadius: 'var(--radius-md)', border: 'none',
      background: status === 'loading' ? 'var(--bg-elevated)' : 'var(--accent)',
      color: status === 'loading' ? 'var(--text-muted)' : '#0b0e11',
      fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-ui)',
      letterSpacing: '-0.2px', cursor: status === 'loading' || !file ? 'not-allowed' : 'pointer',
      opacity: (!file || status === 'loading') ? 0.5 : 1,
      transition: 'all 0.18s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    },

    errorBox: {
      padding: '12px 16px', borderRadius: 'var(--radius-sm)',
      background: 'var(--danger-dim)', border: '0.5px solid rgba(224,92,92,0.25)',
      color: '#e88', fontSize: 12, fontFamily: 'var(--font-mono)', lineHeight: 1.6,
    },

    reportWrap: {
      flex: 1, display: 'flex', flexDirection: 'column', gap: 0,
    },
    reportScroll: {
      flex: 1, overflowY: 'auto', minHeight: 300,
      fontFamily: 'var(--font-mono)', fontSize: 12.5, lineHeight: 1.9,
      color: 'var(--text-primary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
    },
    reportPlaceholder: {
      height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 10, opacity: 0.3,
    },
    cursor: {
      display: 'inline-block', width: 2, height: '1em',
      background: 'var(--accent)', marginLeft: 2, verticalAlign: 'text-bottom',
      animation: 'blink 1s step-end infinite',
    },

    metaRow: {
      marginTop: 16, paddingTop: 16, borderTop: '0.5px solid var(--bg-border)',
      display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
    },

    copyBtn: {
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '6px 14px', borderRadius: 'var(--radius-sm)',
      background: 'transparent', border: '0.5px solid var(--bg-border)',
      color: copied ? 'var(--accent)' : 'var(--text-secondary)',
      fontSize: 11, fontFamily: 'var(--font-mono)', cursor: 'pointer',
      transition: 'all 0.15s',
      borderColor: copied ? 'var(--accent-border)' : 'var(--bg-border)',
    },

    footer: {
      borderTop: '0.5px solid var(--bg-border)',
      padding: '14px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    },
    footerText: { fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.04em' },
    footerLink: { fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', textDecoration: 'none' },
  }

  const isTyping = status === 'ready' && displayed.length < report.length

  return (
    <div style={s.app}>
      {/* ── header ── */}
      <header style={s.header}>
        <div style={s.logo}>
          <span style={s.logoText}>R2Gen</span>
          <span style={s.logoSub}>CHEST X-RAY REPORT GENERATOR</span>
        </div>
        <div style={s.headerRight}>
          <Tag>R2GenTransformer</Tag>
          <Tag>Swin + Cerebras-GPT</Tag>
          <StatusDot status={status} />
        </div>
      </header>

      {/* ── two-panel layout ── */}
      <main style={s.main}>

        {/* LEFT — upload */}
        <div style={{ ...s.panel, borderRight: '0.5px solid var(--bg-border)' }}>
          <div style={s.panelHead}>
            <span style={s.panelLabel}>Input · Chest X-Ray</span>
            {file && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
              {(file.size / 1024).toFixed(0)} KB
            </span>}
          </div>
          <div style={s.panelBody}>
            {!file ? (
              <div
                style={s.dropZone}
                onClick={() => inputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
              >
                <div style={s.dropIcon}><IconUpload /></div>
                <div style={{ textAlign: 'center' }}>
                  <p style={s.dropTitle}>Drop your X-ray image here</p>
                  <p style={{ ...s.dropSub, marginTop: 4 }}>or click to browse</p>
                </div>
                <p style={s.dropSub}>PNG · JPG · DICOM preview</p>
              </div>
            ) : (
              <div style={s.previewWrap}>
                <img src={preview} alt="X-ray preview" style={s.previewImg} />
                <div style={s.previewOverlay}>
                  <button style={s.removeBtn} onClick={reset}><IconX /></button>
                </div>
              </div>
            )}

            {file && (
              <div style={s.fileMeta}>
                <div style={s.fileMetaLeft}>
                  <IconDoc />
                  <span style={s.fileMetaName}>{file.name}</span>
                </div>
                <span style={s.fileMetaSize}>{file.type.split('/')[1].toUpperCase()}</span>
              </div>
            )}

            {error && <div style={s.errorBox}>{error}</div>}

            <button
              style={s.genBtn}
              onClick={generate}
              disabled={!file || status === 'loading'}
            >
              {status === 'loading' ? (
                <>
                  <span style={{ width: 14, height: 14, border: '2px solid #555', borderTopColor: 'var(--text-secondary)', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                  Generating report…
                </>
              ) : 'Generate report →'}
            </button>
          </div>
        </div>

        {/* RIGHT — report */}
        <div style={s.panel}>
          <div style={s.panelHead}>
            <span style={s.panelLabel}>Output · Radiology Report</span>
            {report && (
              <button style={s.copyBtn} onClick={copyReport}>
                <IconCopy done={copied} />
                {copied ? 'Copied' : 'Copy'}
              </button>
            )}
          </div>
          <div style={s.panelBody}>
            <div style={s.reportWrap}>
              <div ref={reportRef} style={s.reportScroll}>
                {status === 'loading' && !displayed && (
                  <div style={{ paddingTop: 4 }}>
                    <SkeletonLine width="88%" />
                    <SkeletonLine width="72%" />
                    <SkeletonLine width="94%" />
                    <SkeletonLine width="60%" />
                    <SkeletonLine width="80%" />
                  </div>
                )}
                {!displayed && status !== 'loading' && (
                  <div style={s.reportPlaceholder}>
                    <IconDoc />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>Report will appear here</span>
                  </div>
                )}
                {displayed}
                {isTyping && <span style={s.cursor} />}
              </div>

              {meta && report && (
                <div style={s.metaRow}>
                  {meta.ms && (
                    <Tag>{meta.ms} ms</Tag>
                  )}
                  <Tag>IU-Xray</Tag>
                  <Tag>beam=1</Tag>
                  <Tag>max_len=192</Tag>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ── footer ── */}
      <footer style={s.footer}>
        <span style={s.footerText}>Amirparsa Rouhi · MSc Data Science &amp; AI · Bournemouth University, 2025</span>
        <div style={{ display: 'flex', gap: 20 }}>
          <a href="https://github.com/Parsa2025AI" target="_blank" rel="noreferrer" style={s.footerLink}>GitHub ↗</a>
          <a href="https://huggingface.co/Parsa2025AI" target="_blank" rel="noreferrer" style={s.footerLink}>HuggingFace ↗</a>
        </div>
      </footer>

      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => loadFile(e.target.files[0])} />
    </div>
  )
}
