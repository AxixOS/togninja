"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_basic_1 = require("../services/db-basic");
const uuid_1 = require("uuid");
const zod_1 = require("zod");
const email_basic_1 = require("../services/email-basic");
const router = (0, express_1.Router)();
function makeSlug() {
    return (0, uuid_1.v4)().replace(/-/g, "").slice(0, 10);
}
const Field = zod_1.z.object({
    key: zod_1.z.string().min(1),
    label: zod_1.z.string().min(1),
    type: zod_1.z.enum(["text", "textarea", "email", "select", "radio", "checkbox"]),
    required: zod_1.z.boolean().optional().default(false),
    options: zod_1.z.array(zod_1.z.string()).optional(),
});
const QuestionnaireCreate = zod_1.z.object({
    title: zod_1.z.string().min(1),
    description: zod_1.z.string().optional().default(""),
    fields: zod_1.z.array(Field).min(1),
    notifyEmail: zod_1.z.string().email().optional(),
});
router.post("/api/questionnaires", async (req, res) => {
    try {
        const body = QuestionnaireCreate.parse(req.body);
        const slug = makeSlug();
        const email = body.notifyEmail || process.env.NOTIFY_EMAIL || null;
        const rows = await (0, db_basic_1.q)(`INSERT INTO questionnaires (slug,title,description,fields,notify_email)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id, slug, title, description, fields, notify_email, created_at`, [slug, body.title, body.description || "", JSON.stringify(body.fields), email]);
        const base = (process.env.APP_BASE_URL || process.env.APP_URL || "").replace(/\/$/, "");
        const link = `${base}/q/${rows[0].slug}`;
        res.json({ ok: true, questionnaire: rows[0], link });
    }
    catch (e) {
        console.error(e);
        res.status(400).json({ ok: false, error: e.message || "Invalid payload" });
    }
});
router.get("/q/:slug", async (req, res) => {
    const slug = req.params.slug;
    const rows = await (0, db_basic_1.q)(`SELECT * FROM questionnaires WHERE slug=$1 AND is_active=true`, [slug]);
    if (!rows.length)
        return res.status(404).send("Questionnaire not found");
    const qn = rows[0];
    const fields = qn.fields;
    const css = `
    body{font-family:ui-sans-serif,system-ui,Arial;margin:2rem;line-height:1.5}
    .card{max-width:760px;margin:auto;padding:24px;border:1px solid #eee;border-radius:14px;box-shadow:0 8px 26px rgba(0,0,0,.06)}
    label{display:block;margin:.5rem 0 .25rem;font-weight:600}
    input,select,textarea{width:100%;padding:.6rem;border:1px solid #ddd;border-radius:8px}
    .row{margin:1rem 0}
    button{background:#6C2BD9;color:#fff;padding:.8rem 1.2rem;border:0;border-radius:10px;cursor:pointer}
    .muted{color:#666;font-size:.9rem}
  `;
    const inputs = (fields || [])
        .map((f) => {
        const reqAttr = f.required ? "required" : "";
        if (f.type === "textarea") {
            return `<div class="row"><label>${f.label}${f.required ? " *" : ""}</label><textarea name="${f.key}" rows="4" ${reqAttr}></textarea></div>`;
        }
        if (f.type === "select") {
            const opts = (f.options || [])
                .map((o) => `<option value="${o}">${o}</option>`)
                .join("");
            return `<div class="row"><label>${f.label}${f.required ? " *" : ""}</label><select name="${f.key}" ${reqAttr}>${opts}</select></div>`;
        }
        if (f.type === "radio") {
            const radios = (f.options || [])
                .map((o) => `<label style="font-weight:400"><input type="radio" name="${f.key}" value="${o}" ${reqAttr}/> ${o}</label>`)
                .join("<br/>");
            return `<div class="row"><div><strong>${f.label}${f.required ? " *" : ""}</strong></div>${radios}</div>`;
        }
        if (f.type === "checkbox") {
            return `<div class="row"><label style="font-weight:400"><input type="checkbox" name="${f.key}" /> ${f.label}</label></div>`;
        }
        const type = f.type === "email" ? "email" : "text";
        return `<div class="row"><label>${f.label}${f.required ? " *" : ""}</label><input type="${type}" name="${f.key}" ${reqAttr}/></div>`;
    })
        .join("");
    const html = `
  <!doctype html>
  <html lang="de">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1"/>
    <title>${qn.title} – New Age Fotografie</title>
    <style>${css}</style>
  </head>
  <body>
    <div class="card">
      <h2>${qn.title}</h2>
      ${qn.description ? `<p class="muted">${qn.description}</p>` : ""}
      <form id="f">
        <div class="row"><label>Dein Name *</label><input type="text" name="client_name" required /></div>
        <div class="row"><label>Deine E-Mail *</label><input type="email" name="client_email" required /></div>
        ${inputs}
        <div class="row"><button type="submit">Antwort senden</button></div>
        <p id="msg" class="muted"></p>
      </form>
    </div>
    <script>
      const el = document.getElementById('f');
      el.addEventListener('submit', async (e)=>{
        e.preventDefault();
        const fd = new FormData(el);
        const payload = {};
        fd.forEach((v,k)=> payload[k] = v);

        const r = await fetch('/api/questionnaires/${slug}/submit', {
          method: 'POST',
          headers: { 'Content-Type':'application/json' },
          body: JSON.stringify(payload)
        });
        const j = await r.json();
        const msg = document.getElementById('msg');
        if(j.ok){
          msg.textContent = 'Danke! Deine Antworten wurden gesendet.';
          el.reset();
        } else {
          msg.textContent = 'Fehler: ' + (j.error || 'Bitte versuch es noch einmal.');
        }
      });
    </script>
  </body>
  </html>
  `;
    res.status(200).send(html);
});
router.post("/api/questionnaires/:slug/submit", async (req, res) => {
    try {
        const slug = req.params.slug;
        const rows = await (0, db_basic_1.q)(`SELECT * FROM questionnaires WHERE slug=$1 AND is_active=true`, [slug]);
        if (!rows.length)
            return res.status(404).json({ ok: false, error: "Questionnaire not found" });
        const qn = rows[0];
        const client_name = String(req.body?.client_name || "").trim();
        const client_email = String(req.body?.client_email || "").trim();
        if (!client_name || !client_email) {
            return res
                .status(400)
                .json({ ok: false, error: "Please provide your name and email" });
        }
        const answers = {};
        const missing = [];
        for (const f of qn.fields) {
            let val = req.body?.[f.key];
            if (f.type === "checkbox")
                val = !!val;
            if (f.required && (val === undefined || val === ""))
                missing.push(f.label);
            answers[f.key] = val ?? null;
        }
        if (missing.length) {
            return res
                .status(400)
                .json({ ok: false, error: `Please answer: ${missing.join(", ")}` });
        }
        const saved = await (0, db_basic_1.q)(`INSERT INTO questionnaire_responses (questionnaire_id, client_email, client_name, answers, ip, user_agent)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, created_at`, [
            qn.id,
            client_email,
            client_name,
            JSON.stringify(answers),
            req.headers["x-forwarded-for"] || req.ip,
            req.get("user-agent") || "",
        ]);
        const to = qn.notify_email || process.env.NOTIFY_EMAIL;
        const when = formatDeDateTime(saved[0].created_at);
        const html = `
      <p><strong>Neue Fragebogen-Antwort</strong></p>
      <p><b>Fragebogen:</b> ${qn.title}<br/>
         <b>Datum:</b> ${when}<br/>
         <b>Name:</b> ${client_name}<br/>
         <b>E-Mail:</b> ${client_email}</p>
      <p><b>Antworten:</b></p>
      <pre style="background:#f8f8f8;padding:12px;border-radius:8px">${escapeHtml(JSON.stringify(answers, null, 2))}</pre>
    `;
        if (to) {
            await (0, email_basic_1.sendNotification)({
                to,
                subject: `Neue Fragebogen-Antwort: ${qn.title}`,
                html,
            });
            console.log(`[QUESTIONNAIRE] Notification sent to ${to} for slug=${slug}`);
        }
        res.json({ ok: true, id: saved[0].id });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ ok: false, error: "Server error" });
    }
});
router.get("/api/questionnaires/:slug/responses", async (req, res) => {
    const slug = req.params.slug;
    const qn = (await (0, db_basic_1.q)(`SELECT id,title FROM questionnaires WHERE slug=$1`, [slug]))[0];
    if (!qn)
        return res.status(404).json({ ok: false, error: "Not found" });
    const rows = await (0, db_basic_1.q)(`SELECT id, client_name, client_email, answers, created_at
     FROM questionnaire_responses
     WHERE questionnaire_id=$1
     ORDER BY created_at DESC`, [qn.id]);
    res.json({ ok: true, questionnaire: qn, count: rows.length, responses: rows });
});
function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}
exports.default = router;
function formatDeDateTime(d) {
    try {
        return new Date(d).toLocaleString("de-AT", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        }).replace(",", "");
    }
    catch {
        const iso = new Date().toISOString();
        return iso.slice(0, 16).replace("T", " ");
    }
}
