# Smart Utility Billing & Meter Management System

A full-stack, server-rendered web application built for automated electricity and water utility metering, progressive slab-wise billing calculations, and consumer invoice management.

---

## 📌 Project Overview

- **Domain**: Utilities / Public Services / Municipal Energy & Water Management
- **Purpose**: Automates monthly meter reading collection, enforces business validation rules (rejecting readings lower than previous audits), performs progressive slab-wise tariff calculations, manages payment status, and tracks consumption history.
- **Architecture**: MVC (Model-View-Controller) with Server-Side Rendering (SSR) via Express & EJS.
- **Deployment Targets**: **Render** (primary recommendation for Express + EJS stateful apps) & **MongoDB Atlas**.

---

## 🚀 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | EJS (Server-Side Rendering), HTML5, Vanilla CSS3, Vanilla JavaScript, Chart.js (CDN) |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB Atlas / Local MongoDB, Mongoose ODM |
| **Authentication** | Session-based authentication (`express-session`, `connect-mongo`), `bcryptjs` password hashing |
| **Security** | Role-Based Access Control (RBAC), HTTP-only secure cookies, environment secrets |

---

## 👥 Role-Based Access Control (RBAC)

The system enforces three distinct permission levels:

### 1. 👑 ADMIN
- Comprehensive dashboard with aggregate statistics (total consumers, active meters, bills issued, revenue collected, outstanding dues).
- Visual charts: monthly billed units vs. revenue (via Chart.js).
- Top 5 consumers ranked by power/water consumption.
- Consumer Management: Add, edit, delete, and link meters/tariffs.
- Meter Management: Register physical meters, assign to consumers, track status (`Active`, `Inactive`, `Faulty`).
- Tariff Slab Management: Configure flexible slab tiers and fixed charges stored directly in MongoDB.
- All Bills Review: Filter bills by `ALL`, `PAID`, or `UNPAID`.
- User Directory: Inspect registered accounts across all roles.

### 2. 📟 METER READER
- Field Operations dashboard: Total assigned meters, readings entered, pending meters for current month.
- Meter Reading Entry Form:
  - Dynamic AJAX lookup: Selecting a meter immediately displays its previous recorded reading and consumer details.
  - **Critical Business Rule**: Rejects any reading lower than the previous reading with an immediate alert banner:
    > *"Invalid reading: New meter reading cannot be lower than the previous reading."*
  - Instant unit consumption preview.
  - Automatic invoice generation upon submission.

### 3. 👤 CONSUMER
- Consumer Self-Service Portal:
  - Profile card displaying Consumer ID, assigned meter, connection type, and service address.
  - Current Bill summary with instant payment simulation.
  - Detailed Bill Invoice View: Printable breakdown showing exact slab-wise tier charges, fixed charges, late surcharges, and payment badges.
  - Bill History: Historical invoices with payment dates and statuses.
  - Consumption History: Monthly consumption trend log with interactive Chart.js line graph.
  - "Mark as Paid": Simulated one-click payment settlement.

---

## 🗂️ Project Directory Structure

