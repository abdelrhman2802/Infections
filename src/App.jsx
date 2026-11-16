import { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, NotebookPen, Sun, Moon, ArrowLeft, ArrowRight, X, RotateCcw, Timer, Play, Library as LibIcon, Check, Flame, Target } from 'lucide-react'
import data from './data.json'

const { topics: TOPICS, questions: BANK } = data
const LETTERS = 'ABCDEF'
const nav = { leaving: false }
const BYID = new Map(BANK.map((q) => [q.id, q]))
const GOALS = [10, 20, 30, 50, 100]
const TITLES = ['Culture', 'Colony', 'Strain', 'Isolate', 'Outbreak', 'Epidemic', 'Pandemic']
const key = (d) => d.toLocaleDateString('en-CA')
const today = () => key(new Date())
const streakOf = (days) => { let n = 0; const d = new Date(); if (!days[key(d)]) d.setDate(d.getDate() - 1); while (days[key(d)]) { n++; d.setDate(d.getDate() - 1) } return n }
const exportData = () => {
  const o = {}; Object.keys(localStorage).filter((k) => k.startsWith('colony_') && k !== 'colony_resume').forEach((k) => { o[k] = localStorage.getItem(k) })
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(o)], { type: 'application/json' })); a.download = `colony-progress-${today()}.json`; a.click()
}
const importData = (e) => {
  const f = e.target.files[0]; if (!f || !confirm('Replace your current progress with this backup?')) return
  f.text().then((t) => { const o = JSON.parse(t); Object.entries(o).forEach(([k, v]) => k.startsWith('colony_') && typeof v === 'string' && localStorage.setItem(k, v)); location.reload() }).catch(() => alert('That file is not a Colony backup.'))
}
const ok = (q, sel) => sel.length === q.answers.length && q.answers.every((a) => sel.includes(a))
const isAns = (a) => !!a && a.sel.length > 0

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

function Progress({ days, xp, goal, setGoal }) {
  const lv = Math.floor(Math.sqrt(xp / 100)) + 1, lo = 100 * (lv - 1) ** 2, hi = 100 * lv * lv
  const n = days[today()] || 0, streak = streakOf(days)
  const last = Array.from({ length: 14 }, (_, k) => { const d = new Date(); d.setDate(d.getDate() - (13 - k)); return days[key(d)] || 0 })
  return (
    <div className="prog">
      <div className="prog-top"><span>Level {lv} · {TITLES[Math.min(lv - 1, TITLES.length - 1)]}</span><small>{xp} / {hi} XP</small></div>
      <div className="xpbar"><motion.div initial={{ width: 0 }} animate={{ width: `${((xp - lo) / (hi - lo)) * 100}%` }} transition={{ duration: 0.8 }} /></div>
      <div className="prog-row">
        <span className={`pill ${streak ? 'hot' : ''}`}><Flame size={15} /> {streak}-day streak</span>
        <button type="button" className={`pill ${n >= goal ? 'hot' : ''}`} title="Tap to change your daily goal" onClick={() => setGoal(GOALS[(GOALS.indexOf(goal) + 1) % GOALS.length])}><Target size={15} /> Today {n}/{goal}</button>
      </div>
      <div className="days" aria-label="Questions answered in the last 14 days">
        {last.map((v, k) => <i key={k} className={v >= goal ? 'goal' : v ? 'on' : ''} style={{ height: `${Math.max(12, Math.min(100, (v / goal) * 100))}%` }} title={`${v} answered`} />)}
      </div>
    </div>
  )
}

