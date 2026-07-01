<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Admin\BrandController;

Route::prefix('admin/brand')
    ->name('admin.brand.')
    ->controller(BrandController::class)
    ->group(function () {
        Route::get('/', 'index')->name('index');
        Route::post('/', 'store')->name('store');

        Route::get('/{id}', 'show')->name('show');
        Route::put('/{id}', 'update')->name('update');
        Route::patch('/{id}', 'update')->name('patch');
        Route::delete('/{id}', 'destroy')->name('destroy');
    });