```
project_2/
├── app.js                          # Application entry point & middleware configuration
├── package.json                    # Project dependencies and npm scripts
├── .env                            # Local environment configuration (git-ignored)
├── .env.example                    # Template for production deployment
├── .gitignore                      # Git exclusion rules
├── README.md                       # Complete documentation & viva presentation guide
│
├── config/
│   └── db.js                       # Mongoose connection with host logging & error handling
│
├── models/
│   ├── User.js                     # User accounts, bcrypt hashing, matchPassword method
│   ├── Consumer.js                 # Consumer profile, consumerId (CONxxx), address, meter link
│   ├── Meter.js                    # Meter hardware, meterNumber (MTRxxx), lastReading, status
│   ├── Reading.js                  # Reading audit, previousReading, currentReading, unitsConsumed
│   ├── Tariff.js                   # Flexible slab tiers [{from, to, rate}], fixedCharge in MongoDB
│   └── Bill.js                     # Utility invoice, breakdown array, status (UNPAID/PAID), surcharge
│
├── controllers/
│   ├── authController.js           # Login, consumer registration, session destruction
│   ├── adminController.js          # Admin metrics, analytics aggregation, tariff CRUD
│   ├── consumerController.js       # Admin consumer management & consumer self-service portal
│   ├── meterController.js          # Meter CRUD & RESTful meter lookup API
│   ├── readingController.js        # Reading validation (>= prev) & automatic bill trigger
│   └── billController.js           # Invoice rendering, 5% late fee surcharge, simulated payment
│
├── routes/
│   ├── authRoutes.js               # /auth/login, /auth/register, /auth/logout
│   ├── adminRoutes.js              # /admin/* (protected by requireRole('admin'))
│   ├── consumerRoutes.js           # /consumer/* (protected by requireRole('consumer', 'admin'))
│   ├── meterRoutes.js              # /meters/api/:id/details (AJAX meter lookup)
│   ├── readingRoutes.js            # /meter-reader/* (protected by requireRole('meter_reader', 'admin'))
│   └── billRoutes.js               # /bills/:id, /bills/:id/pay
│
├── middleware/
│   ├── authMiddleware.js           # requireAuth, redirectIfAuth
│   └── roleMiddleware.js           # requireRole('admin' | 'meter_reader' | 'consumer')
│
├── services/
│   ├── billService.js              # Automated bill creation & numbering pipeline
│   └── tariffService.js            # Resolves consumer tariff or defaults
│
├── utils/
│   ├── billCalculator.js           # Pure function for progressive slab billing
│   └── surchargeCalculator.js      # Non-duplicating 5% overdue surcharge logic
│
├── views/
│   ├── partials/
│   │   ├── header.ejs              # Meta, Google Fonts, Chart.js CDN, CSS links
│   │   ├── navbar.ejs              # Top bar with current user info & logout
│   │   ├── sidebar.ejs             # Dynamic role-based navigation sidebar
│   │   └── footer.ejs              # Scripts & alert dismissers
│   ├── auth/
│   │   ├── login.ejs               # Login form with 1-click demo account autofill
│   │   └── register.ejs            # Consumer onboarding registration form
│   ├── admin/
│   │   ├── dashboard.ejs           # Admin metrics, analytics chart, top consumers
│   │   ├── consumers.ejs           # Consumer CRUD management table & modal
│   │   ├── meters.ejs              # Meter CRUD inventory table & modal
│   │   ├── tariffs.ejs             # Tariff slabs management & dynamic tier creator
│   │   ├── bills.ejs               # All utility bills with status filters
│   │   └── users.ejs               # System user directory
│   ├── meterReader/
│   │   ├── dashboard.ejs           # Reader stats, pending audits, recent submissions
│   │   └── reading-form.ejs        # Dynamic meter selector, validation banner, live units
│   ├── consumer/
│   │   ├── dashboard.ejs           # Consumer dashboard, latest bill summary, quick pay
│   │   ├── current-bill.ejs        # Official utility invoice, slab breakdown table, print CSS
│   │   ├── bill-history.ejs        # Past invoices table
│   │   └── consumption-history.ejs # Monthly consumption log & Chart.js trend line
│   └── error.ejs                   # Universal 403, 404, and 500 error template
│
├── public/
│   ├── css/
│   │   └── style.css               # Modern utility theme, badges, cards, print styling
│   └── js/
│       └── main.js                 # Live meter lookup AJAX, validation, modal handlers
│
└── seed/
    └── seed.js                     # Pre-populates demo accounts, tariffs, meters, and bills
```

---

## ⚡ Step-by-Step Installation & Local Setup

### 1. Prerequisites
- **Node.js**: v18+ or v20+ installed
- **MongoDB**: Either a local MongoDB instance running on port 27017 or a free MongoDB Atlas cloud cluster.

