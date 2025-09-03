import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, DollarSign, Percent, Calculator } from 'lucide-react';

export function ProfitAnalysis() {
  const { state } = useApp();
  const { sales, products } = state;
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'quarterly'>('monthly');

  const profitData = useMemo(() => {
    // Calculate profit by product
    const productProfits = new Map<string, { 
      name: string; 
      totalProfit: number; 
      unitsSold: number; 
      avgProfit: number;
      profitMargin: number;
      costPrice: number;
      salePrice: number;
    }>();

    sales.forEach(sale => {
      sale.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (product) {
        const price = item.price ?? item.unitPrice ?? product.salePrice ?? 0;
        const name = item.name ?? item.productName ?? product.name ?? 'Producto';
        const profit = (price - product.costPrice) * item.quantity;
        const existing = productProfits.get(item.productId) || {
  name,
  totalProfit: 0,
  unitsSold: 0,
  avgProfit: 0,
  profitMargin: 0,
  costPrice: product.costPrice,
  salePrice: product.salePrice,
};
          
          productProfits.set(item.productId, {
            ...existing,
            totalProfit: existing.totalProfit + profit,
            unitsSold: existing.unitsSold + item.quantity,
            avgProfit: (existing.totalProfit + profit) / (existing.unitsSold + item.quantity),
            profitMargin: ((product.salePrice - product.costPrice) / product.salePrice) * 100,
          });
        }
      });
    });

    // Get profit over time
    const profitByPeriod = new Map<string, number>();
    sales.forEach(sale => {
      const date = new Date(sale.createdAt);
      let key = '';
      
      switch (period) {
        case 'weekly':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().slice(0, 10);
          break;
        case 'monthly':
          key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
          break;
        case 'quarterly':
          const quarter = Math.floor(date.getMonth() / 3) + 1;
          key = `${date.getFullYear()}-Q${quarter}`;
          break;
      }

      const saleProfit = sale.items.reduce((sum, item) => {
        const product = products.find(p => p.id === item.productId);
        return sum + (product ? ((item.price ?? item.unitPrice ?? product.salePrice ?? 0) - product.costPrice) * item.quantity : 0);
      }, 0);

      profitByPeriod.set(key, (profitByPeriod.get(key) || 0) + saleProfit);
    });

    const sortedProducts = Array.from(productProfits.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.totalProfit - a.totalProfit);

    const totalProfit = Array.from(productProfits.values())
      .reduce((sum, p) => sum + p.totalProfit, 0);

    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
    const totalCost = sales.reduce((sum, sale) => 
      sum + sale.items.reduce((itemSum, item) => {
        const product = products.find(p => p.id === item.productId);
        return itemSum + (product ? product.costPrice * item.quantity : 0);
      }, 0), 0
    );

    return {
      totalProfit,
      totalRevenue,
      totalCost,
      profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
      topProducts: sortedProducts.slice(0, 10),
      leastProfitableProducts: sortedProducts.slice(-5).reverse(),
      chartData: Array.from(profitByPeriod.entries())
        .map(([period, profit]) => ({ period, profit }))
        .sort((a, b) => a.period.localeCompare(b.period)),
    };
  }, [sales, products, period]);

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center space-x-4">
          <label className="block text-sm font-medium text-gray-700">
            Período de Análisis
          </label>
          <select
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={period}
            onChange={(e) => setPeriod(e.target.value as any)}
          >
            <option value="weekly">Semanal</option>
            <option value="monthly">Mensual</option>
            <option value="quarterly">Trimestral</option>
          </select>
        </div>
      </div>

      {/* Profit KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ganancia Total</p>
              <p className="text-2xl font-bold text-green-600">S/ {profitData.totalProfit.toFixed(2)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Margen de Ganancia</p>
              <p className="text-2xl font-bold text-blue-600">{profitData.profitMargin.toFixed(1)}%</p>
            </div>
            <Percent className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ingresos Totales</p>
              <p className="text-2xl font-bold text-purple-600">S/ {profitData.totalRevenue.toFixed(2)}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Costos Totales</p>
              <p className="text-2xl font-bold text-red-600">S/ {profitData.totalCost.toFixed(2)}</p>
            </div>
            <Calculator className="h-8 w-8 text-red-600" />
          </div>
        </div>
      </div>

      {/* Profit Over Time Chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Evolución de Ganancias</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={profitData.chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" />
            <YAxis />
            <Tooltip formatter={(value: any) => [`S/ ${value.toFixed(2)}`, 'Ganancia']} />
            <Line type="monotone" dataKey="profit" stroke="#10B981" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Profitable Products */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Productos Más Rentables</h3>
          <div className="space-y-3">
            {profitData.topProducts.map((product, index) => (
              <div key={product.id} className="p-3 bg-green-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-green-100 text-green-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{product.name}</p>
                      <p className="text-sm text-gray-500">{product.unitsSold} unidades vendidas</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">S/ {product.totalProfit.toFixed(2)}</p>
                    <p className="text-sm text-green-500">{product.profitMargin.toFixed(1)}% margen</p>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-600">
                  Costo: S/ {product.costPrice.toFixed(2)} | Venta: S/ {product.salePrice.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Least Profitable Products */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Productos Menos Rentables</h3>
          <div className="space-y-3">
            {profitData.leastProfitableProducts.map((product, index) => (
              <div key={product.id} className="p-3 bg-red-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-red-100 text-red-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{product.name}</p>
                      <p className="text-sm text-gray-500">{product.unitsSold} unidades vendidas</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-red-600">S/ {product.totalProfit.toFixed(2)}</p>
                    <p className="text-sm text-red-500">{product.profitMargin.toFixed(1)}% margen</p>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-600">
                  Costo: S/ {product.costPrice.toFixed(2)} | Venta: S/ {product.salePrice.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Profit Analysis Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Análisis Detallado por Producto</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Producto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unidades Vendidas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ganancia Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ganancia por Unidad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Margen %
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ROI
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {profitData.topProducts.slice(0, 15).map(product => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{product.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.unitsSold}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-semibold text-green-600">
                      S/ {product.totalProfit.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    S/ {product.avgProfit.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-medium ${
                      product.profitMargin > 30 ? 'text-green-600' : 
                      product.profitMargin > 15 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {product.profitMargin.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-blue-600">
                      {((product.salePrice - product.costPrice) / product.costPrice * 100).toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
              {/* Mostrar productos sin ventas */}
              {products.filter(p => !profitData.topProducts.some(tp => tp.id === p.id)).map(p => (
                <tr key={p.id} className="hover:bg-gray-50 bg-gray-100">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-400">{p.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">0</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">S/ 0.00</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">S/ 0.00</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">0%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">0%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}