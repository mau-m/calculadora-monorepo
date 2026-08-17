# ============================================================
# Tests del Health Check
# ============================================================

from app.core.instance_identity import get_backend_ip


def test_health_retorna_ok(client):
    """El health check debe retornar status 200 y status 'ok'."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data
    assert "X-Backend-IP" in response.headers


def test_health_usa_ip_configurada(client, monkeypatch):
    """En Docker debe reportar la IP de la EC2 inyectada por Compose."""
    monkeypatch.setenv("INSTANCE_IP", "10.0.1.25")
    get_backend_ip.cache_clear()

    response = client.get("/health")

    assert response.headers["X-Backend-IP"] == "10.0.1.25"
    get_backend_ip.cache_clear()
