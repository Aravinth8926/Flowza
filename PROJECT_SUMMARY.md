# Vendor AI - Project Summary

## 🎯 Project Overview

**Vendor AI** is a comprehensive **AI-driven inventory and supply chain management system** designed to streamline operations between small-scale vendors (shopkeepers), administrators, and suppliers. The platform focuses on smart stock management, demand prediction, and real-time tracking for retail businesses, particularly targeting vegetable, fruit, and grocery vendors in India.

---

## 🏗️ Architecture

### **Monorepo Structure**
```
Vendor-AI-main/
├── apps/
│   ├── web/          # Next.js Admin & Vendor Web Portal
│   └── mobile/       # Expo React Native Mobile App
├── backend/          # FastAPI Python Backend (in development)
├── .agent/           # AI workflow documentation
└── requirements.txt  # Python dependencies
```

### **Technology Stack**

#### **Frontend (Web)**
- **Framework:** Next.js 16.1.1 with App Router & Turbopack
- **UI Framework:** React 19.2.3
- **Styling:** Tailwind CSS 4 with custom design tokens
- **Internationalization:** next-intl (supports English, Hindi, Tamil, Telugu, Kannada)
- **Maps:** Leaflet & React-Leaflet for vendor location visualization
- **Icons:** Lucide React
- **State Management:** React Context API with localStorage persistence

#### **Frontend (Mobile)**
- **Framework:** Expo 54.0.31
- **Navigation:** Expo Router 6.0.21 with file-based routing
- **UI:** React Native 0.81.5 with Reanimated & Gesture Handler
- **Cross-platform:** iOS, Android, and Web support

#### **Backend** (Partial Implementation)
- **Framework:** FastAPI (Python)
- **ORM:** SQLAlchemy
- **Database:** Designed for PostgreSQL/SQLite
- **ML Libraries:** scikit-learn, pandas, numpy (for AI/ML features)
- **Deployment:** Gunicorn, prepared for Heroku

---

## 🎨 Design System

### **Color Palette**
- **Deep Green:** `#2e7d32` - Primary brand color, actions, CTAs
- **Light Green:** `#a5d6a7` - Secondary highlights, accents
- **Charcoal:** `#263238` - Text, headings
- **Amber:** `#ffc107` - Warnings, attention states
- **White/Dark:** Full dark mode support with adaptive theming

### **Theming**
- Dynamic light/dark mode toggle
- localStorage-based theme persistence
- CSS custom properties for seamless transitions
- Glassmorphism effects on navigation

---

## 👥 User Roles & Portals

### **1. Admin Portal** (`/[locale]/(dashboard)`)
Comprehensive management interface for supervisors and officials.

**Key Features:**
- **Dashboard:** Overview of vendor statistics, pending approvals, risk metrics
- **Vendor Management:** Add, view, filter, and delete vendor profiles
- **Stock Request Management:** Review, approve, modify, and track stock requests
- **Inventory Tracking:** Real-time stock levels, low stock alerts, expiry warnings
- **Analytics:** Revenue trends, demand predictions, AI-driven recommendations
- **Settings:** System configuration and user preferences

### **2. Vendor Portal** (`/[locale]/(vendor)`)
Simplified interface for shopkeepers to manage daily operations.

**Key Features:**
- **Vendor Dashboard:** Quick stats, low stock alerts, recent requests
- **Inventory Management:** View current stock, request new stock
- **Sales Entry:** Daily sales reporting and tracking
- **Stock Request Modal:** Easy-to-use form for requesting inventory

### **3. Mobile App** (Expo)
Cross-platform mobile access for vendors on the go.

**Features:**
- Tab-based navigation
- Mobile-optimized UI components
- Offline-first architecture (planned)
- Push notifications support

---

## 🔄 Stock Management Workflow

### **Step 1: Vendor Actions**
1. **Daily Reporting:** Log sales data in the Vendor Desk
2. **Stock Request:** 
   - Open "Request Stock" modal
   - Fill: Product Name, Quantity, Unit, Current Stock, Delivery Time
   - Submit with "Requested" status
