// Security & Fraud Detection Module
const GuardManager = (function() {
    
    function analyzeFraud(data) {
        const anomalies = [];
        const tsaleData = data.c_tsale || [];
        
        tsaleData.forEach(sale => {
            // 1. Deteksi Uang Kembali Ekstrem (Potensi salah ketik / trik laci kasir)
            if (sale.kembali > 150000) {
                anomalies.push({
                    nota: sale.no_nota || 'Tanpa Nota',
                    tipe: 'Kembalian Ekstrem',
                    keterangan: `Kembalian Rp ${sale.kembali.toLocaleString('id-ID')} (Total Belanja: Rp ${sale.jum.toLocaleString('id-ID')})`,
                    level: 'DANGER',
                    badgeColor: 'bg-danger'
                });
            }
            
            // 2. Deteksi Diskon Tidak Wajar (Diskon > 40% dari total belanja)
            if (sale.disc > 0 && sale.disc > (sale.jum * 0.4)) {
                anomalies.push({
                    nota: sale.no_nota || 'Tanpa Nota',
                    tipe: 'Diskon Berlebih',
                    keterangan: `Diskon Rp ${sale.disc.toLocaleString('id-ID')} memakan ${( (sale.disc/sale.jum) * 100 ).toFixed(0)}% total omset struk.`,
                    level: 'WARNING',
                    badgeColor: 'bg-warning'
                });
            }

            // 3. Deteksi Transaksi Jam Kalong (Misal toko tutup jam 22.00, tapi ada transaksi jam 23.00 - 04.00)
            if (sale.jam) {
                const jamTrx = parseInt(sale.jam.split(':')[0]); // Ambil angka jamnya saja
                if (jamTrx >= 23 || jamTrx <= 4) {
                    anomalies.push({
                        nota: sale.no_nota || 'Tanpa Nota',
                        tipe: 'Transaksi Jam Kalong',
                        keterangan: `Transaksi dilakukan pada jam rawan (${sale.jam})`,
                        level: 'INFO',
                        badgeColor: 'bg-info'
                    });
                }
            }
        });
        
        return anomalies;
    }
    
    return {
        analyzeFraud: analyzeFraud
    };
})();
