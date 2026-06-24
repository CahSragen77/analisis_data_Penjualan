function calculateProfitLoss(data) {
        const productSales = new Map();
        
        const loaderMap = new Map();
        if (data.m_loader && Array.isArray(data.m_loader)) {
            data.m_loader.forEach(p => {
                if (p.plu) {
                    const cleanPluKey = String(p.plu).trim();
                    loaderMap.set(cleanPluKey, p);
                }
            });
        }
        
        data.c_trans.forEach(trans => {
            if (!trans.plu) return;
            
            const cleanTransPlu = String(trans.plu).trim();
            const product = loaderMap.get(cleanTransPlu);
            
            const qty = trans.qty || 0;
            const revenue = (trans.price || 0) * qty;
            
            // 💡 FIX CADANGAN: Jika produk tidak ketemu di m_loader, ambil harga modal m_price dari trans 
            // atau set minimal 70% dari harga jual sebagai perkiraan sementara daripada Rp 0.
            let unitHpp = 0;
            if (product && product.m_price) {
                unitHpp = product.m_price;
            } else if (trans.m_price) {
                unitHpp = trans.m_price; // Jika di c_trans ternyata ada kolom m_price
            } else {
                unitHpp = trans.price ? (trans.price * 0.8) : 0; // Cadangan: Asumsi modal 80% dari harga jual
            }
            
            const hpp = unitHpp * qty; 
            const profit = revenue - hpp;
            
            if (!productSales.has(cleanTransPlu)) {
                productSales.set(cleanTransPlu, {
                    plu: cleanTransPlu,
                    name: trans.descp || (product ? product.descp : '-') || '-',
                    category: trans.kategori || (product ? product.kategori : '-') || '-',
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
