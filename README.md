# ⚕️ CareLink: Intelligent Healthcare Assistant

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![React](https://img.shields.io/badge/React-Next.js-black?logo=react)
![Node.js](https://img.shields.io/badge/Node.js-Express-green?logo=nodedotjs)
![Python](https://img.shields.io/badge/Python-Flask-blue?logo=python)
![TensorFlow](https://img.shields.io/badge/TensorFlow-DenseNet-orange?logo=tensorflow)

**CareLink** is a comprehensive, full-stack healthcare platform that bridges the gap between patients and medical professionals using state-of-the-art AI, real-time communication, and an intuitive user interface. 

The platform offers two specialized experiences: a **Voice-First Health Buddy** for patients and an **AI Radiologist Assistant** for doctors.

---

## ✨ Key Features

### 🩺 For Doctors
- **AI X-Ray Anomaly Detection:** Upload X-ray scans and instantly receive AI-generated clinical impressions. Our custom DenseNet121 CNN identifies suspicious regions and generates Grad-CAM bounding boxes.
- **Uncertainty Calibration:** The AI doesn't just guess; it provides reliability badges based on prediction entropy and image blur detection so doctors know when to double-check.
- **Patient Dashboard:** Seamlessly manage patients, view their medical histories, and track critical alerts in real-time.

### 👥 For Patients
- **Medical Report Demystifier & OCR:** Upload a photo of a physical medical report or paste its text. Our AI uses Optical Character Recognition (OCR) to extract the text and translate complex medical jargon into simple, 6th-grade level language.
- **Proactive Safety Alerts:** Browser-based fall detection using device accelerometers, paired with a voice-triggered SOS system that instantly alerts connected doctors via real-time WebSockets.
- **Health Trend Analysis:** Tracks patient health over time, comparing multiple reports to identify trends rather than just single-point snapshots.

---

## 🛠️ Tech Stack

### Frontend (`/client`)
- **Framework:** Next.js (React)
- **Styling:** Tailwind CSS, Framer Motion
- **State/API:** standard React Hooks

### Backend (`/server`)
- **Runtime:** Node.js with Express.js
- **Database:** Firebase Firestore & Firebase Auth
- **Real-time:** Socket.io (WebSockets)

### AI Microservices (`/ai`)
- **Report Service (Flask):** Uses `google-genai` (Gemini API) and FAISS vector databases for Retrieval-Augmented Generation (RAG) and medical text translation. Uses `pytesseract` and `Pillow` for OCR.
- **X-Ray Service (Flask):** Uses TensorFlow/Keras for deep learning image analysis, OpenCV for image processing, and Gemini for structured report generation.

---

## 🚀 Getting Started

### Prerequisites
Make sure you have the following installed on your machine:
- [Node.js](https://nodejs.org/en/) (v16+)
- [Python](https://www.python.org/) (3.9+)
- [Tesseract OCR](https://github.com/tesseract-ocr/tesseract) (Required for the Report Service image extraction)
- A [Firebase](https://firebase.google.com/) Project with Firestore and Authentication enabled
- A [Google Gemini API Key](https://aistudio.google.com/)

---

### 1. Backend Setup (Node.js)
1. Navigate to the server directory:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Add your Firebase `serviceAccountKey.json` to the `server/` directory.
4. Start the backend server (runs on port 8000 by default):
   ```bash
   node index.js
   ```

### 2. AI Services Setup (Python)
The AI system is split into two microservices.

**Report Service:**
1. Navigate to the report service:
   ```bash
   cd ai/report_service
   ```
2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Create a `.env` file and add your Gemini API Key:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```
4. Start the service (runs on port 5001):
   ```bash
   python app.py
   ```

**X-Ray Service:**
1. Navigate to the X-ray service:
   ```bash
   cd ai/xray_service
   ```
2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Create a `.env` file and add your Gemini API Key:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```
4. Start the service (runs on port 5002):
   ```bash
   python app.py
   ```

### 3. Frontend Setup (Next.js)
1. Navigate to the client directory:
   ```bash
   cd client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your environment variables if needed (e.g., pointing to the local backend).
4. Start the development server (runs on port 3000):
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application!

---

## 🔒 Security
- **Firebase Auth:** Handles secure user authentication and role-based access control (Doctor vs. Patient).
- **Environment Variables:** All sensitive keys (Firebase Service Accounts, API Keys) are ignored via `.gitignore` to prevent exposure.

## 📄 License
This project is licensed under the MIT License.
