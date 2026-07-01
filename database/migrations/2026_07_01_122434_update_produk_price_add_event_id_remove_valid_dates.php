<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('produk_price', function (Blueprint $table) {
            if (Schema::hasColumn('produk_price', 'valid_from')) {
                $table->dropColumn('valid_from');
            }

            if (Schema::hasColumn('produk_price', 'valid_until')) {
                $table->dropColumn('valid_until');
            }
        });

        Schema::table('produk_price', function (Blueprint $table) {
            if (!Schema::hasColumn('produk_price', 'event_id')) {
                $table->uuid('event_id')->nullable()->after('harga_produk');
            }
        });

        if (!$this->foreignKeyExists('produk_price', 'produk_price_event_id_foreign')) {
            Schema::table('produk_price', function (Blueprint $table) {
                $table->foreign('event_id')
                    ->references('id')
                    ->on('data_event')
                    ->nullOnDelete();
            });
        }

        if (!$this->indexExists('produk_price', 'produk_price_event_id_index')) {
            Schema::table('produk_price', function (Blueprint $table) {
                $table->index('event_id');
            });
        }

        /*
         * Tidak perlu buat index produk_id lagi,
         * karena index produk_price_produk_id_index sudah ada.
         */
    }

    public function down(): void
    {
        if ($this->foreignKeyExists('produk_price', 'produk_price_event_id_foreign')) {
            Schema::table('produk_price', function (Blueprint $table) {
                $table->dropForeign(['event_id']);
            });
        }

        if ($this->indexExists('produk_price', 'produk_price_event_id_index')) {
            Schema::table('produk_price', function (Blueprint $table) {
                $table->dropIndex(['event_id']);
            });
        }

        Schema::table('produk_price', function (Blueprint $table) {
            if (Schema::hasColumn('produk_price', 'event_id')) {
                $table->dropColumn('event_id');
            }
        });

        Schema::table('produk_price', function (Blueprint $table) {
            if (!Schema::hasColumn('produk_price', 'valid_from')) {
                $table->date('valid_from')->nullable()->after('harga_produk');
            }

            if (!Schema::hasColumn('produk_price', 'valid_until')) {
                $table->date('valid_until')->nullable()->after('valid_from');
            }
        });
    }

    private function indexExists(string $table, string $indexName): bool
    {
        $result = DB::selectOne(
            "select exists (
                select 1
                from pg_indexes
                where schemaname = current_schema()
                and tablename = ?
                and indexname = ?
            ) as exists",
            [$table, $indexName]
        );

        return (bool) $result->exists;
    }

    private function foreignKeyExists(string $table, string $constraintName): bool
    {
        $result = DB::selectOne(
            "select exists (
                select 1
                from information_schema.table_constraints
                where table_schema = current_schema()
                and table_name = ?
                and constraint_name = ?
                and constraint_type = 'FOREIGN KEY'
            ) as exists",
            [$table, $constraintName]
        );

        return (bool) $result->exists;
    }
};