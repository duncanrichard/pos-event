<?php

use App\Http\Controllers\Admin\PosController;
use Illuminate\Support\Facades\Route;

Route::prefix('admin/pos')
    ->name('admin.pos.')
    ->controller(PosController::class)
    ->group(function () {
        Route::get('/options', 'options')->name('options');
        Route::get('/drafts', 'drafts')->name('drafts');

        Route::post('/cart/start', 'startCart')->name('cart.start');

        Route::get('/cart/{id}', 'showCart')
            ->whereUuid('id')
            ->name('cart.show');

        Route::get('/cart/{id}/nota', 'nota')
            ->whereUuid('id')
            ->name('cart.nota');

        Route::post('/cart/{id}/scan', 'scanProduct')
            ->whereUuid('id')
            ->name('cart.scan');

        Route::patch('/cart/{cartId}/item/{detailId}', 'updateItem')
            ->whereUuid('cartId')
            ->whereUuid('detailId')
            ->name('cart.item.update');

        Route::delete('/cart/{cartId}/item/{detailId}', 'deleteItem')
            ->whereUuid('cartId')
            ->whereUuid('detailId')
            ->name('cart.item.delete');

        Route::post('/cart/{id}/void', 'voidCart')
            ->whereUuid('id')
            ->name('cart.void');

        Route::post('/cart/{id}/pay', 'pay')
            ->whereUuid('id')
            ->name('cart.pay');
    });
