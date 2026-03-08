# 🚀 Установка Whisper Room

## Что нужно

- Компьютер с **Docker** (Windows, Mac или Linux)
- ~10 ГБ свободного места (для AI-моделей)
- Интернет **только при первой установке**

## Пошаговая инструкция

### Шаг 1. Установите Docker

Скачайте и установите [Docker Desktop](https://www.docker.com/products/docker-desktop/) для вашей ОС.  
После установки убедитесь, что Docker запущен (иконка в трее).

### Шаг 2. Подготовьте HuggingFace (нужно для распознавания спикеров)

1. Зарегистрируйтесь на [huggingface.co](https://huggingface.co/join)
2. **Примите лицензии** — нажмите "Agree" на каждой из этих страниц:
   - [pyannote/speaker-diarization-3.1](https://huggingface.co/pyannote/speaker-diarization-3.1)
   - [pyannote/segmentation-3.0](https://huggingface.co/pyannote/segmentation-3.0)
3. Создайте токен: [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) → **New token** → тип **Read** → скопируйте

### Шаг 3. Скачайте и запустите

Откройте **терминал** (на Windows — PowerShell) и выполните команды по одной:

```bash
# 1. Скачайте проект
git clone https://github.com/ssamoschenkov/whisper-room.git

# 2. Перейдите в папку
cd whisper-room

# 3. Создайте файл с токеном
cp .env.docker .env
```

Теперь откройте файл `.env` любым текстовым редактором и замените `hf_ваш_токен_сюда` на ваш настоящий токен:

```
HF_TOKEN=hf_ваш_реальный_токен
```

Сохраните файл и продолжите в терминале:

```bash
# 4. Запустите! (первый раз ~15-30 минут, скачиваются AI-модели)
docker-compose up -d --build
```

### Шаг 4. Готово!

Откройте в браузере:
- **http://localhost** — с этого компьютера
- **http://IP_вашего_компьютера** — с других устройств в сети

## Управление

```bash
# Остановить
docker-compose down

# Запустить снова
docker-compose up -d

# Обновить до новой версии
git pull
docker-compose up -d --build

# Посмотреть логи (если что-то не работает)
docker-compose logs -f
```

## GPU (опционально, ускоряет в 5-10 раз)

Если есть видеокарта NVIDIA:

1. Установите [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html)
2. В `docker-compose.yml` раскомментируйте секцию `deploy` (удалите `#` в начале строк)
3. `docker-compose up -d --build`

## Решение проблем

| Проблема | Решение |
|----------|---------|
| Не запускается | `docker-compose logs backend` — посмотреть ошибку |
| Ошибка с моделями | Проверьте что приняли лицензии на HuggingFace и токен верный |
| Нет доступа с других устройств | Откройте порт 80 в файрволе |
| Мало памяти | Нужно минимум 4 ГБ RAM (рекомендуется 8 ГБ) |
