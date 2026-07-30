# CTY Log production release pipeline

The local directory name and GitHub repository name do not need to match the
server path or the Docker Compose project name:

- Local working tree: `E:\WEB\CTY_log`
- GitHub source repository: `Coming-zll0722/CTY_Weblog`
- Server deployment root: `/opt/cty-log`
- Compatibility Compose project: `engineering-notes`

The compatibility project name is intentional. It keeps the existing
PostgreSQL, uploads, and backups volumes attached after the repository rename.

## Release flow

1. Develop on a feature branch and merge a green pull request into `main`.
2. Create and push a tag matching `release-*`.
3. GitHub Actions verifies that the tagged commit belongs to `main` and that
   the `frontend`, `backend`, and `containers` checks passed.
4. GitHub Actions builds the API and web images and publishes them to GHCR.
5. GitHub Actions creates a SHA-256-protected relay bundle containing the two
   images and their immutable digests. It is attached to the private GitHub
   Release and retained as a seven-day Actions artifact.
6. When `DEPLOY_TRANSPORT=direct`, the production job streams the images through
   the dedicated forced-command SSH key. When the international runner-to-server
   route is degraded, download the artifact on a trusted Windows workstation and
   run `deploy/scripts/deploy-release-artifact.ps1` to relay the exact same bytes.
7. The server validates both image provenance labels and the tagged Git revision.
8. The server creates a PostgreSQL backup and SHA-256 checksum.
9. Alembic applies forward migrations.
10. The API and web containers are switched and checked locally and through
   the host Nginx TLS endpoint.
11. If an application health check fails, the previous application images are
    restored. Database migrations are never downgraded automatically.

Example release:

```bash
git switch main
git pull --ff-only
git tag release-20260730-1
git push origin release-20260730-1
```

The production SSH identity cannot open a shell, forward ports, or run
arbitrary commands. It may only load the two release images or invoke the
root-owned release script with validated CTY Log GHCR image digests and a
40-character Git revision.

Example relay from Windows after extracting the release artifact:

```powershell
.\deploy\scripts\deploy-release-artifact.ps1 `
  -ArtifactDirectory C:\path\to\cty-log-release-YYYYMMDD-N
```

## Manual rollback

On the server, list the root-owned release state files under
`/opt/cty-log/var/releases`, then run:

```bash
sudo /opt/cty-log/deploy/scripts/rollback.sh release-YYYYMMDD-N
```

Rollback creates another database backup and switches only the API and web
images. It does not restore a database dump or run an Alembic downgrade.
