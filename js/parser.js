// SQL Parser Module - FIXED ANTI NOMBOK VERSION (OPTIMIZED)
const SQLParser = (function() {
    
    // Parse SQL COPY format
    function parseSQLCopy(sqlText) {
        const result = {
            c_trans: [],
            c_tsale: [],
            m_cust: [],
            m_loader: [],
            cek_eod: []
        };
        
        const lines = sqlText.split(/\r?\n/);
        let currentTable = null;
        let columns = [];
        let inCopy = false;
        let copyDataLines = [];

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            let copyMatch = line.match(/^COPY public\.(\w+)\s*\((.*?)\)\s+FROM stdin;/i);
            
            if (copyMatch) {
                currentTable = copyMatch[1].toLowerCase();
                let colStr = copyMatch[2];
                columns = colStr.split(',').map(c => c.trim().replace(/"/g, ''));
                inCopy = true;
                copyDataLines = [];
                continue;
            }
            
            if (inCopy) {
                if (line.trim() === '\\ .' || line.trim() === '\\.') {
                    const parsedRows = parseCopyDataRows(copyDataLines, columns, currentTable);
                    if (result[currentTable]) {
                        result[currentTable].push(...parsedRows);
                    }
                    inCopy = false;
                    currentTable = null;
                    continue;
                }
                if (line.startsWith('--') || line.trim() === '') continue;
                copyDataLines.push(line);
            }
        }
        
        return result;
    }

    function parseCopyDataRows(rows, columns, tableName) {
        const dataRows = [];
        
        for (let row of rows) {
            if (row.trim() === '') continue;
            
            let values = [];
            let current = '';
            let inEscape = false;
            
            for (let ch of row) {
                if (ch === '\\' && !inEscape) {
                    inEscape = true;
                    current += ch;
                    continue;
                }
                if (ch === '\t' && !inEscape) {
                    values.push(cleanNullValue(current));
                    current = '';
                    continue;
                }
                current += ch;
                inEscape = false;
            }
            values.push(cleanNullValue(current));
            
            if (values.length !== columns.length) continue;
            
            let obj = {};
            columns.forEach((col, idx) => {
                obj[col] = typeof values[idx] === 'string' ? values[idx].trim() : values[idx];
            });
            
            // Parse numeric values
            if (tableName === 'c_trans') {
                obj.price = parseFloat(obj.price) || 0;
                obj.qty = parseFloat(obj.qty) || 0;
            }
            
            // === BAGIAN PERBAIKAN UTAMA PENGURANG UTK c_tsale ===
            if (tableName === 'c_tsale') {
                obj.jum = parseFloat(obj.jum) || 0;
                obj.cash = parseFloat(obj.cash) || 0;
                obj.card = parseFloat(obj.card) || 0;
                obj.kembali = parseFloat(obj.kembali) || 0;
                
                // Parsing kolom pengurang
                obj.disc = parseFloat(obj.disc) || 0;
                obj.voucher = parseFloat(obj.voucher) || 0;
                obj.donasi = parseFloat(obj.donasi) || 0;
                obj.hemat = parseFloat(obj.hemat) || 0;

                // Hitung otomatis angka bersih harian (Anti Nombok)
                obj.fix_setoran_server = obj.jum - obj.disc - obj.card - obj.voucher - obj.donasi - obj.hemat;
            }
            
            if (tableName === 'm_cust') {
                obj.point = parseInt(obj.point) || 0;
            }
            if (tableName === 'm_loader') {
                obj.price1 = parseFloat(obj.price1) || 0;
                obj.m_price = parseFloat(obj.m_price) || 0;
            }
            
            dataRows.push(obj);
        }
        
        return dataRows;
    }

    function cleanNullValue(val) {
        if (!val || val === '\\N' || val === 'NULL') return null;
        if (val.startsWith('\\') && val.length > 1) return val.substring(1);
        return val;
    }

    // Calculate Profit & Loss (HIGH PERFORMANCE & SINKRON VERSION)
    function calculateProfitLoss(data) {
        const productSales = new Map();
        
        // 🚀 OPTIMASI UTAMA: Buat Indexing Map untuk m_loader agar pencarian O(1)
        const loaderMap = new Map();
        if (data.m_loader && Array.isArray(data.m_loader)) {
            data.m_loader.forEach(p => {
                if (p.plu) {
                    const cleanPluKey = String(p.plu).trim();
                    loaderMap.set(cleanPluKey, p);
                }
            });
        }
        
        // Aggregate sales by product
        data.c_trans.forEach(trans => {
            if (!trans.plu) return;
            
            const cleanTransPlu = String(trans.plu).trim();
            const product = loaderMap.get(cleanTransPlu);
            if (!product) return; 
            
            const qty = trans.qty || 0;
            const revenue = (trans.price || 0) * qty;
            const hpp = (product.m_price || 0) * qty; 
            const profit = revenue - hpp;
            
            if (!productSales.has(cleanTransPlu)) {
                productSales.set(cleanTransPlu, {
                    plu: cleanTransPlu,
                    name: trans.descp || product.descp || '-',
                    category: trans.kategori || product.kategori || '-',
                    qty: 0,
                    revenue: 0,
                    hpp: 0,
                    profit: 0
                });
            }
            
            const record = productSales.get(cleanTransPlu);
            record.qty += qty;
            record.revenue += revenue;
            record.hpp += hpp;
            record.profit += profit;
        });
        
        // Calculate totals
        let totalRevenue = 0;
        let totalHPP = 0;
        let totalProfit = 0;
        
        const profitLossData = Array.from(productSales.values()).map(item => {
            totalRevenue += item.revenue;
            totalHPP += item.hpp;
            totalProfit += item.profit;
            
            return {
                ...item,
                margin: item.revenue > 0 ? ((item.profit / item.revenue) * 100).toFixed(2) : "0.00"
            };
        });
        
        return {
            products: profitLossData.sort((a, b) => b.profit - a.profit),
            totalRevenue: totalRevenue,
            totalHPP: totalHPP,
            totalProfit: totalProfit
        };
    }

    // 🚀 INI DIA YANG KETINGGALAN, MAS BRO! (Pintu keluar modul)
    return {
        parseSQLCopy: parseSQLCopy,
        calculateProfitLoss: calculateProfitLoss
    };

})();
