<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('satuans', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->string('satuan');

            $table->timestamps();
            $table->softDeletes();

            $table->unique('satuan');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('satuans');
    }
};