"""Identidad de la instancia que atiende las peticiones HTTP."""

import ipaddress
import os
import socket
from functools import lru_cache
from typing import Optional


def _valid_ip(value: str) -> Optional[str]:
    """Normaliza una IP y descarta valores no aptos para un header HTTP."""
    try:
        return str(ipaddress.ip_address(value.strip()))
    except ValueError:
        return None


@lru_cache(maxsize=1)
def get_backend_ip() -> str:
    """Retorna la IP privada del host o, en desarrollo, la IP local disponible."""
    configured_ip = _valid_ip(os.getenv("INSTANCE_IP", ""))
    if configured_ip:
        return configured_ip

    try:
        addresses = socket.getaddrinfo(socket.gethostname(), None)
    except OSError:
        return "unknown"

    for address in addresses:
        candidate = _valid_ip(address[4][0])
        if candidate and not ipaddress.ip_address(candidate).is_loopback:
            return candidate

    return "unknown"
