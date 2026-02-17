# Flowbit Backend API

FastAPI backend for Flowbit Operations OS.

## Setup

### 1. Create virtual environment

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env and set your SECRET_KEY and other variables
```

### 4. Start PostgreSQL with Docker

```bash
docker-compose up -d
```

### 5. Run migrations

```bash
# Create initial migration
alembic revision --autogenerate -m "Initial migration"

# Apply migrations
alembic upgrade head
```

### 6. Run development server

```bash
uvicorn app.main:app --reload --port 8000
```

API will be available at: http://localhost:8000

Interactive docs: http://localhost:8000/docs

## First-Time Setup Flow

1. Start the server
2. Register super admin: `POST /auth/register/super-admin`
3. Login to get token: `POST /auth/login`
4. Create a company: `POST /auth/companies`
5. Create company admin: `POST /auth/companies/{id}/admin`

## API Structure

```
/auth
  POST /login                          - Login
  POST /register/super-admin          - Register first super admin
  GET  /me                            - Get current user
  POST /companies                     - Create company (super admin)
  POST /companies/{id}/admin          - Create company admin (super admin)

/                                     - API info
/health                               - Health check
```

## Database Schema

**Multi-tenant architecture**: Every entity scoped by `company_id`

- **Company**: Tenant isolation
- **User**: Roles (SUPER_ADMIN, COMPANY_ADMIN, STAGE_WORKER)
- **Stage**: Workflow steps
- **StageEdge**: Dependencies between stages
- **Material**: Raw materials
- **Product**: Products with BOM
- **ProductBOMItem**: Materials per product unit
- **Project**: Customer orders
- **ProjectStage**: Stage instance in project
- **ProjectMaterialRequirement**: Material snapshot per project
- **TimeLog**: Work timers
- **FinancialEvent**: Income/cost tracking

## Development Commands

```bash
# Run server
uvicorn app.main:app --reload

# Create migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback migration
alembic downgrade -1

# Check current migration
alembic current

# View migration history
alembic history
```

## Testing with curl

```bash
# Register super admin
curl -X POST http://localhost:8000/auth/register/super-admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@flowbit.com",
    "password": "admin123",
    "full_name": "Super Admin"
  }'

# Login
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@flowbit.com",
    "password": "admin123"
  }'

# Get current user (use token from login)
curl -X GET http://localhost:8000/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Next Steps

After this initial auth setup is working:

1. Implement `/companies/{id}/stages` endpoints (Sprint 1.2)
2. Implement `/companies/{id}/users` endpoints
3. Implement Products/Materials endpoints
4. Implement Projects endpoints
5. Implement worker `/me/work-items` endpoint
