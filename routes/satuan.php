<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Admin\SatuanController;

Route::prefix('admin/satuan')
    ->name('admin.satuan.')
    ->controller(SatuanController::class)
    ->group(function () {
        Route::get('/', 'index')->name('index');
        Route::post('/', 'store')->name('store');

        Route::get('/{id}', 'show')->name('show');
        Route::put('/{id}', 'update')->name('update');
        Route::patch('/{id}', 'update')->name('patch');
        Route::delete('/{id}', 'destroy')->name('destroy');
    });