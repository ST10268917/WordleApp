<p align="center">
  <img src="https://github.com/ST10268917/WordleApp/blob/main/WordRush_Logo.png" width="220" alt="WordRush Logo"/>
</p>

# 🧠 WordRush Backend API

The **WordRush Backend** is a RESTful API built using **Node.js** and **Express**, serving as the core engine for the WordRush Android application.  
It manages word generation, validation, timed game sessions, and leaderboard logic — all securely integrated with **Firebase Firestore** and **RapidAPI’s WordsAPI**.

---

## 📖 Table of Contents
1. [Introduction](#introduction)  
2. [Purpose](#purpose)  
3. [System Overview](#system-overview)  
4. [Prerequisites](#prerequisites)  
5. [Installation Guide](#installation-guide)  
6. [Environment Configuration](#environment-configuration)  
7. [Available Scripts](#available-scripts)  
8. [API Endpoints](#api-endpoints)  
9. [Security](#security)  
10. [Deployment (Render)](#deployment-render)  
11. [Continuous Integration (GitHub Actions)](#continuous-integration-github-actions)  
12. [Tech Stack](#tech-stack)  
13. [Repository Links](#repository-links)
14. [Demo Video](#demo-video)
15. [References](#references)

---

## 🟢 Introduction

The backend provides the cloud logic and database integration for **WordRush**.  
It is responsible for:
- Generating or retrieving daily puzzle words  
- Validating player guesses  
- Managing Speedle sessions and leaderboards  
- Returning dictionary definitions and synonyms  
- Interfacing with Firebase Authentication for secure access  

<p align="center">
  <img src="https://media1.giphy.com/media/v1.Y2lkPWFkZWE2ZTUyOHlhOWRwd204N2poZ2NjMjhnNGwwbTZqbnJ6Mmt3aWg2OGNoY21oaSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/e34lA8V77WQS0Ut1sG/giphy.gif" width="400"/>
</p>

---

## 🟠 Purpose

To act as a robust, scalable, and secure API service layer connecting the **WordRush Android frontend** with cloud services such as **Firebase Firestore** and **WordsAPI**.

---

## ⚙️ System Overview

<p align="center">
  <img src="https://media0.giphy.com/media/v1.Y2lkPWFkZWE2ZTUyOHlhOWRwd204N2poZ2NjMjhnNGwwbTZqbnJ6Mmt3aWg2OGNoY21oaSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/62HRHz7zZZYThhTwEI/giphy.gif" width="400"/>
</p>

The backend is hosted on **Render** and uses **Express** to expose REST endpoints consumed by the Android client.  
It communicates with **Firebase Firestore** for persistent storage and **RapidAPI’s WordsAPI** to fetch real dictionary data.

---

## 🧰 Prerequisites

Before you begin, ensure you have:
- **Node.js** (v18+ LTS recommended)  
- **npm** (comes with Node.js)  
- **Visual Studio Code** (for editing and running the server)  
- A **Firebase project** with Firestore & Authentication enabled  
- A **RapidAPI** account with a WordsAPI key  

---

## 🛠 Installation Guide

1. **Clone the repository**
   ```bash
   git clone https://github.com/ST10268917/WordleApp.git
   cd WordleApp

2.**Install dependecies**
npm install

3.**Create enviroment file**
```bash
- WORDSAPI_KEY=d4b96835d4msh663af81a6a5ce3ap1a1e9fjsn71f0d436d2f8
- WORDSAPI_HOST=wordsapiv1.p.rapidapi.com
- GOOGLE_APPLICATION_CREDENTIALS=./keys/serviceAccount.json
- FIREBASE_PROJECT_ID=wordle-5ab92
- PORT=4000

4. **Run the API locally**

npm start
or for development
npm run dev

5. **Test your connection**
Visit http://localhost:3000/api/v1/word/today
 in your browser or use Postman.

## API Endpoints

**Base URL:** `https://wordleappapi.onrender.com/api/v1`

| Endpoint              | Method | Description                                   |
|-----------------------|--------|-----------------------------------------------|
| `/word/today`         | GET    | Retrieves or seeds the daily 5-letter puzzle |
| `/word/validate`      | POST   | Validates a player’s guess                    |
| `/speedle/start`      | POST   | Starts a Speedle session                      |
| `/speedle/validate`   | POST   | Checks guesses and updates time               |
| `/speedle/finish`     | POST   | Ends the session and saves results            |
| `/speedle/leaderboard`| GET    | Fetches top players                           |

### Sample Request

    GET /api/v1/word/today
    Headers: { Authorization: Bearer <Firebase-ID-Token> }

### Sample Response

    {
      "word": "PLANT",
      "definition": "A living organism of the kind exemplified by trees, shrubs, herbs, grasses, ferns, and mosses.",
      "date": "2025-10-07"
    }

---

## 🔐 Security

- Firebase Authentication required for all endpoints  
- Tokens are validated using Firebase Admin SDK  
- All API keys and credentials stored as environment variables  
- HTTPS enforced by Render hosting

<p align="center">
  <img src="https://media1.giphy.com/media/v1.Y2lkPWFkZWE2ZTUyOHlhOWRwd204N2poZ2NjMjhnNGwwbTZqbnJ6Mmt3aWg2OGNoY21oaSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/e34lA8V77WQS0Ut1sG/giphy.gif" width="400"/>
</p>

---

## 🚀 Deployment (Render)

This API is hosted on **Render**, which supports automatic deployment from GitHub.  
Once connected:

1. Push your latest code to the `main` branch.  
2. Render triggers a new build and deployment automatically.  
3. You can view build logs directly on the Render dashboard.

---

## 🔄 Continuous Integration (GitHub Actions)

The backend uses **GitHub Actions** for CI/CD:

- Runs on every push to `main`  
- Installs dependencies  
- Builds and lints code  
- (Optional) Triggers Render redeployment upon success

**Sample workflow file:** `.github/workflows/node.yml`

    name: Node.js CI

    on:
      push:
        branches: [ main ]

    jobs:
      build:
        runs-on: ubuntu-latest
        steps:
          - uses: actions/checkout@v3
          - uses: actions/setup-node@v3
            with:
              node-version: 20
          - run: npm ci
          - run: npm test

---

## 🧠 Tech Stack

| Component   | Technology            |
|------------|------------------------|
| Runtime    | Node.js (v20 LTS)      |
| Framework  | Express.js             |
| Database   | Firebase Firestore     |
| Auth       | Firebase Authentication|
| External API | RapidAPI – WordsAPI  |
| Deployment | Render                 |
| CI/CD      | GitHub Actions         |
| IDE        | Visual Studio Code     |

<p align="center">
  <img src="https://media0.giphy.com/media/v1.Y2lkPWFkZWE2ZTUyOHlhOWRwd204N2poZ2NjMjhnNGwwbTZqbnJ6Mmt3aWg2OGNoY21oaSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/62HRHz7zZZYThhTwEI/giphy.gif" width="400"/>
</p>

---

## 🧭 Repository Links

- **Frontend (Android):** [Atiyyahm/Wordleandroidclient](https://github.com/Atiyyahm/Wordleandroidclient)  
- **Backend (API):** [ST10268917/WordleApp](https://github.com/ST10268917/WordleApp)

---

## 🎥 Demo Video

[![Watch the Demo](https://img.youtube.com/vi/sbE3L70ndtg/0.jpg)](https://youtu.be/sbE3L70ndtg)

<p align="center">
  <img src="https://media4.giphy.com/media/v1.Y2lkPWFkZWE2ZTUyOHlhOWRwd204N2poZ2NjMjhnNGwwbTZqbnJ6Mmt3aWg2OGNoY21oaSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/NFgM484nJxhYpvDz9C/giphy.gif" width="400"/>
</p>

---

## 📚 References

- Fowler, M. (2022). *Continuous Integration and Delivery: Modern DevOps Practices.*  
- GitHub Docs. (2024). *Understanding GitHub Actions Workflows.*  
- OWASP. (2023). *Secrets Management Cheat Sheet.*  
- Render. (2024). *Render Documentation: Environment Variables & Deployment.*  
- RapidAPI. (2024). *WordsAPI Documentation.*


