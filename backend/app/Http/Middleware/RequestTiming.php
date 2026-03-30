<?php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Support\Facades\Log;

class RequestTiming
{
    public function handle($request, Closure $next)
    {
        $start = microtime(true);
        $response = $next($request);
        $duration = round((microtime(true) - $start) * 1000, 2);
        $response->headers->set('X-Response-Time', $duration . 'ms');
        Log::info('RequestTiming', [
            'method' => $request->method(),
            'uri' => $request->path(),
            'duration_ms' => $duration,
            'status' => $response->status(),
        ]);
        return $response;
    }
}
