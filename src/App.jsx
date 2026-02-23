import { useState, useEffect, useRef } from "react";

// ─── !! PASTE YOUR REPLIT URL HERE WHEN READY !! ─────────────────────────────
const BACKEND_URL = "https://agi-backend.thomzy07.workers.dev";
// ─────────────────────────────────────────────────────────────────────────────

// ─── CURRICULUM ──────────────────────────────────────────────────────────────
// 4 phases × ~6 emails = ~24 emails, strategically spaced over 100 days
// Batched so each phase generates independently and renders progressively

const PHASES = [
  {
    id: "phase1",
    label: "Phase 1 — Wake Up",
    subtitle: "Days 1–20 · The Honest Reckoning",
    color: "#e05252",
    icon: "⚠",
    description: "Shock absorption, threat clarity, and your very first moves.",
    days: [1, 3, 5, 8, 12, 17, 20],
    themes: [
      "Day 1 — Your First Move This Week: one concrete action based on their specific role",
      "Day 3 — The Machines Are Already Here: specific AI tools already doing parts of their job right now",
      "Day 5 — What You're Actually Good At: identifying transferable human strengths beneath the job title",
      "Day 8 — The Skill Gap Audit: an honest self-assessment exercise mapping current vs. needed skills",
      "Day 12 — Pick One Skill. Just One: the single most important capability to develop, with a learning path",
      "Day 17 — Your First Week of Learning: a daily micro-habit for skill acquisition that takes under 20 minutes",
      "Day 20 — Check In: how do you feel? Normalising the discomfort of transition",
    ],
  },
  {
    id: "phase2",
    label: "Phase 2 — Rebuild",
    subtitle: "Days 21–50 · Identity & Skills",
    color: "#e0a852",
    icon: "◈",
    description: "Decoupling worth from job title. Building new capabilities.",
    days: [21, 25, 30, 35, 40, 45, 50],
    themes: [
      "Day 21 — Who Are You Without Your Title? A journaling exercise to explore identity beyond career",
      "Day 25 — The Comparison Trap: why watching colleagues get displaced triggers shame, and how to redirect it",
      "Day 30 — Your Human Moat: the 3 qualities about you that AGI will never replicate — and how to lean into them",
      "Day 35 — Mid-Point Skill Check: celebrating progress, adjusting the learning plan",
      "Day 40 — Relationships as Infrastructure: how to build professional trust that outlasts any technology shift",
      "Day 45 — The Story You Tell Yourself: rewriting the internal narrative from 'threatened' to 'transitioning'",
      "Day 50 — Half-Time Report: what's shifted in 50 days? A structured self-reflection exercise",
    ],
  },
  {
    id: "phase3",
    label: "Phase 3 — Reposition",
    subtitle: "Days 51–80 · Your New Value Proposition",
    color: "#52b4e0",
    icon: "◎",
    description: "Crafting your hybrid human-AI role. Going on offence.",
    days: [51, 55, 60, 65, 70, 75, 80],
    themes: [
      "Day 51 — The Hybrid Worker Advantage: how to position yourself as someone who directs AI, not competes with it",
      "Day 55 — Build Something: a prompt to start a small creative or professional project using AI as a collaborator",
      "Day 60 — Your Personal Advisory Board: identifying 3 people to build a deeper mentorship relationship with",
      "Day 65 — The Portfolio Mindset: why a single job is the riskiest position — and how to think in terms of income streams",
      "Day 70 — Communicating Your Value: how to talk about your evolution to employers or clients in concrete terms",
      "Day 75 — Emotional Resilience Under Uncertainty: a practical toolkit for managing anxiety when the ground keeps shifting",
      "Day 80 — The Crisis You Avoided: visualising the person you would have been if you had done nothing",
    ],
  },
  {
    id: "phase4",
    label: "Phase 4 — Transcend",
    subtitle: "Days 81–100 · Beyond the Job",
    color: "#a076f9",
    icon: "∞",
    description: "The deeper question. Who you're becoming. Your next chapter.",
    days: [81, 85, 88, 91, 95, 98, 100],
    themes: [
      "Day 81 — What Does Flourishing Look Like For You? A values excavation exercise",
      "Day 85 — Legacy Without a Job Title: what mark you want to leave, independent of your career",
      "Day 88 — The Community You Belong To: finding or building a tribe of people navigating the same transition",
      "Day 91 — Money, Meaning, and the New Economy: rethinking financial security in an AGI world",
      "Day 95 — Gratitude for the Disruption: finding genuine appreciation for being forced to evolve",
      "Day 98 — Letter to Yourself in One Year: a written exercise projecting forward with intention",
      "Day 100 — Who Are You Now? A final reflection — and your next 100-day challenge",
    ],
  },
];