3. **Tracking:** Monitor request status in real-time

### **Step 2: Admin Actions**
1. **Review:** View all stock requests in Admin Portal
2. **Verification:** Check vendor details and AI demand suggestions
3. **Fulfillment:**
   - Modify quantity if needed
   - Assign supplier from vendor list
   - Schedule delivery date/time
4. **Status Updates:** Move through stages: Requested → Approved → In Transit → Delivered

### **Step 3: System Integration**
- **Notifications:** Real-time UI updates on status changes
- **Inventory Sync:** Auto-update vendor inventory on delivery
- **Analytics:** Historical data for demand prediction and performance reports

---

## 📊 Core Features

### **Inventory Management**
- Real-time stock tracking across all vendors
- Low stock alerts and expiry warnings
- Total stock value calculation
- Automatic inventory updates on delivery
- Multi-unit support (kg, liters, pieces)

### **Vendor Management**
- Comprehensive vendor profiles (name, owner, phone, category, location)
- Status tracking (Active, Warning, Inactive)
- Location-based mapping with Leaflet
- Performance and risk assessment
- Easy vendor addition/deletion

### **Stock Request System**
- Multi-field request forms with validation
- Status workflow (Requested → Approved → In Transit → Delivered)
- Quantity modification by admins
- Supplier assignment
- Delivery scheduling
- SLA tracking with urgency indicators

### **Analytics & AI Features**
- Revenue tracking and trend analysis
- Average order value calculations
- Demand prediction algorithms (ML-powered)
- Actionable recommendations based on:
  - Low stock patterns
  - Price fluctuations
  - Vendor performance
  - Fast-selling items
- Category mix analysis
- Wastage reduction metrics

### **Internationalization**
- Full i18n support via next-intl
- Languages: English, Hindi, Tamil, Telugu, Kannada
- Locale-based routing (`/en`, `/hi`, `/ta`, `/te`, `/kn`)
- RTL support ready
- Language switcher in UI

### **Notifications System**
- Low stock alerts
- Price hike warnings
- Delayed order notifications
- Fast-selling item alerts
- Pending approval reminders
- Vendor assignment notifications

---

## 🗄️ Data Models

### **User**
- Authentication and role-based access (admin, official, company)
- Email/username-based login
- Active status tracking

### **Vendor**
```typescript
{
  id: number
  name: string          // Shop name
  ownerName: string
  phone: string
  category: string      // Vegetable, Fruit, Grocery vendors
  location: string      // Address
  sales: string         // Current sales figures
  status: "Active" | "Inactive" | "Warning"
}
```

### **InventoryItem**
```typescript
{
  id: number
  vendorId: number
  name: string
  quantity: number
  unit: string          // kg, liters, pieces
  price: number
  expiryDate?: Date
  lastUpdated: Date
}
```

### **StockRequest**
```typescript
{
  id: number
  vendorId: number
  productName: string
  quantity: number
  unit: string
  currentStock: number
  preferredDelivery: string
  status: "Requested" | "Approved" | "In Transit" | "Delivered"
  requestedAt: Date
  deliveredAt?: Date
  handledBy?: string
  modifiedQuantity?: number
  assignedSupplier?: string
}
```

### **Sale**
- Vendor-linked sales records
- Timestamp tracking
- Items summary (JSON)
- Total amount

---

## 🎯 Key Differentiators

1. **AI-Driven Insights:** Machine learning models for demand forecasting and wastage reduction
2. **Multi-Language Support:** Catering to diverse Indian market with 5 languages
3. **Dual Portal System:** Separate optimized experiences for admins and vendors
4. **Real-Time Tracking:** Live status updates throughout the supply chain
5. **Mobile-First:** Cross-platform mobile app for vendor accessibility
6. **Geographic Visualization:** Map-based vendor location tracking
7. **SLA Management:** Urgency indicators and time-based escalations
8. **Dark Mode:** Full theming support for better UX

---

## 📱 Responsive Design

