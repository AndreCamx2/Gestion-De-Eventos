FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# SECRET_KEY solo existe en esta línea (valor descartable): settings.py exige la variable
# para importarse y collectstatic corre en el build, donde Render aún no la inyecta.
RUN SECRET_KEY=solo-para-collectstatic-en-el-build python manage.py collectstatic --noinput

# Al arrancar: migraciones, limpieza de refresh tokens vencidos de la lista negra
# (SGDE-92; Render Free reinicia el contenedor tras cada inactividad, así que se
# limpia seguido sin cron; si la limpieza falla, el servidor arranca igual) y gunicorn.
CMD ["sh", "-c", "python manage.py migrate --noinput && (python manage.py flushexpiredtokens || true) && gunicorn config.wsgi:application --bind 0.0.0.0:8000"]