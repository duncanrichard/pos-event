<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('produk_price', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('produk_id')
                ->constrained('produk')
                ->cascadeOnDelete();

            $table->decimal('harga_produk', 15, 2)->default(0);
            $table->date('valid_from')->nullable();
            $table->date('valid_until')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index('produk_id');
            $table->index(['valid_from', 'valid_until']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('produk_price');
    }
};