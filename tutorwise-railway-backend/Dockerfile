FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

# --- THIS IS THE DEFINITIVE FIX ---
# This command uses the standard shell (`/bin/sh -c`) to execute the server command.
# This is the most reliable way to ensure that shell features, like expanding the $PORT
# environment variable, work correctly across different container platforms like Railway.
CMD /bin/sh -c "uvicorn main:app --host 0.0.0.0 --port $PORT"