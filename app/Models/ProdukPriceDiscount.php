<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ProdukPriceDiscount extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'produk_price_discounts';

    protected $primaryKey = 'id';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'produk_price_id',
        'min_qty',
        'max_qty',
        'discount_type',
        'discount_value',
        'is_active',
    ];

    protected $casts = [
        'min_qty' => 'integer',
        'max_qty' => 'integer',
        'discount_value' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    public function produkPrice()
    {
        return $this->belongsTo(ProdukPrice::class, 'produk_price_id');
    }

    public function isPercent(): bool
    {
        return $this->discount_type === 'percent';
    }

    public function isNominal(): bool
    {
        return $this->discount_type === 'nominal';
    }
}