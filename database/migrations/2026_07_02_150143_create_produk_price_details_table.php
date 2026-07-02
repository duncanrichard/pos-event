<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('produk_price_details')) {
            Schema::create('produk_price_details', function (Blueprint $table) {
                $table->uuid('id')->primary();

                $table->uuid('produk_price_id');
                $table->uuid('produk_id');
                $table->integer('qty')->default(1);

                $table->timestamps();
                $table->softDeletes();

                $table->foreign('produk_price_id')
                    ->references('id')
                    ->on('produk_price')
                    ->cascadeOnDelete();

                $table->foreign('produk_id')
                    ->references('id')
                    ->on('produk')
                    ->restrictOnDelete();

                $table->unique(['produk_price_id', 'produk_id']);
            });

            DB::statement("
                ALTER TABLE produk_price_details
                ADD CONSTRAINT produk_price_details_qty_check
                CHECK (qty > 0)
            ");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('produk_price_details');
    }
};