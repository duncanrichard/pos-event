<?php

use App\Http\Controllers\Admin\ReportTransaksiCustomerController;
use Illuminate\Support\Facades\Route;

Route::prefix('admin/report-transaksi-customer')
    ->name('admin.report-transaksi-customer.')
    ->controller(ReportTransaksiCustomerController::class)
    ->group(function () {
        Route::get('/', 'index')->name('index');
    });