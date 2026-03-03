from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import get_settings
from app.api.auth import router as auth_router
from app.api.stages import router as stages_router
from app.api.suppliers import router as suppliers_router
from app.api.materials import router as materials_router
from app.api.products import router as products_router
from app.api.users import router as users_router
from app.api.projects import router as projects_router
from app.api.settings import router as settings_router
from app.api.purchases import router as purchases_router
from app.api.inventory import router as inventory_router
from app.api.notifications import router as notifications_router
from app.api.templates import router as templates_router
from app.tasks.scheduler import start_scheduler, shutdown_scheduler

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Start the notification scheduler
    start_scheduler()
    yield
    # Shutdown: Stop the scheduler
    shutdown_scheduler()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    debug=settings.DEBUG,
    lifespan=lifespan,
    root_path="/api",
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://flowbiit.com",
        "https://www.flowbiit.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(stages_router, prefix="/stages", tags=["stages"])
app.include_router(suppliers_router, prefix="/suppliers", tags=["suppliers"])
app.include_router(materials_router, prefix="/materials", tags=["materials"])
app.include_router(products_router, prefix="/products", tags=["products"])
app.include_router(users_router, prefix="/users", tags=["users"])
app.include_router(projects_router, prefix="/projects", tags=["projects"])
app.include_router(settings_router, prefix="/settings", tags=["settings"])
app.include_router(purchases_router, prefix="/purchases", tags=["purchases"])
app.include_router(inventory_router, prefix="/inventory", tags=["inventory"])
app.include_router(notifications_router)
app.include_router(templates_router, prefix="/templates", tags=["templates"])


@app.get("/")
def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}
