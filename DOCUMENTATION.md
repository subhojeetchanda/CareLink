# CareLink: Comprehensive AI-Powered Healthcare Platform

Welcome to the comprehensive documentation for **CareLink**. This document provides an in-depth overview of the platform's architecture, features, technologies, and deployment strategies.

## 🚀 Project Overview

CareLink is a full-stack, AI-integrated telemedicine platform designed to bridge the gap between patients and healthcare professionals. By combining real-time communication with advanced artificial intelligence, CareLink empowers patients to understand their health data better while providing doctors with powerful diagnostic assistance tools.

### Core Architecture
The platform is built using a modern microservices architecture, consisting of three primary layers:
1. **Frontend Client:** A responsive, interactive user interface built with Next.js and Tailwind CSS.
2. **Main Backend Server:** A Node.js/Express server handling core business logic, real-time WebSocket communication, and database operations.
3. **AI Microservices:** Two independent Python Flask microservices dedicated to heavy machine learning tasks (Medical Report OCR/Simplification and X-Ray Analysis).

---

## 💻 Tech Stack

### Frontend (`client/`)
- **Framework:** Next.js (App Router) & React 19
- **Styling:** Tailwind CSS & Framer Motion (for animations)
- **Authentication:** Firebase Client SDK
- **Real-time:** Socket.io-client
- **Components:** Radix UI / Custom Components, React Big Calendar

### Main Backend (`server/`)
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** Firebase Firestore (via Firebase Admin SDK)
- **Real-time Engine:** Socket.io
- **Security:** JWT Verification, CORS

### AI Report Service (`ai/report_service/`)
- **Framework:** Python Flask
- **LLM Engine:** Google Gemini AI (`google-genai`)
- **OCR:** PyTesseract (Tesseract OCR Engine)
- **RAG Architecture:** FAISS (Vector Database) for context retrieval
- **Server:** Gunicorn

### AI X-Ray Service (`ai/xray_service/`)
- **Framework:** Python Flask
- **Machine Learning:** TensorFlow & Keras (DenseNet121 Architecture)
- **Explainability:** Grad-CAM (Gradient-weighted Class Activation Mapping)
- **LLM Analysis:** Google Gemini AI
- **Server:** Gunicorn

---

## ✨ Key Features

### 1. Dual Dashboard System
- **Patient Dashboard:** View medical history, book appointments, track mood, receive alerts, and interact with the AI medical assistant.
- **Doctor Dashboard:** Manage patient rosters, view uploaded medical reports and X-rays, schedule consultations, and utilize AI for second opinions.

### 2. Real-Time Communication
- Integrated Socket.io allows for real-time notifications, instant messaging between doctors and patients, and live updates to appointment statuses.

### 3. AI Medical Report Demystifier (RAG + OCR)
- Patients can upload images or PDFs of complex medical reports.
- The system extracts text using **Tesseract OCR**.
- Uses a **Retrieval-Augmented Generation (RAG)** pipeline powered by FAISS to retrieve relevant medical context.
- **Google Gemini AI** simplifies the medical jargon into easily understandable terms for the patient.

### 4. AI X-Ray Pneumonia Detection
- Doctors can upload chest X-rays.
- A customized **DenseNet121 TensorFlow model** analyzes the X-ray for signs of pneumonia.
- Generates a **Grad-CAM heatmap** overlay, visually highlighting the specific regions of the lungs that influenced the AI's decision.
- Integrates with Gemini AI to provide a structured, professional diagnostic summary based on the visual findings.

### 5. Voice Assistant Integration
- Built-in Voice Assistant component (`VoiceAssistant.tsx`) allowing hands-free interaction and accessibility features for patients.

### 6. Mood Tracking & Alerts
- Daily mood logging system.
- Automated alert generation for doctors if a patient's vital signs or mood patterns indicate potential health risks.

---

## 🧠 AI Pipeline & Deep Learning Deep Dive

This section details the artificial intelligence pipeline built for the X-Ray Pneumonia Detection model.

### 1. Data Preprocessing: Preparing the Fuel
An AI model requires normalized, mathematical representations of images to learn effectively.
- **Resizing (224x224):** Neural networks require a fixed input size. All X-rays were resized to 224x224 pixels.
- **Normalization (1./255):** Pixel colors range from 0 to 255. To prevent unstable math (exploding gradients), every pixel was divided by 255, scaling them to a tight range between 0.0 and 1.0.
- **Data Augmentation:** To prevent the model from memorizing exact training images, random rotations, zooms, and shifts were applied. This forces the AI to learn robust disease representations from different angles.

