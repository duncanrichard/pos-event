<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('suppliers', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->string('nama_supplier');
            $table->string('contact_supplier')->nullable();
            $table->text('alamat')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index('nama_supplier');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('suppliers');
    }
};