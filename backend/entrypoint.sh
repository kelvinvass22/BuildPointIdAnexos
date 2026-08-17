#!/bin/bash
set -e

echo "=== Iniciando processo de boot (BuildPoint ID) ==="

echo "1. Coletando arquivos estáticos..."
python manage.py collectstatic --noinput

echo "2. Aplicando migrações no banco de dados..."
python manage.py migrate --noinput

echo "3. Configurando superusuário..."
python manage.py shell <<EOF
import os
from django.contrib.auth import get_user_model

User = get_user_model()

email = os.environ.get('ADMIN_EMAIL')
password = os.environ.get('ADMIN_PASSWORD')
cpf = os.environ.get('ADMIN_CPF', '00000000000')

if email and password:
    user = User.objects.filter(username=email).first() or User.objects.filter(email=email).first()
    
    if not user:
        user = User(username=email)
        print(f"Criando superusuário '{email}'...")
    else:
        print(f"Atualizando superusuário existente '{email}'...")

    user.email = email
    user.cpf = cpf
    user.papel = 'DONO'
    user.is_staff = True
    user.is_superuser = True
    user.is_active = True
    user.set_password(password)
    user.save()
    
    print(f"Superusuário '{email}' configurado com sucesso!")
else:
    print("Aviso: ADMIN_EMAIL e ADMIN_PASSWORD não definidos. Pulando criação de superusuário.")
EOF

echo "4. Subindo servidor Gunicorn..."
exec gunicorn core.wsgi:application --bind 0.0.0.0:${PORT:-10000}