# build stage
FROM python:3.12-slim AS build

# output all logs to stdout not in buffer
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# ---- Runtime Stage ----
FROM python:3.12-slim AS runtime

# Create non-root user
WORKDIR /app

# create home direcrotory for added user
# change ownership of user:group to appuser
RUN useradd --create-home appuser &&\
    mkdir -p /app && \
    chown -R appuser:appuser /app

# Install system dependencies for OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends libgl1 && \
    rm -rf /var/lib/apt/lists/*

USER appuser

# Copy dependencies from build stage
COPY --from=build --chown=appuser:appuser /root/.local /home/appuser/.local

# copy application code
COPY --chown=appuser:appuser . .

# vite api url set to alb public ip
ENV PATH="/home/appuser/.local/bin:${PATH}" \
    FLASK_ENV=production \
    GUNICORN_CMD_ARGS="--bind=0.0.0.0:5000 --workers=2 --timeout 60"
# Expose port and set CMD
EXPOSE 5000

# run gunicorn using set PATH variable
# app.py as entrypoint and app = create_app()
CMD ["gunicorn", "app:app"]