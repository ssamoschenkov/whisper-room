# 🚀 Развёртывание (Deploy)

## Требования

- [Docker](https://docs.docker.com/get-docker/) и [Docker Compose](https://docs.docker.com/compose/install/)
- ~10 ГБ свободного места (для моделей WhisperX)
- Интернет при **первом** запуске (загрузка моделей)

## Быстрый старт

```bash
# 1. Клонируйте репозиторий
git clone <URL_ВАШЕГО_РЕПОЗИТОРИЯ>
cd <ПАПКА_ПРОЕКТА>

# 2. Запустите (первый раз может занять 10-15 минут)
docker-compose up -d

# 3. Готово! Откройте в браузере:
#    http://localhost
#    или http://<IP_СЕРВЕРА> с других устройств в сети
```

## Остановка и запуск

```bash
# Остановить
docker-compose down

# Запустить снова
docker-compose up -d

# Посмотреть логи
docker-compose logs -f

# Посмотреть логи только бэкенда
docker-compose logs -f backend
```

## Обновление

```bash
git pull
docker-compose up -d --build
```

## Использование GPU (NVIDIA)

Для ускорения транскрибации с GPU:

1. Установите [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html)
2. Раскомментируйте секцию `deploy` в `docker-compose.yml`
3. Перезапустите: `docker-compose up -d --build`

## Данные

Все данные (аудиофайлы и транскрипции) хранятся в Docker volume `transcriptor-data`.

```bash
# Посмотреть где хранятся данные
docker volume inspect <ПАПКА>_transcriptor-data
```

## Доступ из локальной сети

Приложение автоматически доступно по IP сервера на порту 80. Узнайте IP:

```bash
hostname -I
```

Откройте `http://<IP>` на любом устройстве в сети.

## Устранение проблем

```bash
# Проверить статус контейнеров
docker-compose ps

# Перезапустить всё
docker-compose restart

# Полная пересборка
docker-compose down
docker-compose up -d --build
```
