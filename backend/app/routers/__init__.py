from .calculadora_router import router as calculadora_router  # noqa: F401
from .auth_router import router as auth_router  # noqa: F401
from .health_router import router as health_router  # noqa: F401

__all__ = ["calculadora_router", "auth_router", "health_router"]
