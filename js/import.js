function processLogin() {
    const user = document.getElementById('usernameInput').value;
    const pass = document.getElementById('passwordInput').value;

    // Contoh verifikasi sederhana (sesuaikan dengan logic Anda)
    if (user === "admin" && pass === "123456") {
        // 1. Sembunyikan Modal Login
        closeLoginModal();
        
        // 2. Tampilkan Tombol Upload SQL
        document.getElementById('btnUploadSql').style.display = 'inline-block';
        
        // 3. Ubah Tombol Login jadi Logout
        const loginBtn = document.getElementById('btnLoginNav');
        loginBtn.innerHTML = '🚪 Logout';
        loginBtn.onclick = processLogout; // Fungsi logout jika diklik lagi
        
        alert("Login berhasil!");
    } else {
        document.getElementById('loginError').style.display = 'block';
    }
}

function processLogout() {
    // Sembunyikan kembali tombol upload saat logout
    document.getElementById('btnUploadSql').style.display = 'none';
    
    // Kembalikan tombol ke status Login
    const loginBtn = document.getElementById('btnLoginNav');
    loginBtn.innerHTML = '🔑 Login';
    loginBtn.onclick = openLoginModal;
    
    alert("Anda telah logout.");
}
