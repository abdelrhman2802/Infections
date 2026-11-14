import { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, NotebookPen, Sun, Moon, ArrowLeft, ArrowRight, X, RotateCcw, Timer, Play, Trash2, Check } from 'lucide-react'
import data from './data.json'

const { topics: TOPICS, questions: BANK } = data
const LETTERS = 'ABCDEF'
const COUNTS = TOPICS.map((_, i) => BANK.filter((q) => q.topic === i).length)

const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } }
function usePersist(k, d) {
  const [v, s] = useState(() => load(k, d))
  useEffect(() => { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} }, [k, v])
  return [v, s]
}
const shuffle = (a) => { const c = [...a]; for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [c[i], c[j]] = [c[j], c[i]] } return c }
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

/* The memorable thing: a culture plate. Every answered question grows a colony. */
function Dish({ n, status, cur, className = '' }) {
  const pts = useMemo(() => Array.from({ length: n }, (_, i) => {
    const r = 80 * Math.sqrt((i + 0.5) / n), a = i * 2.39996
    return [100 + r * Math.cos(a), 100 + r * Math.sin(a)]
  }), [n])
  const cr = Math.max(1.3, Math.min(8, (74 / Math.sqrt(n)) * 0.5))
  return (
    <svg viewBox="0 0 200 200" className={`dish ${className}`} role="img" aria-label="Culture plate showing progress">
      <defs>
        <radialGradient id="agar" cx="40%" cy="35%"><stop offset="0" stopColor="var(--agar-hi)" /><stop offset="1" stopColor="var(--agar-lo)" /></radialGradient>
      </defs>
      <circle cx="100" cy="100" r="98" className="dish-rim" />
      <circle cx="100" cy="100" r="91" fill="url(#agar)" />
      <ellipse cx="72" cy="52" rx="34" ry="14" className="dish-glare" transform="rotate(-28 72 52)" />
      {pts.map(([x, y], i) => {
        const s = status(i)
        return s
          ? <motion.circle key={i} cx={x} cy={y} r={cr} className={`col ${s}`} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }} style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />
          : <circle key={i} cx={x} cy={y} r={cr * 0.45} className="seed" />
      })}
      {cur != null && pts[cur] && <motion.circle className="cur" r={cr + 2.6} animate={{ cx: pts[cur][0], cy: pts[cur][1] }} transition={{ type: 'spring', stiffness: 200, damping: 20 }} />}
    </svg>
  )
}

function ThemeToggle({ theme, setTheme }) {
  return (
    <button className="icon-btn" aria-label="Toggle theme" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}

function Home({ onStart, favCount, openFavs, theme, setTheme }) {
  const [sel, setSel] = useState([])
  const [find, setFind] = useState('')
  const [repeats, setRepeats] = useState(false)
  const [mode, setMode] = useState('practice')
  const [minutes, setMinutes] = useState(30)
  const [shuffleQ, setShuffleQ] = useState(false)
  const [shuffleA, setShuffleA] = useState(false)
  const [k, setK] = useState(0)
  useEffect(() => { const t = setInterval(() => setK((x) => (x >= 90 ? 0 : x + 1)), 130); return () => clearInterval(t) }, [])

  const pool = useMemo(() => BANK.filter((q) => !sel.length || sel.includes(q.topic))
    .flatMap((q) => Array(repeats ? q.exams.length : 1).fill(q)), [sel, repeats])

  const start = () => {
    let items = pool
    if (shuffleQ) items = shuffle(items)
    onStart({ mode, minutes, items: items.map((q) => ({ q, order: shuffleA ? shuffle(q.options.map((_, i) => i)) : q.options.map((_, i) => i) })) })
  }

  return (
    <main className="home">
      <header className="bar">
        <div className="brand"><span className="brand-dot" />Colony</div>
        <div className="bar-r">
          <button className="chip-btn" onClick={openFavs}><Star size={16} /> Saved <b>{favCount}</b></button>
          <ThemeToggle theme={theme} setTheme={setTheme} />
        </div>
      </header>
      <section className="hero">
        <div className="hero-txt">
          <h1>Infectious diseases, one colony at a time.</h1>
          <p>{BANK.length} exam-sourced MCQs across {TOPICS.length} topics. Every answer you give grows on the plate.</p>
          <Dish n={64} status={(i) => (i < k ? (i % 7 === 3 ? 'w' : 'c') : null)} className="hero-dish" />
        </div>
        <motion.form className="setup" onSubmit={(e) => { e.preventDefault(); start() }} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: 'easeOut' }}>
          <div className="field">
            <div className="field-row">Topics <span>{sel.length ? `${sel.length} selected` : 'All topics'}</span>
              {sel.length > 0 && <button type="button" className="link" onClick={() => setSel([])}>Clear</button>}</div>
            <input type="search" className="find" placeholder="Search topics" value={find} onChange={(e) => setFind(e.target.value)} />
            <div className="topic-box">
              {TOPICS.map((t, i) => t.toLowerCase().includes(find.toLowerCase()) && (
                <button type="button" key={i} aria-pressed={sel.includes(i)} className={`tchip ${sel.includes(i) ? 'on' : ''}`}
                  onClick={() => setSel((x) => (x.includes(i) ? x.filter((y) => y !== i) : [...x, i]))}>{t} <i>{COUNTS[i]}</i></button>
              ))}
            </div>
          </div>
          <Seg label="Questions" value={repeats} set={setRepeats} opts={[[false, 'Unique only'], [true, 'Include repeats']]} />
          <Seg label="Session" value={mode} set={setMode} opts={[['practice', 'Practice'], ['exam', 'Timed exam']]} />
          {mode === 'exam' && (
            <label className="field inline"><Timer size={16} /> Minutes
              <input type="number" min="1" max="240" value={minutes} onChange={(e) => setMinutes(Math.max(1, +e.target.value || 1))} />
            </label>
          )}
          <div className="toggles">
            <Tog on={shuffleQ} set={setShuffleQ}>Shuffle questions</Tog>
            <Tog on={shuffleA} set={setShuffleA}>Shuffle answers</Tog>
          </div>
          <button className="go" disabled={!pool.length}><Play size={18} fill="currentColor" /> Start with {pool.length} question{pool.length === 1 ? '' : 's'}</button>
        </motion.form>
      </section>
    </main>
  )
}

