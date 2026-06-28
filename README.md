<<<<<<< HEAD
# Bookstore Management System API

A complete, production-ready REST API for a bookstore, built with **Django REST Framework** and **PostgreSQL**. It supports JWT authentication, role-based access control (Admin / Customer), full book and order management with automatic inventory tracking, search, filtering, pagination, Swagger/Redoc documentation, and bonus features like reviews, ratings, and wishlists.

## Tech Stack

| Concern              | Technology                          |
|----------------------|--------------------------------------|
| Backend              | Python 3.13+, Django 5, DRF          |
| Database             | PostgreSQL                           |
| Auth                 | JWT (SimpleJWT) + refresh + blacklist |
| Docs                 | drf-spectacular (Swagger & Redoc)    |
| Filtering            | django-filter                        |
| Config               | python-decouple (.env)               |
| Testing              | Django `TestCase` / DRF `APIClient` / pytest |

## Folder Structure

```
bookstore_project/
├── manage.py
├── requirements.txt
├── pytest.ini
├── .env.example
├── .gitignore
├── README.md
├── bookstore/              # Project settings, root urls, wsgi/asgi
│   ├── settings.py
│   ├── urls.py
│   ├── wsgi.py
│   └── asgi.py
├── accounts/               # Auth: register, login, JWT, profile, password change
│   ├── models.py           # Custom User model (email login, role field)
│   ├── serializers.py
│   ├── views.py
│   ├── urls.py
│   ├── admin.py
│   └── tests.py
├── books/                  # Books, Reviews, Wishlist (bonus)
│   ├── models.py
│   ├── serializers.py
│   ├── views.py
│   ├── filters.py
│   ├── urls.py
│   ├── admin.py
│   └── tests.py
├── orders/                 # Orders, OrderItems, inventory management
│   ├── models.py
│   ├── serializers.py
│   ├── views.py
│   ├── urls.py
│   ├── admin.py
│   └── tests.py
├── core/                   # Shared, reusable building blocks
│   ├── pagination.py       # StandardResultsPagination
│   ├── exceptions.py       # Global exception handler (consistent JSON errors)
│   ├── permissions.py      # IsAdminRole, IsCustomerRole, IsAdminOrReadOnly, IsOwnerOrAdmin
│   └── middleware.py       # Request logging middleware
├── tests/                  # Top-level cross-app integration tests
│   └── test_integration_flow.py
├── postman/
│   └── Bookstore_API.postman_collection.json
├── media/                  # User-uploaded files (book covers, etc.)
└── static/                 # Static files
```

## 1. Installation

```bash
git clone <repo-url> bookstore_project
cd bookstore_project
```

## 2. Virtual Environment

```bash
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
```

## 3. Install Requirements

```bash
pip install -r requirements.txt
```

## 4. Database Setup (PostgreSQL)

Create a database and user:

```sql
CREATE DATABASE bookstore_db;
CREATE USER postgres WITH PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE bookstore_db TO postgres;
```

Copy the environment template and fill in your own values:

```bash
cp .env.example .env
```

`.env` keys:

```
SECRET_KEY=...
DEBUG=True
ALLOWED_HOSTS=127.0.0.1,localhost
DB_NAME=bookstore_db
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432
ACCESS_TOKEN_LIFETIME_MINUTES=60
REFRESH_TOKEN_LIFETIME_DAYS=7
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

## 5. Migrations

```bash
python manage.py makemigrations
python manage.py migrate
```

## 6. Create Superuser

```bash
python manage.py createsuperuser
```
(You will be asked for email, full name, and password — the custom User model has no username field.)

## 7. Run Server

```bash
python manage.py runserver
```

API base URL: `http://127.0.0.1:8000/api/v1/`
Admin panel: `http://127.0.0.1:8000/admin/`

## 8. Swagger / Redoc

| Doc            | URL                          |
|----------------|-------------------------------|
| OpenAPI schema | `/api/schema/`                |
| Swagger UI     | `/api/docs/`                  |
| Redoc          | `/api/redoc/`                 |

## JWT Usage

1. **Register**: `POST /api/v1/auth/register/`
2. **Login**: `POST /api/v1/auth/login/` → returns `access` + `refresh` tokens
3. Send `Authorization: Bearer <access_token>` on every protected request
4. **Refresh**: `POST /api/v1/auth/refresh/` with `{"refresh": "<token>"}`
5. **Logout**: `POST /api/v1/auth/logout/` with `{"refresh": "<token>"}` — blacklists the token

## API Examples

### Register
```bash
curl -X POST http://127.0.0.1:8000/api/v1/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Jane Doe","email":"jane@example.com","password":"StrongPass123","password2":"StrongPass123"}'
```

### Login
```bash
curl -X POST http://127.0.0.1:8000/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"jane@example.com","password":"StrongPass123"}'
```

### List / search books
```bash
curl "http://127.0.0.1:8000/api/v1/books/?search=python&ordering=price" \
  -H "Authorization: Bearer <access_token>"
```

