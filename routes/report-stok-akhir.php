<?php

use App\Http\Controllers\Admin\ReportStokAkhirController;
use Illuminate\Support\Facades\Route;

Route::prefix('admin/report-stok-akhir')
    ->name('admin.report-stok-akhir.')
    ->controller(ReportStokAkhirController::class)
    ->group(function () {
        Route::get('/', 'index')->name('index');
        Route::get('/options', 'options')->name('options');
    });