const Seg = ({ label, value, set, opts }) => (
  <div className="field">{label}
    <div className="seg" role="radiogroup">
      {opts.map(([v, t]) => (
        <button type="button" key={t} role="radio" aria-checked={value === v} className={value === v ? 'on' : ''} onClick={() => set(v)}>
          {value === v && <motion.span layoutId={`seg-${label}`} className="seg-bg" />}<span>{t}</span>
        </button>
      ))}
    </div>
  </div>
)
const Tog = ({ on, set, children }) => (
  <button type="button" role="switch" aria-checked={on} className={`tog ${on ? 'on' : ''}`} onClick={() => set(!on)}><i /><span>{children}</span></button>
)

function Quiz({ session, favs, toggleFav, notes, setNote, onFinish, onExit, theme, setTheme }) {
  const { items, mode, minutes } = session
  const exam = mode === 'exam'
  const [i, setI] = useState(0)
  const [ans, setAns] = useState({})
  const [secs, setSecs] = useState(0)
  const [noteOpen, setNoteOpen] = useState(false)
  const times = useRef({})
  const last = useRef(Date.now())

  useEffect(() => { const t = setInterval(() => setSecs((s) => s + 1), 1000); return () => clearInterval(t) }, [])
  useEffect(() => { last.current = Date.now(); const idx = i; return () => { times.current[idx] = (times.current[idx] || 0) + (Date.now() - last.current) / 1000 } }, [i])

  const finish = () => { times.current[i] = (times.current[i] || 0) + (Date.now() - last.current) / 1000; onFinish(items, ans, times.current) }
  const left = minutes * 60 - secs
  useEffect(() => { if (exam && left <= 0) finish() }, [left]) // eslint-disable-line

  const it = items[i], q = it.q, picked = ans[i], reveal = !exam && picked !== undefined
  const pick = (oi) => { if (!exam && picked !== undefined) return; setAns((a) => ({ ...a, [i]: oi })) }
  const go = (d) => setI((x) => Math.min(items.length - 1, Math.max(0, x + d)))

  useEffect(() => {
    const onKey = (e) => {
      if (noteOpen || ['TEXTAREA', 'INPUT'].includes(e.target.tagName)) return
      if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
      else if (/^[1-6]$/.test(e.key) && it.order[+e.key - 1] !== undefined) pick(it.order[+e.key - 1])
    }
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey)
  })

  const status = (k) => (ans[k] === undefined ? null : exam ? 'a' : ans[k] === items[k].q.answer ? 'c' : 'w')
  const faved = favs.includes(q.id)

  return (
    <main className="quiz">
      <header className="bar">
        <button className="icon-btn" aria-label="Leave session" onClick={onExit}><X size={18} /></button>
        <div className={`clock ${exam && left < 60 ? 'urgent' : ''}`}><Timer size={16} />{fmt(exam ? Math.max(0, left) : secs)}</div>
        <div className="bar-r"><ThemeToggle theme={theme} setTheme={setTheme} />
          <button className="chip-btn solid" onClick={finish}>Finish</button></div>
      </header>
      <div className="quiz-grid">
        <aside className="side">
          <Dish n={items.length} status={status} cur={i} />
          <div className="meter"><motion.div animate={{ width: `${((i + 1) / items.length) * 100}%` }} /></div>
          <p className="count">{Object.keys(ans).length} answered · question {i + 1} of {items.length}</p>
        </aside>
        <AnimatePresence mode="wait">
          <motion.section key={i} className="card" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }}>
            <div className="card-top">
              <span className="topic">{TOPICS[q.topic]}</span>
              <div className="acts">
                <button className={`icon-btn ${notes[q.id] ? 'has' : ''}`} aria-label="Add note" onClick={() => setNoteOpen(true)}><NotebookPen size={18} /></button>
                <button className={`icon-btn ${faved ? 'fav' : ''}`} aria-label="Save question" aria-pressed={faved} onClick={() => toggleFav(q.id)}><Star size={18} fill={faved ? 'currentColor' : 'none'} /></button>
              </div>
            </div>
            <h2 className="stem">{q.stem}</h2>
            <div className="opts">
              {it.order.map((oi, pos) => {
                const cls = reveal && oi === q.answer ? 'right' : reveal && picked === oi ? 'wrong' : picked === oi ? 'picked' : ''
                return (
                  <motion.button key={oi} className={`opt ${cls}`} whileTap={{ scale: 0.985 }} onClick={() => pick(oi)} disabled={reveal}>
                    <span className="letter">{cls === 'right' ? <Check size={16} /> : cls === 'wrong' ? <X size={16} /> : LETTERS[pos]}</span>
                    <span>{q.options[oi]}</span>
                  </motion.button>
                )
              })}
            </div>
            <AnimatePresence>
              {reveal && (
                <motion.div className="why" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <p><b>{picked === q.answer ? 'Correct.' : `Answer: ${LETTERS[it.order.indexOf(q.answer)]}.`}</b> {q.explanation}</p>
                  <div className="tags">{q.exams.map((e) => <span key={e}>{e}</span>)}</div>
                </motion.div>
              )}
            </AnimatePresence>
            {notes[q.id] && <p className="note-preview">{notes[q.id]}</p>}
            <div className="nav">
              <button className="chip-btn" onClick={() => go(-1)} disabled={i === 0}><ArrowLeft size={16} /> Previous</button>
              {i === items.length - 1 ? <button className="chip-btn solid" onClick={finish}>See results</button>
                : <button className="chip-btn solid" onClick={() => go(1)}>Next <ArrowRight size={16} /></button>}
            </div>
          </motion.section>
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {noteOpen && <NoteSheet key="n" initial={notes[q.id] || ''} onClose={() => setNoteOpen(false)} onSave={(t) => { setNote(q.id, t); setNoteOpen(false) }} />}
      </AnimatePresence>
    </main>
  )
}