function Home({ onStart, favs, stats, days, xp, goal, setGoal, saved, onResume, onDiscard, favCount, openFavs, theme, setTheme }) {
  const [sel, setSel] = useState([])
  const [find, setFind] = useState('')
  const [flt, setFlt] = useState('all')
  const [pf, setPf] = usePersist('colony_prefs', { repeats: false, mode: 'practice', minutes: 30, shuffleQ: false, shuffleA: false, lim: 0, auto: true, showTopic: false })
  const P = (k) => [pf[k], (v) => setPf((p) => ({ ...p, [k]: v }))]
  const [repeats, setRepeats] = P('repeats')
  const [mode, setMode] = P('mode')
  const [minutes, setMinutes] = P('minutes')
  const [shuffleQ, setShuffleQ] = P('shuffleQ')
  const [shuffleA, setShuffleA] = P('shuffleA')
  const [lim, setLim] = P('lim')
  const [auto, setAuto] = P('auto')
  const [showTopic, setShowTopic] = P('showTopic')
  const [k, setK] = useState(0)
  useEffect(() => { const t = setInterval(() => setK((x) => (x >= 90 ? 0 : x + 1)), 130); return () => clearInterval(t) }, [])

  const passes = (q) => flt === 'all' || (flt === 'new' ? !stats[q.id] : flt === 'wrong' ? stats[q.id]?.l === 'w' : flt === 'due' ? !!stats[q.id] && stats[q.id].d <= Date.now() : favs.includes(q.id))
  const counts = useMemo(() => TOPICS.map((_, i) => BANK.filter((q) => q.topic === i && passes(q)).length), [flt, stats, favs]) // eslint-disable-line
  const esel = sel.filter((i) => counts[i] > 0)
  const mast = useMemo(() => {
    const m = TOPICS.map(() => 0), t = TOPICS.map(() => 0)
    BANK.forEach((q) => { t[q.topic]++; if (stats[q.id]?.b >= 3) m[q.topic]++ })
    return m.map((v, i) => Math.round((100 * v) / (t[i] || 1)))
  }, [stats])
  const kp = useMemo(() => ({ m: BANK.filter((q) => stats[q.id]?.b >= 3).length, d: BANK.filter((q) => stats[q.id] && stats[q.id].d <= Date.now()).length, w: BANK.filter((q) => stats[q.id]?.l === 'w').length }), [stats])
  const pool = useMemo(() => BANK.filter((q) => (!esel.length || esel.includes(q.topic)) && passes(q))
    .flatMap((q) => Array(repeats ? q.exams.length : 1).fill(q)), [esel.join(), repeats, flt, stats, favs])

  const start = () => {
    let items = pool
    if (shuffleQ) items = shuffle(items)
    if (lim > 0) items = items.slice(0, lim)
    onStart({ mode, minutes, auto, showTopic, items: items.map((q) => ({ q, order: shuffleA ? shuffle(q.options.map((_, i) => i)) : q.options.map((_, i) => i) })) })
  }

  return (
    <main className="home">
      <header className="bar">
        <div className="brand"><span className="brand-dot" />Colony</div>
        <div className="bar-r">
          <button className="chip-btn" onClick={openFavs}><LibIcon size={16} /> Library <b>{favCount}</b></button>
          <ThemeToggle theme={theme} setTheme={setTheme} />
        </div>
      </header>
      <section className="hero">
        <div className="hero-txt">
          <h1>Infectious diseases, one colony at a time.</h1>
          <p>{BANK.length} exam-sourced MCQs across {TOPICS.length} topics. Every answer you give grows on the plate.</p>
          <div className="kpis"><span><b>{kp.m}</b> mastered</span><span><b>{kp.d}</b> due today</span><span><b>{kp.w}</b> missed</span></div>
          <Progress days={days} xp={xp} goal={goal} setGoal={setGoal} />
          <Dish n={64} status={(i) => (i < k ? (i % 7 === 3 ? 'w' : 'c') : null)} className="hero-dish" />
        </div>
        <motion.form className="setup" onSubmit={(e) => { e.preventDefault(); start() }} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: 'easeOut' }}>
          {saved && (
            <div className="resume">
              <div><b>Continue where you left off</b><small>Question {saved.i + 1} of {saved.items.length} · {Object.values(saved.ans || {}).filter(isAns).length} answered · {saved.mode}</small></div>
              <button type="button" className="chip-btn solid" onClick={onResume}>Resume</button>
              <button type="button" className="icon-btn" aria-label="Discard saved session" onClick={onDiscard}><X size={16} /></button>
            </div>
          )}
          <div className="field">
            <div className="field-row">Topics <span>{esel.length ? `${esel.length} selected` : 'All topics'}</span>
              {sel.length > 0 && <button type="button" className="link" onClick={() => setSel([])}>Clear</button>}</div>
            <input type="search" className="find" placeholder="Search topics" value={find} onChange={(e) => setFind(e.target.value)} />
            <div className="topic-box">
              {!counts.some(Boolean) && <small>Nothing here yet. Answer some questions first.</small>}
              {TOPICS.map((t, i) => counts[i] > 0 && t.toLowerCase().includes(find.toLowerCase()) && (
                <button type="button" key={i} aria-pressed={sel.includes(i)} className={`tchip ${sel.includes(i) ? 'on' : ''}`} style={{ '--p': `${mast[i]}%` }} title={`${mast[i]}% mastered`}
                  onClick={() => setSel((x) => (x.includes(i) ? x.filter((y) => y !== i) : [...x, i]))}>{t} <i>{counts[i]}</i></button>
              ))}
            </div>
          </div>
          <Seg label="Questions" value={repeats} set={setRepeats} opts={[[false, 'Unique only'], [true, 'Include repeats']]} />
          <Seg label="Show" value={flt} set={setFlt} opts={[['all', 'All'], ['due', 'Due'], ['new', 'Unseen'], ['wrong', 'Missed'], ['fav', 'Saved']]} />
          <Seg label="Session" value={mode} set={setMode} opts={[['practice', 'Practice'], ['exam', 'Timed exam'], ['study', 'Study']]} />
          {mode === 'exam' && (
            <label className="field inline"><Timer size={16} /> Minutes
              <input type="number" min="1" max="240" value={minutes} onChange={(e) => setMinutes(Math.max(1, +e.target.value || 1))} />
            </label>
          )}
          <label className="field inline">Limit <input type="number" min="0" value={lim} onChange={(e) => setLim(Math.max(0, +e.target.value || 0))} /> <small>0 = all</small></label>
          <div className="toggles">
            <Tog on={auto} set={setAuto}>Auto-advance on correct</Tog>
            <Tog on={showTopic} set={setShowTopic}>Show chapter name</Tog>
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
  const study = mode === 'study'
  const [i, setI] = useState(session.init?.i ?? 0)
  const [ans, setAns] = useState(session.init?.ans ?? {})
  const [secs, setSecs] = useState(session.init?.secs ?? 0)
  const [noteOpen, setNoteOpen] = useState(false)
  const times = useRef({})
  const last = useRef(Date.now())
  const front = useRef(0)
  useEffect(() => {
    try { localStorage.setItem('colony_resume', JSON.stringify({ items: items.map((x) => [x.q.id, x.order]), mode, minutes, showTopic: session.showTopic, auto: session.auto, i, ans, secs })) } catch {}
  }, [i, ans, Math.floor(secs / 15)]) // eslint-disable-line
  const [ask, setAsk] = useState(false)
  useEffect(() => {
    const pop = () => { if (nav.leaving) return; history.pushState({ v: 'quiz' }, ''); setAsk(true) }
    const unload = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('popstate', pop); window.addEventListener('beforeunload', unload)
    return () => { window.removeEventListener('popstate', pop); window.removeEventListener('beforeunload', unload) }
  }, [])
  const adv = useRef(null)

  useEffect(() => { const t = setInterval(() => setSecs((s) => s + 1), 1000); return () => clearInterval(t) }, [])
  useEffect(() => { last.current = Date.now(); const idx = i; return () => { times.current[idx] = (times.current[idx] || 0) + (Date.now() - last.current) / 1000 } }, [i])

  const finish = () => { times.current[i] = (times.current[i] || 0) + (Date.now() - last.current) / 1000; onFinish(items, ans, times.current) }
  const left = minutes * 60 - secs
  useEffect(() => { if (exam && left <= 0) finish() }, [left]) // eslint-disable-line

  const it = items[i], q = it.q, a = ans[i] || { sel: [], done: false }, multi = q.answers.length > 1
  const reveal = study || (!exam && a.done), good = ok(q, a.sel)
  const maybeAdv = (sel) => { if (session.auto && ok(q, sel) && i >= front.current && i < items.length - 1) { clearTimeout(adv.current); adv.current = setTimeout(() => go(1), 1100) } }
  const pick = (oi) => {
    if (study || (!exam && a.done)) return
    setAns((s) => { const c = s[i] || { sel: [] }; const sel = multi ? (c.sel.includes(oi) ? c.sel.filter((x) => x !== oi) : [...c.sel, oi]) : [oi]; return { ...s, [i]: { sel, done: !exam && !multi } } })
    if (!multi && !exam) maybeAdv([oi])
  }
  const check = () => { if (!a.sel.length) return; setAns((s) => ({ ...s, [i]: { ...s[i], done: true } })); maybeAdv(a.sel) }
  const go = (d) => { clearTimeout(adv.current); if (d < 0) front.current = Math.max(front.current, i); setI((x) => Math.min(items.length - 1, Math.max(0, x + d))) }
  useEffect(() => { window.scrollTo({ top: 0 }) }, [i])
  useEffect(() => () => clearTimeout(adv.current), []) // eslint-disable-line

  useEffect(() => {
    const onKey = (e) => {
      if (noteOpen || ask || ['TEXTAREA', 'INPUT'].includes(e.target.tagName)) return
      if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') { if (multi && !a.done && !exam) check(); else go(1) }
      else if (/^[1-6]$/.test(e.key) && it.order[+e.key - 1] !== undefined) pick(it.order[+e.key - 1])
    }
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey)
  })

  const status = (k) => { const x = ans[k]; return !isAns(x) ? null : exam || !x.done ? 'a' : ok(items[k].q, x.sel) ? 'c' : 'w' }
  const faved = favs.includes(q.id)

  return (
    <main className="quiz">
      <header className="bar">
        <button className="icon-btn" aria-label="Leave session" onClick={() => setAsk(true)}><X size={18} /></button>
        <div className={`clock ${exam && left < 60 ? 'urgent' : ''}`}><Timer size={16} />{fmt(exam ? Math.max(0, left) : secs)}</div>
        <div className="bar-r"><ThemeToggle theme={theme} setTheme={setTheme} />
          <button className="chip-btn solid" onClick={study ? () => onExit(items, {}) : finish}>{study ? 'Done' : 'Finish'}</button></div>
      </header>
      <div className="quiz-grid">
        <aside className="side">
          <Dish n={items.length} status={status} cur={i} />
          <div className="meter"><motion.div animate={{ width: `${((i + 1) / items.length) * 100}%` }} /></div>
          <p className="count">{Object.values(ans).filter(isAns).length} answered · question {i + 1} of {items.length}</p>
        </aside>
        <AnimatePresence mode="wait">
          <motion.section key={i} className="card" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }}>
            <div className="card-top">
              <span className="topic">{[session.showTopic && TOPICS[q.topic], multi && 'Select all that apply'].filter(Boolean).join(' · ')}</span>
              <div className="acts">
                <button className={`icon-btn ${notes[q.id] ? 'has' : ''}`} aria-label="Add note" onClick={() => setNoteOpen(true)}><NotebookPen size={18} /></button>
                <button className={`icon-btn ${faved ? 'fav' : ''}`} aria-label="Save question" aria-pressed={faved} onClick={() => toggleFav(q.id)}><Star size={18} fill={faved ? 'currentColor' : 'none'} /></button>
              </div>
            </div>
            <h2 className="stem">{q.stem}</h2>
            <div className="opts">
              {it.order.map((oi, pos) => {
                const cls = reveal && q.answers.includes(oi) ? 'right' : reveal && a.sel.includes(oi) ? 'wrong' : a.sel.includes(oi) ? 'picked' : ''
                return (
                  <motion.button key={oi} className={`opt ${multi ? 'multi' : ''} ${cls}`} whileTap={{ scale: 0.985 }} onClick={() => pick(oi)} disabled={reveal}>
                    <span className="letter">{cls === 'right' ? <Check size={16} /> : cls === 'wrong' ? <X size={16} /> : LETTERS[pos]}</span>
                    <span>{q.options[oi]}</span>
                  </motion.button>
                )
              })}
            </div>
            {multi && !exam && !a.done && <button className="chip-btn solid" onClick={check} disabled={!a.sel.length}>Check answer</button>}
            <AnimatePresence>
              {reveal && (
                <motion.div className="why" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <p><b>{good ? 'Correct.' : `Answer: ${q.answers.map((x) => LETTERS[it.order.indexOf(x)]).sort().join(', ')}.`}</b> {q.explanation}</p>
                  <div className="tags">{q.exams.map((e) => <span key={e}>{e}</span>)}</div>
                </motion.div>
              )}
            </AnimatePresence>
            {notes[q.id] && <p className="note-preview">{notes[q.id]}</p>}
            <div className="nav">
              <button className="chip-btn" onClick={() => go(-1)} disabled={i === 0}><ArrowLeft size={16} /> Previous</button>
              {i === items.length - 1 ? <button className="chip-btn solid" onClick={study ? () => onExit(items, {}) : finish}>{study ? 'Done' : 'See results'}</button>
                : <button className="chip-btn solid" onClick={() => go(1)}>Next <ArrowRight size={16} /></button>}
            </div>
          </motion.section>
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {ask && <Confirm key="c" onStay={() => setAsk(false)} onLeave={() => onExit(items, ans)} />}
        {noteOpen && <NoteSheet key="n" initial={notes[q.id] || ''} onClose={() => setNoteOpen(false)} onSave={(t) => { setNote(q.id, t); setNoteOpen(false) }} />}
      </AnimatePresence>
    </main>
  )
}

