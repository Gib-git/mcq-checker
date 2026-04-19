const http = require('http');
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

// ── Database setup ─────────────────────────────────────────────────────────
const db = new DatabaseSync(process.env.DB_PATH || './mcq.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS exams (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    topic       TEXT    NOT NULL,
    started_at  INTEGER NOT NULL,
    ended_at    INTEGER,
    total_time  INTEGER DEFAULT 0,
    planned_q   INTEGER DEFAULT 0,
    total_q     INTEGER DEFAULT 0,
    correct_q   INTEGER DEFAULT 0,
    status      TEXT    DEFAULT 'active'
  );

  CREATE TABLE IF NOT EXISTS questions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    exam_id     INTEGER NOT NULL,
    q_number    INTEGER NOT NULL,
    answer      TEXT,
    is_correct  INTEGER DEFAULT 0,
    time_taken  INTEGER DEFAULT 0,
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
  );
`);

// ── Helper: parse body ─────────────────────────────────────────────────────
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')); }
      catch { resolve({}); }
    });
    req.on('error', reject);
  });
}

function send(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(json) });
  res.end(json);
}

// ── Router ─────────────────────────────────────────────────────────────────
async function handler(req, res) {
  const url = new URL(req.url, `http://localhost`);
  const pathname = url.pathname;
  const method = req.method;

  // Serve HTML
  if (method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
    const html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'));
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end(html);
  }

  // POST /api/exams — create new exam
  if (method === 'POST' && pathname === '/api/exams') {
    const body = await parseBody(req);
    if (!body.topic) return send(res, 400, { error: 'topic required' });
    const plannedQ = parseInt(body.planned_q) || 0;
    const stmt = db.prepare('INSERT INTO exams (topic, started_at, planned_q) VALUES (?, ?, ?)');
    const result = stmt.run(body.topic.trim(), Date.now(), plannedQ);
    const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(result.lastInsertRowid);
    return send(res, 201, exam);
  }

  // GET /api/exams — list all exams
  if (method === 'GET' && pathname === '/api/exams') {
    const exams = db.prepare(`
      SELECT e.*, 
        (SELECT COUNT(*) FROM questions WHERE exam_id = e.id) as q_count
      FROM exams e ORDER BY e.started_at DESC
    `).all();
    return send(res, 200, exams);
  }

  // GET /api/exams/:id
  const examMatch = pathname.match(/^\/api\/exams\/(\d+)$/);
  if (method === 'GET' && examMatch) {
    const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(Number(examMatch[1]));
    if (!exam) return send(res, 404, { error: 'not found' });
    const questions = db.prepare('SELECT * FROM questions WHERE exam_id = ? ORDER BY q_number').all(exam.id);
    return send(res, 200, { ...exam, questions });
  }

  // DELETE /api/exams/:id
  if (method === 'DELETE' && examMatch) {
    db.prepare('DELETE FROM exams WHERE id = ?').run(Number(examMatch[1]));
    return send(res, 200, { ok: true });
  }

  // POST /api/exams/:id/questions — submit a question answer
  const qMatch = pathname.match(/^\/api\/exams\/(\d+)\/questions$/);
  if (method === 'POST' && qMatch) {
    const body = await parseBody(req);
    const examId = Number(qMatch[1]);
    const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(examId);
    if (!exam) return send(res, 404, { error: 'exam not found' });
    if (exam.status !== 'active') return send(res, 400, { error: 'exam not active' });

    const { q_number, answer, is_correct, time_taken } = body;
    db.prepare(`
      INSERT INTO questions (exam_id, q_number, answer, is_correct, time_taken)
      VALUES (?, ?, ?, ?, ?)
    `).run(examId, q_number, answer, is_correct ? 1 : 0, time_taken || 0);

    // Update exam totals
    db.prepare(`
      UPDATE exams SET 
        total_q = total_q + 1,
        correct_q = correct_q + ?,
        total_time = total_time + ?
      WHERE id = ?
    `).run(is_correct ? 1 : 0, time_taken || 0, examId);

    const updated = db.prepare('SELECT * FROM exams WHERE id = ?').get(examId);
    return send(res, 201, updated);
  }

  // POST /api/exams/:id/end — end exam
  const endMatch = pathname.match(/^\/api\/exams\/(\d+)\/end$/);
  if (method === 'POST' && endMatch) {
    const examId = Number(endMatch[1]);
    db.prepare('UPDATE exams SET status = ?, ended_at = ? WHERE id = ?')
      .run('completed', Date.now(), examId);
    const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(examId);
    const questions = db.prepare('SELECT * FROM questions WHERE exam_id = ? ORDER BY q_number').all(examId);
    return send(res, 200, { ...exam, questions });
  }

  send(res, 404, { error: 'not found' });
}

const server = http.createServer(handler);
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`MCQ Tracker running → http://localhost:${PORT}`));
