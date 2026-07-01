<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('data_event', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->string('nama_event');
            $table->text('alamat_event')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index('nama_event');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('data_event');
    }
};