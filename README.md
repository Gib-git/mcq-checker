<img width="911" height="390" alt="Screenshot 2026-04-19 at 3 02 16 PM" src="https://github.com/user-attachments/assets/3e6bf4c3-a77d-4c3c-a885-93c0c191c20f" />
---
<img width="884" height="937" alt="Screenshot 2026-04-19 at 3 02 06 PM" src="https://github.com/user-attachments/assets/f0e02f3a-de01-4f46-933d-55fc1dba33a8" />
---
<img width="913" height="753" alt="Screenshot 2026-04-19 at 3 01 39 PM" src="https://github.com/user-attachments/assets/8e6f3752-bdba-43a5-a692-0c427d2c47aa" />
---
<img width="945" height="631" alt="Screenshot 2026-04-19 at 3 01 21 PM" src="https://github.com/user-attachments/assets/a8ad825f-2813-4995-9f45-62de35924b09" />



# MCQ Tracker

A Node.js application to track multiple-choice question (MCQ) exam results, storing all data in a SQLite database. Zero npm dependencies — runs on Node.js 22's built-in SQLite module.

---

## Docker (Quickstart)

The fastest way to get running. No Node.js or source code required.

```bash
# Pull and start from Docker Hub
docker compose -f docker-compose.hub.yml up -d
```

Then open **http://localhost:3000**.

**Image:** [`gibigbig/mcq-tracker:latest`](https://hub.docker.com/r/gibigbig/mcq-tracker)

### Updating to the latest version

```bash
docker compose -f docker-compose.hub.yml pull
docker compose -f docker-compose.hub.yml up -d
```

### Building from source

```bash
# Build and run locally
docker compose up --build -d

# Build for Linux amd64 and push to Docker Hub
docker buildx build \
  --platform linux/amd64 \
  --tag gibigbig/mcq-tracker:latest \
  --push \
  .
```

> **Data persistence:** The SQLite database is stored in a named Docker volume (`mcq-data`) and survives container restarts and image updates.

---

## Local Development (Node.js)

**Requirements:** Node.js v22+

```bash
# No install needed — zero dependencies
node --experimental-sqlite server.js

# Or via npm
npm start
```

Then open **http://localhost:3000**.

**Override port:**
```bash
PORT=8080 npm start
```

---

## Features

### Starting an Exam
- Enter a **topic name** to identify the exam
- Optionally set **Total Questions** — if provided, a progress bar is shown during the exam and the exam **auto-ends** when the last question is answered
- Press **Start** or hit `Enter` to begin

### During an Exam

**Answer options**
- Select your answer letter by clicking (A–E by default)
- Answer selection is **optional** — you can skip recording a letter
- **Add or remove options** using the `+` / `−` buttons (supports 2–10 options, A–J)
- Click a selected letter again to deselect it

**Recording the result**
- Press **✓ Correct** or **✗ Wrong** to log the result — this **immediately submits** the question and advances to the next one, no extra button needed
- **Keyboard shortcuts:**
  - `Enter` or `Space` → Correct
  - `W` → Wrong

**Timers**
- Each question has its own timer that **freezes automatically** when you select Correct or Wrong
- A **total exam timer** runs continuously in the top bar
- The **Pause / Resume** toggle freezes both timers (useful for mid-exam breaks)
- Total exam time is calculated as the **sum of per-question times**, so idle time between finishing and ending the exam is never counted

**Progress bar**
- Shown only when a total question count was set at the start
- Displays `answered / total` and a percentage fill bar
- Automatically ends the exam when 100% is reached

**Controls**
- **End Exam** — manually end at any point
- The exam auto-ends when all planned questions are answered

### Results Screen
- Animated score ring with percentage
- Grade label (Excellent / Good Effort / Keep Practicing)
- Stats: correct count, total questions, total time, average time per question
- Full per-question breakdown showing answer letter, correct/wrong, and time taken

### History Tab
- Lists all past exams with score, date, question count, and total time
- Delete any exam (all question records are removed with it)

---

## Database

SQLite file location:
- **Local:** `./mcq.db` (auto-created on first run)
- **Docker:** `/app/data/mcq.db` (inside the `mcq-data` volume)

