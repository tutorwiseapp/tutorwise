FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

# --- THIS IS THE DEFINITIVE FIX ---
# Instead of using the problematic $PORT variable, we will hardcode the port to 8000.
# This matches the working configuration of the fuschia project and is a standard practice.
# Railway will automatically map its public-facing port to this port inside the container.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]