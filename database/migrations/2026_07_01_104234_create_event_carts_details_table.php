<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('event_carts_detail', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('event_carts_id')
                ->constrained('event_carts')
                ->cascadeOnDelete();

            $table->foreignUuid('produk_price_id')
                ->constrained('produk_price')
                ->cascadeOnDelete();

            $table->integer('qty')->default(1);

            $table->timestamps();
            $table->softDeletes();

            $table->index('event_carts_id');
            $table->index('produk_price_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_carts_detail');
    }
};