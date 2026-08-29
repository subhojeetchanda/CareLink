# Base image
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all app code and models
COPY . .

# Command to run the Flask app
CMD ["gunicorn", "-b", "0.0.0.0:6000", "app:app"]
