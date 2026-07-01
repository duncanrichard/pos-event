<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('event_inbound', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('supplier_id')
                ->nullable()
                ->constrained('suppliers')
                ->nullOnDelete();

            $table->foreignUuid('event_id')
                ->constrained('data_event')
                ->cascadeOnDelete();

            $table->foreignUuid('produk_price_id')
                ->constrained('produk_price')
                ->cascadeOnDelete();

            $table->integer('jumlah_produk')->default(0);
            $table->date('tanggal_inbound');

            $table->timestamps();
            $table->softDeletes();

            $table->index('supplier_id');
            $table->index('event_id');
            $table->index('produk_price_id');
            $table->index('tanggal_inbound');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_inbound');
    }
};