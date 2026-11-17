# 🧠 MockMind
### Train Your Mind. Ace Your Interview.

MockMind is an AI-powered interview practice platform designed to help candidates prepare for technical and professional interviews. It combines structured interview questions, coding and SQL practice, AI-generated hints, follow-up questions, and detailed feedback in one workspace.

Powered by the Google Gemini API, MockMind evaluates candidate responses and provides practical guidance to help users understand their strengths and identify areas for improvement.

## ✨ Features

### AI-powered interview practice
- Get AI-generated evaluations of submitted answers.
- Receive a score, correctness assessment, strengths, and areas for improvement.
- Review a model answer and a tailored follow-up interview question.
- Request up to three levels of progressive hints while practising.

### Coding practice
- Work through coding challenges in an in-browser code editor.
- Practise with TypeScript, JavaScript, Python, and Java.
- Run available test cases for supported coding questions.
- Receive AI-assisted dry-run checks where applicable.

### SQL practice
- Write and run SQL queries in an isolated, in-memory SQLite sandbox.
- Practise using sample datasets covering employees, departments, customers, orders, transactions, and prescriptions.
- Review query results and execution feedback.

### Interview question library
Questions are organised across several areas, including:
- Algorithms
- Data Structures
- System Design
- Databases
- Behavioral interviews
- Pharmacy & Healthcare
- Information & Technology
- Banking & Finance

### Personal practice workspace
- Save questions using bookmarks.
- Track previous submissions and review feedback.
- View practice statistics and progress.
- Continue working with saved answer drafts.

### Accounts and administration
- Register and sign in to a candidate account.
- Access protected practice and submission features.
- Use role-based administrator access to manage questions and review platform activity and feedback.
- Create and manage custom interview questions through the question-management workflow.

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React 19, TypeScript, Vite |
| Styling & UI | Tailwind CSS 4, Lucide React, Motion |
| Backend | Node.js, Express.js |
| AI integration | Google Gemini API (`@google/genai`) |
| Database | SQLite using Node.js `node:sqlite` |
| Code editor | CodeMirror 6 |
| Build tools | TSX, ESBuild, TypeScript |

## 📁 Project Structure

```text
MockMind/
├── src/
│   ├── components/       # Application pages and reusable UI components
│   ├── server/           # Database, Gemini integration, and SQL sandbox
│   ├── utils/             # Authentication and coding test utilities
│   ├── App.tsx            # Main application component
│   ├── index.css          # Global styles
│   ├── main.tsx           # Frontend entry point
│   └── types.ts           # Shared TypeScript types
├── server.ts              # Express server and API routes
├── .env.example           # Environment variable template
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## ⚙️ Getting Started

### Prerequisites

- Node.js 22.13 or later
- npm
- A Google Gemini API key

> MockMind uses Node.js's built-in `node:sqlite` module. Use a compatible recent Node.js release.

### 1. Clone the repository

```bash
git clone <YOUR_REPOSITORY_URL>
cd MockMind
```

Replace `<YOUR_REPOSITORY_URL>` with the URL of your GitHub repository.

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root and add the following:

```env
GEMINI_API_KEY=your_gemini_api_key
SESSION_SECRET=replace_with_a_long_random_secret
ADMIN_EMAILS=admin@example.com
ADMIN_PASSWORD=replace_with_a_strong_admin_password
```

**Environment variables**
- `GEMINI_API_KEY` — required for Gemini-powered evaluation, hints, follow-up questions, and AI-assisted code checks.
- `SESSION_SECRET` — secret used to sign authentication session tokens. Set a strong, unique value for deployment.
- `ADMIN_EMAILS` — optional comma-separated list of administrator email addresses.
- `ADMIN_PASSWORD` — optional administrator password override.

Do not commit your `.env` file or expose API keys and secrets in public repositories.

### 4. Start the development server

```bash
npm run dev
```

Open the local URL shown in your terminal. The Express server runs the application and API routes together.

## 🏗️ Build and Production

Create a production build:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

Run the TypeScript check:

```bash
npm run lint
```

## 🔐 Data and Security Notes

- Application data is stored in a local SQLite database (`mockmind.db`), created by the application.
- Authentication uses signed session tokens.
- Administrator routes are protected by role checks.
- SQL practice runs against an isolated in-memory SQLite database rather than the application's persistent database.
- Keep API keys, session secrets, and administrator credentials private. Review and harden the deployment configuration before exposing the application publicly.

## 🎯 Who Is MockMind For?

- Computer Science and Engineering students
- Fresh graduates and job seekers
- Software engineering candidates
- Data and AI/ML enthusiasts
- Candidates preparing for system design, database, and behavioral interviews
- Professionals who want a structured way to practise interview questions

## 🚀 Future Improvements

Potential areas for future development include:
- Voice-based mock interviews
- Resume-based question generation
- Company-specific interview preparation
- A live collaborative coding environment
- Video interview simulation
- Peer practice sessions
- Interview scheduling and recruiter feedback tools
- Additional programming languages and integrations

## 🤝 Contributing

Contributions, suggestions, and bug reports are welcome. If you would like to contribute:

1. Fork the repository.
2. Create a feature branch.
3. Make your changes and test them.
4. Submit a pull request describing the update.


---

**MockMind — Practise with purpose. Improve with feedback.**
