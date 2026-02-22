/**
 * AGI Life Coach — Email Scheduling Backend
 * Stack: Node.js · Express · Resend · JSON file storage · Groq (FREE)
 * No native modules — runs perfectly on Replit
 */

import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import Groq from "groq-sdk";
import { Resend } from "resend";
import { randomUUID } from "crypto";
import dotenv from "dotenv";

dotenv.config();

const PORT      = process.env.PORT         || 3001;
const SENDER    = process.env.SENDER_EMAIL || "Jinshi <jinshi@contact.zoomfrez.xyz>";
const ADMIN_KEY = process.env.ADMIN_KEY    || "agicoach-admin-2026";

const groq   = new Groq({ apiKey: process.env.GROQ_API_KEY });
const resend = new Resend(process.env.RESEND_API_KEY);
const app    = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

// ─── JSON FILE DATABASE ───────────────────────────────────────────────────────
// Simple flat-file storage — no compilation needed, works everywhere

const DB_FILE = "./db.json";

function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ subscribers: {}, emails: [] }));
  }
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function getSubscriber(email) {
  return readDB().subscribers[email] || null;
}

function saveSubscriber(sub) {
  const db = readDB();
  db.subscribers[sub.email] = sub;
  writeDB(db);
}

function saveEmail(emailRecord) {
  const db = readDB();
  db.emails.push(emailRecord);
  writeDB(db);
}

function getEmailsForSubscriber(subscriberId) {
  return readDB().emails.filter(e => e.subscriberId === subscriberId);
}

function updateEmailStatus(resendId, status) {
  const db = readDB();
  db.emails = db.emails.map(e => e.resendId === resendId ? { ...e, status } : e);
  writeDB(db);
}

function cancelEmailsForSubscriber(subscriberId) {
  const db = readDB();
  db.emails = db.emails.map(e =>
    e.subscriberId === subscriberId && e.status === "scheduled"
      ? { ...e, status: "cancelled" }
      : e
  );
  writeDB(db);
}

// ─── 100-DAY CURRICULUM ──────────────────────────────────────────────────────

const PHASES = [
  {
    id: "phase1", label: "Phase 1 — Wake Up",
    days: [1, 3, 5, 8, 12, 17, 20],
    themes: [
      "Day 1 — Your First Move This Week: one concrete action specific to their role they can do in the next 48 hours",
      "Day 3 — The Machines Are Already Here: name specific AI tools already replacing parts of their exact job today",
      "Day 5 — What You're Actually Good At: identify transferable human strengths beneath their job title",
      "Day 8 — The Skill Gap Audit: a structured self-assessment exercise mapping current vs. needed skills",
      "Day 12 — Pick One Skill. Just One: the single most valuable capability to develop now, with a concrete learning path",
      "Day 17 — Your First Learning Habit: a daily micro-habit for skill acquisition under 20 minutes",
      "Day 20 — Check In: normalise the discomfort of transition. What has shifted? What feels hard?",
    ],
  },
  {
    id: "phase2", label: "Phase 2 — Rebuild",
    days: [21, 25, 30, 35, 40, 45, 50],
    themes: [
      "Day 21 — Who Are You Without Your Title? A journaling exercise to explore identity beyond career",
      "Day 25 — The Comparison Trap: why watching colleagues get displaced triggers shame and how to redirect it",
      "Day 30 — Your Human Moat: the 3 qualities AGI will never replicate — lean into them hard",
      "Day 35 — Mid-Point Skill Check: celebrate progress honestly and adjust the learning plan",
      "Day 40 — Relationships as Infrastructure: building professional trust that outlasts any technology shift",
      "Day 45 — The Story You Tell Yourself: rewriting the narrative from threatened to intentionally transitioning",
      "Day 50 — Half-Time Report: a structured 50-day reflection. What has genuinely changed?",
    ],
  },
  {
    id: "phase3", label: "Phase 3 — Reposition",
    days: [51, 55, 60, 65, 70, 75, 80],
    themes: [
      "Day 51 — The Hybrid Worker Advantage: positioning as someone who directs AI, not competes with it",
      "Day 55 — Build Something Small: start a real project using AI as a collaborator — specific to their field",
      "Day 60 — Your Personal Advisory Board: identify 3 people for a real mentorship relationship right now",
      "Day 65 — The Portfolio Mindset: why a single job is the riskiest position — thinking in parallel income streams",
      "Day 70 — Communicating Your Value: how to talk about their evolution to employers or clients concretely",
      "Day 75 — Emotional Resilience Under Uncertainty: a practical toolkit for managing anxiety mid-shift",
      "Day 80 — The Crisis You Avoided: visualise who they'd be in 2 years if they had done nothing",
    ],
  },
  {
    id: "phase4", label: "Phase 4 — Transcend",
    days: [81, 85, 88, 91, 95, 98, 100],
    themes: [
      "Day 81 — What Does Flourishing Look Like For You? A deep values excavation exercise",
      "Day 85 — Legacy Without a Job Title: what mark they want to leave, independent of career",
      "Day 88 — The Community You Belong To: finding or building a tribe navigating the same transition",
      "Day 91 — Money, Meaning, and the New Economy: rethinking financial security in an AGI world",
      "Day 95 — Gratitude for the Disruption: genuine appreciation for being forced to evolve before it was too late",
      "Day 98 — Letter to Yourself in One Year: projecting forward with radical honesty and intention",
      "Day 100 — Who Are You Now? The final reflection and their next 100-day challenge",
    ],
  },
];

