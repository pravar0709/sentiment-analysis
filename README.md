# PulseLex — All World Languages, Global Englishes & Hinglish Sentiment Analyzer

A full-stack NLP web application built for real-time sentiment classification across **all original world languages on Earth** (Spanish, Hindi, French, Arabic, Japanese, Korean, German, Portuguese, etc.), **all global varieties of English**, and **Hinglish (the sole supported mixed-language mode)**, featuring Aspect-Based Sentiment Analysis (ABSA), sarcasm reversal, emoji/symbol decoding, abbreviation expansion (`ily`, `icl`, `ts`, `pmo`, `mdr`, `tqm`, `草`), and a live baseline lexicon comparator.

---

## 1. Project Abstract

Traditional rule-based and bag-of-words sentiment tools (such as VADER or AFINN) struggle with real-world social media language because:
1. **Multilingual & Pure Native Language Gaps:** English-only lexicons miss sentiment, idioms, and native abbreviations in original languages such as Spanish (*tqm*, *xq*), French (*mdr*, *kiffer*), Hindi (*वाह*, *बकवास*), Japanese (*草*, *神*), and Korean (*ㅋㅋㅋ*, *대박*).
2. **Global English Dialect Diversity:** Idioms across British (*chuffed*, *gutted*), Australian (*yeah nah*, *dodgy*), Singlish (*shiok*, *sian*), Nigerian Pidgin (*wahala*, *e choke*), and Indian English (*prepone*, *timepass*) are missing from standard US-centric lexicons.
3. **Hinglish-Only Code-Mixing:** Social users blend English with Hindi (*mast*, *bakwas*, *ek number*, *kaand*, *waah bhai waah 🙄*), which PulseLex supports explicitly while flagging non-Hinglish code-mixed hybrids as out of scope.
4. **Sarcasm, Emojis & Latent Shorthand:** Positive words under irony (*"Oh awesome 🙄"*) invert polarity, `💀` and `😭` shift meaning, and latent shorthand (`icl`, `ts`, `pmo`) depends on context.

**PulseLex** resolves these challenges with calibrated confidence scoring, aspect-level sentiment splitting, and a live side-by-side comparison against a traditional word-matching baseline.

---

## 2. Core Features

- **All Original World Languages + All World Englishes + Hinglish Only**: Detects the exact language/dialect (`Spanish`, `Pure Hindi`, `French`, `Japanese`, `British English`, `Australian English`, `Code-Mixed Hinglish`) and enforces the Hinglish-only mixed-language boundary.
- **Inline Explainable Attribution Heatmap (XAI)**: Highlights exact tokens inside the sentence by role (`Positive`, `Negative`, `Sarcasm Flip`, `Intensifier`, `Hedge`, `Neutral`) with clickable directional weights (`-1.0` to `+1.0`) and explanations.
- **Counterfactual "Flip-Test" Sensitivity**: Generates minimal sentence perturbations showing exact confidence deltas and polarity flips, with one-click live re-evaluation.
- **Aspect-Based Sentiment Analysis (ABSA)**: Splits multi-topic sentences into individual targets (e.g., `Camera: Positive`, `Battery: Negative`) with supporting phrase evidence.
- **Parent-Reply Thread Context**: Optional parent post input to evaluate sarcastic, elliptical, or deadpan replies relative to conversational context.
- **Hedges, Intensifiers & Ambiguity Calibration**: Separately tracks uncertainty hedges (`ig`, `lowkey`, `kinda`), intensifiers (`frfr`, `sm`, `af`, `properly`), and ambiguity levels (`Low` / `Moderate` / `High`).
- **Live Baseline Lexicon Comparison**: Runs a deterministic word-matching baseline (`src/utils/baselineLexicon.ts`) alongside PulseLex on every sentence to demonstrate exact OOV blind spots and sarcasm misses.
- **Sarcasm, Abbreviations & Emoji/Symbol Decoder**: Compares literal vs. intended polarity and expands English acronyms (`ily`, `icl`, `ts`, `pmo`), native shorthand (`mdr`, `tqm`, `草`, `ㅋㅋㅋ`), Hinglish idioms, emojis, and ASCII signs (`<3`, `:/`, `/s`).
- **Batch Feed Classifier + `.TXT`/`.CSV` Upload**: Analyze up to 20 sentences at once, filter results, and export classified feeds to CSV.

---

## 3. System Architecture

```text
[ React + TypeScript Frontend (Vite + Tailwind CSS v4) ]
        │
        │  POST /api/analyze        (Single sentence + optional thread context)
        │  POST /api/analyze-batch  (Multi-line / CSV feed classification)
        │  GET  /api/download-project-zip (Packaged source archive)
        ▼
[ Express.js API Server (server.ts — Port 3000) ]
        │
        │  Structured JSON Schema (@google/genai SDK)
        ▼
[ Gemini Contextual Linguistic Engine (gemini-4-hydrogen) ]
```

---

## 4. Tech Stack

- **Frontend**: React 19, TypeScript, Vite 8, Tailwind CSS v4, Lucide Icons
- **Backend**: Node.js (v22+), Express 4, `tsx`, built-in `node:zlib` PKZIP archiver
- **AI / NLP Engine**: `@google/genai` (`gemini-4-hydrogen` with strict `responseSchema`)

---

## 5. Local Setup & Running Instructions

### Prerequisites
- **Node.js** `v20.18+` or `v22+`
- A valid **Gemini API Key**

### Installation
1. Extract the project ZIP archive and open a terminal inside the project folder.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables:
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Set your key in `.env`:
     ```env
     GEMINI_API_KEY="your_api_key_here"
     ```
4. Start the development server:
   ```bash
   npm run dev
   ```
5. Open your browser at `http://localhost:3000`.

### Production Build & Check
```bash
npm run lint     # TypeScript type-checking
npm run build    # Production frontend bundle -> dist/
NODE_ENV=production npm start
```

---

## 6. Project Structure

```text
├── server.ts                    # Express server, Gemini API endpoints & ZIP packager
├── index.html                   # HTML entry & typography setup
├── package.json                 # Dependencies & scripts
├── vite.config.ts               # Vite configuration
├── .env.example                 # Environment variable template
├── README.md                    # Project documentation
├── PROJECT_REPORT_OUTLINE.md    # Academic report chapters & Viva Q&A
└── src/
    ├── App.tsx                  # Workspace shell & state coordination
    ├── index.css                # Tailwind CSS v4 configuration
    ├── types/sentiment.ts       # Shared TypeScript interfaces
    ├── data/socialLexicon.ts    # Curated social slang, emojis & symbols reference
    ├── utils/baselineLexicon.ts # Deterministic baseline word-matching comparator
    └── components/
        ├── Sidebar.tsx          # Workspace navigation
        ├── SingleAnalyzer.tsx   # Deep analyzer, XAI heatmap, counterfactuals & thread mode
        ├── BatchAnalyzer.tsx    # Multi-sentence & file upload classifier
        ├── LexiconExplorer.tsx  # Searchable slang & symbol lexicon
        ├── HistoryView.tsx      # Session log & filtering
        └── ProjectOverview.tsx  # Academic methodology & architecture view
```
