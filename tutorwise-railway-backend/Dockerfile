FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

# --- THIS IS THE FIX ---
# 1. Make the new start script executable
RUN chmod +x ./start.sh

# 2. Use the script to start the server, which correctly handles the $PORT variable
CMD ["./start.sh"]