function Confirm({ onStay, onLeave }) {
  return (
    <motion.div className="scrim mid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onStay}>
      <motion.div className="sheet dlg" initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }} onClick={(e) => e.stopPropagation()} role="alertdialog" aria-label="Leave session">
        <h3>Leave this session?</h3>
        <p>Answers you've checked so far are kept in your progress. Unanswered questions stay unseen.</p>
        <div className="nav"><button className="chip-btn" autoFocus onClick={onStay}>Stay</button><button className="chip-btn solid" onClick={onLeave}>Leave</button></div>
      </motion.div>
    </motion.div>
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
  const c = items.filter((x, k) => isAns(ans[k]) && ok(x.q, ans[k].sel)).length
  const w = Object.values(ans).filter(isAns).length - c
  const u = items.length - c - w
  const pct = Math.round((c / items.length) * 100)
  const avg = items.length ? Object.values(times).reduce((a, b) => a + b, 0) / items.length : 0
  const retake = (withU) => onRetake(items.filter((x, k) => isAns(ans[k]) ? !ok(x.q, ans[k].sel) : withU))
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
          {res.xp > 0 && <p className="xp">+{res.xp} XP earned</p>}
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
          <details className="review"><summary>Review mistakes and skipped</summary>
            {items.map((x, k) => ({ x, k })).filter(({ x, k }) => !isAns(ans[k]) || !ok(x.q, ans[k].sel)).map(({ x, k }) => (
              <div className="favcard" key={k}><p>{x.q.stem}</p><small>{x.q.answers.map((a) => x.q.options[a]).join(' · ')}</small>{x.q.explanation && <em>{x.q.explanation}</em>}</div>
            ))}
          </details>
        </div>
      </div>
    </main>
  )
}