// ─── GROQ EMAIL GENERATION ────────────────────────────────────────────────────

async function generatePhaseEmails(phase, jobDesc) {
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0.72,
    max_tokens: 4000,
    messages: [
      {
        role: "system",
        content: `You are Jinshi — AGI transitions life coach. You write warm, direct, deeply personalised coaching emails. Never generic. Always reference the person's specific job. Tone: a trusted mentor who tells hard truths with compassion.`,
      },
      {
        role: "user",
        content: `Draft ${phase.themes.length} personalised coaching emails for someone whose job is: "${jobDesc}"

Phase: ${phase.label}

CRITICAL: Respond ONLY with a valid JSON array. No markdown. No backticks. Start with [ end with ].

[
  {
    "day": <number>,
    "subject": "<personal subject line — like a message from a friend, NOT a newsletter>",
    "preview": "<one sentence hook under 12 words>",
    "theme": "<3-4 word label>",
    "plainText": "<210-250 word email. Second person. Reference their specific role. End with one clear action. Sign off: Warmly,\\nJinshi>"
  }
]

Emails to write:
${phase.themes.map((t, i) => `- Day ${phase.days[i]}: ${t}`).join("\n")}`,
      },
    ],
  });

  const raw   = completion.choices[0]?.message?.content || "";
  const start = raw.indexOf("[");
  const end   = raw.lastIndexOf("]");
  if (start === -1 || end === -1) throw new Error("No JSON in response");
  return JSON.parse(raw.slice(start, end + 1));
}

// ─── EMAIL TEMPLATE ───────────────────────────────────────────────────────────

function getSendAt(dayNumber) {
  const d = new Date();
  d.setDate(d.getDate() + (dayNumber - 1));
  d.setHours(8, 0, 0, 0);
  return d.toISOString();
}

