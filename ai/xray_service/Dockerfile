# Base image
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app code
COPY app.py .

# Expose port 6000
EXPOSE 6000

# Note: Ensure that model.h5 is placed in this directory (or volume mounted) before building/running.
# Example: COPY model.h5 .

# Command to run the Flask app
CMD ["gunicorn", "-b", "0.0.0.0:6000", "app:app"]
