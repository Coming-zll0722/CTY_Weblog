FROM python:3.12-slim
ARG PYPI_INDEX_URL=https://pypi.org/simple
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
WORKDIR /app
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
