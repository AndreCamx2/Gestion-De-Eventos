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

# Usuario sin privilegios (SGDE-120): si alguien lograra ejecutar código en el
# contenedor, no tendría permisos de root. Va después de collectstatic, que
# escribe en /app/staticfiles.
RUN useradd --create-home --uid 1000 app && chown -R app:app /app
USER app

# Al arrancar:
# 1. migraciones;
# 2. la tabla de caché, donde se cuentan los límites de intentos (SGDE-120);
# 3. limpieza de refresh tokens vencidos de la lista negra (SGDE-92). Render Free
#    reinicia el contenedor tras cada inactividad, así que se limpia seguido sin
#    cron; si la limpieza falla, el servidor arranca igual;
# 4. gunicorn con 2 workers, para que una petición lenta no bloquee a las demás,
#    y 60 s de timeout. Dos caben en los 512 MB de Render Free; WEB_CONCURRENCY
#    lo cambia sin tocar este archivo.
CMD ["sh", "-c", "python manage.py migrate --noinput && python manage.py createcachetable && (python manage.py flushexpiredtokens || true) && gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers ${WEB_CONCURRENCY:-2} --timeout 60"]