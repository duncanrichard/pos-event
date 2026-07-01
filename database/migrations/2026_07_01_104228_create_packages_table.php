<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('packages', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->string('package');

            $table->timestamps();
            $table->softDeletes();

            $table->unique('package');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('packages');
    }
};