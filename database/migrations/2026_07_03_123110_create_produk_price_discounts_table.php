<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('produk_price_discounts', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->uuid('produk_price_id');

            // Qty minimal dan maksimal
            // max_qty nullable artinya tidak ada batas atas
            $table->unsignedInteger('min_qty')->default(1);
            $table->unsignedInteger('max_qty')->nullable();

            // percent = diskon persen
            // nominal = diskon rupiah per satuan
            $table->string('discount_type', 20)->default('percent');

            // Contoh:
            // discount_type percent, discount_value 10 = diskon 10%
            // discount_type nominal, discount_value 500 = diskon Rp 500
            $table->decimal('discount_value', 15, 2)->default(0);

            $table->boolean('is_active')->default(true);

            $table->timestamps();
            $table->softDeletes();

            $table->foreign('produk_price_id')
                ->references('id')
                ->on('produk_price')
                ->cascadeOnDelete();

            $table->index(['produk_price_id', 'min_qty', 'max_qty']);
            $table->index(['produk_price_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('produk_price_discounts');
    }
};