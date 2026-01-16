# Screen Recorder MVP 

A Full Stack MVP built using **Next.js (App Router) + TypeScript** that allows users to record **screen + microphone** directly in the browser, trim the video, upload it to mocked storage, generate a shareable link, and track analytics including a **watch heatmap**.

---

## ✅ Features

### 1) In-Browser Recording
- Record **screen + mic** using **MediaRecorder API**
- Start / Stop controls
- Recording saved as **.webm**
- Preview playback in browser
- Download recorded `.webm`

### 2) Trim & Export
- Trim video by start/end seconds
- Export trimmed video as `.webm`
- Implemented using **ffmpeg.wasm** (client-side)

### 3) Upload + Share (Mocked Storage)
- Upload final trimmed video to mocked local storage (`/uploads`)
- Generates a share link: `/share/:id`
- Public share page with embedded video player

### 4) Analytics 
- View count tracking
- Average watch completion %
- **Watch Heatmap** 🔥
  - Tracks which seconds are watched the most
  - Click heatmap section to jump to that timestamp

### 5) Smart Share Page (Standout Feature)
- Copy share link button
- Download permission toggle 
- Branding footer

---

## 🛠 Tech Stack
- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- MediaRecorder API
- ffmpeg.wasm
- File-based persistence (JSON)

---

## 📦 Setup Instructions

### 1) Install dependencies
```bash
npm install
```

### 2) Start dev server
```bash
npm run dev
```

Open:
http://localhost:3000

## 🧱 Project Structure (High Level)
```
src/
  app/
    api/
      upload/route.ts
      video/[filename]/route.ts
      analytics/[id]/route.ts
      share-settings/[id]/route.ts
    share/[id]/
      page.tsx
      ShareClient.tsx
    page.tsx
  components/
    Recorder.tsx
```

## 🧠 Architecture Decisions
### Frontend

-  Recorder UI is isolated into:

    - src/components/Recorder.tsx

- Share page split into:

  - page.tsx (server wrapper for Next.js dynamic params)

  - ShareClient.tsx (client component handling analytics, UI interactions, heatmap)

### Backend (API Routes)

- POST /api/upload

  - Stores uploaded video in /uploads

  - Returns unique share link

- GET /api/video/[filename]

  - Streams stored .webm files

- GET/POST /api/analytics/[id]

  - Saves view count, completion %, and heatmap timeline

  - Persists to analytics.json

- GET/POST /api/share-settings/[id]

  - Stores allowDownload setting

  - Persists to share-settings.json

### Persistence

  - File-based storage was chosen to keep the MVP lightweight and easy to run locally without DB setup.

## ✅ What I Would Improve for Production

- Replace mocked storage with S3 / Cloudflare R2

- Use Postgres / SQLite instead of JSON persistence

- Authentication + user dashboard

- Better analytics:

  - unique views, sessions, retention curve

- Better trimming UI:

  - drag handles on a timeline

- Background jobs / queue for video export & transcoding

- Export in MP4 + HLS playback for wider browser support

- Deploy fully on Vercel + external storage provider

### 🎥 Demo

Deliverable options:

- Live demo link (optional)

- OR 2–3 minute screen recording showing:

1. Record screen + mic

2. Trim export

3. Upload + generate share link

4. Open share link & analytics update

5. Heatmap + copy link + download toggle