function Library({ favs, notes, toggle, onPractice, onClose }) {
  const [q, setQ] = useState('')
  const [only, setOnly] = useState(false)
  const list = useMemo(() => {
    const w = q.toLowerCase().split(/\s+/).filter(Boolean)
    return BANK.filter((x) => (!only || favs.includes(x.id)) && w.every((t) => `${x.stem} ${x.options.join(' ')} ${TOPICS[x.topic]}`.toLowerCase().includes(t)))
  }, [q, only, favs])
  return (
    <motion.div className="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.aside className="drawer" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} onClick={(e) => e.stopPropagation()}>
        <div className="card-top"><h3>Library</h3><button className="icon-btn" aria-label="Close" onClick={onClose}><X size={18} /></button></div>
        <input type="search" className="find" autoFocus placeholder="Search questions, answers, topics" value={q} onChange={(e) => setQ(e.target.value)} />
        <Tog on={only} set={setOnly}>Saved only ({favs.length})</Tog>
        <div className="row2"><button type="button" className="chip-btn" onClick={exportData}>Export progress</button><label className="chip-btn">Import<input type="file" accept="application/json" hidden onChange={importData} /></label></div>
        <p className="empty">{list.length} question{list.length === 1 ? '' : 's'}</p>
        {list.slice(0, 60).map((x) => (
          <div className="favcard" key={x.id}>
            <p>{x.stem}</p><small>{x.answers.map((a) => x.options[a]).join(' · ')}</small>
            {notes[x.id] && <em>{notes[x.id]}</em>}
            <button className={`icon-btn ${favs.includes(x.id) ? 'fav' : ''}`} aria-label="Save" onClick={() => toggle(x.id)}><Star size={16} fill={favs.includes(x.id) ? 'currentColor' : 'none'} /></button>
          </div>
        ))}
        {list.length > 60 && <p className="empty">Showing the first 60. Refine your search to narrow down.</p>}
        {!!list.length && <button className="go" onClick={() => onPractice(list)}><Play size={18} fill="currentColor" /> Practice these ({list.length})</button>}
      </motion.aside>
    </motion.div>
  )
}

