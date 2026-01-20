# Ubuntu Server Installation Guide

Follow these steps to set up Parakeet AI Clone on a fresh Ubuntu server.

## 1. System Updates & Dependencies
Update your system and install Python, pip, and Git.

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3 python3-pip python3-venv git
```

## 2. Install Node.js (Version 18+)
We'll use the official NodeSource script to get a recent version of Node.js.

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
# Verify installation
node -v
npm -v
```

## 3. Clone the Repository
Clone the code you just pushed.

```bash
git clone https://github.com/gorasashivakumar-coder/parakeet-clone.git
cd parakeet-clone
```

## 4. Setup Backend
Set up the Python environment.

```bash
cd backend
# Create virtual environment
python3 -m venv venv
# Activate it
source venv/bin/activate
# Install dependencies
pip install -r requirements.txt
# Create .env file with your API Key
echo "GROQ_API_KEY=your_actual_api_key_here" > .env
```
*(Use `nano .env` to edit and paste your real key if needed)*

## 5. Setup Frontend
Install the Node dependencies.

```bash
cd ../frontend
npm install
```

## 6. Run the Application
You need to run proper commands to keep the servers alive. For testing, we can use `screen` or simple background commands.

**Option A: Simple (for quick test)**
Open TWO terminal windows (or use `tmux`).

*Terminal 1 (Backend):*
```bash
cd parakeet-clone/backend
source venv/bin/activate
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000
```

*Terminal 2 (Frontend):*
```bash
cd parakeet-clone/frontend
npm run dev -- --host 0.0.0.0
```

**Option B: Background using PM2 (Recommended)**
Install PM2 to keep apps running even if you disconnect.
```bash
sudo npm install -g pm2

# Start Backend
cd parakeet-clone/backend
pm2 start "python3 -m uvicorn main:app --host 0.0.0.0 --port 8000" --name backend

# Start Frontend
cd ../frontend
pm2 start "npm run dev -- --host 0.0.0.0" --name frontend

# Check status
pm2 status
# View logs
pm2 logs
```

## 7. Accessing the App
1. Find your server's Public IP.
2. Open `http://YOUR_SERVER_IP:5173` in your browser.
3. **IMPORTANT**: If the microphone is blocked, refer to the **"Security Context Warning"** on the screen or the `deployment_guide.md` to fix the HTTPS/HTTPs issue.
