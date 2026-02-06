<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

class CreateProjectsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            // owner_id per scheme.txt
            $table->foreignId('owner_id')->constrained('users')->onDelete('cascade');
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('status')->default('active'); // active, archived, deleted
            $table->timestamps();
        });

        // Fix any existing projects without owner_id (for data consistency)
        $firstUserId = DB::table('users')->first()?->id;
        if ($firstUserId) {
            DB::table('projects')
                ->whereNull('owner_id')
                ->update(['owner_id' => $firstUserId]);
        }
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('projects');
    }
}
