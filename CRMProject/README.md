# NexusCRM — Customer & Lead Management System

A production-ready, full-stack CRM application built with **Django REST Framework** and **React.js**.  
Manage customers, track leads through a visual pipeline, log interactions, and analyse your sales funnel — all in one place.

---

## ✨ Feature Highlights

| Feature | Details |
|---|---|
| 🔐 JWT Authentication | Secure login/register with access + refresh tokens, auto-refresh |
| 👥 Role-Based Access Control | Admin vs Sales Representative with per-endpoint enforcement |
| 📋 Customer Management | Full CRUD, search, pagination, sorting |
| 🎯 Lead Management | Full CRUD, multi-field filtering, status workflow |
| ⧉ Kanban Pipeline | Drag-and-drop lead board across 7 pipeline stages |
| 💬 Interaction Timeline | Log calls, emails, meetings, notes with rich history |
| 📊 Analytics Dashboard | Charts: monthly trends, status distribution, conversion rate, pipeline value |
| 🌙 Dark Mode | Full light/dark theme toggle persisted per user |
| 🔔 Notifications | In-app real-time notifications for lead events |
| 📤 CSV Export | Admin one-click export for customers and leads |
| 📝 Activity Logs | Complete audit trail of every user action |
| 📧 Email Alerts | SMTP notifications on lead assignments and status changes |

---

## 🛠 Technology Stack

### Backend
- **Python 3.11** + **Django 4.2**
- **Django REST Framework 3.14** — REST API
- **SimpleJWT** — JWT authentication with token blacklist
- **django-filter** — Advanced queryset filtering
- **drf-yasg** — Swagger / ReDoc API documentation
- **SQLite** (dev) / **PostgreSQL** (production)
- **WhiteNoise** — Static file serving
- **Gunicorn** — WSGI server

### Frontend
- **React 18** with functional components and hooks
- **React Router 6** — Client-side routing
- **Axios** — HTTP client with JWT interceptors
- **Recharts** — Analytics charts
- **Context API** — Auth and theme state management
- **CSS Variables** — Theming system (no external UI library required)

---

## 📁 Project Structure

```
CRMProject/
├── backend/
│   ├── crm_backend/          # Django project settings & URLs
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   ├── crm_api/              # Main application
│   │   ├── models.py         # All database models
│   │   ├── serializers.py    # DRF serializers
│   │   ├── views.py          # All API views
│   │   ├── urls.py           # URL routing
│   │   ├── permissions.py    # RBAC permission classes
│   │   ├── utils.py          # Helpers: logging, email, export
│   │   ├── admin.py          # Django admin configuration
│   │   ├── tests.py          # Complete test suite
│   │   └── management/
│   │       └── commands/
│   │           └── seed_data.py   # Sample data seeder
│   ├── manage.py
│   ├── requirements.txt
│   ├── Procfile
│   └── runtime.txt
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── App.js            # Root component + routing
│   │   ├── index.js
│   │   ├── styles/
│   │   │   └── globals.css   # Global CSS with design tokens
│   │   ├── context/
│   │   │   ├── AuthContext.js
│   │   │   └── ThemeContext.js
│   │   ├── services/
│   │   │   └── api.js        # Axios client + all API functions
│   │   ├── components/
│   │   │   ├── layout/       # AppLayout, Sidebar, Header
│   │   │   └── common/       # Modal, Badge, Pagination, etc.
│   │   └── pages/
│   │       ├── auth/         # Login, Register, Profile
│   │       ├── dashboard/    # Analytics dashboard
│   │       ├── customers/    # Customer list + detail
│   │       ├── leads/        # Lead list, detail, Kanban pipeline
│   │       ├── interactions/ # Interaction history
│   │       └── admin/        # Users management, Activity logs
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## 🚀 Local Development Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/yourname/nexuscrm.git
cd nexuscrm
```

### 2. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate      # Linux/macOS
# OR
venv\Scripts\activate         # Windows

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env
# Edit .env as needed (SQLite is used by default — no DB setup required)

# Run migrations
python manage.py makemigrations
python manage.py migrate

# Create logs directory
mkdir -p logs

# Seed sample data (creates 20 customers, 40 leads, interactions)
python manage.py seed_data

# Start backend server
python manage.py runserver
```

Backend runs at: **http://localhost:8000**  
API Docs (Swagger): **http://localhost:8000/api/docs/**

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Start frontend dev server
npm start
```

Frontend runs at: **http://localhost:3000**

