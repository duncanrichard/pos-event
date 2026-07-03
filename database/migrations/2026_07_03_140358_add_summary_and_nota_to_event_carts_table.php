<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('event_carts', function (Blueprint $table) {
            if (!Schema::hasColumn('event_carts', 'total_qty')) {
                $table->integer('total_qty')->default(0)->after('status');
            }

            if (!Schema::hasColumn('event_carts', 'total_amount')) {
                $table->decimal('total_amount', 15, 2)->default(0)->after('total_qty');
            }

            if (!Schema::hasColumn('event_carts', 'nota')) {
                $table->json('nota')->nullable()->after('total_amount');
            }
        });
    }

    public function down(): void
    {
        Schema::table('event_carts', function (Blueprint $table) {
            if (Schema::hasColumn('event_carts', 'nota')) {
                $table->dropColumn('nota');
            }

            if (Schema::hasColumn('event_carts', 'total_amount')) {
                $table->dropColumn('total_amount');
            }

            if (Schema::hasColumn('event_carts', 'total_qty')) {
                $table->dropColumn('total_qty');
            }
        });
    }
};