### 2. Clone / Open Project
```bash
cd project_2
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Configure Environment Variables
Create a `.env` file in the root directory (or copy from `.env.example`):
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/utilityBilling
SESSION_SECRET=smart_utility_billing_secret_super_secure
```

### 5. Seed the Database
Populate demo users, tariffs, meters, and sample bills:
```bash
npm run seed
```

### 6. Start the Server
- **Development Mode** (auto-restart on file change):
  ```bash
  npm run dev
  ```
- **Production Mode**:
  ```bash
  npm start
  ```

Open your browser at: **`http://localhost:5000`**

---

## 🔑 Demo Login Credentials

You can log in manually or simply click the **Demo Accounts Autofill buttons** on the login page:

| Role | Email | Password | Pre-seeded Data / Purpose |
|---|---|---|---|
| **👑 Admin** | `admin@example.com` | `Admin@123` | Full control over consumers, meters, tariffs, and revenue analytics |
| **📟 Meter Reader** | `reader@example.com` | `Reader@123` | Record meter measurements with lower-reading rejection rule |
| **👤 Consumer** | `consumer@example.com` | `Consumer@123` | Linked to Consumer `CON001`, has 250-unit bill for ₹1,250 |

---

## 💡 Bill Calculation Example & Verification

### The College Assignment Scenario:
- **Previous Reading**: `1200`
- **Current Reading**: `1450`
- **Units Consumed**: $1450 - 1200 = 250$ units
- **Configured Tariff Slabs** (stored in MongoDB):
  - Tier 1: $0 - 100$ units @ **₹3 / unit**
  - Tier 2: $101 - 200$ units @ **₹5 / unit**
  - Tier 3: $201 - 500$ units @ **₹7 / unit**
  - Tier 4: $501+$ units @ **₹10 / unit**
  - **Fixed Charge**: **₹100**

### Progressive Slab Calculation Walkthrough:
1. **First 100 units** $\to 100 \times ₹3 = ₹300$
2. **Next 100 units** (101 to 200) $\to 100 \times ₹5 = ₹500$
3. **Remaining 50 units** (201 to 250) $\to 50 \times ₹7 = ₹350$
4. **Energy Charges Subtotal** $= 300 + 500 + 350 = ₹1,150$
5. **Add Fixed Charges** $= ₹1,150 + ₹100 = ₹1,250$
6. **Total Payable Bill** $= \mathbf{₹1,250}$

This exact calculation is verified and visible on Consumer `CON001`'s bill (`BIL1002`).

---

## ⏰ Stretch Goal: Late Payment Surcharge

- **Rule**: If `currentDate > dueDate` and `status === 'UNPAID'`, a 5% surcharge is assessed.
- **Protection**: Handled via `utils/surchargeCalculator.js` which checks `bill.surcharge > 0` before applying, preventing duplicate compounding upon multiple page refreshes.
- **Demo**: Bill `BIL1003` for Consumer `CON002` (Priya Sharma) is pre-seeded with an overdue due date to showcase this functionality live.

---

## 🌐 MongoDB Atlas Setup Instructions

