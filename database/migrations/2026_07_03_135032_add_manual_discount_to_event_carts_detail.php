<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('event_carts_detail', function (Blueprint $table) {
            if (!Schema::hasColumn('event_carts_detail', 'manual_discount_type')) {
                $table->string('manual_discount_type', 20)
                    ->nullable()
                    ->after('qty');
            }

            if (!Schema::hasColumn('event_carts_detail', 'manual_discount_value')) {
                $table->decimal('manual_discount_value', 15, 2)
                    ->default(0)
                    ->after('manual_discount_type');
            }
        });
    }

    public function down(): void
    {
        Schema::table('event_carts_detail', function (Blueprint $table) {
            if (Schema::hasColumn('event_carts_detail', 'manual_discount_value')) {
                $table->dropColumn('manual_discount_value');
            }

            if (Schema::hasColumn('event_carts_detail', 'manual_discount_type')) {
                $table->dropColumn('manual_discount_type');
            }
        });
    }
};