function NoteSheet({ initial, onSave, onClose }) {
  const [t, setT] = useState(initial)
  return (
    <motion.div className="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="sheet" initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }} onClick={(e) => e.stopPropagation()}>
        <h3>Note on this question</h3>
        <textarea autoFocus rows={4} value={t} onChange={(e) => setT(e.target.value)} placeholder="Write the pearl you want to remember" />
        <div className="nav"><button className="chip-btn" onClick={onClose}>Cancel</button><button className="chip-btn solid" onClick={() => onSave(t.trim())}>Save note</button></div>
      </motion.div>
    </motion.div>
  )
}

function Results({ res, onRetake, onHome }) {
  const { items, ans, times } = res
  const c = items.filter((x, k) => ans[k] === x.q.answer).length
  const w = Object.keys(ans).length - c
  const u = items.length - c - w
  const pct = Math.round((c / items.length) * 100)
  const avg = items.length ? Object.values(times).reduce((a, b) => a + b, 0) / items.length : 0
  const retake = (withU) => onRetake(items.filter((x, k) => ans[k] !== undefined ? ans[k] !== x.q.answer : withU))
  const R = 54, C = 2 * Math.PI * R
  return (
    <main className="results">
      <header className="bar"><div className="brand"><span className="brand-dot" />Colony</div></header>
      <div className="res-grid">
        <div className="ring">
          <svg viewBox="0 0 140 140"><circle cx="70" cy="70" r={R} className="ring-bg" />
            <motion.circle cx="70" cy="70" r={R} className="ring-fg" strokeDasharray={C} initial={{ strokeDashoffset: C }} animate={{ strokeDashoffset: C * (1 - pct / 100) }} transition={{ duration: 1.1, ease: 'easeOut' }} transform="rotate(-90 70 70)" /></svg>
          <div className="ring-n">{pct}<small>%</small></div>
        </div>
        <div>
          <h1>{pct >= 80 ? 'Strong culture.' : pct >= 50 ? 'Growing well.' : 'Needs more incubation.'}</h1>
          <dl className="stats">
            <div className="ok"><dt>Correct</dt><dd>{c}</dd></div>
            <div className="bad"><dt>Wrong</dt><dd>{w}</dd></div>
            <div><dt>Skipped</dt><dd>{u}</dd></div>
            <div><dt>Avg per question</dt><dd>{avg.toFixed(0)}s</dd></div>
          </dl>
          <div className="actions">
            <button className="go" disabled={!w} onClick={() => retake(false)}><RotateCcw size={18} /> Retake wrong ({w})</button>
            <button className="chip-btn" disabled={!w && !u} onClick={() => retake(true)}>Wrong + skipped ({w + u})</button>
            <button className="chip-btn" onClick={onHome}>Home</button>
          </div>
        </div>
      </div>
    </main>
  )
}

