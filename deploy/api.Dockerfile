FROM python:3.12-slim
ARG DEBIAN_MIRROR=http://deb.debian.org
ARG PYPI_INDEX_URL=https://pypi.org/simple
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
WORKDIR /app
RUN sed -i "s|http://deb.debian.org|${DEBIAN_MIRROR}|g" \
        /etc/apt/sources.list.d/debian.sources \
    && apt-get update \
    && apt-get install --no-install-recommends -y postgresql-client \
    && rm -rf /var/lib/apt/lists/*
COPY pyproject.toml ./
COPY requirements.lock ./
COPY app ./app
COPY alembic.ini ./
COPY alembic ./alembic
RUN pip install --index-url "${PYPI_INDEX_URL}" \
    --no-cache-dir --require-hashes -r requirements.lock
RUN addgroup --system app && adduser --system --ingroup app app \
    && mkdir -p /data/uploads /data/backups \
    && chown -R app:app /app /data
USER app
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