- **Desktop:** Full-featured dashboard with sidebar navigation
- **Tablet:** Adaptive layouts with collapsible sidebars
- **Mobile:** Touch-optimized interfaces with bottom navigation
- **PWA Ready:** Progressive Web App capabilities

---

## 🚀 Current Status

### **Completed Features**
✅ Web application with dual portals (Admin & Vendor)  
✅ Inventory management with CRUD operations  
✅ Stock request workflow with status tracking  
✅ Vendor management system  
✅ Analytics dashboard with AI recommendations  
✅ Multi-language internationalization  
✅ Dark mode theming  
✅ Mobile app scaffolding (Expo)  
✅ Context-based state management  
✅ localStorage persistence  
✅ Map integration for vendor locations  

### **In Development**
🔄 Backend API (FastAPI) - Basic structure in place  
🔄 Database integration (SQLAlchemy models defined)  
🔄 Machine learning demand prediction models  
🔄 Authentication system  
🔄 Mobile app feature implementation  

### **Planned Features**
📋 Real-time notifications (WebSocket/Push)  
📋 PDF report generation  
📋 Advanced analytics charts (Recharts/Chart.js integration)  
📋 Supplier management module  
📋 Multi-warehouse support  
📋 Automated reordering based on AI predictions  
📋 SMS/WhatsApp integration for vendor communication  
📋 Payment tracking and invoice management  

---

## 🔧 Setup & Deployment

### **Web App**
```bash
cd apps/web
npm install
npm run dev  # Runs on http://localhost:3000
```

### **Mobile App**
```bash
cd apps/mobile
npm install
npm start    # Opens Expo development menu
```

### **Backend** (Future)
```bash
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

### **Deployment Targets**
- **Web:** Vercel (Next.js optimized)
- **Mobile:** Expo EAS Build for iOS/Android
- **Backend:** Heroku/Railway (Procfile included)

---

## 📦 Dependencies Summary

### **Web (Key Packages)**
- next: 16.1.1
- react: 19.2.3
- next-intl: 4.8.3
- leaflet: 1.9.4
- lucide-react: 0.562.0
- tailwindcss: 4

### **Mobile (Key Packages)**
- expo: 54.0.31
- expo-router: 6.0.21
- react-native: 0.81.5
- react-native-reanimated: 4.1.1

### **Backend (Key Packages)**
- Flask: 3.1.2
- FastAPI (planned)
- pandas: 3.0.0
- scikit-learn: 1.8.0
- SQLAlchemy

---

## 🎓 Use Cases

1. **Small Retail Shops:** Daily inventory and sales management
2. **Supply Chain Coordinators:** Centralized vendor oversight
3. **Government Programs:** Public distribution system management
4. **Franchise Networks:** Multi-location inventory coordination
5. **Agricultural Cooperatives:** Farmer-to-retailer supply chains

---

## 🌟 Future Vision

- **Blockchain Integration:** Transparent supply chain tracking
- **IoT Sensors:** Automated stock level detection
- **Voice Interface:** Hands-free operation for vendors
- **Predictive Maintenance:** Equipment and cold storage monitoring
- **Social Commerce:** Direct customer ordering through vendor profiles
- **Financial Services:** Integrated micro-lending and payment solutions

---

## 📄 License & Contact

**Project Type:** Prototype/MVP  
**Target Market:** India (expanding to Southeast Asia)  
**Deployment:** Currently running on http://localhost:3000

---

## 🚦 Quick Start Guide

1. **Clone the repository**
2. **Install dependencies:** `cd apps/web && npm install`
3. **Run development server:** `npm run dev`
4. **Access portals:**
   - Admin: `http://localhost:3000/en` → Dashboard
   - Vendor: `http://localhost:3000/en/vendor` → Vendor Desk
5. **Test features:**
   - Add a vendor
   - Create a stock request
   - Review analytics
   - Switch languages and themes

---

*This is a comprehensive AI-powered inventory management platform designed to modernize small-scale retail operations in India through smart automation, predictive analytics, and user-friendly interfaces.*
