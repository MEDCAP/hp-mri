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

COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.9.0 /lambda-adapter /opt/extensions/lambda-adapter

# copy application code
COPY --chown=appuser:appuser app app
COPY run.py config.py data.py ./

# FLASK_ENV is a *default*, not a fixture: docker run -e and an ECS task
# definition both override it. It stays so that a container which loses the
# variable does not fall back to DevelopmentConfig with DEBUG on.
ENV PATH="/home/appuser/.local/bin:${PATH}" \
    FLASK_ENV=production \
    GUNICORN_CMD_ARGS="--bind=0.0.0.0:5000 --workers=2 --timeout 60"

EXPOSE 5000

# The ALB has its own health check; this makes docker ps and local runs honest.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:5000/api/health').read()" || exit 1

# run gunicorn using set PATH variable
# app.py as entrypoint and app = create_app()
CMD ["gunicorn", "run:create_app()"]