<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('produk', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('kategori_produk_id')
                ->nullable()
                ->constrained('kategori_produk')
                ->nullOnDelete();

            $table->foreignUuid('brand_id')
                ->nullable()
                ->constrained('brands')
                ->nullOnDelete();

            $table->foreignUuid('satuan_id')
                ->nullable()
                ->constrained('satuans')
                ->nullOnDelete();

            $table->foreignUuid('package_id')
                ->nullable()
                ->constrained('packages')
                ->nullOnDelete();

            $table->string('nama_produk');
            $table->string('product_number')->nullable();
            $table->decimal('weight', 12, 2)->nullable();
            $table->string('code_gs1')->nullable();
            $table->string('image')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index('kategori_produk_id');
            $table->index('brand_id');
            $table->index('satuan_id');
            $table->index('package_id');
            $table->index('nama_produk');
            $table->index('product_number');
            $table->index('code_gs1');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('produk');
    }
};