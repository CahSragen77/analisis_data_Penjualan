// Charts Module
const ChartsManager = (function() {
    let transChart = null;
    let paymentChart = null;
    let profitLossChart = null;
    
    // Fungsi pembantu ditempatkan di atas agar aman saat dipanggil oleh chart tooltip
    function formatRupiah(val) {
        if (val === undefined || val === null) return 'Rp 0';
        let num = parseFloat(val);
        if (isNaN(num)) return val;
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(num);
    }
    
    // Generate summary from sales data
    function generateSummaryAndCharts(salesData) {
        const groupMap = new Map();
        let totalCashAll = 0, totalQrisAll = 0, totalDebitAll = 0;
        
        salesData.forEach(sale => {
            const tgl = sale.tgl_f;
            if (!tgl) return;
            
            if (!groupMap.has(tgl)) {
                groupMap.set(tgl, { count: 0, total: 0, cash: 0, qris: 0, debit: 0 });
            }
            
            const rec = groupMap.get(tgl);
            rec.count++;
            const nominal = parseFloat(sale.jum) || 0; // Memastikan data berupa angka numeric
            rec.total += nominal;
            
            // Payment method detection
            let metode = 'cash';
            if (sale.j_card) {
                const jcardUpper = sale.j_card.toString().toUpperCase();
                if (jcardUpper.includes('QRIS')) metode = 'qris';
                else if (jcardUpper.includes('DEBIT') || jcardUpper.includes('CREDIT')) metode = 'debit';
            }
            if (metode === 'cash' && sale.card && parseFloat(sale.card) > 0) {
                metode = 'debit';
            }
            
            // Pengelompokan data dioptimalkan dalam satu blok logika
            if (metode === 'cash') {
                rec.cash += nominal;
                totalCashAll += nominal;
            } else if (metode === 'qris') {
                rec.qris += nominal;
                totalQrisAll += nominal;
            } else {
                rec.debit += nominal;
                totalDebitAll += nominal;
            }
        });
        
        const sortedDates = Array.from(groupMap.keys()).sort();
        const summaryRows = [];
        const labels = [], countData = [];
        
        for (let dt of sortedDates) {
            const d = groupMap.get(dt);
            labels.push(dt);
            countData.push(d.count);
            summaryRows.push({
                tanggal: dt,
                total_trx: d.count,
                nominal: d.total,
                cash: d.cash,
                qris: d.qris,
                debit: d.debit,
                avg: d.count > 0 ? (d.total / d.count) : 0 // Proteksi error pembagian dengan angka 0
            });
        }
        
        // Update charts bawaan dashboard secara otomatis
        updateTransChart(labels, countData);
        updatePaymentChart(totalCashAll, totalQrisAll, totalDebitAll);
        
        return summaryRows;
    }
    
    function updateTransChart(labels, data) {
        const ctx = document.getElementById('transChart');
        if (!ctx) return;
        
        if (transChart) transChart.destroy();
        
        transChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Jumlah Transaksi',
                    data: data,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102,126,234,0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#764ba2',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false, // Diubah ke false agar lebih pas di grid Bootstrap
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            font: { size: 12, weight: 'bold' }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: '#667eea',
                        borderWidth: 2
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0,0,0,0.05)' }
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        });
    }
    
    function updatePaymentChart(cash, qris, debit) {
        const ctx = document.getElementById('paymentChart');
        if (!ctx) return;
        
        if (paymentChart) paymentChart.destroy();
        
        paymentChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Cash', 'QRIS', 'Debit/Credit'],
                datasets: [{
                    data: [cash, qris, debit],
                    backgroundColor: ['#10b981', '#3b82f6', '#f59e0b'],
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: { size: 12 },
                            padding: 15
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return ` ${label}: ${formatRupiah(value)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    function updateProfitLossChart(revenueData, costData, profitData) {
        const ctx = document.getElementById('profitLossChart');
        if (!ctx) return;
        
        if (profitLossChart) profitLossChart.destroy();
        
        profitLossChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Pendapatan', 'HPP', 'Laba Bersih'],
                datasets: [{
                    label: 'Nilai (Rp)',
                    data: [revenueData, costData, profitData],
                    backgroundColor: ['#10b981', '#ef4444', '#3b82f6'],
                    borderRadius: 10,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                return ` ${formatRupiah(context.raw)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => {
                                return formatRupiah(value);
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Ekspos fungsi ke global scope agar bisa diakses oleh main.js
    return {
        generateSummaryAndCharts: generateSummaryAndCharts,
        updateProfitLossChart: updateProfitLossChart,
        formatRupiah: formatRupiah
    };
})();