### 4. Demo Login Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@crm.com | Admin@123 |
| Sales Rep 1 | rep1@crm.com | Rep@123 |
| Sales Rep 2 | rep2@crm.com | Rep@123 |

---

## 🔑 API Reference

### Base URL
```
http://localhost:8000/api
```

All protected endpoints require:
```
Authorization: Bearer <access_token>
```

---

### Authentication

#### POST /auth/register
Register a new user.

**Request:**
```json
{
  "username": "johndoe",
  "email": "john@company.com",
  "password": "SecurePass1",
  "confirm_password": "SecurePass1",
  "role": "sales_rep"
}
```
**Response:** `201 Created`
```json
{
  "message": "Registration successful.",
  "user": { "id": "uuid", "username": "johndoe", "email": "john@company.com", "role": "sales_rep" },
  "tokens": { "access": "eyJ...", "refresh": "eyJ..." }
}
```

#### POST /auth/login
```json
{ "email": "john@company.com", "password": "SecurePass1" }
```

#### POST /auth/logout
```json
{ "refresh": "<refresh_token>" }
```

#### GET /auth/profile
#### PUT /auth/profile
#### POST /auth/change-password

---

### Customers

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /customers | List customers (search, paginate, sort) | Any |
| POST | /customers | Create customer | Any |
| GET | /customers/{id} | Customer detail | Any |
| PUT | /customers/{id} | Update customer | Any |
| DELETE | /customers/{id} | Delete customer | Admin only |
| GET | /customers/{id}/leads | Customer's leads | Any |

**Query parameters for GET /customers:**
- `search` — Full-text search (name, email, company, phone)
- `page` — Page number
- `ordering` — Field to sort by (prefix `-` for descending)

---

### Leads

| Method | Endpoint | Auth |
|--------|----------|------|
| GET | /leads | Any (Sales rep sees own leads only) |
| POST | /leads | Any |
| GET | /leads/{id} | Owner or Admin |
| PUT | /leads/{id} | Owner or Admin |
| DELETE | /leads/{id} | Any |
| GET | /leads/{id}/interactions | Any |

**Filter parameters:**
- `status` — new, contacted, qualified, proposal_sent, negotiation, won, lost
- `priority` — low, medium, high, urgent
- `assigned_to` — User UUID
- `search` — Title, notes, customer name

---

### Interactions

| Method | Endpoint |
|--------|----------|
| GET | /interactions |
| POST | /interactions |
| GET | /interactions/{id} |
| PUT | /interactions/{id} |
| DELETE | /interactions/{id} |

**Interaction types:** `call`, `email`, `meeting`, `note`, `demo`, `follow_up`

---

### Pipeline (Kanban)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /pipeline | All leads grouped by status |
| PATCH | /pipeline | Move lead to new status |

**PATCH body:**
```json
{ "lead_id": "uuid", "status": "qualified" }
```

---

### Dashboard

#### GET /dashboard/stats

Returns analytics for the authenticated user's scope:
```json
{
  "total_customers": 47,
  "total_leads": 124,
  "total_interactions": 312,
  "leads_by_status": { "new": 23, "contacted": 18, "won": 31, ... },
  "conversion_rate": 25.0,
  "total_pipeline_value": "480000.00",
  "monthly_leads": [ { "month": "Jul 2024", "count": 12 }, ... ],
  "recent_leads": [...],
  "recent_interactions": [...]
}
```

---

### Export (Admin Only)

- `GET /export/customers` — Download customers as CSV
- `GET /export/leads` — Download leads as CSV

---

## 🧪 Running Tests

```bash
cd backend
source venv/bin/activate

# Run all tests
python manage.py test crm_api

# Run with coverage
coverage run manage.py test crm_api
coverage report -m
coverage html  # generates htmlcov/index.html
```

**Test coverage includes:**
- Auth: registration (5 cases), login (5 cases), profile (3 cases)
- Customers: CRUD, search, duplicate check, 404 (10 cases)
- Leads: CRUD, filtering, RBAC isolation (8 cases)
- Interactions: CRUD, filtering, validation (7 cases)
- Dashboard: admin + rep views, auth requirement (3 cases)
- Pipeline: GET, PATCH, validation (3 cases)
- RBAC: endpoint access by role (6 cases)
- Notifications: list, unread count, mark read (3 cases)

---

## 🌐 Deployment Guide

### Railway (Recommended)

1. **Push code to GitHub**

2. **Create a Railway project** at railway.app → New Project → Deploy from GitHub

3. **Add a PostgreSQL service** in Railway dashboard

