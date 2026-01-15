FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# host=0.0.0.0 is CRITICAL for Docker networking
CMD ["python", "main.py"]