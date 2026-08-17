FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

COPY . /app/

CMD python manage.py collectstatic --noinput && \
    python manage.py migrate && \
    python manage.py shell -c "from django.contrib.auth import get_user_model; User = get_user_model(); import os; email = os.environ.get('ADMIN_EMAIL'); password = os.environ.get('ADMIN_PASSWORD'); field = User.USERNAME_FIELD; kwargs = {field: email, 'password': password}; print('Criando superusuário...') if email and password and not User.objects.filter(**{field: email}).exists() and User.objects.create_superuser(**kwargs) else print('Superusuário já existe ou variáveis não configuradas.')" && \
    gunicorn core.wsgi:application --bind 0.0.0.0:10000