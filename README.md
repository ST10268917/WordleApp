html <img src="50182926-f8c1-4bd6-b849-3fee03a4fd2b.png" width="200"/>

#  WordRush

WordRush is a next-generation Android word challenge application designed to merge entertainment, education, and competition. Built in Kotlin with Firebase integration, the app delivers an engaging daily puzzle experience, fast-paced Speedle mode, and AI-powered multiplayer — all through a cloud-connected REST API hosted on Render.

---

## 📖 Table of Contents

1. [Introduction](#introduction)  
2. [Purpose](#purpose)  
3. [Objectives](#objectives)  
4. [Design Considerations](#design-considerations)  
5. [System Architecture](#system-architecture)  
6. [REST API Documentation](#rest-api-documentation)  
7. [Features](#features)  
8. [Screens](#screens)  
9. [Tech Stack](#tech-stack)  
10. [Functional Requirements](#functional-requirements)  
11. [Non-Functional Requirements](#non-functional-requirements)  
12. [GitHub and CI/CD](#github-and-cicd)  
13. [Demo Video](#demo-video)  
14. [Repository Links](#repository-links)  
15. [References](#references)  
16. [AI Usage Disclosure](#ai-usage-disclosure)

---

## 🟢 Introduction

In an era where word games like *Wordle* dominate the digital landscape, **WordRush** stands out as a modern and dynamic reimagination of the genre.  
Developed in **Kotlin (Android Studio)**, it integrates with a **Node.js + Express REST API** hosted on **Render**, backed by **Firebase Firestore** for data persistence and **RapidAPI’s WordsAPI** for real-time definitions and synonyms.

This architecture ensures:
- A single daily puzzle for all users  
- Reliable validation and scalable sessions  
- Cloud-backed leaderboard and streak systems  

---
html <img src="https://media1.giphy.com/media/v1.Y2lkPWFkZWE2ZTUyOHlhOWRwd204N2poZ2NjMjhnNGwwbTZqbnJ6Mmt3aWg2OGNoY21oaSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/e34lA8V77WQS0Ut1sG/giphy.gif" width="400"/>

## 🟠 Purpose

The primary goal of WordRush is to deliver an interactive, educational, and competitive platform that improves users’ vocabulary and cognitive agility.  
Unlike standard word games, it incorporates **gamification** and **modern UX** to boost engagement through streaks, badges, and timed modes.

Key motivations include:
- Promoting daily mental exercises  
- Encouraging language enrichment through definitions  
- Fostering healthy competition via multiplayer and leaderboards  

---

## 🎯 Objectives

- Build a secure, scalable mobile application that enhances linguistic ability.  
- Integrate **Firebase Authentication** with **Google SSO** and email login.  
- Implement a **REST API layer** for all gameplay logic and validation.  
- Incorporate multiple play modes (Daily WordRush, Speedle, Multiplayer AI).  
- Automate version control, build testing, and deployment using **GitHub Actions**.

---

## 💡 Design Considerations

### 🖋 User Experience (UX)
- **Dark Mode Interface:** Gradient-based backgrounds reduce eye strain.  
- **Central Dashboard:** Rounded cards for quick access to all core features.  
- **Instant Feedback:** Color-coded results (🟩 Green, 🟨 Yellow, ⬜ Grey).  
- **Gamified Progression:** Visible streak counters and animated badges.  
- **Accessibility:** Designed for both phone and tablet screen sizes.

### 🎨 Visual Design
- **Color Palette:** Navy, cyan, neon green, rose red, and gold.  
  - 🟦 Blue → Calm logic (Daily mode)  
  - 🟩 Green → Speed and challenge (Speedle)  
  - 🟥 Red → Competition (Multiplayer)  
  - 🟨 Gold → Achievement (Streaks and rewards)  
- **Typography:** Rounded sans-serif fonts for readability.  
- **Layout:** Card-based design with depth and smooth animations.

---

## ⚙️ System Architecture

WordRush follows a **client–server model** with three layers:

| Layer | Description |
|-------|--------------|
| **Frontend (Android)** | Kotlin app using Android Jetpack and Material Components. Handles input, displays hints, and validates guesses. |
| **Backend (Node.js + Express)** | Hosted on Render, orchestrates game logic, word validation, and leaderboard management. |
| **Cloud Services (Firebase + WordsAPI)** | Firestore stores progress, WordsAPI provides definitions and synonyms. |

**Data Flow Summary:**
1. User logs in via Firebase (Email or Google SSO).  
2. The app requests the puzzle or Speedle word from the API.  
3. Backend retrieves/validates data and returns results.  
4. Firestore stores streaks, sessions, and badges.  



---

## 🔗 REST API Documentation

**Base URL:** `https://wordleappapi.onrender.com/api/v1`

| Endpoint | Method | Description |
|-----------|---------|-------------|
| `/word/today` | GET | Returns the daily 5-letter puzzle |
| `/word/validate` | POST | Validates the user’s guess |
| `/speedle/start` | POST | Starts a timed Speedle session |
| `/speedle/validate` | POST | Validates word and time |
| `/speedle/finish` | POST | Ends session, stores score |
| `/speedle/leaderboard` | GET | Retrieves top performers |

**Security:** Firebase ID Token required for all gameplay endpoints.

---

## 🧩 Features

### Core Gameplay
- Daily WordRush puzzle shared globally  
- Instant per-letter feedback  
- End-of-round word definition and synonym display  

### Highlighted Features
- **Speedle Mode:** Timed 60s/90s/120s gameplay  
- **Multiplayer vs AI:** Compete against AI opponents (Easy/Medium/Hard)  
- **Hints System:** Retrieve word definitions with time penalties  
- **Badges & Streaks:** Unlock glowing achievements for progress  
- **Light/Dark Mode:** User-controlled interface preference  

---

## 📱 Screens

A preview of the WordRush UI experience:

| Screen | Description |
|--------|--------------|
| **Welcome** | Animated intro inviting users to play |
| **Login/Register** | Email + Google SSO authentication |
| **Dashboard** | Central hub with cards for each mode |
| **Speedle Mode** | Timer countdown challenge screen |
| **Multiplayer AI** | AI opponent with visible progress bar |
| **Badges & Profile** | Player stats, streaks, and achievements |
| **Settings** | Toggle dark/light mode and haptics |

---

## 🧰 Tech Stack

| Layer | Technology |
|--------|-------------|
| **Frontend** | Kotlin, Android Jetpack, Material Components |
| **Backend** | Node.js, Express, CORS, Axios |
| **Hosting** | Render |
| **Database** | Firebase Firestore |
| **Authentication** | Firebase Auth (Email & Google SSO) |
| **External API** | RapidAPI WordsAPI |
| **CI/CD** | GitHub Actions |

---

## ⚡ Functional Requirements

- Daily WordRush (shared puzzle)  
- Speedle Mode (60/90/120 sec)  
- Multiplayer vs AI (3 difficulty levels)  
- Hints and Definitions  
- Achievements and Badges  
- Theme and Haptics Settings  
- Firebase Authentication  

---

## 🛡 Non-Functional Requirements

- **Security:** Firebase ID Tokens, Firestore rules, secret management  
- **Performance:** Cached daily puzzle, API error handling  
- **Accessibility:** Dark/light parity, TalkBack support  
- **Maintainability:** Modular helpers and automated builds  

---

## 🔁 GitHub and CI/CD

**Frontend Repo:** [WordRush Android (Kotlin)](https://github.com/Atiyyahm/Wordleandroidclient.git)  
**Backend Repo:** [WordRush API (Node.js)](https://github.com/ST10268917/WordleApp.git)

Both repos use **GitHub Actions** for CI, and **Render** for automated CD deployment.  
- Android: Verifies Gradle build via Automated Build workflow.  
- Backend: Runs Node.js smoke tests and auto-deploys to Render.  

These pipelines ensure consistent builds, security, and reproducibility.

---

## 🎥 Demo Video

[![Watch the Demo](https://img.youtube.com/vi/sbE3L70ndtg/0.jpg)](https://youtu.be/sbE3L70ndtg)

---

## 🧭 Repository Links

- **Frontend:** [Atiyyahm/Wordleandroidclient](https://github.com/Atiyyahm/Wordleandroidclient.git)  
- **Backend:** [ST10268917/WordleApp](https://github.com/ST10268917/WordleApp.git)

---
html <img src="https://media1.giphy.com/media/v1.Y2lkPWFkZWE2ZTUyOHlhOWRwd204N2poZ2NjMjhnNGwwbTZqbnJ6Mmt3aWg2OGNoY21oaSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/e34lA8V77WQS0Ut1sG/giphy.gif" width="400"/>

## 🧠 References

- Fowler, M. (2022). *Continuous Integration and Delivery: Modern DevOps Practices.* ThoughtWorks Insights.  
- GitHub Docs. (2024). *Understanding GitHub Actions Workflows.*  
- GitHub Marketplace. (2024). *Automated Build Android App Workflow.*  
- Martin, R.C. (2023). *Clean DevOps: Building and Testing Automation in Practice.*  
- OWASP. (2023). *Secrets Management Cheat Sheet.*  
- Render. (2024). *Continuous Deployment and Environment Variables.*

---

## 🤖 AI Usage Disclosure

This project responsibly incorporated **AI assistance** only in:
- **Logo generation** (design concept)  
- **Error resolution** (RetrofitClient and Google SSO fixes)  
AI was used strictly as a learning and debugging tool — all implementation decisions and content creation were manually completed by the developers.

html <img src="https://media4.giphy.com/media/v1.Y2lkPWFkZWE2ZTUyOHlhOWRwd204N2poZ2NjMjhnNGwwbTZqbnJ6Mmt3aWg2OGNoY21oaSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/NFgM484nJxhYpvDz9C/giphy.gif" width="400"/>


---
