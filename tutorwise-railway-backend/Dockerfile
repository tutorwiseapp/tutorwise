FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

# --- THIS IS THE FIX ---
# This command explicitly uses the shell (`sh -c`) to run the uvicorn server.
# This forces the shell to properly expand the `$PORT` environment variable 
# provided by Railway before the server starts.
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port $PORT"]