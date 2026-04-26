# EcoVision AI — Deployment Guide

Free stack:  MongoDB Atlas  →  Render (backend)  →  Vercel (frontend)

---

## Step 1 — MongoDB Atlas (free database)

1. Go to https://cloud.mongodb.com and sign up / log in
2. Create a new project → click **Build a Database** → choose **M0 Free**
3. Pick a cloud provider (AWS) and region closest to you
4. Set a username and password — save them
5. Under **Network Access** → Add IP Address → **Allow Access from Anywhere** (0.0.0.0/0)
6. Click **Connect** → **Drivers** → copy the connection string, it looks like:
   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
7. Replace `<user>` and `<password>` with your credentials
8. Keep this string — you'll need it in Step 2

---

## Step 2 — Render (free backend)

1. Go to https://render.com and sign up / log in with GitHub
2. Click **New** → **Web Service**
3. Connect your GitHub repo and select it
4. Configure:
   - **Name**: ecovision-backend
   - **Root Directory**: Eco-Vision/backend
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: Free
5. Under **Environment Variables**, add:

   | Key | Value |
   |-----|-------|
   | MONGODB_URI | your Atlas connection string from Step 1 |
   | MONGODB_DB_NAME | ecovision |
   | JWT_SECRET_KEY | any long random string (e.g. generate at https://generate-secret.vercel.app/64) |
   | JWT_ALGORITHM | HS256 |
   | JWT_EXPIRES_MINUTES | 60 |
   | ALLOWED_ORIGINS | https://your-app.vercel.app (add after Step 3) |

6. Click **Create Web Service**
7. Wait for the build to finish (~5 min first time due to TensorFlow)
8. Copy your backend URL — looks like: `https://ecovision-backend.onrender.com`

> ⚠️  Free Render services spin down after 15 min of inactivity.
>     First request after sleep takes ~30s. Upgrade to Starter ($7/mo) to avoid this.

---

## Step 3 — Vercel (free frontend)

1. Go to https://vercel.com and sign up / log in with GitHub
2. Click **Add New** → **Project** → import your repo
3. Configure:
   - **Root Directory**: Eco-Vision/frontend
   - **Framework Preset**: Next.js (auto-detected)
4. Under **Environment Variables**, add:

   | Key | Value |
   |-----|-------|
   | NEXT_PUBLIC_API_URL | https://ecovision-backend.onrender.com |

5. Click **Deploy**
6. Once deployed, copy your Vercel URL (e.g. `https://eco-vision.vercel.app`)

---

## Step 4 — Wire them together

1. Go back to **Render** → your backend service → **Environment**
2. Update `ALLOWED_ORIGINS` to your Vercel URL:
   ```
   https://eco-vision.vercel.app
   ```
3. Render will auto-redeploy

---

## Step 5 — Verify

- Frontend: https://eco-vision.vercel.app
- Backend health: https://ecovision-backend.onrender.com
- API docs: https://ecovision-backend.onrender.com/docs

---

## Local development (unchanged)

```bash
# Terminal 1 — backend
cd Eco-Vision/backend
uvicorn app.main:app --reload

# Terminal 2 — frontend
cd Eco-Vision/frontend
npm run dev
```

Frontend reads `NEXT_PUBLIC_API_URL` from `.env.local` → `http://127.0.0.1:8000`

---

## Notes

- The ML model file (`wasteClassify.keras`) is committed to the repo and
  gets deployed with the backend automatically — no extra setup needed.
- Uploaded images on Render free tier are **ephemeral** (lost on redeploy).
  For persistent uploads, add a Render Disk ($1/GB/mo) and set:
  `UPLOADS_DIR=/var/data/uploads` in Render environment variables.
- MongoDB Atlas M0 free tier: 512 MB storage, shared cluster.
  Sufficient for development and small production use.
