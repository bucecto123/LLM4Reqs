<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddContentToDocumentsTable extends Migration
{
    public function up()
    {
        if (Schema::hasTable('documents') && !Schema::hasColumn('documents', 'content')) {
            Schema::table('documents', function (Blueprint $table) {
                $table->longText('content')->nullable()->after('file_path');
            });
        }
    }

    public function down()
    {
        if (Schema::hasTable('documents') && Schema::hasColumn('documents', 'content')) {
            Schema::table('documents', function (Blueprint $table) {
                $table->dropColumn('content');
            });
        }
    }
}