const ASSESSMENT_PROMPT = `You are Jinshi — a world-renowned life coach, organisational psychologist, and futurist with 30 years of experience helping people navigate career identity crises and radical change. You specialise in the psychological and vocational impact of AGI on the human workforce.

Tone: warm but unflinching. Honest. Direct. No filler.

When given a person's job description, respond with exactly these four sections:

## THREAT ASSESSMENT
Honestly evaluate how vulnerable this specific role is to AGI displacement in the next 3–7 years. Be specific. Name actual capabilities.

## THE IDENTITY TRAP
How their sense of self is entangled with their job. What the psychological fallout could look like.

## YOUR SURVIVAL ARCHITECTURE
4–5 highly personalised, concrete actions specific to their role. Not generic advice.

## THE DEEPER QUESTION
One provocative, soul-level question that reframes their relationship to work entirely.

Under 600 words total. No corporate speak.`;

function buildBatchPrompt(phase, jobDesc) {
  return `You are Jinshi — AGI transitions coach with 30 years experience.

A person has described their job as: "${jobDesc}"

Draft ${phase.themes.length} coaching emails for ${phase.label} (${phase.subtitle}).

Each email is a personal letter from a trusted mentor. Warm, direct, specific to THEIR role. Reference their actual job where relevant. Never generic.

RESPOND ONLY WITH VALID JSON. No markdown. No backticks. No preamble. Start with [ end with ].

[
  {
    "day": <number>,
    "subject": "<personal subject line — NOT newsletter-style>",
    "preview": "<1 sentence hook, 12 words max>",
    "theme": "<short theme label, 4 words max>",
    "body": "<email body, 220-260 words, second person, warm but direct, end with a single action or reflection prompt, sign off as Jinshi. Use \\n\\n for paragraph breaks.>"
  }
]

The emails must cover these specific themes on these days:
${phase.themes.map((t, i) => `Email ${i + 1}: ${t} (day: ${phase.days[i]})`).join("\n")}

Write every email as if you know this specific person's job intimately. Make it feel hand-written for them.`;
}

// ─── API ─────────────────────────────────────────────────────────────────────

async function callClaude(systemPrompt, userMessage, maxTokens = 1000) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      temperature: 0.72,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userMessage },
      ],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices?.[0]?.message?.content || "";
}

function safeParseJSON(raw) {
  try {
    const clean = raw.replace(/```json|```/g, "").trim();
    const start = clean.indexOf("[");
    const end = clean.lastIndexOf("]");
    if (start === -1 || end === -1) return null;
    return JSON.parse(clean.slice(start, end + 1));
  } catch { return null; }
}

function parseAssessment(text) {
  const defs = [
    { header: "THREAT ASSESSMENT", icon: "⚠", color: "#e05252" },
    { header: "THE IDENTITY TRAP", icon: "◎", color: "#e0a852" },
    { header: "YOUR SURVIVAL ARCHITECTURE", icon: "◈", color: "#52b4e0" },
    { header: "THE DEEPER QUESTION", icon: "∞", color: "#a076f9" },
  ];
  return defs.map(d => {
    const rx = new RegExp(`## ${d.header}([\\s\\S]*?)(?=## |$)`, "i");
    const m = text.match(rx);
    return { ...d, title: d.header, content: m ? m[1].trim() : "" };
  }).filter(s => s.content);
}

// ─── SUB-COMPONENTS ──────────────────────────────────────────────────────────