function Favs({ favs, notes, remove, onPractice, onClose }) {
  const list = BANK.filter((q) => favs.includes(q.id))
  return (
    <motion.div className="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.aside className="drawer" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} onClick={(e) => e.stopPropagation()}>
        <div className="card-top"><h3>Saved questions</h3><button className="icon-btn" aria-label="Close" onClick={onClose}><X size={18} /></button></div>
        {!list.length && <p className="empty">Nothing saved yet. Tap the star on any question to keep it here.</p>}
        {list.map((q) => (
          <div className="fav" key={q.id}>
            <p>{q.stem}</p><small>{q.options[q.answer]}</small>
            {notes[q.id] && <em>{notes[q.id]}</em>}
            <button className="icon-btn" aria-label="Remove" onClick={() => remove(q.id)}><Trash2 size={16} /></button>
          </div>
        ))}
        {!!list.length && <button className="go" onClick={() => onPractice(list)}><Play size={18} fill="currentColor" /> Practice saved ({list.length})</button>}
      </motion.aside>
    </motion.div>
  )
}

export default function App() {
  const [theme, setTheme] = usePersist('colony_theme', 'dark')
  const [favs, setFavs] = usePersist('colony_favs', [])
  const [notes, setNotes] = usePersist('colony_notes', {})
  const [view, setView] = useState('home')
  const [session, setSession] = useState(null)
  const [res, setRes] = useState(null)
  const [favOpen, setFavOpen] = useState(false)
  useEffect(() => { document.documentElement.dataset.theme = theme }, [theme])

  const begin = (s) => { setSession({ ...s, id: Math.random() }); setView('quiz') }
  const practice = (qs) => { setFavOpen(false); begin({ mode: 'practice', minutes: 0, items: qs.map((q) => ({ q, order: q.options.map((_, i) => i) })) }) }
  const toggleFav = (id) => setFavs((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]))
  const setNote = (id, t) => setNotes((n) => { const c = { ...n }; if (t) c[id] = t; else delete c[id]; return c })
  const t = { theme, setTheme }

  return (
    <>
      {view === 'home' && <Home onStart={begin} favCount={favs.length} openFavs={() => setFavOpen(true)} {...t} />}
      {view === 'quiz' && <Quiz key={session.id} session={session} favs={favs} toggleFav={toggleFav} notes={notes} setNote={setNote} onExit={() => setView('home')} onFinish={(items, ans, times) => { setRes({ items, ans, times }); setView('results') }} {...t} />}
      {view === 'results' && <Results res={res} onHome={() => setView('home')} onRetake={(qs) => begin({ mode: 'practice', minutes: 0, items: qs })} />}
      <AnimatePresence>{favOpen && <Favs key="f" favs={favs} notes={notes} remove={toggleFav} onPractice={practice} onClose={() => setFavOpen(false)} />}</AnimatePresence>
    </>
  )
}
