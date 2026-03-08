# 🚀 Развёртывание (Deploy)

## Требования

- [Docker](https://docs.docker.com/get-docker/) и [Docker Compose](https://docs.docker.com/compose/install/)
- ~10 ГБ свободного места (для моделей)
- Интернет **только при первой сборке** (потом работает офлайн)

## Быстрый старт

### 1. Подготовка HuggingFace (для распознавания голосов)

1. Зарегистрируйтесь на [huggingface.co](https://huggingface.co/join)
2. Примите лицензии (нажмите "Agree" на каждой странице):
   - [pyannote/speaker-diarization-3.1](https://huggingface.co/pyannote/speaker-diarization-3.1)
   - [pyannote/segmentation-3.0](https://huggingface.co/pyannote/segmentation-3.0)
3. Создайте токен: [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) → **New token** → тип **Read**

### 2. Запуск

```bash
# Клонируйте репозиторий
git clone <URL_ВАШЕГО_РЕПОЗИТОРИЯ>
cd <ПАПКА_ПРОЕКТА>

# Создайте файл с токеном
cp .env.docker .env
nano .env   # Вставьте ваш HF_TOKEN=hf_xxxxx

# Запустите (первый раз ~15-30 минут, скачиваются модели)
docker-compose up -d --build

# Готово! Откройте:
# http://localhost       — с этого компьютера
# http://<IP_сервера>   — с других устройств в сети
```

### 3. Проверка

```bash
# Убедитесь, что оба контейнера запущены
docker-compose ps

# Посмотрите логи
docker-compose logs -f
```

## Повседневные команды

```bash
# Остановить
docker-compose down

# Запустить
docker-compose up -d

# Перезапустить
docker-compose restart

# Обновить после git pull
docker-compose up -d --build
```

## GPU (NVIDIA) — опционально

Ускоряет транскрибацию в 5-10 раз:

1. Установите [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html)
2. Раскомментируйте секцию `deploy` в `docker-compose.yml`
3. `docker-compose up -d --build`

## Данные

Аудиофайлы и транскрипции хранятся в Docker volume `transcriptor-data` и не пропадут при обновлении.

## Устранение проблем

| Проблема | Решение |
|----------|---------|
| Контейнер не запускается | `docker-compose logs backend` — посмотреть ошибку |
| Модели не скачались | Проверьте HF_TOKEN и что лицензии приняты |
| Нет доступа с других устройств | `sudo ufw allow 80` |
| Мало памяти | Нужно минимум 4 ГБ RAM (8 ГБ рекомендуется) |