1. Log into [MongoDB Cloud Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a free **M0 Sandbox** cluster.
3. Under **Database Access**, create a user with read/write privileges (e.g., `utilityAdmin`).
4. Under **Network Access**, add IP address `0.0.0.0/0` (Allow access from anywhere, required for Render/cloud hosting).
5. Click **Connect** $\to$ **Connect your application** $\to$ copy the URI:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/utilityBilling?retryWrites=true&w=majority
   ```
6. Paste this URI into your `.env` file as `MONGODB_URI`.
7. Re-run `npm run seed` to populate your Atlas database.

---

## ☁️ Deployment Guide

### A. Deploy to Render (Primary Recommended Platform)
Because this application uses Express with server-rendered EJS and stateful sessions, Render Web Services is the ideal host.

1. Push your project to GitHub:
   ```bash
   git add .
   git commit -m "Initial commit of Smart Utility Billing System"
   git remote add origin https://github.com/<your-username>/smart-utility-billing.git
   git push -u origin main
   ```
2. Log into [Render Dashboard](https://dashboard.render.com).
3. Click **New +** $\to$ **Web Service**.
4. Connect your GitHub repository.
5. Configure the service settings:
   - **Name**: `smart-utility-billing`
   - **Environment**: `Node`
   - **Branch**: `main`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
6. Under **Environment Variables**, add:
   - `NODE_ENV`: `production`
   - `PORT`: `10000` (or leave default, Render sets `PORT` automatically)
   - `MONGODB_URI`: Your MongoDB Atlas connection string
   - `SESSION_SECRET`: A secure random passphrase
7. Click **Create Web Service**. Render will provision your app, and your live URL will be ready in 1–2 minutes!

### B. Vercel Deployment Notes
Vercel is primarily optimized for serverless functions (e.g. Next.js). To run Express on Vercel:
- Sessions are stored in MongoDB (`connect-mongo`), which allows seamless operation across stateless serverless lambdas.
- Add a `vercel.json` file pointing routes to `app.js` if deploying as a serverless function:
  ```json
  {
    "version": 2,
    "builds": [{ "src": "app.js", "use": "@vercel/node" }],
    "routes": [{ "src": "/(.*)", "dest": "app.js" }]
  }
  ```
- **Recommendation for College Presentation**: Stick with Render, as it runs a persistent Express server natively with zero configuration discrepancies.

---

## 🎓 8–10 Key Code Sections for Viva / Project Presentation

When presenting this project to examiners, focus on these well-structured code sections:

1. **MongoDB Connection (`config/db.js`)**:
   Shows how Mongoose connects asynchronously using environment variables (`process.env.MONGODB_URI`), allowing seamless toggling between local dev and MongoDB Atlas.

2. **User Password Security (`models/User.js`)**:
   Demonstrates Mongoose pre-save middleware using `bcrypt.genSalt(10)` and `bcrypt.hash()` to guarantee passwords are never stored in plain text, alongside the `matchPassword` comparison method.

3. **Role-Based Authorization Middleware (`middleware/roleMiddleware.js`)**:
   The `requireRole(...allowedRoles)` higher-order function checks the active session's role, returning a clean 403 Forbidden page or redirecting unauthorized users.

4. **Slab-Wise Progressive Calculation (`utils/billCalculator.js`)**:
   Iterates through MongoDB-stored slab tiers (`0-100`, `101-200`, `201-500`, `501+`), allocating consumption units progressively to calculate exact energy charges without hardcoding rates.

5. **Meter Reading Validation Rule (`controllers/readingController.js`)**:
   Enforces the non-negotiable business constraint: `if (newReading < previousReading) reject reading`. Prevents corrupted meter logs and displays human-readable error alerts.

6. **Automatic Bill Generation Pipeline (`services/billService.js`)**:
   Triggered immediately upon valid meter reading submission. Fetches the consumer's tariff, runs the slab calculation, assigns due dates (+15 days), and creates an `UNPAID` invoice record in MongoDB.

7. **Simulated Payment Settlement (`controllers/billController.js`)**:
   Handles the `POST /bills/:id/pay` route. Updates the bill status from `UNPAID` to `PAID`, stamps the current timestamp in `paymentDate`, and shows green visual status badges.

8. **Overdue Surcharge Protection (`utils/surchargeCalculator.js`)**:
   Applies a 5% fee when `currentDate > dueDate` on unpaid bills, while checking `bill.surcharge > 0` to prevent duplicate charges on repeated page loads.

9. **Dynamic AJAX Meter Inspection (`public/js/main.js` & `controllers/meterController.js`)**:
   Provides immediate frontend interactivity when selecting a meter by querying `/meters/api/:id/details`, displaying the previous reading and consumer details dynamically.

10. **Session Store & Persistence (`app.js`)**:
    Uses `connect-mongo` with `express-session` so sessions survive server restarts and work properly in production cloud deployments.

---

## 📄 License
Created for academic evaluation and college project submission.
