from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health() -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"success": True, "data": {"status": "ok"}}


def test_posts_are_public_only() -> None:
    response = client.get("/api/v1/posts")
    assert response.status_code == 200
    assert response.json()["data"][0]["status"] == "published"


def test_missing_post_returns_404() -> None:
    response = client.get("/api/v1/posts/not-found")
    assert response.status_code == 404


def test_upload_rejects_executable() -> None:
    response = client.post(
        "/api/v1/admin/media",
        files={"file": ("danger.exe", b"MZ", "application/octet-stream")},
    )
    assert response.status_code == 415
