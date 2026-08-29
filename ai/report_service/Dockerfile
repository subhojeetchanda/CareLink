FROM python:3.9-slim

# Install Tesseract OCR and its dependencies
RUN apt-get update && apt-get install -y tesseract-ocr && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all source files
COPY . .

# Expose port (report_service runs on 7001 based on app.py)
EXPOSE 7001

# Start the Flask app with Gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:7001", "app:app"]
