<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("
            ALTER TABLE produk_price
            ALTER COLUMN produk_id DROP NOT NULL
        ");
    }

    public function down(): void
    {
        /*
         * Hati-hati:
         * Down ini hanya aman kalau tidak ada data bundle
         * yang produk_id-nya NULL.
         */
        DB::statement("
            DELETE FROM produk_price
            WHERE produk_id IS NULL
        ");

        DB::statement("
            ALTER TABLE produk_price
            ALTER COLUMN produk_id SET NOT NULL
        ");
    }
};