function PhaseHeader({ phase, emailCount, totalEmails, status }) {
  const pct = totalEmails > 0 ? Math.round((emailCount / totalEmails) * 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: "20px 24px", background: `${phase.color}08`, borderLeft: `3px solid ${phase.color}`, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <span style={{ fontSize: 22, color: phase.color, flexShrink: 0, marginTop: 2 }}>{phase.icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase", color: phase.color, marginBottom: 4 }}>{phase.label}</div>
        <div style={{ fontSize: 13, color: "#5a5850", marginBottom: status === "generating" ? 10 : 0 }}>{phase.subtitle}</div>
        {status === "generating" && (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1, height: 2, background: "rgba(255,255,255,0.05)", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", inset: 0, background: `linear-gradient(90deg, transparent, ${phase.color}, transparent)`, animation: "sweep 1.6s ease infinite" }} />
            </div>
            <span style={{ fontSize: 10, letterSpacing: "0.2em", color: phase.color, textTransform: "uppercase", flexShrink: 0 }}>Writing...</span>
          </div>
        )}
        {status === "done" && (
          <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#52e0a4", marginTop: 4 }}>✓ {emailCount} emails ready</div>
        )}
      </div>
    </div>
  );
}

function EmailRow({ email, phase, isOpen, onToggle }) {
  return (
    <div style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", animation: "slideIn 0.35s ease both" }}>
      <button onClick={onToggle} style={{ width: "100%", background: "transparent", border: "none", padding: "18px 24px", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ fontSize: 10, letterSpacing: "0.2em", border: `1px solid ${phase.color}55`, color: phase.color, padding: "3px 9px", flexShrink: 0, minWidth: 52, textAlign: "center" }}>
          D{email.day}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "Playfair Display, serif", fontSize: 14, fontWeight: 700, color: "#d0cbc4", lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{email.subject}</div>
          <div style={{ fontSize: 11, color: "#3a3830", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{email.preview}</div>
        </div>
        <div style={{ fontSize: 10, letterSpacing: "0.12em", color: "#3a3830", flexShrink: 0, textTransform: "uppercase", paddingRight: 4 }}>{email.theme}</div>
        <div style={{ color: "#2a2820", fontSize: 13, flexShrink: 0, transition: "transform 0.25s", transform: isOpen ? "rotate(180deg)" : "none" }}>∨</div>
      </button>
      {isOpen && (
        <div style={{ padding: "4px 24px 28px 24px", animation: "slideIn 0.25s ease" }}>
          <div style={{ display: "inline-block", fontSize: 9, letterSpacing: "0.25em", textTransform: "uppercase", border: `1px solid ${phase.color}33`, color: phase.color, padding: "3px 10px", marginBottom: 16 }}>◈ {email.theme}</div>
          <div style={{ fontSize: 14, lineHeight: 1.95, color: "#9a9490" }}>
            {(email.body || "").split("\\n\\n").map((para, i) => (
              <p key={i} style={{ marginBottom: 14 }}>{para.replace(/\\n/g, " ")}</p>
            ))}
          </div>
          <button onClick={() => navigator.clipboard.writeText(`Subject: ${email.subject}\n\n${(email.body || "").replace(/\\n\\n/g, "\n\n").replace(/\\n/g, "\n")}`)}
            style={{ marginTop: 16, background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "#4a4840", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", padding: "7px 14px", cursor: "pointer", transition: "all 0.2s" }}
            onMouseEnter={e => { e.target.style.color = "#d4cfc8"; e.target.style.borderColor = "rgba(255,255,255,0.2)"; }}
            onMouseLeave={e => { e.target.style.color = "#4a4840"; e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}>
            ⊕ Copy email text
          </button>
        </div>
      )}
    </div>
  );
}

function SkeletonRows({ count, color }) {
  return Array.from({ length: count }, (_, i) => (
    <div key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", padding: "18px 24px", display: "flex", alignItems: "center", gap: 14, opacity: 1 - i * 0.15 }}>
      <div style={{ width: 52, height: 22, background: `${color}18`, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ height: 13, background: "rgba(255,255,255,0.04)", width: `${55 + Math.random() * 30}%`, marginBottom: 6 }} />
        <div style={{ height: 10, background: "rgba(255,255,255,0.025)", width: `${30 + Math.random() * 25}%` }} />
      </div>
    </div>
  ));
}

function ProgressRing({ pct, color, size = 48 }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={3} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={3}
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)}
        style={{ transition: "stroke-dashoffset 0.5s ease" }} strokeLinecap="round" />
    </svg>
  );
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

export default function App() {
  const [userEmail, setUserEmail] = useState("");
  const [jobDesc, setJobDesc] = useState("");
  const [stage, setStage] = useState("landing"); // landing | form | loading | result
  const [assessment, setAssessment] = useState("");
  const [phaseEmails, setPhaseEmails] = useState({ phase1: [], phase2: [], phase3: [], phase4: [] });
  const [phaseStatus, setPhaseStatus] = useState({ phase1: "idle", phase2: "idle", phase3: "idle", phase4: "idle" });
  const [openEmail, setOpenEmail] = useState(null);
  const [activeTab, setActiveTab] = useState("assessment");
  const [error, setError] = useState("");
  const [loadTick, setLoadTick] = useState(0);
  const [activePhaseFilter, setActivePhaseFilter] = useState("all");
  const [emailsEnrolled, setEmailsEnrolled] = useState(false);

  const loadMsgs = ["Mapping your vocational DNA...", "Cross-referencing AGI threat timelines...", "Profiling your identity architecture...", "Building your survival blueprint...", "Almost there..."];
  useEffect(() => {
    if (stage !== "loading") return;
    const iv = setInterval(() => setLoadTick(t => t + 1), 2100);
    return () => clearInterval(iv);
  }, [stage]);

  const sections = assessment ? parseAssessment(assessment) : [];
  const allEmails = [...(phaseEmails.phase1 || []), ...(phaseEmails.phase2 || []), ...(phaseEmails.phase3 || []), ...(phaseEmails.phase4 || [])];
  const totalEmailsExpected = PHASES.reduce((s, p) => s + p.themes.length, 0);
  const totalGenerated = allEmails.length;
  const agentDone = Object.values(phaseStatus).every(s => s === "done" || s === "error");
  const agentRunning = Object.values(phaseStatus).some(s => s === "generating");

  async function runEmailAgent(desc) {
    for (const phase of PHASES) {
      setPhaseStatus(ps => ({ ...ps, [phase.id]: "generating" }));
      try {
        const raw = await callClaude("You are Jinshi, AGI transitions coach. You write warm, direct, personalised coaching emails.", buildBatchPrompt(phase, desc), 4000);
        const parsed = safeParseJSON(raw);
        if (parsed && parsed.length > 0) {
          setPhaseEmails(pe => ({ ...pe, [phase.id]: parsed }));
          setPhaseStatus(ps => ({ ...ps, [phase.id]: "done" }));
        } else {
          setPhaseStatus(ps => ({ ...ps, [phase.id]: "error" }));
        }
      } catch {
        setPhaseStatus(ps => ({ ...ps, [phase.id]: "error" }));
      }
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStage("loading");
    setError("");
    setPhaseEmails({ phase1: [], phase2: [], phase3: [], phase4: [] });
    setPhaseStatus({ phase1: "idle", phase2: "idle", phase3: "idle", phase4: "idle" });

    try {
      // Step 1: Get instant assessment (shown on screen)
      const text = await callClaude(ASSESSMENT_PROMPT, `My job: ${jobDesc}`);
      setAssessment(text);
      setStage("result");
      setActiveTab("assessment");

      // Step 2: Register with backend + schedule 28 emails via Resend (fire & forget)
      fetch(`${BACKEND_URL}/api/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, jobDesc }),
      })
        .then(r => r.json())
        .then(d => {
          if (d.success) setEmailsEnrolled(true);
        })
        .catch(() => {}); // Silent fail — preview still works

      // Step 3: Also render email previews live in the browser
      runEmailAgent(jobDesc);
    } catch {
      setError("Something went wrong. Please try again.");
      setStage("form");
    }
  }

  const reset = () => {
    setStage("form"); setAssessment(""); setActiveTab("assessment"); setError(""); setEmailsEnrolled(false);
    setPhaseEmails({ phase1: [], phase2: [], phase3: [], phase4: [] });
    setPhaseStatus({ phase1: "idle", phase2: "idle", phase3: "idle", phase4: "idle" });
    setOpenEmail(null);
  };

  const filteredEmails = activePhaseFilter === "all" ? allEmails : (phaseEmails[activePhaseFilter] || []);
  const filteredPhase = PHASES.find(p => p.id === activePhaseFilter);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=Inconsolata:wght@300;400;500;600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{background:#080b12;color:#d4cfc8;font-family:'Inconsolata',monospace;min-height:100vh;overflow-x:hidden}
        button{cursor:pointer;font-family:'Inconsolata',monospace}
        input,textarea{font-family:'Inconsolata',monospace}
        input::placeholder,textarea::placeholder{color:#252318}
        textarea{resize:vertical}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#1e1c14}
        @keyframes fadeUp{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:.35;transform:scale(1)}50%{opacity:1;transform:scale(1.08)}}
        @keyframes sweep{0%{left:-100%}100%{left:100%}}
        @keyframes slideIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes agentBlink{0%,100%{opacity:1}50%{opacity:.3}}
        .fade-in{animation:fadeUp .65s ease both}
        .noise{position:fixed;inset:0;opacity:.45;pointer-events:none;z-index:0;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.04'/%3E%3C/svg%3E")}
        .grid{position:fixed;inset:0;pointer-events:none;z-index:0;background-image:linear-gradient(rgba(255,255,255,.016) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.016) 1px,transparent 1px);background-size:60px 60px}
      `}</style>

      <div className="noise" /><div className="grid" />
      <div style={{ position:"fixed",width:700,height:700,top:-280,left:-220,borderRadius:"50%",background:"rgba(224,82,82,.05)",filter:"blur(130px)",pointerEvents:"none",zIndex:0 }} />
      <div style={{ position:"fixed",width:600,height:600,bottom:-200,right:-180,borderRadius:"50%",background:"rgba(160,118,249,.045)",filter:"blur(130px)",pointerEvents:"none",zIndex:0 }} />

      <div style={{ position:"relative",zIndex:1,minHeight:"100vh" }}>

        {/* ══ LANDING ══ */}
        {stage === "landing" && (
          <div className="fade-in" style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",padding:"60px 24px",textAlign:"center" }}>
            <div style={{ maxWidth:820 }}>
              <p style={{ fontSize:10,letterSpacing:".32em",textTransform:"uppercase",color:"#e05252",marginBottom:28 }}>⬤ AGI is not coming — it is arriving</p>
              <h1 style={{ fontFamily:"Playfair Display,serif",fontSize:"clamp(46px,8vw,90px)",lineHeight:1,fontWeight:900,color:"#f0ebe3",marginBottom:14,letterSpacing:"-.02em" }}>
                Are you<br /><em style={{ color:"#e0a852" }}>ready</em><br />to still<br />matter?
              </h1>
              <div style={{ width:56,height:1,background:"#e05252",margin:"32px auto" }} />
              <p style={{ fontFamily:"Playfair Display,serif",fontSize:"clamp(16px,2.2vw,21px)",fontStyle:"italic",color:"#9e9890",marginBottom:36,lineHeight:1.65 }}>
                Most people won't see it until it's too late.<br />The question isn't whether your job is safe —<br />it's whether your <em>identity</em> is.
              </p>
              <p style={{ fontSize:15,lineHeight:1.9,color:"#a8a298",maxWidth:620,margin:"0 auto 52px" }}>
                AGI will not just eliminate jobs. It will dissolve the stories we tell ourselves about who we are. Your title. Your expertise. Your sense of contribution. <strong style={{ color:"#d4cfc8" }}>All of it is at risk.</strong><br /><br />
                Tell me what you do. I'll give you an honest assessment — then my AI agent will build you a personalised <strong style={{ color:"#d4cfc8" }}>100-day coaching programme</strong>, delivered to your inbox in 28 strategic emails across 4 phases of transformation.
              </p>

              {/* Phase preview */}
              <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12,maxWidth:720,margin:"0 auto 52px",textAlign:"left" }}>
                {PHASES.map(p => (
                  <div key={p.id} style={{ background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.06)",borderLeft:`3px solid ${p.color}`,padding:"16px 18px" }}>
                    <div style={{ fontSize:10,letterSpacing:".25em",textTransform:"uppercase",color:p.color,marginBottom:6 }}>{p.icon} {p.label.split("—")[1]?.trim()}</div>
                    <div style={{ fontSize:11,color:"#5a5850",lineHeight:1.6 }}>{p.subtitle}</div>
                  </div>
                ))}
              </div>

              <button onClick={() => setStage("form")}
                style={{ background:"#e05252",color:"#fff",border:"none",padding:"18px 56px",fontSize:13,letterSpacing:".22em",textTransform:"uppercase",transition:"all .2s",clipPath:"polygon(0 0,calc(100% - 12px) 0,100% 12px,100% 100%,12px 100%,0 calc(100% - 12px))" }}
                onMouseEnter={e=>{e.target.style.background="#c83c3c";e.target.style.transform="translateY(-2px)";e.target.style.boxShadow="0 12px 40px rgba(224,82,82,.3)"}}
                onMouseLeave={e=>{e.target.style.background="#e05252";e.target.style.transform="";e.target.style.boxShadow=""}}>
                Start my 100-day programme
              </button>

              <div style={{ display:"flex",gap:52,marginTop:72,justifyContent:"center",flexWrap:"wrap" }}>
                {[["28","personalised emails"],["100","days of coaching"],["4","transformation phases"]].map(([n,l]) => (
                  <div key={n} style={{ textAlign:"center" }}>
                    <div style={{ fontFamily:"Playfair Display,serif",fontSize:42,fontWeight:900,color:"#e0a852" }}>{n}</div>
                    <div style={{ fontSize:10,letterSpacing:".2em",textTransform:"uppercase",color:"#3a3830",marginTop:8 }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ FORM ══ */}
        {stage === "form" && (
          <div className="fade-in" style={{ display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",padding:"72px 24px" }}>
            <div style={{ maxWidth:660,width:"100%" }}>
              <h2 style={{ fontFamily:"Playfair Display,serif",fontSize:"clamp(28px,5vw,46px)",fontWeight:700,color:"#f0ebe3",textAlign:"center",marginBottom:8 }}>Your Assessment</h2>
              <p style={{ fontSize:12,letterSpacing:".18em",textTransform:"uppercase",color:"#3a3830",textAlign:"center",marginBottom:40 }}>60 seconds of honesty. 100 days of guidance.</p>

              <div style={{ background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.07)",padding:"22px 26px",marginBottom:36 }}>
                <div style={{ fontSize:11,letterSpacing:".2em",textTransform:"uppercase",color:"#5a5850",marginBottom:14 }}>What you'll receive</div>
                {[
                  { icon:"◈", color:"#e0a852", label:"Instant personalised assessment", sub:"Threat level + survival architecture for your role" },
                  { icon:"⟳", color:"#52e0a4", label:"AI-generated 100-day programme", sub:"28 emails across 4 phases — written for you, sent on a schedule" },
                ].map(f => (
                  <div key={f.label} style={{ display:"flex",gap:14,marginBottom:14,alignItems:"flex-start" }}>
                    <span style={{ color:f.color,fontSize:18,flexShrink:0,marginTop:1 }}>{f.icon}</span>
                    <div>
                      <div style={{ fontSize:12,letterSpacing:".1em",textTransform:"uppercase",color:f.color,marginBottom:3 }}>{f.label}</div>
                      <div style={{ fontSize:12,color:"#4a4840",lineHeight:1.6 }}>{f.sub}</div>
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSubmit}>
                {error && <div style={{ background:"rgba(224,82,82,.1)",border:"1px solid rgba(224,82,82,.25)",color:"#e05252",padding:"13px 17px",fontSize:13,marginBottom:20 }}>{error}</div>}
                <div style={{ marginBottom:22 }}>
                  <label style={{ display:"block",fontSize:10,letterSpacing:".25em",textTransform:"uppercase",color:"#4a4840",marginBottom:10 }}>Your email address</label>
                  <input style={{ width:"100%",background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",color:"#d4cfc8",fontSize:15,padding:"15px 18px",outline:"none" }} type="email" placeholder="you@yourworld.com" value={userEmail} onChange={e=>setUserEmail(e.target.value)} required />
                </div>
                <div style={{ marginBottom:28 }}>
                  <label style={{ display:"block",fontSize:10,letterSpacing:".25em",textTransform:"uppercase",color:"#4a4840",marginBottom:10 }}>Your role & what you actually do</label>
                  <textarea style={{ width:"100%",background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",color:"#d4cfc8",fontSize:15,padding:"15px 18px",outline:"none",minHeight:155 }}
                    placeholder={`e.g. "I'm a senior UX designer at a fintech startup. I lead product design, run user research, manage a team of 3, and present to stakeholders. 8 years in design."`}
                    value={jobDesc} onChange={e=>setJobDesc(e.target.value)} required />
                </div>
                <button type="submit" style={{ width:"100%",background:"transparent",border:"1px solid #e05252",color:"#e05252",padding:19,fontSize:13,letterSpacing:".2em",textTransform:"uppercase",transition:"background .2s" }}
                  onMouseEnter={e=>e.target.style.background="rgba(224,82,82,.1)"}
                  onMouseLeave={e=>e.target.style.background="transparent"}>
                  → Begin my 100-day programme
                </button>
              </form>
              <p style={{ fontSize:10,color:"#252318",textAlign:"center",marginTop:16,lineHeight:1.7 }}>No spam. No data selling. Your email is used only to deliver your programme.</p>
              <button onClick={()=>setStage("landing")} style={{ background:"transparent",border:"none",color:"#252318",fontSize:11,letterSpacing:".2em",textTransform:"uppercase",display:"block",margin:"28px auto 0",transition:"color .2s" }}
                onMouseEnter={e=>e.target.style.color="#d4cfc8"} onMouseLeave={e=>e.target.style.color="#252318"}>← back</button>
            </div>
          </div>
        )}

        {/* ══ LOADING ══ */}
        {stage === "loading" && (
          <div style={{ display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",flexDirection:"column" }}>
            <div style={{ textAlign:"center",animation:"fadeUp .5s ease" }}>
              <div style={{ fontSize:52,marginBottom:32,animation:"pulse 2s ease infinite" }}>◈</div>
              <p style={{ fontSize:13,letterSpacing:".22em",textTransform:"uppercase",color:"#5a5850",marginBottom:28 }}>{loadMsgs[loadTick % loadMsgs.length]}</p>
              <div style={{ width:200,height:1,background:"rgba(255,255,255,.05)",margin:"0 auto",position:"relative",overflow:"hidden" }}>
                <div style={{ position:"absolute",top:0,left:"-100%",width:"100%",height:"100%",background:"linear-gradient(90deg,transparent,#e0a852,transparent)",animation:"sweep 1.8s ease infinite" }} />
              </div>
            </div>
          </div>
        )}

        {/* ══ RESULT ══ */}
        {stage === "result" && (
          <div className="fade-in" style={{ maxWidth:860,margin:"0 auto",padding:"72px 24px 100px",width:"100%" }}>

            {/* Enrolled confirmation banner */}
            {emailsEnrolled && (
              <div style={{ background:"rgba(82,224,164,.06)",border:"1px solid rgba(82,224,164,.2)",padding:"14px 20px",marginBottom:32,display:"flex",alignItems:"center",gap:12,animation:"slideIn .4s ease" }}>
                <span style={{ fontSize:18,color:"#52e0a4" }}>✓</span>
                <div>
                  <div style={{ fontSize:12,letterSpacing:".15em",textTransform:"uppercase",color:"#52e0a4",marginBottom:3 }}>You're enrolled</div>
                  <div style={{ fontSize:13,color:"#5a5850" }}>Your 100-day programme is being generated and will arrive at <strong style={{ color:"#a8a298" }}>{userEmail}</strong> starting today.</div>
                </div>
              </div>
            )}

            {/* Header */}
            <div style={{ textAlign:"center",marginBottom:52 }}>
              <p style={{ fontSize:10,letterSpacing:".3em",textTransform:"uppercase",color:"#e05252",marginBottom:16 }}>◈ Jinshi — Personal Assessment</p>
              <h2 style={{ fontFamily:"Playfair Display,serif",fontSize:"clamp(28px,5vw,52px)",fontWeight:900,color:"#f0ebe3",lineHeight:1.1 }}>
                Here is the truth<br />about where you stand.
              </h2>
            </div>

            {/* Tabs */}
            <div style={{ display:"flex",borderBottom:"1px solid rgba(255,255,255,.06)",marginBottom:40 }}>
              {[
                { id:"assessment", label:"◈ Assessment" },
                { id:"emails", label:"⟳ 100-Day Programme",
                  badge: agentDone ? `${totalGenerated} emails ready` : agentRunning ? `${totalGenerated} / ${totalEmailsExpected} emails...` : null,
                  badgeColor: agentDone ? "#52e0a4" : "#e0a852" }
              ].map(t => (
                <button key={t.id} onClick={()=>setActiveTab(t.id)}
                  style={{ background:"transparent",border:"none",color:activeTab===t.id?"#d4cfc8":"#3a3830",fontSize:12,letterSpacing:".18em",textTransform:"uppercase",padding:"14px 28px 16px",borderBottom:activeTab===t.id?"2px solid #e05252":"2px solid transparent",transition:"color .2s",position:"relative" }}>
                  {t.label}
                  {t.badge && <span style={{ position:"absolute",top:9,right:2,fontSize:9,letterSpacing:".1em",color:t.badgeColor,background:`${t.badgeColor}18`,border:`1px solid ${t.badgeColor}33`,padding:"2px 7px",whiteSpace:"nowrap" }}>{t.badge}</span>}
                </button>
              ))}
            </div>

            {/* ── Assessment ── */}
            {activeTab === "assessment" && (
              <div style={{ animation:"slideIn .35s ease" }}>
                {sections.map((s, i) => (
                  <div key={i} style={{ background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.07)",borderLeft:`3px solid ${s.color}`,padding:"34px 38px",marginBottom:18,animation:`slideIn .4s ease ${i*.08}s both` }}>
                    <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:18 }}>
                      <span style={{ fontSize:18,color:s.color }}>{s.icon}</span>
                      <div style={{ fontSize:10,letterSpacing:".35em",textTransform:"uppercase",color:s.color }}>{s.title}</div>
                    </div>
                    <div style={{ fontSize:15,lineHeight:1.9,color:"#9a9490",whiteSpace:"pre-wrap" }}>{s.content}</div>
                  </div>
                ))}
                <div style={{ marginTop:28,textAlign:"center" }}>
                  <button onClick={()=>setActiveTab("emails")}
                    style={{ background:"transparent",border:"1px solid rgba(255,255,255,.1)",color:"#5a5850",fontSize:11,letterSpacing:".2em",textTransform:"uppercase",padding:"12px 28px",transition:"all .2s" }}
                    onMouseEnter={e=>{e.target.style.color="#d4cfc8";e.target.style.borderColor="rgba(255,255,255,.25)"}}
                    onMouseLeave={e=>{e.target.style.color="#5a5850";e.target.style.borderColor="rgba(255,255,255,.1)"}}>
                    View your 100-day programme →
                  </button>
                </div>
              </div>
            )}

            {/* ── 100-Day Programme ── */}
            {activeTab === "emails" && (
              <div style={{ animation:"slideIn .35s ease" }}>

                {/* Overall progress bar */}
                <div style={{ background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.07)",padding:"20px 24px",marginBottom:32,display:"flex",alignItems:"center",gap:20 }}>
                  <div style={{ position:"relative",flexShrink:0 }}>
                    <ProgressRing pct={Math.round((totalGenerated/totalEmailsExpected)*100)} color="#e0a852" size={52} />
                    <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:600,color:"#e0a852" }}>
                      {Math.round((totalGenerated/totalEmailsExpected)*100)}%
                    </div>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13,color:"#d4cfc8",marginBottom:4 }}>
                      {agentDone ? `✓ All ${totalGenerated} emails generated — your 100-day programme is ready.` : agentRunning ? `Agent writing your programme... ${totalGenerated} of ${totalEmailsExpected} emails complete.` : "Starting agent..."}
                    </div>
                    <div style={{ fontSize:11,color:"#3a3830",letterSpacing:".08em" }}>
                      {agentDone ? "Copy any email · Connect your provider to automate delivery" : "Each phase unlocks as the agent completes it"}
                    </div>
                  </div>
                  {agentRunning && <div style={{ fontSize:18,color:"#e0a852",animation:"pulse 1.5s ease infinite",flexShrink:0 }}>⟳</div>}
                </div>

                {/* Phase filter */}
                <div style={{ display:"flex",gap:8,marginBottom:24,flexWrap:"wrap" }}>
                  {[{ id:"all", label:"All Phases" }, ...PHASES.map(p=>({ id:p.id, label:p.label.split("—")[1]?.trim()||p.id, color:p.color }))].map(f => (
                    <button key={f.id} onClick={()=>setActivePhaseFilter(f.id)}
                      style={{ background:activePhaseFilter===f.id?"rgba(255,255,255,.07)":"transparent",border:`1px solid ${activePhaseFilter===f.id?"rgba(255,255,255,.18)":"rgba(255,255,255,.06)"}`,color:activePhaseFilter===f.id?"#d4cfc8":"#3a3830",fontSize:10,letterSpacing:".18em",textTransform:"uppercase",padding:"7px 14px",transition:"all .2s" }}>
                      {f.id !== "all" && <span style={{ color: PHASES.find(p=>p.id===f.id)?.color, marginRight:6 }}>{PHASES.find(p=>p.id===f.id)?.icon}</span>}
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Phase blocks */}
                <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
                  {(activePhaseFilter === "all" ? PHASES : PHASES.filter(p => p.id === activePhaseFilter)).map(phase => {
                    const status = phaseStatus[phase.id];
                    const emails = phaseEmails[phase.id] || [];
                    const show = activePhaseFilter === "all" || activePhaseFilter === phase.id;
                    if (!show) return null;
                    return (
                      <div key={phase.id} style={{ background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.07)",overflow:"hidden" }}>
                        <PhaseHeader phase={phase} emailCount={emails.length} totalEmails={phase.themes.length} status={status} />
                        {status === "generating" && <SkeletonRows count={3} color={phase.color} />}
                        {status === "idle" && (
                          <div style={{ padding:"20px 24px",fontSize:12,color:"#2a2820",letterSpacing:".1em" }}>Queued — agent will begin shortly...</div>
                        )}
                        {status === "error" && (
                          <div style={{ padding:"20px 24px",fontSize:12,color:"#e05252",letterSpacing:".1em" }}>⚠ Generation failed for this phase. Please retry.</div>
                        )}
                        {emails.map((em, i) => (
                          <EmailRow key={i} email={em} phase={phase}
                            isOpen={openEmail === `${phase.id}-${i}`}
                            onToggle={() => setOpenEmail(openEmail === `${phase.id}-${i}` ? null : `${phase.id}-${i}`)} />
                        ))}
                      </div>
                    );
                  })}
                </div>

                {/* Integration */}
                {agentDone && totalGenerated > 0 && (
                  <div style={{ background:"rgba(82,224,164,.03)",border:"1px dashed rgba(82,224,164,.15)",padding:"28px 32px",marginTop:36,animation:"slideIn .5s ease" }}>
                    <div style={{ fontSize:12,letterSpacing:".18em",textTransform:"uppercase",color:"#52e0a4",marginBottom:10 }}>⚡ Automate your delivery</div>
                    <p style={{ fontSize:13,color:"#5a5850",lineHeight:1.85,marginBottom:18 }}>
                      Connect a sending provider and schedule each email to go out on its assigned day.
                      Your programme is fully written — just wire up the trigger.
                    </p>
                    <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:10 }}>
                      {[["Resend","resend.com"],["SendGrid","sendgrid.com"],["Loops.so","loops.so"],["Postmark","postmarkapp.com"],["Mailchimp","mailchimp.com"]].map(([name])=>(
                        <div key={name} style={{ background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.07)",padding:"10px 14px",fontSize:11,letterSpacing:".15em",textTransform:"uppercase",color:"#4a4840",textAlign:"center" }}>{name}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <button onClick={reset} style={{ background:"transparent",border:"none",color:"#252318",fontSize:11,letterSpacing:".2em",textTransform:"uppercase",display:"block",margin:"52px auto 0",transition:"color .2s" }}
              onMouseEnter={e=>e.target.style.color="#d4cfc8"} onMouseLeave={e=>e.target.style.color="#252318"}>← assess a different role</button>
          </div>
        )}

      </div>
    </>
  );
}
