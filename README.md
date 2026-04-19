<br/>
<div align="center">
<a href="https://vercel.com" target="_blank">
<div align="center">
  <img src="public/Screenshot 2026-04-19 at 10.55.20 AM.png" alt="App Screenshot" width="900" />
</div>
</a>
<br/>
<br/>

  **Because your resume is currently worth ₹15** 
  <br/>
  <br>
  *An AI-powered, brutally honest resume roaster and ATS analyzer.*

  

  <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" /></a>
  <a href="https://deepmind.google/technologies/gemini/"><img src="https://img.shields.io/badge/Google_Gemini-1A73E8?style=for-the-badge&logo=googlegemini&logoColor=white" alt="Google Gemini" /></a>
</div>

<br/>

## 🛑 The Problem
Job seekers often send their resumes into a black hole, never knowing why they get mass-rejected. Standard ATS checkers are robotic, boring, and lack actionable feedback. Sometimes, what a candidate really needs is a brutal reality check—a "Sharma Ji Ka Beta" standard of evaluation.


## 💡 The Solution: JhalmuriCV
**JhalmuriCV** is a Next.js web application that takes your PDF resume, parses it, and feeds it to the Google Gemini API. It returns a hilariously savage "roast" of your career choices, alongside a legitimate ATS score and constructive feedback to help you actually improve your chances of getting hired.


## ✨ Key Features
- **📄 Instant PDF Parsing:** Seamlessly upload and extract text from your resume.
- **🔥 Desi AI Roasts:** Powered by Gemini, the AI takes on the persona of a strict Indian dad or a ruthless corporate HR to tear your CV apart.
- **🎯ATS Score Gauge:** A visual representation of how well your resume matches industry standards.
- **🛠️ Constructive Feedback:** It’s not all insults! Get actionable tips on formatting, keyword optimization, and phrasing.
- **📥 Exportable Reports:** Download your roast and feedback as a slick report.
- **⚡ API Fallback Mechanism:** Uses a cycle of retries with three API keys ensuring that backend runs smoothly even if one fails.

---


## 🏗️ Tech Stack

| Category | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | Next.js (App Router), React, Tailwind CSS | UI components, routing, and responsive styling. |
| **Animations** | Framer Motion | Smooth transitions and engaging loading states. |
| **Backend** | Next.js API Routes | Securely handling file parsing and API requests. |
| **AI Engine** | Google Gemini 2.5 API | Generating the context-aware roasts and ATS analysis. |
| **Language** | TypeScript | Type safety and scalable code architecture. |

---

## 🚀 Getting Started (Local Setup)

Want to run JhalmuriCV on your local machine? Follow these steps:

### 1. Clone the repository
```bash
git clone [https://github.com/yourusername/jhalmuricv.git](https://github.com/yourusername/jhalmuricv.git)
cd jhalmuricv

```
### 2. Install dependencies
```bash
npm install
# or
yarn install
```

### 3. Set up Environment Variables
Create a .env.local file in the root directory and add your Google Gemini API key:
```bash
# Get your key from Google AI Studio
GEMINI_API_KEY_1=your_api_key_here
GEMINI_API_KEY_2=your_api_key_here
GEMINI_API_KEY_3=your_api_key_here
```

### 4. Fire up the development server
```bash
npm run dev
```
Open http://localhost:3000 in your browser to see the application running.

---

## 📂 Project Structure

```bash
├── app/
│   ├── api/            # Backend API routes for parsing and Gemini integration
│   ├── results/        # The dynamic results page for the roast
│   ├── fonts/          # Custom Geist typography
│   ├── layout.tsx      # Root layout
│   └── page.tsx        # Landing page
├── components/         # Reusable UI (Hero, UploadZone, ATSChecker, ScoreGauge)
├── lib/                # Utility functions, Gemini prompt engineering, types
├── public/             # Static assets (SVGs, Favicon)
└── tailwind.config.ts  # Tailwind styling configurations
```

---

## 🔮 Future Roadmap

- **Custom Roasting Personas:** Allow users to choose their evaluator (e.g., "The Disappointed Desi Dad", "The Ruthless Tech Lead", "The Startup Bro").
- **LinkedIn Profile Integration:** Bypass the PDF upload and securely parse public LinkedIn profiles for instant feedback.
- **Enterprise Rate Limiting & Caching:** Implement Upstash/Redis to handle heavy traffic, cache duplicate resume hashes, and protect API quotas.
- **Enhanced Security:** Harden the application against prompt injection attacks and implement rigorous input sanitization for uploaded documents.

---


## 👨‍💻 Author
**Chiranjib Saikia**, a B.Tech Electrical Engineering student at Assam Engineering College who loves bridging the gap between core engineering logic and sleek, modern web experiences. He specializes in building full-stack applications and intuitive UIs using React, Next.js, and Tailwind CSS. 

When he is not working on web projects, he is usually exploring other facets of technology. Recently, he developed **NOOK**, a minimalist, cross-platform Pomodoro desktop application built with React and Electron that features customizable aesthetic themes and built-in lofi audio. 

Currently, he is expanding his technical horizons by diving deep into **Cybersecurity**. He is in the process of setting up his Kali Linux environment, exploring penetration testing, and learning how to actively secure and harden the web applications he builds. Whether he is tinkering with 555 timers on a physical breadboard or debugging a Next.js API route, he is always building.

**🔗 Let's Connect:** https://linktr.ee/_chironnnn_?utm_source=linktree_profile_share&ltsid=24116cbf-6283-4196-abfc-4ad9b53614c1
