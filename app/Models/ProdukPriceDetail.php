<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ProdukPriceDetail extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'produk_price_details';

    protected $fillable = [
        'id',
        'produk_price_id',
        'produk_id',
        'qty',
    ];

    protected $casts = [
        'qty' => 'integer',
    ];

    public function produkPrice()
    {
        return $this->belongsTo(ProdukPrice::class, 'produk_price_id');
    }

    public function produk()
    {
        return $this->belongsTo(Produk::class, 'produk_id');
    }
}