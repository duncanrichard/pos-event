<?php

use App\Http\Controllers\Admin\PosController;
use Illuminate\Support\Facades\Route;

Route::prefix('admin/pos')
    ->name('admin.pos.')
    ->controller(PosController::class)
    ->group(function () {
        /*
        |--------------------------------------------------------------------------
        | Options & Invoice List
        |--------------------------------------------------------------------------
        */
        Route::get('/options', 'options')
            ->name('options');

        Route::get('/drafts', 'drafts')
            ->name('drafts');

        /*
        |--------------------------------------------------------------------------
        | Cart / Invoice
        |--------------------------------------------------------------------------
        */
        Route::post('/cart/start', 'startCart')
            ->name('cart.start');

        Route::get('/cart/{id}', 'showCart')
            ->whereUuid('id')
            ->name('cart.show');

        Route::get('/cart/{id}/nota', 'nota')
            ->whereUuid('id')
            ->name('cart.nota');

        /*
        |--------------------------------------------------------------------------
        | Add Product / Bundle
        |--------------------------------------------------------------------------
        | Produk satuan:
        | - kirim code_gs1
        |
        | Produk manual / Bundle:
        | - kirim produk_price_id
        |--------------------------------------------------------------------------
        */
        Route::post('/cart/{id}/scan', 'scanProduct')
            ->whereUuid('id')
            ->name('cart.scan');

        /*
        |--------------------------------------------------------------------------
        | Cart Item
        |--------------------------------------------------------------------------
        | Update qty dan diskon manual item:
        | PATCH /admin/pos/cart/{cartId}/item/{detailId}
        |
        | Payload contoh:
        | {
        |   "qty": 10,
        |   "manual_discount_type": "percent",
        |   "manual_discount_value": 10
        | }
        |--------------------------------------------------------------------------
        */
        Route::patch('/cart/{cartId}/item/{detailId}', 'updateItem')
            ->whereUuid('cartId')
            ->whereUuid('detailId')
            ->name('cart.item.update');

        Route::delete('/cart/{cartId}/item/{detailId}', 'deleteItem')
            ->whereUuid('cartId')
            ->whereUuid('detailId')
            ->name('cart.item.delete');

        /*
        |--------------------------------------------------------------------------
        | Void & Payment
        |--------------------------------------------------------------------------
        */
        Route::post('/cart/{id}/void', 'voidCart')
            ->whereUuid('id')
            ->name('cart.void');

        Route::post('/cart/{id}/pay', 'pay')
            ->whereUuid('id')
            ->name('cart.pay');
    });