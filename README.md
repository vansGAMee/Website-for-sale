# Restaurant Commerce

Готовый шаблон сайта ресторана: витрина, корзина, заказ, админка, PostgreSQL и онлайн-оплата.

По умолчанию включены `ORDERS` и безопасные тестовые заказы без обращения к эквайеру.

Быстрый старт:

```bash
npm ci
copy .env.example .env
npm run setup:check
npm run setup:db
npm run admin:bootstrap
npm run dev:platform
npm run dev:storefront
```

Полная инструкция по продаже, ребрендингу и Vercel: [SELL_AND_DEPLOY.md](SELL_AND_DEPLOY.md).
