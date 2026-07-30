from pathlib import Path

import yaml

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEPLOY_ROOT = PROJECT_ROOT / "deploy"


def test_development_compose_is_loopback_only() -> None:
    compose = yaml.safe_load((DEPLOY_ROOT / "compose.dev.yml").read_text("utf8"))
    postgres = compose["services"]["postgres"]
    assert postgres["ports"] == ["127.0.0.1:5432:5432"]
    assert postgres["healthcheck"]["test"][0] == "CMD-SHELL"
    assert "postgres_dev_data" in compose["volumes"]


def test_production_compose_keeps_services_private_and_ordered() -> None:
    compose = yaml.safe_load((DEPLOY_ROOT / "compose.prod.yml").read_text("utf8"))
    services = compose["services"]
    assert {"postgres", "migrate", "api", "web", "nginx"} <= services.keys()
    assert "ports" not in services["postgres"]
    assert services["api"]["ports"] == ["127.0.0.1:8000:8000"]
    assert services["web"]["ports"] == ["127.0.0.1:3000:3000"]
    assert services["migrate"]["command"] == ["alembic", "upgrade", "head"]
    assert (
        services["api"]["depends_on"]["migrate"]["condition"]
        == "service_completed_successfully"
    )
    assert services["web"]["depends_on"]["api"]["condition"] == "service_healthy"
    assert compose["networks"]["backend"]["internal"] is True
    assert {"postgres_data", "uploads", "backups"} <= compose["volumes"].keys()
    assert compose["volumes"]["postgres_data"]["name"] == "engineering-notes_postgres_data"
    assert compose["volumes"]["uploads"]["name"] == "engineering-notes_uploads"
    assert compose["volumes"]["backups"]["name"] == "engineering-notes_backups"
    assert services["api"]["image"].startswith("${API_IMAGE:-")
    assert services["migrate"]["image"].startswith("${API_IMAGE:-")
    assert services["web"]["image"].startswith("${WEB_IMAGE:-")
    for name in ("postgres", "api", "web", "nginx"):
        assert "healthcheck" in services[name]
        assert services[name]["restart"] == "unless-stopped"
        limits = services[name]["deploy"]["resources"]["limits"]
        assert limits["memory"]
        assert limits["cpus"]
        assert limits["pids"] > 0
    assert services["api"]["read_only"] is True
    assert services["web"]["read_only"] is True
    assert services["init-admin"]["profiles"] == ["tools"]
    assert services["init-admin"]["command"] == [
        "python",
        "-m",
        "app.cli",
        "create-admin",
    ]


def test_images_and_nginx_have_production_safety_controls() -> None:
    api_dockerfile = (DEPLOY_ROOT / "api.Dockerfile").read_text("utf8")
    web_dockerfile = (DEPLOY_ROOT / "web.Dockerfile").read_text("utf8")
    nginx = (DEPLOY_ROOT / "nginx-host.conf").read_text("utf8")
    assert "USER app" in api_dockerfile
    assert "--workers\", \"1\"" in api_dockerfile
    assert "--require-hashes" in api_dockerfile
    assert "pip install --no-cache-dir --no-deps ." not in api_dockerfile
    assert web_dockerfile.count("FROM ") >= 2
    assert "USER node" in web_dockerfile
    assert "/app/dist/standalone" in web_dockerfile
    assert 'CMD ["node", "server.js"]' in web_dockerfile
    for required in (
        "location /api/",
        "location /assets/",
        "limit_req",
        "Strict-Transport-Security",
        "Content-Security-Policy",
        "gzip on",
        "expires 1y",
        "devlelin.xyz",
        "engineering_notes_json",
    ):
        assert required in nginx
    assert "example.com" not in nginx


def test_legacy_compose_entrypoint_only_includes_production_stack() -> None:
    compose = yaml.safe_load((DEPLOY_ROOT / "docker-compose.yml").read_text("utf8"))
    assert compose == {
        "name": "engineering-notes",
        "include": [{"path": "compose.prod.yml"}],
    }


def test_production_example_allows_the_internal_api_hostname() -> None:
    environment_example = (DEPLOY_ROOT / ".env.production.example").read_text("utf8")
    assert 'API_ALLOWED_HOSTS=\'["devlelin.xyz","api","127.0.0.1","localhost"]\'' in (
        environment_example
    )


def test_rollback_recreates_only_application_containers() -> None:
    for script_name in ("deploy.sh", "rollback.sh"):
        script = (DEPLOY_ROOT / "scripts" / script_name).read_text("utf8")
        assert "--no-build" in script
        assert "--no-deps" in script
        assert "--pull never" in script
        assert "--force-recreate api web" in script
        assert "alembic downgrade" not in script


def test_release_pipeline_uses_immutable_images_and_restricted_ssh() -> None:
    workflow = (PROJECT_ROOT / ".github" / "workflows" / "release.yml").read_text("utf8")
    deploy_script = (DEPLOY_ROOT / "scripts" / "deploy.sh").read_text("utf8")
    load_script = (DEPLOY_ROOT / "scripts" / "load-images.sh").read_text("utf8")
    ssh_entrypoint = (DEPLOY_ROOT / "scripts" / "ssh-entrypoint.sh").read_text("utf8")
    sudoers = (DEPLOY_ROOT / "sudoers-cty-log-deploy").read_text("utf8")

    assert 'tags:\n      - "release-*"' in workflow
    assert "Required check did not pass" in workflow
    assert "needs: [build-api, build-web]" in workflow
    assert "API_DIGEST" in workflow
    assert "WEB_DIGEST" in workflow
    assert "StrictHostKeyChecking=yes" in workflow
    assert "PasswordAuthentication=no" in workflow
    assert "docker image save" in workflow
    assert "gzip -1" in workflow
    assert '"load $GITHUB_REF_NAME $API_DIGEST $WEB_DIGEST $GITHUB_SHA"' in workflow

    assert "cty-log-api:${release_id}" in deploy_script
    assert "cty-log-web:${release_id}" in deploy_script
    assert "source_api_image" in deploy_script
    assert "source_web_image" in deploy_script
    assert "backup.sh" in deploy_script
    assert "alembic downgrade" not in deploy_script
    assert "rollback_apps" in deploy_script

    assert "gzip --decompress --stdout | docker image load" in load_script
    assert "org.opencontainers.image.revision" in load_script
    assert 'SSH_ORIGINAL_COMMAND' in ssh_entrypoint
    assert '"${operation:-}" != "deploy"' in ssh_entrypoint
    assert '"${operation:-}" != "load"' in ssh_entrypoint
    assert "cty-log-deploy" in sudoers
    assert "cty-log-load-images" in sudoers
    assert "NOPASSWD:" in sudoers
