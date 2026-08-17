from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.logger import logger
from app.core.middleware import LoggingMiddleware
from app.routers import calculadora_router, health_router, auth_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Calculadora API v6.0.0 iniciada (versión final)")
    logger.info(f"CORS habilitado para: {settings.CORS_ORIGINS}")
    yield
    logger.info("Calculadora API apagada")


app = FastAPI(
    title="Calculadora API",
    description="API REST de calculadora - V6: Versión final con CORS",
    version="6.0.0",
    root_path="/api",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# --- CORS ---
# IMPORTANTE: CORSMiddleware debe ir ANTES del LoggingMiddleware
# para que las peticiones preflight (OPTIONS) se manejen correctamente.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=settings.CORS_ALLOW_METHODS,
    allow_headers=settings.CORS_ALLOW_HEADERS,
    expose_headers=settings.CORS_EXPOSE_HEADERS,
)

# --- Logging ---
app.add_middleware(LoggingMiddleware)

# --- Routers ---
app.include_router(health_router)
app.include_router(auth_router)
app.include_router(calculadora_router)
