# 🎖️ Attendance Management System

Leave management system with Admin and Student portals.

---

## 📁 Project Structure

```
attendance-system/
├── server.js               ← Main server
├── .env.example            ← Copy to .env and fill values
├── models/                 ← Database schemas
├── routes/                 ← API endpoints
├── middleware/             ← Auth guards
└── public/
    ├── admin-login.html
    ├── student-login.html
    ├── admin/index.html    ← Admin SPA
    └── student/index.html  ← Student SPA
```

---

## 🖥️ Run Locally

### Step 1 — Prerequisites
- Node.js v18+ installed
- MongoDB installed locally OR use MongoDB Atlas (free)

### Step 2 — Setup
```bash
# Clone/copy project folder, then:
cd attendance-system
npm install

# Create .env file
cp .env.example .env
```

### Step 3 — Edit .env
```
PORT=3000
MONGO_URI=mongodb://localhost:27017/attendance_db
SESSION_SECRET=any_random_long_string
NODE_ENV=development
```

### Step 4 — Run
```bash
npm run dev      # with auto-reload (nodemon)
# OR
npm start        # production mode
```

### Step 5 — Open
- Admin Panel:   http://localhost:3000/admin/login
- Student Portal: http://localhost:3000/student/login

---

## 🔑 Default Credentials

| Role    | Username | Password     |
|---------|----------|--------------|
| Admin   | admin    | sainik_admin |
| Student | cdt{SR}  | sainiklko    |

---

## 📊 Excel Upload Format

Download sample from Admin → Students → "Download Sample Excel"

| SR_No | Student_Name | Father_Name | Class_Section | DOB        |
|-------|--------------|-------------|---------------|------------|
| 1     | Arjun Singh  | Rajendra    | X-A           | 2008-05-15 |
| 2     | Priya Sharma | Mohan       | X-B           | 2007-11-10 |

Auto-creates logins: Username = `cdt1`, `cdt2` ... Password = `sainiklko`

---

## 🌐 Deploy to Live Server (Free)

### Step 1 — MongoDB Atlas (Free Database)
1. Go to https://www.mongodb.com/cloud/atlas/register
2. Create free account → Create a FREE M0 cluster (512MB)
3. Set username + password for DB
4. Whitelist IP: `0.0.0.0/0` (allow all for Render)
5. Get connection string: `mongodb+srv://user:pass@cluster.mongodb.net/attendance_db`

### Step 2 — Deploy on Render (Free Hosting)
1. Go to https://render.com → Sign up (free)
2. Push your project to GitHub first:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   # Create repo on github.com, then:
   git remote add origin https://github.com/YOUR_USERNAME/attendance-system.git
   git push -u origin main
   ```
3. On Render → New → Web Service → Connect your GitHub repo
4. Settings:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free
5. Add Environment Variables on Render:
   ```
   PORT=10000
   MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/attendance_db
   SESSION_SECRET=your_random_secret_here
   NODE_ENV=production
   ```
6. Click Deploy → Wait 2-3 minutes → Get your live URL

⚠️ **Note:** Render free tier sleeps after 15 min of inactivity.
First request after sleep takes ~30 seconds to wake up.
For always-on, upgrade to Render Starter ($7/mo).

---

## 📋 Features

### Admin Portal
- ✅ Bulk student upload via Excel
- ✅ Auto-create student logins (cdt{sr_no} / sainiklko)
- ✅ Set leave days per category (Public, Gazetted, Summer, Winter)
- ✅ Review & approve/reject emergency leave requests
- ✅ Add admin notes to decisions
- ✅ View complete leave summary per student
- ✅ Dashboard with stats

### Student Portal
- ✅ View all leave entitlements in cards
- ✅ Emergency leave progress bar
- ✅ Raise leave request with reason
- ✅ Sound alert when emergency quota exhausted
- ✅ Warning to visit Principal's office when quota done
- ✅ View request history with status
- ✅ Leave card greys out when exhausted
