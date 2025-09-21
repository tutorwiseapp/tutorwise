FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

# This is the standard, correct command to run the server.
CMD ["/bin/sh", "-c", "uvicorn main:app --host 0.0.0.0 --port $PORT"]