<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('produk_price', function (Blueprint $table) {
            if (!Schema::hasColumn('produk_price', 'tipe_harga')) {
                $table->string('tipe_harga', 20)->default('single')->after('event_id');
            }

            if (!Schema::hasColumn('produk_price', 'nama_bundle')) {
                $table->string('nama_bundle')->nullable()->after('tipe_harga');
            }
        });

        DB::statement("
            ALTER TABLE produk_price
            DROP CONSTRAINT IF EXISTS produk_price_tipe_harga_check
        ");

        DB::statement("
            ALTER TABLE produk_price
            ADD CONSTRAINT produk_price_tipe_harga_check
            CHECK (tipe_harga IN ('single', 'bundle'))
        ");
    }

    public function down(): void
    {
        DB::statement("
            ALTER TABLE produk_price
            DROP CONSTRAINT IF EXISTS produk_price_tipe_harga_check
        ");

        Schema::table('produk_price', function (Blueprint $table) {
            if (Schema::hasColumn('produk_price', 'nama_bundle')) {
                $table->dropColumn('nama_bundle');
            }

            if (Schema::hasColumn('produk_price', 'tipe_harga')) {
                $table->dropColumn('tipe_harga');
            }
        });
    }
};