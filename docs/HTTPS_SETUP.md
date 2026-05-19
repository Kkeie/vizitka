# Настройка HTTPS

Nginx публикуется отдельным Docker-образом `vizitka-nginx`. Он слушает `80` и `443`, проксирует `/` на `frontend:80`, а `/api/` и `/uploads/` на `backend:3000`.

## 1. Добавь GitHub Secret

В репозитории -> Settings -> Secrets and variables -> Actions:

```text
DOMAIN=yourdomain.com
```

`DOMAIN` обязателен для `.github/workflows/deploy-yc.yml`: без него Nginx не сможет корректно выпустить и подключить сертификат.

## 2. Направь DNS на IP сервера

В панели регистратора домена добавь A-запись:

```text
yourdomain.com -> <IP вашей COI VM>
```

IP можно узнать так:

```bash
yc compute instance get <VM_NAME> --format json | grep -A2 '"one_to_one_nat"'
```

## 3. Задеплой первый HTTP-вариант

Запушь изменения в `master` или запусти workflow `Deploy to Yandex Cloud` вручную. До появления сертификата Nginx стартует в HTTP-only режиме и отдаёт ACME challenge из volume `certbot_www`.

## 4. Получи SSL-сертификат на VM

```bash
ssh <user>@<VM_IP>

# COI именует compose volumes с префиксом "coi_".
docker run --rm \
  -v coi_certbot_www:/var/www/certbot \
  -v coi_certbot_conf:/etc/letsencrypt \
  certbot/certbot certonly \
    --webroot -w /var/www/certbot \
    -d yourdomain.com \
    --email you@example.com \
    --agree-tos --no-eff-email
```

## 5. Перезапусти Nginx

```bash
docker restart vizitka-nginx
```

После рестарта entrypoint Nginx найдёт `/etc/letsencrypt/live/$DOMAIN/fullchain.pem`, переключится на HTTPS-конфиг и начнёт редиректить HTTP на HTTPS.

## Автообновление

Контейнер `vizitka-certbot` проверяет продление сертификата каждые 12 часов. Сертификат лежит в Docker volume `coi_certbot_conf`, поэтому следующие автодеплои не удаляют его.
