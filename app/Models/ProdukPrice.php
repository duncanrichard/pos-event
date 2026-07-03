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

        // single / bundle
        'tipe_harga',
        'nama_bundle',

        // Harga dasar sebelum diskon qty
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

    public function discounts()
    {
        return $this->hasMany(ProdukPriceDiscount::class, 'produk_price_id')
            ->where('is_active', true)
            ->orderBy('min_qty');
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

    public function getDiscountForQty(int $qty): ?ProdukPriceDiscount
    {
        $qty = max($qty, 1);

        return $this->discounts
            ->first(function ($discount) use ($qty) {
                $minQty = (int) $discount->min_qty;
                $maxQty = $discount->max_qty !== null ? (int) $discount->max_qty : null;

                return $qty >= $minQty && ($maxQty === null || $qty <= $maxQty);
            });
    }

    public function getDiscountAmountForQty(int $qty): float
    {
        $basePrice = (float) $this->harga_produk;
        $discount = $this->getDiscountForQty($qty);

        if (!$discount) {
            return 0;
        }

        $discountValue = (float) $discount->discount_value;

        if ($discount->discount_type === 'percent') {
            return round($basePrice * ($discountValue / 100), 2);
        }

        if ($discount->discount_type === 'nominal') {
            return min($discountValue, $basePrice);
        }

        return 0;
    }

    public function getFinalUnitPriceForQty(int $qty): float
    {
        $basePrice = (float) $this->harga_produk;
        $discountAmount = $this->getDiscountAmountForQty($qty);

        return max($basePrice - $discountAmount, 0);
    }

    public function getSubtotalForQty(int $qty): float
    {
        $qty = max($qty, 1);

        return $this->getFinalUnitPriceForQty($qty) * $qty;
    }
}