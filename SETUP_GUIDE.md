# Vendor AI - Complete Setup Guide

## 🚀 Quick Start

This guide will help you set up and run the entire Vendor AI system including backend, web app, and mobile app.

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **Python** (v3.9 or higher) - [Download](https://www.python.org/downloads/)
- **pip** (Python package manager) - Usually comes with Python
- **Git** - [Download](https://git-scm.com/)
- **Expo CLI** (for mobile app) - `npm install -g expo-cli`
- **Android Studio** or **Xcode** (optional, for mobile development)

---

## 🔧 Backend Setup (FastAPI)

### 1. Navigate to Backend Directory
```bash
cd backend
```

### 2. Create Virtual Environment (Recommended)
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure Environment
```bash
# Copy example env file
copy .env.example .env  # Windows
# OR
cp .env.example .env    # macOS/Linux
```

Edit `.env` and set your configuration:
```env
DATABASE_URL=sqlite:///./vendor_ai.db
SECRET_KEY=your-secret-key-here-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:19006
ENVIRONMENT=development
```

### 5. Initialize Database
The database will be created automatically on first run.

### 6. Run Backend Server
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at: **http://localhost:8000**

API documentation: **http://localhost:8000/docs**

---

## 🌐 Web App Setup (Next.js)

### 1. Navigate to Web Directory
```bash
cd apps/web
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment (Optional)
Create `.env.local` if you need custom configuration:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

### 4. Run Development Server
```bash
npm run dev
```

Web app will be available at: **http://localhost:3000**

### 5. Build for Production
```bash
npm run build
npm start
```

---

## 📱 Mobile App Setup (Expo)

### 1. Navigate to Mobile Directory
```bash
cd apps/mobile
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
```bash
# Copy example env file
copy .env.example .env  # Windows
# OR
cp .env.example .env    # macOS/Linux
```

Edit `.env`:
```env
EXPO_PUBLIC_API_URL=http://YOUR-IP-ADDRESS:8000/api
```

**Important:** Replace `YOUR-IP-ADDRESS` with your computer's local IP address (not localhost). You can find it using:
- Windows: `ipconfig`
- macOS/Linux: `ifconfig` or `ip addr`

### 4. Start Expo Development Server
```bash
npm start
```

Or use specific platform:
```bash
npm run android  # For Android
npm run ios      # For iOS (macOS only)
npm run web      # For web
```

### 5. Run on Physical Device
1. Install **Expo Go** app from Play Store or App Store
2. Scan the QR code shown in terminal
3. App will load on your device

---

## 🗄️ Database Setup & Management

### SQLite (Default)
The default configuration uses SQLite, which requires no additional setup. The database file (`vendor_ai.db`) will be created automatically in the backend directory.

### PostgreSQL (Production Recommended)

1. Install PostgreSQL
2. Create database:
```sql
CREATE DATABASE vendor_ai;
CREATE USER vendor_admin WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE vendor_ai TO vendor_admin;
```

3. Update backend `.env`:
```env
DATABASE_URL=postgresql://vendor_admin:your_password@localhost/vendor_ai
```

4. Install PostgreSQL driver:
```bash
pip install psycopg2-binary
```

---

## 🔐 Creating Admin User

### Method 1: Using API
1. Start the backend server
2. Go to http://localhost:8000/docs
3. Find `/api/auth/register` endpoint
4. Click "Try it out" and enter:
```json
{
  "username": "admin",
  "email": "admin@vendorai.com",
  "password": "your_secure_password",
  "role": "admin"
}
```
5. Click "Execute"

### Method 2: Using Python Script
Create `create_admin.py` in backend directory:
```python
from sqlalchemy.orm import Session
from database import SessionLocal, engine
from models import User
from auth import get_password_hash
import models

models.Base.metadata.create_all(bind=engine)

db = SessionLocal()

admin_user = User(
    username="admin",
    email="admin@vendorai.com",
    hashed_password=get_password_hash("admin123"),
    role="admin",
    is_active=True
)

db.add(admin_user)
db.commit()
print("Admin user created successfully!")
db.close()
```

Run:
```bash
python create_admin.py
```

---

## 🧪 Testing the System

### 1. Test Backend
```bash
# Health check
curl http://localhost:8000/health

# API health
curl http://localhost:8000/api/health
```

### 2. Test Web App
1. Go to http://localhost:3000
2. Navigate to login page
3. Use admin credentials to log in

### 3. Test Mobile App
1. Open app on device/simulator
2. Dashboard should load
3. Try navigating between tabs

---

## 🐛 Troubleshooting

### Backend Issues

**Error: "ModuleNotFoundError"**
```bash
# Ensure virtual environment is activated
# Reinstall dependencies
pip install -r requirements.txt
```

**Error: "Database locked"**
```bash
# SQLite file is being used by another process
# Close any database browsers
# Restart the backend server
```

**Error: "Port 8000 already in use"**
```bash
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:8000 | xargs kill -9
```

### Web App Issues

**Error: "Cannot connect to API"**
- Ensure backend is running on port 8000
- Check CORS settings in backend `config.py`
- Verify API URL in web app

**Error: "Module not found"**
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Mobile App Issues

**Error: "Network request failed"**
- Use your computer's IP address, not localhost
- Ensure phone and computer are on same network
- Check firewall settings

**Error: "Unable to resolve module"**
```bash
# Clear Expo cache
npx expo start -c
```

---

## 📦 Deployment

### Backend Deployment (Heroku)

1. Create `Procfile` in root:
```
web: cd backend && gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app
```

2. Deploy:
```bash
heroku create vendor-ai-backend
heroku addons:create heroku-postgresql:hobby-dev
git push heroku main
```

### Web App Deployment (Vercel)

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
cd apps/web
vercel --prod
```

### Mobile App Deployment (EAS Build)

1. Install EAS CLI:
```bash
npm install -g eas-cli
```

2. Configure and build:
```bash
cd apps/mobile
eas build:configure
eas build --platform android
eas submit --platform android
```

---

## 📊 Features Overview

### ✅ Implemented Features

- **Authentication System**: JWT-based auth with role management
- **Vendor Management**: CRUD operations for vendors
- **Inventory Management**: Track stock levels, prices, expiry dates
- **Sales Recording**: Record and track sales transactions
- **Stock Requests**: Submit and manage stock requests
- **AI Recommendations**: ML-powered demand prediction and insights
- **Real-time Notifications**: WebSocket support for live updates
- **PDF Reports**: Generate inventory, sales, and analytics reports
- **Multi-language Support**: English, Hindi, Tamil, Telugu, Kannada
- **Dark Mode**: Full theming support
- **Mobile App**: Cross-platform React Native app

### 🔜 Planned Enhancements

- Advanced analytics charts
- WhatsApp/SMS notifications
- Payment tracking
- Multi-warehouse support
- Automated reordering
- Supplier management module

---

## 🛠️ Development Tips

### Recommended VS Code Extensions
- Python
- Pylance
- ES7+ React/Redux/React-Native snippets
- Prettier - Code formatter
- ESLint

### Useful Commands

```bash
# Backend
uvicorn main:app --reload  # Run with auto-reload
pytest                      # Run tests (when added)

# Web App
npm run dev                 # Development
npm run build               # Production build
npm run lint                # Lint code

# Mobile App
npm start                   # Start Expo
npm run android            # Run on Android
npm run ios                # Run on iOS
```

---

## 📚 API Documentation

Once the backend is running, access interactive API documentation at:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 📞 Support

For issues and questions:
- Create an issue on GitHub
- Check existing documentation
- Review API docs at /docs endpoint

---

## 🎉 You're All Set!

Your Vendor AI system should now be fully operational. Happy coding! 🚀
