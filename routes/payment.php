<?php

use App\Http\Controllers\Admin\PaymentController;
use Illuminate\Support\Facades\Route;

Route::prefix('admin/payment')
    ->name('admin.payment.')
    ->controller(PaymentController::class)
    ->group(function () {
        Route::get('/', 'index')->name('index');
        Route::post('/', 'store')->name('store');

        Route::get('/{id}', 'show')->whereUuid('id')->name('show');
        Route::put('/{id}', 'update')->whereUuid('id')->name('update');
        Route::patch('/{id}', 'update')->whereUuid('id')->name('patch');
        Route::delete('/{id}', 'destroy')->whereUuid('id')->name('destroy');
    });