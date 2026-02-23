import { useState, useEffect } from "react";

const BACKEND_URL = "https://agi-backend.thomzy07.workers.dev";

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

async function callGroq(systemPrompt, userMessage, maxTokens = 1000) {
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
        { role: "user", content: userMessage },
      ],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices?.[0]?.message?.content || "";
}

function parseAssessment(text) {
  const defs = [
    { header: "THREAT ASSESSMENT", icon: "⚠", accent: "var(--accent-red)" },
    { header: "THE IDENTITY TRAP", icon: "◎", accent: "var(--accent-amber)" },
    { header: "YOUR SURVIVAL ARCHITECTURE", icon: "◈", accent: "var(--accent-blue)" },
    { header: "THE DEEPER QUESTION", icon: "∞", accent: "var(--accent-purple)" },
  ];
  return defs.map(d => {
    const rx = new RegExp(`## ${d.header}([\\s\\S]*?)(?=## |$)`, "i");
    const m = text.match(rx);
    return { ...d, title: d.header, content: m ? m[1].trim() : "" };
  }).filter(s => s.content);
}

const LOAD_MSGS = [
  "Mapping your vocational DNA...",
  "Cross-referencing AGI threat timelines...",
  "Profiling your identity architecture...",
  "Building your survival blueprint...",
  "Almost there...",
];

