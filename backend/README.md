<p align="center"><a href="https://laravel.com" target="_blank"><img src="https://raw.githubusercontent.com/laravel/art/master/logo-lockup/5%20SVG/2%20CMYK/1%20Full%20Color/laravel-logolockup-cmyk-red.svg" width="400" alt="Laravel Logo"></a></p>

<p align="center">
<a href="https://github.com/laravel/framework/actions"><img src="https://github.com/laravel/framework/workflows/tests/badge.svg" alt="Build Status"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/dt/laravel/framework" alt="Total Downloads"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/v/laravel/framework" alt="Latest Stable Version"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/l/laravel/framework" alt="License"></a>
</p>

## About Laravel

Laravel is a web application framework with expressive, elegant syntax. We believe development must be an enjoyable and creative experience to be truly fulfilling. Laravel takes the pain out of development by easing common tasks used in many web projects, such as:

- [Simple, fast routing engine](https://laravel.com/docs/routing).
- [Powerful dependency injection container](https://laravel.com/docs/container).
- Multiple back-ends for [session](https://laravel.com/docs/session) and [cache](https://laravel.com/docs/cache) storage.
- Expressive, intuitive [database ORM](https://laravel.com/docs/eloquent).
- Database agnostic [schema migrations](https://laravel.com/docs/migrations).
- [Robust background job processing](https://laravel.com/docs/queues).
- [Real-time event broadcasting](https://laravel.com/docs/broadcasting).

Laravel is accessible, powerful, and provides tools required for large, robust applications.

## Learning Laravel

Laravel has the most extensive and thorough [documentation](https://laravel.com/docs) and video tutorial library of all modern web application frameworks, making it a breeze to get started with the framework.

You may also try the [Laravel Bootcamp](https://bootcamp.laravel.com), where you will be guided through building a modern Laravel application from scratch.

If you don't feel like reading, [Laracasts](https://laracasts.com) can help. Laracasts contains thousands of video tutorials on a range of topics including Laravel, modern PHP, unit testing, and JavaScript. Boost your skills by digging into our comprehensive video library.

## Laravel Sponsors

We would like to extend our thanks to the following sponsors for funding Laravel development. If you are interested in becoming a sponsor, please visit the [Laravel Partners program](https://partners.laravel.com).

### Premium Partners

- **[Vehikl](https://vehikl.com)**
- **[Tighten Co.](https://tighten.co)**
- **[Kirschbaum Development Group](https://kirschbaumdevelopment.com)**
- **[64 Robots](https://64robots.com)**
- **[Curotec](https://www.curotec.com/services/technologies/laravel)**
- **[DevSquad](https://devsquad.com/hire-laravel-developers)**
- **[Redberry](https://redberry.international/laravel-development)**
- **[Active Logic](https://activelogic.com)**

## Contributing

Thank you for considering contributing to the Laravel framework! The contribution guide can be found in the [Laravel documentation](https://laravel.com/docs/contributions).

## Code of Conduct

In order to ensure that the Laravel community is welcoming to all, please review and abide by the [Code of Conduct](https://laravel.com/docs/contributions#code-of-conduct).

## Security Vulnerabilities

If you discover a security vulnerability within Laravel, please send an e-mail to Taylor Otwell via [taylor@laravel.com](mailto:taylor@laravel.com). All security vulnerabilities will be promptly addressed.

## License

The Laravel framework is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).

## LLM4Reqs additions

This repository has been extended for the LLM4Reqs capstone project. Changes/additions include:

- API endpoints: `/api/health`, `/api/chat`, `/api/register`, `/api/login`, `/api/logout`.
- Token-based authentication using Laravel Sanctum (personal access tokens).
- `ChatController` proxies chat requests to a Python LLM service configurable via `LLM_URL` in `.env`.

Quick setup (project-specific):

1. Ensure dependencies are installed:

```powershell
composer install
```

2. Copy `.env.example` to `.env` and generate an app key:

```powershell
copy .env.example .env
php artisan key:generate
```

3. Update `.env` values if needed. The following values have been appended to `.env` and can be changed:

```
LLM_URL=http://127.0.0.1:8000/extract
SANCTUM_STATEFUL_DOMAINS=localhost:5173
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

4. Run migrations (creates users and session tables if using database session driver):

```powershell
php artisan migrate
```

5. Install and publish Sanctum (if not already present):

```powershell
composer require laravel/sanctum
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
php artisan migrate
```

6. Serve the backend (avoid port conflict with the Python server):

```powershell
php artisan serve --port=8001
```

Example API calls are provided in the project root README or can be executed via Postman/curl as shown below:

Register:

```powershell
curl -X POST http://localhost:8001/api/register -H "Content-Type: application/json" -d '{"name":"Alice","email":"alice@example.com","password":"secret","password_confirmation":"secret"}'
```

Login:

```powershell
curl -X POST http://localhost:8001/api/login -H "Content-Type: application/json" -d '{"email":"alice@example.com","password":"secret"}'
```

Chat (use token from login):

```powershell
curl -X POST http://localhost:8001/api/chat -H "Content-Type: application/json" -H "Authorization: Bearer <TOKEN>" -d '{"text":"Hello LLM"}'
```

Health:

```powershell
curl http://localhost:8001/api/health
```