4. **Set environment variables** in Railway:
   ```
   SECRET_KEY=<generate with: python -c "import secrets; print(secrets.token_urlsafe(50))">
   DEBUG=False
   DATABASE_URL=<auto-filled by Railway PostgreSQL>
   ALLOWED_HOSTS=<your-app>.railway.app
   CORS_ALLOWED_ORIGINS=https://<your-frontend>.railway.app
   ```

5. **Set build command:** `pip install -r requirements.txt`

6. **Set start command:** `gunicorn crm_backend.wsgi:application --bind 0.0.0.0:$PORT`

7. **After first deploy, run migrations:**
   ```bash
   railway run python manage.py migrate
   railway run python manage.py seed_data
   ```

---

### Render

1. Create a **Web Service** on render.com

2. **Build command:**
   ```bash
   pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate
   ```

3. **Start command:**
   ```bash
   gunicorn crm_backend.wsgi:application --bind 0.0.0.0:$PORT
   ```

4. Add environment variables (same as Railway above)

5. Create a **PostgreSQL database** on Render and copy the `DATABASE_URL`

---

### PythonAnywhere

1. **Create a new web app** → Manual configuration → Python 3.11

2. **Upload project files** or clone from Git

3. **Set up virtualenv:**
   ```bash
   mkvirtualenv crm --python=python3.11
   pip install -r requirements.txt
   ```

4. **Configure WSGI file** (`/var/www/<username>_pythonanywhere_com_wsgi.py`):
   ```python
   import os
   import sys
   path = '/home/<username>/CRMProject/backend'
   if path not in sys.path:
       sys.path.insert(0, path)
   os.environ['DJANGO_SETTINGS_MODULE'] = 'crm_backend.settings'
   from django.core.wsgi import get_wsgi_application
   application = get_wsgi_application()
   ```

5. **Run migrations and collectstatic** via the Bash console

---

### Frontend Deployment (Netlify / Vercel)

1. **Build the React app:**
   ```bash
   cd frontend
   REACT_APP_API_URL=https://<your-backend-url>/api npm run build
   ```

2. Deploy the `build/` folder to Netlify or Vercel

3. For Netlify, create `frontend/public/_redirects`:
   ```
   /*  /index.html  200
   ```

---

## 🔒 Security Features

- **JWT** with refresh token rotation and blacklisting on logout
- **Password hashing** via Django's PBKDF2 with SHA-256
- **RBAC** enforced at the view and object level
- **Input validation** on all endpoints via DRF serializers
- **CORS** configured for trusted origins only
- **SQL injection prevention** via Django ORM
- **XSS protection** headers in production
- **CSRF protection** for session-based requests
- **Rate limiting** on anonymous (100/day) and authenticated (1000/day) users
- **HSTS** and **SSL redirect** in production mode
- **Activity audit log** for all write operations

---

## 📊 Database Schema

```
Users ─────────────────────────────────────────────────
  id (UUID PK), username, email, password_hash
  role (admin | sales_rep), first_name, last_name
  phone, avatar, is_active, last_login_ip
  created_at, updated_at

Customers ─────────────────────────────────────────────
  id (UUID PK), name, email, phone, company
  website, address, city, country, notes, tags
  created_by → Users FK
  created_at, updated_at

Leads ─────────────────────────────────────────────────
  id (UUID PK), title, status, priority
  estimated_value, expected_close_date, source, notes, tags
  customer → Customers FK
  assigned_to → Users FK
  created_by → Users FK
  created_at, updated_at

Interactions ──────────────────────────────────────────
  id (UUID PK), interaction_type, description
  outcome, duration_minutes, interaction_date
  lead → Leads FK
  created_by → Users FK
  created_at

ActivityLogs ──────────────────────────────────────────
  id (UUID PK), action, model_name, object_id
  object_repr, changes (JSON), ip_address, user_agent
  user → Users FK
  created_at

Notifications ─────────────────────────────────────────
  id (UUID PK), notification_type, title, message
  is_read, related_lead → Leads FK
  user → Users FK
  created_at
```

---

## 📸 Screenshots

> After seeding data and running both servers, visit **http://localhost:3000**

| Page | Path |
|------|------|
| Login | `/login` |
| Dashboard | `/dashboard` |
| Customers | `/customers` |
| Leads | `/leads` |
| Kanban Pipeline | `/pipeline` |
| Interactions | `/interactions` |
| Users (Admin) | `/users` |
| Activity Logs (Admin) | `/activity` |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit: `git commit -m 'feat: add my feature'`
4. Push: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.