export default function App() {
  const [theme, setTheme] = usePersist('colony_theme', 'dark')
  const [favs, setFavs] = usePersist('colony_favs', [])
  const [notes, setNotes] = usePersist('colony_notes', {})
  const [stats, setStats] = usePersist('colony_stats', {})
  const [days, setDays] = usePersist('colony_days', {})
  const [xp, setXp] = usePersist('colony_xp', 0)
  const [goal, setGoal] = usePersist('colony_goal', 20)
  const [tick, setTick] = useState(0)
  const [view, setView] = useState('home')
  const [session, setSession] = useState(null)
  const [res, setRes] = useState(null)
  const [favOpen, setFavOpen] = useState(false)
  useEffect(() => { document.documentElement.dataset.theme = theme }, [theme])
  const viewRef = useRef(view); viewRef.current = view
  useEffect(() => {
    const pop = () => { if (nav.leaving) { nav.leaving = false; return } if (viewRef.current === 'results') setView('home') }
    window.addEventListener('popstate', pop); return () => window.removeEventListener('popstate', pop)
  }, [])

  const begin = (s) => {
    history[view === 'home' ? 'pushState' : 'replaceState']({ v: 'quiz' }, '')
    const pr = load('colony_prefs', {})
    setSession({ showTopic: !!pr.showTopic, auto: pr.auto ?? true, ...s, id: Math.random() }); setView('quiz')
  }
  const practice = (qs) => { setFavOpen(false); begin({ mode: 'practice', minutes: 0, items: qs.map((q) => ({ q, order: q.options.map((_, i) => i) })) }) }
  const toggleFav = (id) => setFavs((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]))
  const setNote = (id, t) => setNotes((n) => { const c = { ...n }; if (t) c[id] = t; else delete c[id]; return c })
  const record = (items, ans) => {
    let cnt = 0, gain = 0
    items.forEach((it, k) => { const x = ans[k]; if (!isAns(x) || (!x.done && session.mode !== 'exam')) return; cnt++; gain += ok(it.q, x.sel) ? 10 : 2 })
    setStats((s) => {
      const n = { ...s }
      items.forEach((it, k) => {
        const x = ans[k]; if (!isAns(x) || (!x.done && session.mode !== 'exam')) return
        const g = ok(it.q, x.sel), p = n[it.q.id] || { a: 0, c: 0, w: 0 }
        n[it.q.id] = { a: p.a + 1, c: p.c + (g ? 1 : 0), w: p.w + (g ? 0 : 1), l: g ? 'c' : 'w', b: g ? Math.min((p.b || 0) + 1, 5) : 0, d: Date.now() + (g ? [0, 1, 3, 7, 14, 30][Math.min((p.b || 0) + 1, 5)] : 0) * 864e5 }
      })
      return n
    })
    if (cnt) { setDays((d) => ({ ...d, [today()]: (d[today()] || 0) + cnt })); setXp((x) => x + gain) }
    return gain
  }
  const clearResume = () => { try { localStorage.removeItem('colony_resume') } catch {} }
  const saved = useMemo(() => { if (view !== 'home') return null; const r = load('colony_resume', null); return r && r.items?.length ? r : null }, [view, tick])
  const resumeSession = () => {
    const items = saved.items.map(([id, order]) => ({ q: BYID.get(id), order })).filter((x) => x.q)
    history.pushState({ v: 'quiz' }, '')
    setSession({ mode: saved.mode, minutes: saved.minutes, showTopic: saved.showTopic, auto: saved.auto, items, init: { i: Math.min(saved.i, items.length - 1), ans: saved.ans || {}, secs: saved.secs || 0 }, id: Math.random() }); setView('quiz')
  }
  const t = { theme, setTheme }

  return (
    <>
      {view === 'home' && <Home onStart={begin} favs={favs} stats={stats} days={days} xp={xp} goal={goal} setGoal={setGoal} saved={saved} onResume={resumeSession} onDiscard={() => { clearResume(); setTick((x) => x + 1) }} favCount={favs.length} openFavs={() => setFavOpen(true)} {...t} />}
      {view === 'quiz' && <Quiz key={session.id} session={session} favs={favs} toggleFav={toggleFav} notes={notes} setNote={setNote} onExit={(items, ans) => { record(items, ans); clearResume(); nav.leaving = true; setView('home'); history.back() }} onFinish={(items, ans, times) => { const xp = record(items, ans); clearResume(); history.replaceState({ v: 'results' }, ''); setRes({ items, ans, times, xp }); setView('results') }} {...t} />}
      {view === 'results' && <Results res={res} onHome={() => history.back()} onRetake={(qs) => begin({ mode: 'practice', minutes: 0, items: qs })} />}
      <AnimatePresence>{favOpen && <Library key="f" favs={favs} notes={notes} toggle={toggleFav} onPractice={practice} onClose={() => setFavOpen(false)} />}</AnimatePresence>
    </>
  )
}
