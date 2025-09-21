FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

# --- THIS IS THE FINAL FIX ---
# This uses ENTRYPOINT, the standard way to define the main executable for the container.
# It runs a shell (`/bin/sh -c`) to ensure the $PORT variable is correctly interpreted.
ENTRYPOINT ["/bin/sh", "-c", "uvicorn main:app --host 0.0.0.0 --port $PORT"]