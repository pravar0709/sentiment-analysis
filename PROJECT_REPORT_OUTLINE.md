# Major Project Report & Viva Presentation Guide

**Project Title:** PulseLex — Context-Aware Sentiment Analysis Across All Original World Languages, Global Englishes, and Hinglish with Sarcasm Reversal and ABSA

---

## Chapter 1: Introduction & Problem Statement

### 1.1 Background
Social media platforms generate informal sentiment in **every original world language** (Spanish, Hindi, French, Arabic, Japanese, Korean, German, Portuguese, Tamil, etc.), across **all global dialects of English** (US, UK, Australian, Indian, Singlish, Nigerian Pidgin, Gen-Z), and in **code-mixed Hinglish** (Hindi + English).

### 1.2 Problem Statement
Conventional sentiment classifiers fail on real-world social posts due to four core linguistic challenges:
1. **Cross-Lingual & Native Slang Blindness:** Standard English tools fail on original languages and native shorthand (*tqm* in Spanish, *mdr* in French, *草* in Japanese, *वाह/बकवास* in pure Hindi).
2. **Global Dialect & Hinglish OOV Gaps:** Regional English idioms (*chuffed*, *yeah nah*, *shiok*, *wahala*) and Hinglish expressions (*mast*, *bakwas*, *kaand*) are absent from conventional lexicons, while non-Hinglish hybrids require clear scope boundaries.
3. **Pragmatic Polarity Inversion (Sarcasm & Irony):** Surface-level positive words in English, Spanish, Hindi, or French flip polarity under irony cues (`🙄`, `/s`, `💀`).
4. **Multi-Aspect Mixed Sentences:** Single posts often praise one feature while criticizing another, requiring Aspect-Based Sentiment Analysis (ABSA).

### 1.3 Objectives
- Support **all original/pure world languages on Earth**, **all global varieties of English**, and **Hinglish only** for mixed-language inputs.
- Compute calibrated **confidence scores**, 3-class probability distributions, and **Aspect-Based Sentiment** splits.
- Detect **sarcasm** accurately and explain the gap between literal and intended polarity.
- Benchmark PulseLex live against a **Naive English Word-Lexicon Baseline** on every analyzed sentence.

---

## Chapter 2: Comparative Analysis (Why Existing Tools Fall Short)

| Linguistic Phenomenon | Example Input | Traditional Lexicon (VADER/AFINN) | PulseLex Contextual Engine |
| :--- | :--- | :--- | :--- |
| **Code-Mixed Hinglish Irony** | `"waah bhai kya mast UI hai 🙄 crash ho raha hai"` | **Neutral / Misclassified** (Hinglish words are OOV) | **Negative** (detects Hinglish irony + 🙄 trigger) |
| **Global English Dialects** | `"yeah nah mate properly chuffed, battery gutted :/"` | **Neutral** (misses UK & AU dialect idioms) | **Mixed** (ABSA splits positive camera vs. negative battery) |
| **Emoji Semantic Shift** | `"bro tripped in front of everyone 💀😭"` | Misclassified as **Negative** (death/crying) | **Positive / Amusement** (decodes `💀`/`😭` as laughter) |
| **Latent Abbreviations** | `"icl ts app pmo so bad atp"` | Mostly **OOV / Neutral** | **Negative** (expands `icl`, `ts`, `pmo`, `atp`) |

---

## Chapter 3: System Architecture & Methodology

1. **Client Layer (React + TypeScript):**
   - Provides five dedicated views: Deep Sentence Analyzer (with Inline XAI Token Heatmap, Counterfactual Flip-Tests, Thread Context, ABSA, and Baseline Comparator), Batch Feed Classifier (`.txt`/`.csv` upload and CSV export), Social Lexicon Explorer, Session History, and Academic Overview.
2. **API Gateway Layer (Express.js on Node.js):**
   - Validates input length, optional `parentContext`, and batch limits; isolates API credentials on the server side; enforces structured JSON schema output; and packages source archives via zero-dependency `node:zlib`.
3. **Contextual Inference Layer (`gemini-4-hydrogen` + Strict JSON Schema):**
   - Enforces deterministic JSON fields for `languageProfile`, `classification`, `confidence`, `polarityBreakdown`, `netSentimentScore`, `aspects`, `tokenAttributions`, `counterfactuals`, `nuanceCalibration`, `sarcasm`, `abbreviations`, `emojis`, and `symbolsAndSigns`.

---

## Chapter 4: Live Demonstration Script (For Faculty Presentation)

During the presentation, demonstrate the system with custom live sentences entered by faculty members alongside diagnostic panels:
1. **Custom Faculty Input & XAI Token Heatmap:** Ask a faculty member for any sentence (including typos, emojis, or mixed praise/complaint) and click highlighted tokens to inspect directional attribution weights (`-1.00` to `+1.00`).
2. **Counterfactual Flip-Test:** Run `"Test Live"` on a minimal counterfactual edit to prove how removing a single sarcasm cue or intensifier shifts polarity and confidence.
3. **Parent-Reply Thread Context:** Toggle **Thread Context** and load `"Try Thread Reply Demo"` to show how a deadpan reply flips sentiment once the parent deployment post is provided.
4. **Sarcasm, Abbreviations & Hinglish-Only Scope:** Show `ily` vs. `icl`/`ts`/`pmo`, pure Spanish/Hindi/French inputs, and Hinglish code-mixing while verifying that non-Hinglish hybrids trigger the out-of-scope gate.
5. **Batch Processing:** Upload a `.txt` or `.csv` file in **Batch Feed**, filter by `Sarcastic`, and download the classified CSV output.

---

## Chapter 5: Anticipated Viva Questions & Answers

**Q1: Why did you choose structured contextual LLM inference instead of training a standalone Naive Bayes or LSTM classifier?**  
A: Static bag-of-words and small supervised models require retraining whenever new social abbreviations (`icl`, `ts`, `pmo`) or emoji shifts emerge, and they struggle with pragmatic sarcasm without world context. Using schema-constrained contextual inference provides zero-shot generalization across evolving slang while guaranteeing strict structured outputs for confidence calibration, XAI token attribution, and counterfactual perturbations.

**Q2: How does PulseLex provide explainability rather than acting as a black box?**  
A: PulseLex combines four complementary explainability mechanisms: (1) an **Inline Token Attribution Heatmap** assigning directional weights (`-1.0` to `+1.0`) and roles (`Sarcasm Flip`, `Hedge`, `Intensifier`, etc.) to tokens in the original text, (2) **Counterfactual Flip-Tests** showing how minimal edits alter predictions, (3) **Aspect-Based Sentiment Splitting (ABSA)**, and (4) a live **Deterministic Baseline Lexicon** contrast.

**Q3: How does the system handle security for API credentials?**  
A: All calls to the Gemini API occur exclusively inside the Express backend (`server.ts`) using server-side environment variables (`GEMINI_API_KEY`). No secrets are bundled into client JavaScript or included in exported project archives.

**Q4: What is the future scope of this project?**  
A: Integrating real-time social streaming connectors (X/Reddit APIs), persistent longitudinal sentiment trend tracking over a database, and distilling domain-specific student models from verified batch classifications while preserving the strict original-world-languages, World-Englishes, and Hinglish-only linguistic policy.
