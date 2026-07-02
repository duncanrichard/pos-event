<?php

use Illuminate\Support\Facades\Route;

Route::view('/', 'app')->name('home');
Route::view('/login', 'app')->name('login');
Route::view('/dashboard', 'app')->name('dashboard');

require __DIR__ . '/auth.php';

require __DIR__ . '/dashboard.php';

require __DIR__ . '/kategori-produk.php';
require __DIR__ . '/package.php';
require __DIR__ . '/brand.php';
require __DIR__ . '/satuan.php';
require __DIR__ . '/supplier.php';
require __DIR__ . '/produk.php';
require __DIR__ . '/produk-price.php';
require __DIR__ . '/data-event.php';
require __DIR__ . '/event-inbound.php';
require __DIR__ . '/pos.php';
require __DIR__ . '/report-stok-akhir.php';
require __DIR__ . '/report-transaksi-customer.php';

// Untuk React Router supaya halaman tidak 404 saat refresh
Route::fallback(function () {
    return view('app');
});