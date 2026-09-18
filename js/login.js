// Ganti Username dan Password sesuai keinginan Anda
const VALID_USER = "admin";
const VALID_PASS = "rahasia123";

// Fungsi untuk membuka Modal Login
function openLoginModal() {
    document.getElementById('loginModal').style.display = 'flex';
    document.getElementById('loginError').style.display = 'none';
}

// Fungsi untuk menutup Modal Login jika dibatalkan
function closeLoginModal() {
    document.getElementById('loginModal').style.display = 'none';
}

// Fungsi Proses Verifikasi Login
function processLogin() {
    const userVal = document.getElementById('usernameInput').value;
    const passVal = document.getElementById('passwordInput').value;
    const errorMsg = document.getElementById('loginError');

    if (userVal === VALID_USER && passVal === VALID_PASS) {
        // Jika login benar:
        document.getElementById('loginModal').style.display = 'none'; // Sembunyikan Modal
        document.getElementById('mainContent').style.display = 'block'; // Tampilkan Aplikasi Utama
        document.getElementById('btnLoginNav').style.display = 'none';  // Sembunyikan Tombol Login setelah masuk
        
        // Simpan status login di SessionStorage (opsional, agar saat dibuka di tab baru tidak perlu login lagi)
        sessionStorage.setItem('isLoggedIn', 'true');
    } else {
        // Jika login salah:
        errorMsg.style.display = 'block';
    }
}

// Cek status saat halaman dimuat
window.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem('isLoggedIn') === 'true') {
        document.getElementById('mainContent').style.display = 'block';
        document.getElementById('btnLoginNav').style.display = 'none';
    } else {
        document.getElementById('mainContent').style.display = 'none';
    }
});