function buildHtml(email) {
  const body = email.plainText
    .split(/\n\n+/)
    .map(p => `<p style="margin:0 0 18px 0;line-height:1.85">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0d1018;font-family:Georgia,serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
<table width="600" cellpadding="0" cellspacing="0" style="background:#111418;border:1px solid #1e2028;max-width:600px;width:100%">
  <tr><td style="padding:28px 44px 22px;border-bottom:1px solid #1e2028">
    <div style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:.3em;text-transform:uppercase;color:#e05252;margin-bottom:6px">⬤ Jinshi</div>
    <div style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:#3a3830">Day ${email.day} of 100 · ${email.theme}</div>
  </td></tr>
  <tr><td style="padding:32px 44px 28px;color:#a8a298;font-size:16px">${body}</td></tr>
  <tr><td style="padding:18px 44px 28px;border-top:1px solid #1e2028">
    <div style="font-family:'Courier New',monospace;font-size:10px;color:#2a2820;line-height:1.7">
      You enrolled in the AGI Life Coach 100-Day Programme.<br>
      <a href="{{unsubscribe_url}}" style="color:#3a3830">Unsubscribe</a>
    </div>
  </td></tr>
</table></td></tr></table></body></html>`;
}

// ─── BACKGROUND GENERATION ────────────────────────────────────────────────────

async function runProgramme(subscriberId, subscriberEmail, jobDesc) {
  console.log(`\n[${subscriberEmail}] Generating programme...`);

  for (const phase of PHASES) {
    try {
      console.log(`  → ${phase.label}`);
      const emails = await generatePhaseEmails(phase, jobDesc);

      for (const emailData of emails) {
        const sendAt  = getSendAt(emailData.day);
        const html    = buildHtml(emailData);
        let resendId  = null;

        try {
          const { data, error } = await resend.emails.send({
            from:        SENDER,
            to:          subscriberEmail,
            subject:     emailData.subject,
            text:        emailData.plainText,
            html,
            scheduledAt: sendAt,
          });
          if (error) throw new Error(error.message);
          resendId = data?.id ?? null;
          console.log(`    ✓ Day ${emailData.day} scheduled`);
        } catch (err) {
          console.error(`    ✗ Day ${emailData.day} failed: ${err.message}`);
        }

        saveEmail({
          id: randomUUID(),
          subscriberId,
          resendId,
          day: emailData.day,
          phase: phase.id,
          subject: emailData.subject,
          sendAt,
          status: resendId ? "scheduled" : "failed",
        });
      }
    } catch (err) {
      console.error(`  ✗ ${phase.label} failed: ${err.message}`);
    }
  }

  console.log(`[${subscriberEmail}] Complete ✓\n`);
}

// ─── ROUTES ──────────────────────────────────────────────────────────────────

app.post("/api/subscribe", async (req, res) => {
  const { email, jobDesc } = req.body;
  if (!email || !jobDesc)  return res.status(400).json({ error: "email and jobDesc required" });
  if (jobDesc.length < 30) return res.status(400).json({ error: "Please describe your role in more detail" });

  const existing = getSubscriber(email);
  if (existing) {
    if (existing.status === "unsubscribed") return res.status(409).json({ error: "Email previously unsubscribed" });
    return res.status(409).json({ error: "Already enrolled" });
  }

  const subscriberId = randomUUID();
  saveSubscriber({ id: subscriberId, email, jobDesc, signedUp: new Date().toISOString(), status: "active" });

  res.status(202).json({
    success: true,
    subscriberId,
    message: "Enrolled! Your 100-day programme is being generated.",
    note: "Your Day 1 email arrives within a few minutes.",
  });

  runProgramme(subscriberId, email, jobDesc).catch(console.error);
});

app.get("/api/subscriber/:email", (req, res) => {
  const sub = getSubscriber(decodeURIComponent(req.params.email));
  if (!sub) return res.status(404).json({ error: "Not found" });
  const emails = getEmailsForSubscriber(sub.id);
  res.json({
    subscriber: { email: sub.email, signedUp: sub.signedUp, status: sub.status },
    programme: {
      total:     emails.length,
      scheduled: emails.filter(e => e.status === "scheduled").length,
      sent:      emails.filter(e => e.status === "sent").length,
    },
  });
});

app.post("/api/unsubscribe", async (req, res) => {
  const { email } = req.body;
  const sub = getSubscriber(email);
  if (!sub) return res.status(404).json({ error: "Not found" });

  const pending = getEmailsForSubscriber(sub.id).filter(e => e.status === "scheduled" && e.resendId);
  let cancelled = 0;
  for (const e of pending) {
    try { await resend.emails.cancel(e.resendId); cancelled++; } catch {}
  }

  cancelEmailsForSubscriber(sub.id);
  const db = readDB();
  db.subscribers[email].status = "unsubscribed";
  writeDB(db);

  res.json({ message: "Unsubscribed", emailsCancelled: cancelled });
});

app.get("/api/admin/subscribers", (req, res) => {
  if (req.headers["x-admin-key"] !== ADMIN_KEY) return res.status(401).json({ error: "Unauthorised" });
  const db   = readDB();
  const subs = Object.values(db.subscribers).map(sub => {
    const emails = getEmailsForSubscriber(sub.id);
    return { email: sub.email, signedUp: sub.signedUp, status: sub.status, emailsTotal: emails.length, emailsSent: emails.filter(e => e.status === "sent").length };
  });
  res.json({ total: subs.length, subscribers: subs });
});

app.post("/api/resend-webhook", express.raw({ type: "application/json" }), (req, res) => {
  try {
    const { type, data } = JSON.parse(req.body);
    if      (type === "email.delivered") updateEmailStatus(data.email_id, "sent");
    else if (type === "email.bounced")   updateEmailStatus(data.email_id, "failed");
    res.json({ ok: true });
  } catch { res.status(400).json({ error: "Invalid webhook" }); }
});

app.get("/health", (req, res) => {
  const db = readDB();
  res.json({ status: "ok", subscribers: Object.keys(db.subscribers).length, emails: db.emails.length });
});

app.listen(PORT, "0.0.0.0", () => console.log(`
╔════════════════════════════════════════╗
║  AGI Life Coach Backend — LIVE        ║
║  Powered by Groq (free) + Resend      ║
╠════════════════════════════════════════╣
║  /health to confirm it's working      ║
╚════════════════════════════════════════╝
`));
