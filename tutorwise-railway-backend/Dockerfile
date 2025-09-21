FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

# --- THIS IS THE FIX ---
# Run the application using the new Python runner script.
# This is a more reliable way to handle the dynamic PORT.
CMD ["python", "runner.py"]