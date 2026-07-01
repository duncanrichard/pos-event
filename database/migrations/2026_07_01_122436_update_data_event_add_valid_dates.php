<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('data_event', function (Blueprint $table) {
            if (!Schema::hasColumn('data_event', 'valid_from')) {
                $table->date('valid_from')->nullable()->after('alamat_event');
            }

            if (!Schema::hasColumn('data_event', 'valid_until')) {
                $table->date('valid_until')->nullable()->after('valid_from');
            }
        });
    }

    public function down(): void
    {
        Schema::table('data_event', function (Blueprint $table) {
            if (Schema::hasColumn('data_event', 'valid_until')) {
                $table->dropColumn('valid_until');
            }

            if (Schema::hasColumn('data_event', 'valid_from')) {
                $table->dropColumn('valid_from');
            }
        });
    }
};