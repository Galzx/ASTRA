# ASTRA-Lite

**AsiaTech Smart Technology & Resource Assistant — Lite**

An intelligent web assistant for students and administrators of ASIATECH (Asia Technological School of Science and Arts, Laguna, Philippines). Features AI-powered chat, visual schedule management, and a searchable knowledge base.

## Features

- **AI Chat Assistant** — Ask questions about school policies, grading, enrollment, and more. Uses keyword/fuzzy matching with Gemini AI fallback.
- **Schedule Management** — Upload schedules from images/PDFs (OCR via Gemini), view on an interactive time grid, and manage classes via natural language chat commands.
- **Knowledge Base** — Searchable FAQ database with admin CRUD portal.
- **Role-Based Auth** — Student and admin roles with JWT authentication.
- **Multimodal File Analysis** — Upload images/PDFs for AI-powered analysis.

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React 19, Vite 8, Framer Motion |
| Backend | Node.js, Express 5, SQLite3 |
| AI | Google Gemini API (`@google/genai`) |
| Auth | JWT, bcrypt |

## Getting Started

### Prerequisites

- Node.js 18+
- A [Google Gemini API key](https://aistudio.google.com/apikey)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Galzx/ASTRA-Lite.git
   cd ASTRA-Lite
   ```

2. **Install dependencies**
   ```bash
   # Install backend dependencies
   cd backend
   npm install

   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

3. **Configure environment variables**

   Copy the example and fill in your keys:
   ```bash
   cp backend/.env.example backend/.env
   ```

   Required variables:
   | Variable | Description |
   |----------|-------------|
   | `GEMINI_API_KEY` | Your Google Gemini API key |
   | `JWT_SECRET` | Random 64+ character hex string for signing tokens |
   | `ADMIN_KEY` | Secret key required to register admin accounts |

4. **Initialize the database**
   ```bash
   cd backend
   node database/setup.js
   ```

5. **Start development servers**
   ```bash
   # Terminal 1 — Backend (port 5000)
   cd backend
   npm start

   # Terminal 2 — Frontend (port 5173)
   cd frontend
   npm run dev
   ```

   Open [http://localhost:5173](http://localhost:5173) in your browser.

## Project Structure

```
ASTRA-Lite/
├── backend/
│   ├── server.js          # Express API entry point
│   ├── database/          # SQLite setup and connection
│   ├── data/              # Data access layer (schedule, knowledge)
│   ├── models/            # User, Student, Admin, KnowledgeEntry
│   ├── routes/            # Auth routes
│   ├── middleware/        # JWT auth middleware
│   └── utils/             # Gemini AI, quota tracking, Levenshtein
├── frontend/
│   ├── src/
│   │   ├── App.jsx        # Root component with routing
│   │   ├── components/    # React components
│   │   └── config.js      # API base URL config
│   └── vite.config.js
└── package.json           # Workspace root
```

## License

ISC

