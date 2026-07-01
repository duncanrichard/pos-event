<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class DataEvent extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'data_event';

    protected $primaryKey = 'id';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'nama_event',
        'alamat_event',
        'valid_from',
        'valid_until',
    ];

    protected $casts = [
        'valid_from' => 'date:Y-m-d',
        'valid_until' => 'date:Y-m-d',
    ];

    public function produkPrices()
    {
        return $this->hasMany(ProdukPrice::class, 'event_id');
    }
}