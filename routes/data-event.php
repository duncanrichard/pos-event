<?php

use App\Http\Controllers\Admin\DataEventController;
use Illuminate\Support\Facades\Route;

Route::prefix('admin/data-event')
    ->name('admin.data-event.')
    ->controller(DataEventController::class)
    ->group(function () {
        Route::get('/', 'index')->name('index');
        Route::post('/', 'store')->name('store');

        Route::get('/{id}', 'show')->whereUuid('id')->name('show');
        Route::put('/{id}', 'update')->whereUuid('id')->name('update');
        Route::patch('/{id}', 'update')->whereUuid('id')->name('patch');
        Route::delete('/{id}', 'destroy')->whereUuid('id')->name('destroy');
    });