### 2. Model Architecture: Transfer Learning
Instead of training a Convolutional Neural Network (CNN) from scratch, we utilized **Transfer Learning**.
- **DenseNet121 (Base):** Serves as the vision engine. A pre-trained AI that has learned foundational visual features (edges, curves, textures) from 1.4 million images (ImageNet). We "froze" its 121 layers to retain this knowledge.
- **Custom Head:** The new layers stacked on top of DenseNet. They take general visual patterns and learn to associate them specifically with pneumonia.
  - *Global Average Pooling:* Flattens the complex 3D grid of visual features into a simple 1D array.
  - *Dense Layer (128 neurons, ReLU):* A highly interconnected layer acting as a primary filter. The ReLU activation ensures only positive signals pass forward.
  - *Dropout (0.5):* A safety mechanism that randomly turns off 50% of the neurons during training, forcing the model to look at the whole lung and preventing overfitting.
  - *Final Dense Layer (Sigmoid):* A single neuron that outputs the final probability, strictly squashed between 0.0 (Normal) and 1.0 (Pneumonia).

### 3. Compilation: The Rules of the Game
- **The Optimizer (Adam):** The navigator that calculates how much to adjust the "weights" as the model makes guesses. It is highly efficient and adapts its learning speed dynamically.
- **The Loss Function (Binary Crossentropy):** The judge that penalizes incorrect predictions. The optimizer's goal is to drive this loss score as close to zero as possible.

### 4. The Training Loop (Epochs & Callbacks)
- **ModelCheckpoint:** Automatically saves a backup of the best model weights (`model.h5`) every time validation accuracy improves.
- **EarlyStopping:** Prevents overfitting by monitoring validation data. If the model fails to improve for 3 straight epochs, training halts early and the best saved version is restored.

### 5. Grad-CAM: Reading the AI's Mind
Because the dataset lacked bounding box annotations, we implemented **Grad-CAM (Gradient-weighted Class Activation Mapping)** for anomaly localization.
- **The Interrogation:** When the model predicts "Pneumonia", Grad-CAM asks which visual filters in the final convolutional layer (`conv5_block16_concat`) were most influential.
- **The Heatmap:** It calculates the mathematical gradients flowing backward from the prediction into the image, generating a heatmap where hot areas (red/yellow) indicate high importance.
- **The Bounding Box:** OpenCV is used to threshold this heatmap into a black-and-white mask, trace the outer contours of the hot zones, and draw strict mathematical rectangles (x, y, width, height) around them. This pipeline successfully builds a complex localization tool from simple folder-level training data.

---

## 🌐 Deployment Architecture

The application is deployed across multiple cloud providers to optimize performance and cost:

1. **Frontend (Vercel)**
   - Deployed on Vercel's Edge Network for lightning-fast global delivery.
   - Communicates with the backend via environment variables (`NEXT_PUBLIC_API_URL`).

2. **Main Backend (Render)**
   - Deployed as a Web Service on Render.
   - Connected to a live Firebase Firestore project.
   - Kept alive 24/7 using automated Google Apps Script pinging.

3. **AI Services (Render via Docker)**
   - Both `xray_service` and `report_service` are containerized using **Docker**.
   - Deployed as independent Web Services on Render.
   - Using Gunicorn for production-grade request handling.
   - Overcome Render's free-tier limitations via a lightweight `/` health-check endpoint pinged by Google Apps Script.

---

## 🔐 Security & Data Flow

- **Authentication:** All user authentication is handled securely by Firebase Auth. The frontend receives a JWT token.
- **Authorization:** The Node.js backend verifies the Firebase JWT token on every protected API route and Socket.io connection (`server/index.js` middleware) to ensure the user is who they claim to be.
- **Service-to-Service Communication:** The Node backend securely delegates AI tasks to the Render Python endpoints, ensuring API keys (like the Gemini API key) are never exposed to the frontend browser.

---

## 🛠️ Local Development Guide

### Prerequisites
- Node.js (v18+)
- Python (3.10+)
- Firebase Account (with Firestore and Auth enabled)
- Google Gemini API Key

### 1. Setup Backend
```bash
cd server
npm install
# Add serviceAccountKey.json from Firebase
# Create .env with PORT=5001
npm run start
```

### 2. Setup AI Services
```bash
cd ai/report_service
pip install -r requirements.txt
# Create .env with GEMINI_API_KEY
python app.py

cd ../xray_service
pip install -r requirements.txt
# Ensure model.h5 is present
# Create .env with GEMINI_API_KEY
python app.py
```

### 3. Setup Frontend
```bash
cd client
npm install
# Create .env.local with NEXT_PUBLIC_API_URL=http://localhost:5001
npm run dev
```

---

*Documentation generated automatically upon project completion.*