### Create a book (Admin only)
```bash
curl -X POST http://127.0.0.1:8000/api/v1/books/ \
  -H "Authorization: Bearer <admin_access_token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Fluent Python","author":"Luciano Ramalho","genre":"Programming","isbn":"9781492056355","price":"55.00","stock_quantity":5}'
```

### Place an order (Customer)
```bash
curl -X POST http://127.0.0.1:8000/api/v1/orders/ \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"shipping_address":"221B Baker Street","items":[{"book":1,"quantity":2}]}'
```

### Update order status (Admin only)
```bash
curl -X PATCH http://127.0.0.1:8000/api/v1/orders/1/ \
  -H "Authorization: Bearer <admin_access_token>" \
  -H "Content-Type: application/json" \
  -d '{"status":"SHIPPED"}'
```

## Key Endpoints

| Method | Endpoint                              | Description                          | Access        |
|--------|----------------------------------------|---------------------------------------|----------------|
| POST   | `/api/v1/auth/register/`               | Register                              | Public         |
| POST   | `/api/v1/auth/login/`                  | Login (JWT)                           | Public         |
| POST   | `/api/v1/auth/refresh/`                | Refresh access token                  | Public         |
| POST   | `/api/v1/auth/logout/`                 | Logout (blacklist token)              | Authenticated  |
| GET/PUT| `/api/v1/auth/profile/`                | View / update profile                 | Authenticated  |
| PUT    | `/api/v1/auth/change-password/`        | Change password                       | Authenticated  |
| GET    | `/api/v1/books/`                       | List / search / filter books          | Authenticated  |
| POST   | `/api/v1/books/`                       | Create book                           | Admin          |
| PUT/PATCH/DELETE | `/api/v1/books/{id}/`        | Update / delete book                  | Admin          |
| GET    | `/api/v1/books/recently-added/`        | Books added in last 30 days           | Authenticated  |
| GET    | `/api/v1/books/{id}/reviews/`          | Reviews for a book                    | Authenticated  |
| GET/POST | `/api/v1/books/reviews/`             | List / create reviews                 | Authenticated  |
| GET/POST | `/api/v1/books/wishlist/`            | View / add to wishlist                | Authenticated  |
| GET    | `/api/v1/orders/`                      | List orders (own / all for admin)     | Authenticated  |
| POST   | `/api/v1/orders/`                      | Place an order                        | Customer       |
| GET    | `/api/v1/orders/history/`              | Own order history                     | Customer       |
| PATCH  | `/api/v1/orders/{id}/`                 | Update order/payment status           | Admin          |
| DELETE | `/api/v1/orders/{id}/`                 | Cancel (customer) / delete (admin)    | Authenticated  |

## Running Tests

```bash
# Django test runner
python manage.py test

# pytest
pytest
```

## Postman Collection

Import `postman/Bookstore_API.postman_collection.json` into Postman. It includes every endpoint above with example bodies, and uses a collection variable `{{access_token}}` / `{{refresh_token}}` automatically populated by the Login request's test script.

## Notes on Design Decisions

- **Custom User model** (`accounts.User`) uses email as the login field (no username) and a `role` field (`ADMIN` / `CUSTOMER`).
- **Inventory management**: placing an order atomically decrements `stock_quantity`; `Book.save()` automatically flips `is_available` to `False` once stock reaches zero.
- **Global exception handler** (`core/exceptions.py`) returns a consistent JSON envelope for all 400/401/403/404/429/500 errors.
- **Throttling**: scoped rate limits for `auth`, `books`, and `orders` endpoints (see `REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']` in settings).
- **Logging**: all requests are logged (console + rotating file in `logs/bookstore.log`) via `core/middleware.py`.
=======
# 💼 6-Month Python Internship Projects

## 📌 Overview

This repository contains projects and tasks completed during my **6-month internship** in Python development.

The internship focuses on improving skills in:
- Python Programming
- Web Development (Flask)
- Database Handling
- Software Testing Basics

---

## 🛠 Technologies Used

- Python
- Flask
- HTML, CSS, JavaScript
- SQLite
- Git & GitHub

---

## 📂 Projects Included

### 1️⃣ Contact Book Application
- Add, view, and search contacts
- File handling using Python

### 2️⃣ Online Feedback Collector
- User feedback form
- Admin dashboard
- Database integration

---

## ▶️ How to Run

1. Clone the repository:
https://github.com/mansiKhule2331/python-intership.git


2. Go to project folder:
cd python-internship

3. Run Python file:python app.py

---

## 📈 Learning Outcomes

- Improved Python fundamentals
- Built real-world projects
- Learned basic software testing
- Understood full-stack development basics

---

## 👩‍💻 Author

Mansi Khule  
Python Developer  

---

## ⭐ Note

This repository is part of my internship learning journey.
>>>>>>> d8b3b83102cddc63d43bba686f5b793f9ff51853
