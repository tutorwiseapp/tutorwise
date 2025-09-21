FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

# Update the CMD to point to the new app structure
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]