# PostgreSQL Migration Guide

This guide will help you migrate from SQLite to PostgreSQL for the LLM4Reqs project.

## Prerequisites

1. **Install PostgreSQL**
   - Download from: https://www.postgresql.org/download/windows/
   - Or install via Chocolatey: `choco install postgresql`
   - Or install via Scoop: `scoop install postgresql`

2. **Ensure PHP PostgreSQL Extension is Enabled**
   - Check your `php.ini` file (usually in your PHP installation directory)
   - Uncomment or add: `extension=pdo_pgsql`
   - Uncomment or add: `extension=pgsql`
   - Restart your web server after making changes

## Step-by-Step Migration

### 1. Create PostgreSQL Database

Open PostgreSQL command line (psql) or use pgAdmin and run:

```sql
CREATE DATABASE llm4reqs;
CREATE USER llm4reqs_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE llm4reqs TO llm4reqs_user;

-- For PostgreSQL 15+, you may also need:
\c llm4reqs
GRANT ALL ON SCHEMA public TO llm4reqs_user;
```

### 2. Update Environment Configuration

Update your `backend/.env` file (create from `.env.example` if it doesn't exist):

```env
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=llm4reqs
DB_USERNAME=llm4reqs_user
DB_PASSWORD=your_secure_password
```

### 3. Test Database Connection

From the `backend` directory, run:

```bash
php artisan tinker
```

Then in tinker:
```php
DB::connection()->getPdo();
```

If successful, you should see a PDO object. Type `exit` to quit tinker.

### 4. Run Migrations

```bash
cd backend
php artisan migrate:fresh
```

Or if you want to preserve data (export/import approach):

```bash
# Export data from SQLite (if needed)
php artisan db:seed # Re-seed if you have seeders

# Run migrations on PostgreSQL
php artisan migrate:fresh --seed
```

### 5. Update Queue Worker (if running)

If you have the queue worker running, restart it to use the new database connection:

```bash
php artisan queue:restart
```

## Verification

Run these commands to verify everything is working:

```bash
# Check database connection
php artisan tinker
>>> DB::connection()->getPdo();

# List tables
php artisan db:show
php artisan db:table users

# Run tests
php artisan test
```

## Common Issues

### Issue: "could not find driver"
**Solution:** Enable the PostgreSQL extensions in php.ini:
- `extension=pdo_pgsql`
- `extension=pgsql`

### Issue: Connection refused
**Solution:** 
- Ensure PostgreSQL service is running: `Get-Service postgresql*`
- Start if needed: `Start-Service postgresql-x64-14` (version may vary)
- Check firewall settings for port 5432

### Issue: Permission denied for schema public
**Solution (PostgreSQL 15+):**
```sql
\c llm4reqs
GRANT ALL ON SCHEMA public TO llm4reqs_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO llm4reqs_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO llm4reqs_user;
```

## Data Migration (Optional)

If you need to migrate existing data from SQLite to PostgreSQL:

### Option 1: Using Laravel Seeders (Recommended for small datasets)
1. Export data to seeders
2. Run seeders against PostgreSQL

### Option 2: Using pgloader (for larger datasets)
```bash
# Install pgloader
scoop install pgloader

# Run migration
pgloader database/database.sqlite postgresql://llm4reqs_user:password@localhost/llm4reqs
```

### Option 3: Manual Export/Import
```bash
# Export from SQLite
php artisan tinker
>>> DB::table('users')->get()->toJson();

# Import to PostgreSQL (write custom import script or use seeders)
```

## Performance Tuning (Optional)

For better PostgreSQL performance, consider these settings in your `config/database.php`:

```php
'pgsql' => [
    'driver' => 'pgsql',
    // ... existing config ...
    'options' => [
        PDO::ATTR_TIMEOUT => 5,
        PDO::ATTR_PERSISTENT => false,
    ],
    'pool' => [
        'min' => 2,
        'max' => 10,
    ],
],
```

## Rollback to SQLite (if needed)

If you need to rollback:

1. Update `backend/.env`:
   ```env
   DB_CONNECTION=sqlite
   ```

2. Ensure SQLite database exists:
   ```bash
   touch database/database.sqlite
   ```

3. Run migrations:
   ```bash
   php artisan migrate:fresh
   ```

## Next Steps

After successful migration:
- [ ] Update your deployment documentation
- [ ] Update CI/CD pipelines if applicable
- [ ] Configure PostgreSQL backups
- [ ] Set up connection pooling for production
- [ ] Update team documentation

## Support

If you encounter any issues, check:
- Laravel logs: `backend/storage/logs/laravel.log`
- PostgreSQL logs: Varies by installation
- PHP error logs: Check your web server error logs