export default function App() {
  const [theme, setTheme] = useState("light");
  const [stage, setStage] = useState("landing");
  const [userEmail, setUserEmail] = useState("");
  const [jobDesc, setJobDesc] = useState("");
  const [assessment, setAssessment] = useState("");
  const [encouragement, setEncouragement] = useState("");
  const [emailsEnrolled, setEmailsEnrolled] = useState(false);
  const [error, setError] = useState("");
  const [loadTick, setLoadTick] = useState(0);

  const dk = theme === "dark";

  useEffect(() => {
    if (stage !== "loading") return;
    const iv = setInterval(() => setLoadTick(t => t + 1), 2200);
    return () => clearInterval(iv);
  }, [stage]);

  const sections = assessment ? parseAssessment(assessment) : [];

  async function handleSubmit(e) {
    e.preventDefault();
    if (!userEmail || !jobDesc || jobDesc.length < 30) {
      setError("Please fill in both fields with enough detail.");
      return;
    }
    setError("");
    setStage("loading");

    try {
      const text = await callGroq(ASSESSMENT_PROMPT, `My job: ${jobDesc}`);
      setAssessment(text);

      fetch(`${BACKEND_URL}/api/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, jobDesc }),
      })
        .then(r => r.json())
        .then(d => { if (d.success) setEmailsEnrolled(true); })
        .catch(() => {});

      const enc = await callGroq(
        "You are Jinshi — AGI transitions coach. Write one warm, specific paragraph (4-5 sentences) of personal encouragement based on this person's job. Acknowledge the courage it takes to face this uncertainty. Make it feel written just for them. No generic phrases. Sign off: — Jinshi",
        `Their job: ${jobDesc}`,
        400
      );
      setEncouragement(enc);
      setStage("result");
    } catch {
      setError("Something went wrong. Please try again.");
      setStage("form");
    }
  }

  function reset() {
    setStage("landing");
    setAssessment(""); setEncouragement("");
    setEmailsEnrolled(false); setError("");
    setJobDesc(""); setUserEmail("");
  }

  const vars = dk ? {
    "--bg": "#0f1117", "--bg2": "#161a24", "--bg3": "#1e2330",
    "--border": "rgba(255,255,255,0.08)",
    "--text": "#e8e3dc", "--text2": "#8a8580", "--text3": "#3a3830",
    "--accent": "#5b7ff0", "--accent-red": "#e05252",
    "--accent-amber": "#e0a852", "--accent-blue": "#52b4e0", "--accent-purple": "#a076f9",
    "--card": "#161a24", "--card2": "#1e2330", "--shadow": "0 4px 32px rgba(0,0,0,0.4)",
  } : {
    "--bg": "#f7f5f0", "--bg2": "#ffffff", "--bg3": "#efecea",
    "--border": "rgba(0,0,0,0.09)",
    "--text": "#1a1814", "--text2": "#6b6560", "--text3": "#b0aba5",
    "--accent": "#2c4fe8", "--accent-red": "#c93636",
    "--accent-amber": "#c47f1a", "--accent-blue": "#1e8fb0", "--accent-purple": "#7c4fd4",
    "--card": "#ffffff", "--card2": "#f0ede8", "--shadow": "0 4px 32px rgba(0,0,0,0.08)",
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { overflow-x: hidden; }
        button { cursor: pointer; font-family: 'DM Sans', sans-serif; }
        input, textarea { font-family: 'DM Sans', sans-serif; }
        textarea { resize: vertical; }

        @keyframes fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes sweep { 0% { transform:translateX(-100%); } 100% { transform:translateX(300%); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.35; } }
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }

        .fade-up { animation: fadeUp 0.55s ease both; }
        .fade-in { animation: fadeIn 0.4s ease both; }

        .btn-primary {
          display:inline-flex; align-items:center; gap:10px;
          background:var(--accent); color:#fff; border:none; border-radius:8px;
          padding:14px 28px; font-size:15px; font-weight:600; letter-spacing:0.01em;
          transition:opacity 0.2s, transform 0.15s;
        }
        .btn-primary:hover { opacity:0.88; transform:translateY(-1px); }

        .btn-ghost {
          display:inline-flex; align-items:center; gap:8px;
          background:transparent; color:var(--text2);
          border:1.5px solid var(--border); border-radius:8px;
          padding:12px 22px; font-size:14px; font-weight:500;
          transition:border-color 0.2s, color 0.2s, background 0.2s;
        }
        .btn-ghost:hover { border-color:var(--accent); color:var(--accent); }

        .card { background:var(--card); border:1px solid var(--border); border-radius:16px; box-shadow:var(--shadow); }

        .input-field {
          width:100%; background:var(--bg3); border:1.5px solid var(--border);
          border-radius:10px; color:var(--text); font-size:15px; padding:14px 16px;
          transition:border-color 0.2s, box-shadow 0.2s; outline:none;
        }
        .input-field:focus { border-color:var(--accent); box-shadow:0 0 0 3px rgba(44,79,232,0.12); }
        .input-field::placeholder { color:var(--text3); }

        .section-card {
          background:var(--card); border:1px solid var(--border); border-radius:14px;
          padding:28px 32px; margin-bottom:16px; box-shadow:var(--shadow);
          animation:fadeUp 0.5s ease both;
        }

        .navbar {
          position:fixed; top:0; left:0; right:0; z-index:100;
          display:flex; align-items:center; justify-content:space-between;
          padding:0 32px; height:64px;
          border-bottom:1px solid var(--border);
          backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px);
        }

        .theme-toggle {
          width:48px; height:26px; border-radius:13px; border:none; cursor:pointer;
          position:relative; transition:background 0.3s;
        }
        .theme-toggle::after {
          content:''; position:absolute; width:20px; height:20px; border-radius:50%;
          background:#fff; top:3px; left:3px; transition:transform 0.3s;
          box-shadow:0 1px 4px rgba(0,0,0,0.2);
        }
        .theme-toggle.dark::after { transform:translateX(22px); }

        @media (max-width: 640px) {
          .section-card { padding:20px 18px; }
          .hero-grid { grid-template-columns:1fr !important; }
          .steps-grid { grid-template-columns:1fr !important; }
          .confirm-grid { grid-template-columns:1fr !important; }
          .navbar { padding:0 16px; }
          .form-card { padding:28px 20px !important; }
          .hero-actions { flex-direction:column; align-items:flex-start; }
          .hero-stats { gap:16px !important; }
        }
      `}</style>

      <div style={{ minHeight:"100vh", background:"var(--bg)", color:"var(--text)", fontFamily:"'DM Sans', sans-serif", transition:"background 0.3s, color 0.3s", ...vars }}>

        {/* ── NAVBAR ── */}
        <nav className="navbar" style={{ background: dk ? "rgba(15,17,23,0.88)" : "rgba(247,245,240,0.88)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:18, color:"var(--accent)" }}>◈</span>
            <span style={{ fontFamily:"'DM Serif Display', serif", fontSize:18, color:"var(--text)" }}>Jinshi</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ fontSize:12, color:"var(--text3)" }}>{dk ? "☾" : "☀"}</span>
            <button className={`theme-toggle ${dk?"dark":""}`} style={{ background: dk ? "var(--accent)" : "#c5c0ba" }} onClick={() => setTheme(dk?"light":"dark")} aria-label="Toggle theme" />
          </div>
        </nav>

        {/* ══════════════════════════════════════════════════════ LANDING */}
        {stage === "landing" && (
          <div style={{ paddingTop:64 }}>

            {/* Hero */}
            <div className="hero-grid" style={{ maxWidth:1100, margin:"0 auto", padding:"80px 32px 60px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:64, alignItems:"center" }}>

              <div className="fade-up">
                <div style={{ display:"inline-flex", alignItems:"center", gap:8, background: dk?"rgba(91,127,240,0.15)":"rgba(44,79,232,0.08)", border:"1px solid rgba(44,79,232,0.2)", borderRadius:100, padding:"6px 16px", marginBottom:28 }}>
                  <span style={{ width:7, height:7, borderRadius:"50%", background:"var(--accent)", display:"block", animation:"pulse 2s ease infinite" }} />
                  <span style={{ fontSize:11, fontWeight:700, color:"var(--accent)", letterSpacing:"0.06em", textTransform:"uppercase" }}>AGI Career Intelligence</span>
                </div>

                <h1 style={{ fontFamily:"'DM Serif Display', serif", fontSize:"clamp(40px, 5.5vw, 80px)", lineHeight:1.05, letterSpacing:"-0.025em", color:"var(--text)", marginBottom:24 }}>
                  Are you ready<br />
                  <em style={{ color:"var(--accent)", fontStyle:"italic" }}>to still matter?</em>
                </h1>

                <p style={{ fontSize:17, color:"var(--text2)", lineHeight:1.8, marginBottom:36, maxWidth:440 }}>
                  Get a frank, personalised assessment of how AGI will disrupt your career — then receive 28 coaching emails over 100 days to help you adapt before it's too late.
                </p>

                <div className="hero-actions" style={{ display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
                  <button className="btn-primary" onClick={() => setStage("form")}>Begin your assessment →</button>
                  <span style={{ fontSize:13, color:"var(--text3)" }}>Free · Takes 60 seconds</span>
                </div>

                <div className="hero-stats" style={{ display:"flex", gap:32, marginTop:48 }}>
                  {[["28","Coaching emails"],["100","Days of guidance"],["4","Phases of growth"]].map(([n, l]) => (
                    <div key={l}>
                      <div style={{ fontFamily:"'DM Serif Display', serif", fontSize:30, color:"var(--text)", letterSpacing:"-0.02em" }}>{n}</div>
                      <div style={{ fontSize:12, color:"var(--text3)", marginTop:2 }}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="fade-up" style={{ animationDelay:"0.15s", display:"flex", flexDirection:"column", gap:12 }}>
                {[
                  { label:"Phase 1", title:"Wake Up", sub:"Days 1–20 · Threat clarity & first moves", color:"#c93636", icon:"⚠" },
                  { label:"Phase 2", title:"Rebuild", sub:"Days 21–50 · Identity & new skills", color:"#c47f1a", icon:"◈" },
                  { label:"Phase 3", title:"Reposition", sub:"Days 51–80 · Your new value proposition", color:"#1e8fb0", icon:"◎" },
                  { label:"Phase 4", title:"Transcend", sub:"Days 81–100 · Beyond the job", color:"#7c4fd4", icon:"∞" },
                ].map((p, i) => (
                  <div key={p.label} className="card" style={{ padding:"16px 20px", display:"flex", alignItems:"center", gap:16, animation:`fadeUp 0.5s ease ${0.1+i*0.08}s both` }}>
                    <div style={{ width:40, height:40, borderRadius:10, background:`${p.color}15`, border:`1px solid ${p.color}30`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:18, color:p.color }}>{p.icon}</div>
                    <div>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                        <span style={{ fontSize:11, fontWeight:700, color:p.color, textTransform:"uppercase", letterSpacing:"0.06em" }}>{p.label}</span>
                        <span style={{ fontSize:14, fontWeight:600, color:"var(--text)" }}>{p.title}</span>
                      </div>
                      <div style={{ fontSize:12, color:"var(--text3)" }}>{p.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* How it works */}
            <div style={{ background:"var(--card2)", borderTop:"1px solid var(--border)", borderBottom:"1px solid var(--border)", padding:"60px 32px" }}>
              <div style={{ maxWidth:1100, margin:"0 auto" }}>
                <div style={{ textAlign:"center", marginBottom:44 }}>
                  <p style={{ fontSize:12, fontWeight:700, color:"var(--accent)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:12 }}>How it works</p>
                  <h2 style={{ fontFamily:"'DM Serif Display', serif", fontSize:"clamp(26px, 4vw, 40px)", color:"var(--text)", letterSpacing:"-0.02em" }}>Three steps. 100 days. One transformation.</h2>
                </div>
                <div className="steps-grid" style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:20 }}>
                  {[
                    { n:"01", title:"Describe your role", body:"Tell us what you actually do. The more specific, the more useful your assessment." },
                    { n:"02", title:"Get your assessment", body:"Receive a frank analysis of your AGI threat level and a personalised survival plan — instantly." },
                    { n:"03", title:"100 days of coaching", body:"28 personalised emails land in your inbox over 100 days, guiding you through the transition." },
                  ].map(s => (
                    <div key={s.n} className="card" style={{ padding:"28px 24px" }}>
                      <div style={{ fontFamily:"'DM Serif Display', serif", fontSize:38, color:"var(--accent)", opacity:0.25, marginBottom:14, letterSpacing:"-0.02em" }}>{s.n}</div>
                      <div style={{ fontSize:16, fontWeight:600, color:"var(--text)", marginBottom:8 }}>{s.title}</div>
                      <div style={{ fontSize:14, color:"var(--text2)", lineHeight:1.75 }}>{s.body}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom CTA */}
            <div style={{ maxWidth:1100, margin:"0 auto", padding:"80px 32px", textAlign:"center" }}>
              <h2 style={{ fontFamily:"'DM Serif Display', serif", fontSize:"clamp(26px, 4vw, 44px)", color:"var(--text)", marginBottom:20, letterSpacing:"-0.02em" }}>
                The disruption is already here.
              </h2>
              <p style={{ fontSize:16, color:"var(--text2)", marginBottom:36, maxWidth:460, margin:"0 auto 36px" }}>
                The only question is whether you're adapting intentionally or waiting until it's too late.
              </p>
              <button className="btn-primary" onClick={() => setStage("form")}>Start your assessment →</button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════ FORM */}
        {stage === "form" && (
          <div style={{ paddingTop:64, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:"100px 24px 60px" }}>
            <div style={{ width:"100%", maxWidth:540 }} className="fade-up">
              <button onClick={() => setStage("landing")} style={{ background:"none", border:"none", color:"var(--text2)", fontSize:14, marginBottom:24, display:"flex", alignItems:"center", gap:6 }}>← Back</button>

              <div className="card form-card" style={{ padding:"40px 36px" }}>
                <p style={{ fontSize:12, fontWeight:700, color:"var(--accent)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>◈ Jinshi Assessment</p>
                <h2 style={{ fontFamily:"'DM Serif Display', serif", fontSize:"clamp(24px, 4vw, 34px)", color:"var(--text)", letterSpacing:"-0.02em", lineHeight:1.15, marginBottom:12 }}>
                  60 seconds of honesty.<br />100 days of guidance.
                </h2>
                <p style={{ fontSize:14, color:"var(--text2)", lineHeight:1.75, marginBottom:28 }}>
                  Fill in your role and email. We'll analyse your exposure and begin your programme immediately.
                </p>

                {error && (
                  <div style={{ background:"rgba(201,54,54,0.08)", border:"1px solid rgba(201,54,54,0.2)", borderRadius:10, padding:"12px 16px", marginBottom:20, fontSize:14, color:"var(--accent-red)" }}>
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:18 }}>
                  <div>
                    <label style={{ display:"block", fontSize:13, fontWeight:500, color:"var(--text2)", marginBottom:8 }}>Your email address</label>
                    <input className="input-field" type="email" placeholder="you@example.com" value={userEmail} onChange={e => setUserEmail(e.target.value)} required />
                  </div>
                  <div>
                    <label style={{ display:"block", fontSize:13, fontWeight:500, color:"var(--text2)", marginBottom:8 }}>Your role — what you actually do</label>
                    <textarea className="input-field" rows={4} placeholder="Be specific. E.g: I'm a mid-level financial analyst at an investment bank. I build models, write reports, and present to stakeholders. 6 years experience." value={jobDesc} onChange={e => setJobDesc(e.target.value)} required />
                    <p style={{ fontSize:12, color:"var(--text3)", marginTop:6 }}>The more specific, the more useful your assessment.</p>
                  </div>
                  <button className="btn-primary" type="submit" style={{ width:"100%", justifyContent:"center", marginTop:4 }}>
                    Generate my assessment →
                  </button>
                </form>

                <p style={{ fontSize:12, color:"var(--text3)", marginTop:18, textAlign:"center", lineHeight:1.7 }}>
                  No spam. Your email is used only to deliver your 100-day programme.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════ LOADING */}
        {stage === "loading" && (
          <div style={{ paddingTop:64, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:28 }}>
            <div style={{ width:52, height:52, border:"3px solid var(--border)", borderTop:"3px solid var(--accent)", borderRadius:"50%", animation:"spin 0.9s linear infinite" }} />
            <p key={loadTick} style={{ fontSize:15, color:"var(--text2)", fontWeight:500, animation:"fadeIn 0.4s ease" }}>
              {LOAD_MSGS[loadTick % LOAD_MSGS.length]}
            </p>
            <div style={{ width:220, height:3, background:"var(--bg3)", borderRadius:2, overflow:"hidden" }}>
              <div style={{ height:"100%", background:"var(--accent)", borderRadius:2, animation:"sweep 1.8s ease infinite", width:"40%" }} />
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════ RESULT */}
        {stage === "result" && (
          <div style={{ paddingTop:64 }} className="fade-in">
            <div style={{ maxWidth:780, margin:"0 auto", padding:"60px 24px 80px" }}>

              {emailsEnrolled && (
                <div style={{ background: dk?"rgba(32,199,122,0.08)":"rgba(20,160,100,0.07)", border:"1px solid rgba(32,199,122,0.25)", borderRadius:12, padding:"14px 20px", marginBottom:32, display:"flex", alignItems:"center", gap:12 }}>
                  <span style={{ fontSize:18, color:"#20c77a" }}>✓</span>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:"#20c77a", marginBottom:2 }}>You're enrolled</div>
                    <div style={{ fontSize:13, color:"var(--text2)" }}>Your Day 1 email is on its way to <strong style={{ color:"var(--text)" }}>{userEmail}</strong></div>
                  </div>
                </div>
              )}

              <div style={{ marginBottom:40 }}>
                <p style={{ fontSize:12, fontWeight:700, color:"var(--accent)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>◈ Jinshi — Personal Assessment</p>
                <h2 style={{ fontFamily:"'DM Serif Display', serif", fontSize:"clamp(28px, 5vw, 46px)", color:"var(--text)", letterSpacing:"-0.025em", lineHeight:1.1 }}>
                  Here is the truth<br />about where you stand.
                </h2>
              </div>

              {sections.map((s, i) => (
                <div key={i} className="section-card" style={{ animationDelay:`${i*0.1}s`, borderLeft:`4px solid ${s.accent}` }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
                    <span style={{ fontSize:20, color:s.accent }}>{s.icon}</span>
                    <span style={{ fontSize:11, fontWeight:700, color:s.accent, textTransform:"uppercase", letterSpacing:"0.1em" }}>{s.title}</span>
                  </div>
                  <div style={{ fontSize:15, lineHeight:1.9, color:"var(--text2)", whiteSpace:"pre-wrap" }}>{s.content}</div>
                </div>
              ))}

              <div style={{ display:"flex", gap:12, marginTop:36, flexWrap:"wrap" }}>
                <button className="btn-primary" onClick={() => setStage("confirm")}>What happens next →</button>
                <button className="btn-ghost" onClick={reset}>← Assess a different role</button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════ CONFIRM */}
        {stage === "confirm" && (
          <div style={{ paddingTop:64 }} className="fade-in">
            <div style={{ maxWidth:640, margin:"0 auto", padding:"60px 24px 80px" }}>

              <div style={{ textAlign:"center", marginBottom:44 }}>
                <div style={{ width:60, height:60, borderRadius:"50%", background: dk?"rgba(91,127,240,0.15)":"rgba(44,79,232,0.08)", border:"1px solid rgba(44,79,232,0.2)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 24px", fontSize:24, color:"var(--accent)" }}>◈</div>
                <p style={{ fontSize:12, fontWeight:700, color:"#20c77a", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:12 }}>
                  {emailsEnrolled ? "✓ You're enrolled" : "Programme generating"}
                </p>
                <h2 style={{ fontFamily:"'DM Serif Display', serif", fontSize:"clamp(28px, 5vw, 42px)", color:"var(--text)", letterSpacing:"-0.025em", lineHeight:1.15, marginBottom:16 }}>
                  Your first email<br />is on its way.
                </h2>
                <p style={{ fontSize:15, color:"var(--text2)", lineHeight:1.75 }}>
                  Check your inbox at <strong style={{ color:"var(--text)" }}>{userEmail}</strong>
                </p>
              </div>

              <div className="card" style={{ padding:"28px", marginBottom:20 }}>
                <p style={{ fontSize:12, fontWeight:700, color:"var(--accent)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:18 }}>Your 100-day programme</p>
                <div className="confirm-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                  {[["✓","Day 1 email sent now"],["✓","28 coaching emails total"],["✓","4 phases of transformation"],["✓","Personalised to your exact role"]].map(([icon, text]) => (
                    <div key={text} style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <span style={{ color:"#20c77a", fontWeight:700, flexShrink:0 }}>{icon}</span>
                      <span style={{ fontSize:14, color:"var(--text2)" }}>{text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {encouragement && (
                <div className="card" style={{ padding:"28px", marginBottom:20, borderLeft:"4px solid var(--accent-amber)" }}>
                  <p style={{ fontSize:12, fontWeight:700, color:"var(--accent-amber)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:14 }}>A word from Jinshi</p>
                  <p style={{ fontSize:15, lineHeight:1.9, color:"var(--text2)", whiteSpace:"pre-wrap" }}>{encouragement}</p>
                </div>
              )}

              <div style={{ background:"var(--bg3)", border:"1px solid var(--border)", borderRadius:10, padding:"14px 18px", marginBottom:32, fontSize:13, color:"var(--text3)", lineHeight:1.75 }}>
                💡 Don't see it? Check your spam folder. Add <strong style={{ color:"var(--text2)" }}>jinshi@contact.zoomfrez.xyz</strong> to your contacts to keep your programme in your inbox.
              </div>

              <button className="btn-ghost" onClick={reset}>← Assess a different role</button>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
