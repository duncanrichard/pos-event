<?php

use App\Http\Controllers\Admin\ProdukController;
use Illuminate\Support\Facades\Route;

Route::prefix('admin/produk')
    ->name('admin.produk.')
    ->controller(ProdukController::class)
    ->group(function () {
        Route::get('/', 'index')->name('index');
        Route::get('/options', 'options')->name('options');
        Route::get('/export-gs1-pdf', 'exportGs1Pdf')->name('export-gs1-pdf');

        Route::post('/', 'store')->name('store');

        Route::get('/{id}', 'show')->whereUuid('id')->name('show');
        Route::put('/{id}', 'update')->whereUuid('id')->name('update');
        Route::patch('/{id}', 'update')->whereUuid('id')->name('patch');
        Route::delete('/{id}', 'destroy')->whereUuid('id')->name('destroy');
    });