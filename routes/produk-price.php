<?php

use App\Http\Controllers\Admin\ProdukPriceController;
use Illuminate\Support\Facades\Route;

Route::prefix('admin/produk-price')
    ->name('admin.produk-price.')
    ->controller(ProdukPriceController::class)
    ->group(function () {
        Route::get('/', 'index')->name('index');
        Route::get('/options', 'options')->name('options');
        Route::post('/', 'store')->name('store');

        Route::get('/{id}', 'show')
            ->whereUuid('id')
            ->name('show');

        Route::put('/{id}', 'update')
            ->whereUuid('id')
            ->name('update');

        Route::patch('/{id}', 'update')
            ->whereUuid('id')
            ->name('patch');

        Route::delete('/{id}', 'destroy')
            ->whereUuid('id')
            ->name('destroy');
    });
