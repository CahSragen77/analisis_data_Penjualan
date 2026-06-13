// Export Module
const ExportManager = (function() {
    function exportToExcel(data, filename) {
        const wb = XLSX.utils.book_new();
        
        // Create worksheets
        const sheets = [
            { name: 'Transaksi_Detail', data: data.c_trans },
            { name: 'Penjualan_Header', data: data.c_tsale },
            { name: 'Member', data: data.m_cust },
            { name: 'Produk', data: data.m_loader },
            { name: 'EOD_Log', data: data.cek_eod }
        ];
        
        sheets.forEach(sheet => {
            if (sheet.data && sheet.data.length > 0) {
                const ws = XLSX.utils.json_to_sheet(sheet.data);
                // Auto-size columns
                const colWidths = [];
                for (let i = 0; i < Object.keys(sheet.data[0] || {}).length; i++) {
                    colWidths.push({ wch: 15 });
                }
                ws['!cols'] = colWidths;
                XLSX.utils.book_append_sheet(wb, ws, sheet.name);
            }
        });
        
        // Create summary sheet
        const summaryData = generateSummaryData(data);
        const summarySheet = XLSX.utils.json_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, summarySheet, 'Ringkasan');
        
        // Save file
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        XLSX.writeFile(wb, `AmandaMart_Report_${timestamp}.xlsx`);
    }
    
    function generateSummaryData(data) {
        const summary = [];
        
        // Add transaction summary
        summary.push({
            'Kategori': 'Total Transaksi',
            'Nilai': data.c_trans.length,
            'Keterangan': ''
        });
        summary.push({
            'Kategori': 'Total Penjualan',
            'Nilai': data.c_tsale.length,
            'Keterangan': ''
        });
        summary.push({
            'Kategori': 'Total Member',
            'Nilai': data.m_cust.length,
            'Keterangan': ''
        });
        summary.push({
            'Kategori': 'Total Produk',
            'Nilai': data.m_loader.length,
            'Keterangan': ''
        });
        
        // Calculate financial summary
        let totalSales = 0;
        data.c_tsale.forEach(sale => {
            totalSales += sale.jum || 0;
        });
        
        summary.push({
            'Kategori': 'Total Omset Penjualan',
            'Nilai': ChartsManager.formatRupiah(totalSales),
            'Keterangan': ''
        });
        
        return summary;
    }
    
    function exportProfitLoss(profitLossData) {
        const wb = XLSX.utils.book_new();
        
        // Products detail
        const productsSheet = XLSX.utils.json_to_sheet(profitLossData.products);
        XLSX.utils.book_append_sheet(wb, productsSheet, 'Laba_Rugi_Produk');
        
        // Summary sheet
        const summary = [
            {
                'Item': 'Total Pendapatan',
                'Nilai': profitLossData.totalRevenue,
                'Formatted': ChartsManager.formatRupiah(profitLossData.totalRevenue)
            },
            {
                'Item': 'Total HPP',
                'Nilai': profitLossData.totalHPP,
                'Formatted': ChartsManager.formatRupiah(profitLossData.totalHPP)
            },
            {
                'Item': 'Laba Bersih',
                'Nilai': profitLossData.totalProfit,
                'Formatted': ChartsManager.formatRupiah(profitLossData.totalProfit)
            },
            {
                'Item': 'Margin Laba',
                'Nilai': profitLossData.totalRevenue > 0 
                    ? ((profitLossData.totalProfit / profitLossData.totalRevenue) * 100).toFixed(2)
                    : 0,
                'Formatted': profitLossData.totalRevenue > 0 
                    ? `${((profitLossData.totalProfit / profitLossData.totalRevenue) * 100).toFixed(2)}%`
                    : '0%'
            }
        ];
        
        const summarySheet = XLSX.utils.json_to_sheet(summary);
        XLSX.utils.book_append_sheet(wb, summarySheet, 'Ringkasan_Laba_Rugi');
        
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        XLSX.writeFile(wb, `AmandaMart_ProfitLoss_${timestamp}.xlsx`);
    }
    
    return {
        exportToExcel: exportToExcel,
        exportProfitLoss: exportProfitLoss
    };
})();
