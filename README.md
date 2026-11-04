# 🌍 Tripzy - AI Powered Recommendation Engine

> **Project Status:** Active Development (TÜBİTAK 1507 R&D Candidate)
> **Live Demo:** [Click Here](https://tripzytravelanti.vercel.app)

## 🚀 Project Overview
Tripzy is a next-generation recommendation engine that solves the **"Cold Start"** problem in the travel industry using **Autonomous Agents**. Unlike traditional collaborative filtering, Tripzy uses a **Hybrid Vector Space** approach to provide zero-shot recommendations.

## 🏗️ System Architecture
The system is built on a 3-layer Agentic Workflow managed by **Google Antigravity**.

![System Architecture](Ek-1_Teknik_Mimari_Diyagrami.pdf.png)

## 🛠️ Tech Stack
* **AI Core:** Google Gemini 3 & Antigravity IDE (Agent Orchestration)
* **Memory:** Pinecone Vector Database (Long-term semantic memory)
* **Backend:** Python FastAPI (Asynchronous Microservices)
* **Frontend:** HTML5 / React 19 (Context-Aware Interface)
* **Algorithm:** SVD++ & Cross-Domain Transfer Learning

## 📂 Repository Structure
* `/src`: Frontend web and mobile application source code (React 19 / Vite 6).
* `/api`: Layer 2 Autonomous Brain (Python FastAPI microservice, Gemini autonomous cold-start reasoning, SVD++ training pipeline, and provably fair lottery engine).
* `/supabase`: Edge functions, database schema migrations, and pgvector embeddings.
* `/e2e`: Playwright end-to-end integration test suites.
* `/docs`: Architecture diagrams and TÜBİTAK 1507 R&D documentation.

## 🧪 Testing & Verification
```bash
# Frontend Unit & Component Tests (Vitest)
npm test

# Layer 2 Backend Microservice Tests (Pytest)
py -m pytest api/tests

# End-to-End Integration Tests (Playwright)
npm run test:e2e
```

---
*© 2025 Tripzy DevOps Team - Confidential R&D Project*
