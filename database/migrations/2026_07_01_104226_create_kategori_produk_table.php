<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('kategori_produk', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->string('kategori');

            $table->timestamps();
            $table->softDeletes();

            $table->unique('kategori');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kategori_produk');
    }
};