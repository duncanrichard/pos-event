<?php

use App\Http\Controllers\Admin\DashboardController;
use Illuminate\Support\Facades\Route;

Route::prefix('admin/dashboard')
    ->name('admin.dashboard.')
    ->controller(DashboardController::class)
    ->group(function () {
        Route::get('/', 'index')->name('index');
    });