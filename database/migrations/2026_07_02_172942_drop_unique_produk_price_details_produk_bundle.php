<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('
            ALTER TABLE produk_price_details
            DROP CONSTRAINT IF EXISTS produk_price_details_produk_price_id_produk_id_unique
        ');
    }

    public function down(): void
    {
        DB::statement('
            ALTER TABLE produk_price_details
            ADD CONSTRAINT produk_price_details_produk_price_id_produk_id_unique
            UNIQUE (produk_price_id, produk_id)
        ');
    }
};