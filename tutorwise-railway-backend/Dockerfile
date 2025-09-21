FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
# --- THIS IS THE FIX ---
# Use the shell form of CMD to allow the $PORT variable to be expanded by the shell.
# Railway provides the $PORT variable automatically.
CMD uvicorn main:app --host 0.0.0.0 --port $PORT