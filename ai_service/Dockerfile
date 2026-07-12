FROM python:3.12-slim

# Set environment system configurations
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install package requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt --prefer-binary

# Copy service codebase
COPY . .

# Expose microservice port
EXPOSE 8000

# Launch uvicorn server mapping standard hosts
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
