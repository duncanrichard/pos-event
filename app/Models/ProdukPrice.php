<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ProdukPrice extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'produk_price';

    protected $primaryKey = 'id';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'produk_id',
        'event_id',

        // Untuk membedakan harga produk biasa atau bundle
        'tipe_harga',     // single / bundle
        'nama_bundle',    // wajib jika tipe_harga = bundle

        'harga_produk',
    ];

    protected $casts = [
        'harga_produk' => 'decimal:2',
    ];

    /*
    |--------------------------------------------------------------------------
    | Relations
    |--------------------------------------------------------------------------
    */

    public function produk()
    {
        return $this->belongsTo(Produk::class, 'produk_id');
    }

    public function event()
    {
        return $this->belongsTo(DataEvent::class, 'event_id');
    }

    public function bundleDetails()
    {
        return $this->hasMany(ProdukPriceDetail::class, 'produk_price_id');
    }

    public function bundleProducts()
    {
        return $this->belongsToMany(
            Produk::class,
            'produk_price_details',
            'produk_price_id',
            'produk_id'
        )
            ->withPivot('qty')
            ->withTimestamps();
    }

    /*
    |--------------------------------------------------------------------------
    | Helpers
    |--------------------------------------------------------------------------
    */

    public function isSingle(): bool
    {
        return $this->tipe_harga === 'single';
    }

    public function isBundle(): bool
    {
        return $this->tipe_harga === 'bundle';
    }

    public function getDisplayNameAttribute(): string
    {
        if ($this->isBundle()) {
            return $this->nama_bundle ?: 'Bundle Tanpa Nama';
        }

        return $this->produk?->nama_produk ?: 'Produk Tanpa Nama';
    }
}