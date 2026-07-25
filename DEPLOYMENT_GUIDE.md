# QuickMove AI Operations Hub - Production Deployment Guide

This guide details step-by-step instructions to deploy **QuickMove** to cloud environments.

---

## Option 1: Cloud Deployment (Render / Railway + Vercel) — *Recommended & Free*

### Step 1: Deploy Backend to Render or Railway

#### On Render.com:
1. Sign in to [Render.com](https://render.com) and click **New +** $\rightarrow$ **Web Service**.
2. Connect your GitHub repository `quickmove`.
3. Set configuration:
   - **Root Directory**: `backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Add **Environment Variables**:
   - `GROQ_API_KEY`: Your Groq API key (`gsk_...`)
   - `GROQ_MODEL`: `llama-3.3-70b-versatile`
   - `DATABASE_URL`: `sqlite:///./quickmove.db`
5. Click **Create Web Service**. Note your backend URL (e.g. `https://quickmove-backend.onrender.com`).

---

### Step 2: Deploy Frontend to Vercel or Netlify

#### On Vercel.com:
1. Sign in to [Vercel.com](https://vercel.com) and click **Add New...** $\rightarrow$ **Project**.
2. Select your GitHub repository `quickmove`.
3. Set configuration:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add **Environment Variables**:
   - `VITE_API_URL`: Your backend URL from Step 1 (e.g. `https://quickmove-backend.onrender.com/api`)
5. Click **Deploy**.

---

## Option 2: Docker Compose Deployment (Single Command for VPS / EC2 / DigitalOcean)

If hosting on any Virtual Private Server (AWS EC2, DigitalOcean Droplet, Linode, Hetzner):

1. **Clone Repo & Configure Environment**:
   ```bash
   git clone https://github.com/your-username/quickmove.git
   cd quickmove
   ```

2. **Create Environment File**:
   Create a `.env` file in the root directory:
   ```env
   GROQ_API_KEY=gsk_your_actual_groq_api_key_here
   GROQ_MODEL=llama-3.3-70b-versatile
   ```

3. **Launch Containers**:
   ```bash
   docker-compose up -d --build
   ```

4. **Verify Application**:
   - Frontend is live at `http://your-server-ip`
   - Backend API is live at `http://your-server-ip:8000/docs`

---

## Option 3: Manual Production Setup on Linux/Ubuntu Server

### 1. Backend Service (FastAPI + Systemd + Nginx)

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt gunicorn

# Initialize Database & Seed Data
python seed.py

# Run Production Server with Gunicorn
gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:8000
```

### 2. Frontend Production Build

```bash
cd frontend
npm install
npm run build
```
Serve the generated `frontend/dist` directory using Nginx or Caddy.

---

## Pre-Deployment Verification Checklist

- [x] Environment variables configured (`GROQ_API_KEY`, `GROQ_MODEL`).
- [x] Seed data initialized (`python seed.py`).
- [x] CORS middleware enabled in FastAPI for production domain.
- [x] Frontend `npm run build` verified.
- [x] `.gitignore` configured to keep secret keys out of source control.
