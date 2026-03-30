<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Models\Project;
use App\Policies\ProjectPolicy;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Register policies
        Gate::policy(Project::class, ProjectPolicy::class);

        // Log slow database queries (> 100ms)
        DB::listen(function ($query) {
            $ms = $query->time;
            if ($ms > 100) {
                Log::warning('SlowQuery', [
                    'sql' => $query->sql,
                    'bindings' => $query->bindings,
                    'duration_ms' => $ms,
                ]);
            }
        });
    }
}
