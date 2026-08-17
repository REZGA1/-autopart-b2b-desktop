/**
 * [STATISTICS PAGE]
 * Comprehensive analytics dashboard for merchant inventory
 * 
 * [FEATURES]
 * - Customizable report selection
 * - Profit analysis by product, type, vehicle, supplier
 * - Investment and revenue tracking
 * - Top performers and low-margin alerts
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/common/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart3, 
  ArrowLeft, 
  Award, 
  AlertCircle,
  DollarSign,
  Package,
  Car,
  User,
  TrendingUp,
  PieChart,
  Filter
} from 'lucide-react';
import { getProducts, getProductTransactions } from '@/services/inventoryService';

// Report types
const REPORT_TYPES = [
  { id: 'overview', label: 'Overview Summary', icon: BarChart3, default: true },
  { id: 'topProfitable', label: 'Top Profitable Products', icon: Award, default: true },
  { id: 'topSelling', label: 'Top Selling Products', icon: TrendingUp, default: true },
  { id: 'byType', label: 'Analysis by Part Type', icon: PieChart, default: false },
  { id: 'byVehicle', label: 'Analysis by Vehicle Make', icon: Car, default: false },
  { id: 'bySupplier', label: 'Analysis by Supplier', icon: User, default: false },
  { id: 'lowMargin', label: 'Low Margin Alerts', icon: AlertCircle, default: true },
  { id: 'investment', label: 'Investment Analysis', icon: DollarSign, default: false },
];

export default function StatisticsPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReports, setSelectedReports] = useState(() => {
    return REPORT_TYPES.filter(r => r.default).map(r => r.id);
  });
  
  // Top Selling filters
  const [topSellingFilter, setTopSellingFilter] = useState('all'); // 'all' or part_type
  const [topSellingLimit, setTopSellingLimit] = useState(10); // 5, 10, 20, 50, 100, 200, 9999 (All)
  
  // Top Profitable filters
  const [topProfitableFilter, setTopProfitableFilter] = useState('all'); // 'all' or part_type
  const [topProfitableLimit, setTopProfitableLimit] = useState(10); // 5, 10, 20, 50, 100, 200, 9999 (All)

  // Fetch products and transactions on mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch products
      const productsResponse = await getProducts({ limit: 1000 });
      setProducts(productsResponse.products || []);
      
      // Fetch all transactions for sales analysis
      const transactionsPromises = (productsResponse.products || []).slice(0, 50).map(p => 
        getProductTransactions(p.id)
      );
      const transactionsResults = await Promise.all(transactionsPromises);
      const allTransactions = transactionsResults.flatMap(r => r.transactions || []);
      setTransactions(allTransactions);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleReport = (reportId) => {
    setSelectedReports(prev => 
      prev.includes(reportId) 
        ? prev.filter(id => id !== reportId)
        : [...prev, reportId]
    );
  };

  // Calculate all statistics
  const calculateStats = () => {
    const totalProducts = products.length;
    const totalStock = products.reduce((sum, p) => sum + (p.quantity || 0), 0);
    const totalInvestment = products.reduce((sum, p) => sum + ((p.purchase_price || 0) * (p.quantity || 0)), 0);
    const totalPotentialRevenue = products.reduce((sum, p) => sum + ((p.selling_price || 0) * (p.quantity || 0)), 0);
    const totalPotentialProfit = totalPotentialRevenue - totalInvestment;

    // Products with profit analysis
    const productsWithProfit = products.map(p => ({
      ...p,
      unitProfit: (p.selling_price || 0) - (p.purchase_price || 0),
      totalProfit: ((p.selling_price || 0) - (p.purchase_price || 0)) * (p.quantity || 0),
      profitMargin: p.purchase_price > 0 
        ? (((p.selling_price || 0) - (p.purchase_price || 0)) / p.purchase_price * 100).toFixed(1)
        : 0
    }));

    // Top profitable products (all products sorted by profit)
    let topProfitableProducts = [...productsWithProfit];
    
    // Apply part type filter
    if (topProfitableFilter !== 'all') {
      topProfitableProducts = topProfitableProducts.filter(p => p.part_type === topProfitableFilter);
    }
    
    // Sort and limit (if not "All")
    topProfitableProducts = topProfitableProducts
      .sort((a, b) => b.totalProfit - a.totalProfit);
    
    if (topProfitableLimit !== 9999) {
      topProfitableProducts = topProfitableProducts.slice(0, topProfitableLimit);
    }

    // Products by type
    const productsByType = products.reduce((acc, p) => {
      const type = p.part_type || 'Unknown';
      if (!acc[type]) acc[type] = { count: 0, stock: 0, revenue: 0, investment: 0, profit: 0 };
      acc[type].count += 1;
      acc[type].stock += (p.quantity || 0);
      acc[type].revenue += ((p.selling_price || 0) * (p.quantity || 0));
      acc[type].investment += ((p.purchase_price || 0) * (p.quantity || 0));
      acc[type].profit = acc[type].revenue - acc[type].investment;
      return acc;
    }, {});

    // Products by vehicle make
    const productsByVehicle = products.reduce((acc, p) => {
      p.vehicles?.forEach(v => {
        const make = v.make || 'Unknown';
        if (!acc[make]) acc[make] = { count: 0, stock: 0, revenue: 0, investment: 0, profit: 0 };
        acc[make].count += 1;
        acc[make].stock += (p.quantity || 0);
        acc[make].revenue += ((p.selling_price || 0) * (p.quantity || 0));
        acc[make].investment += ((p.purchase_price || 0) * (p.quantity || 0));
        acc[make].profit = acc[make].revenue - acc[make].investment;
      });
      return acc;
    }, {});

    // Products by supplier
    const productsBySupplier = products.reduce((acc, p) => {
      const supplier = p.supplier_name || 'External';
      if (!acc[supplier]) acc[supplier] = { count: 0, stock: 0, revenue: 0, investment: 0, profit: 0 };
      acc[supplier].count += 1;
      acc[supplier].stock += (p.quantity || 0);
      acc[supplier].revenue += ((p.selling_price || 0) * (p.quantity || 0));
      acc[supplier].investment += ((p.purchase_price || 0) * (p.quantity || 0));
      acc[supplier].profit = acc[supplier].revenue - acc[supplier].investment;
      return acc;
    }, {});

    // Top selling products (from transactions with negative change = sale)
    const productSales = {};
    let negativeCount = 0;
    transactions.forEach(t => {
      if (t.change < 0) {
        negativeCount++;
        // This is a sale (negative change)
        const productId = t.product_id;
        const quantity = Math.abs(t.change);
        if (!productSales[productId]) {
          productSales[productId] = { totalSold: 0, transactions: [] };
        }
        productSales[productId].totalSold += quantity;
        productSales[productId].transactions.push(t);
      }
    });
    
    // Map to products and sort
    let topSellingProducts = Object.entries(productSales)
      .map(([productId, sales]) => {
        const product = products.find(p => p.id === productId);
        if (!product) return null;
        return {
          ...product,
          totalSold: sales.totalSold,
          totalRevenue: sales.totalSold * (product.selling_price || 0),
          totalProfit: sales.totalSold * ((product.selling_price || 0) - (product.purchase_price || 0))
        };
      })
      .filter(Boolean);
    
    // Apply part type filter
    if (topSellingFilter !== 'all') {
      topSellingProducts = topSellingProducts.filter(p => p.part_type === topSellingFilter);
    }
    
    // Sort and limit (if not "All")
    topSellingProducts = topSellingProducts
      .sort((a, b) => b.totalSold - a.totalSold);
    
    if (topSellingLimit !== 9999) {
      topSellingProducts = topSellingProducts.slice(0, topSellingLimit);
    }

    // Low profit products
    const lowMarginProducts = products.filter(p => 
      (p.selling_price === 1) || 
      (p.purchase_price > 0 && ((p.selling_price - p.purchase_price) / p.purchase_price < 0.1))
    );

    // Investment analysis
    const investmentAnalysis = {
      totalInvestment,
      totalPotentialRevenue,
      totalPotentialProfit,
      roi: totalInvestment > 0 ? ((totalPotentialProfit / totalInvestment) * 100).toFixed(1) : 0,
      avgProfitPerProduct: totalProducts > 0 ? (totalPotentialProfit / totalProducts).toFixed(0) : 0
    };

    return {
      totalProducts,
      totalStock,
      topProfitableProducts,
      topSellingProducts,
      productsByType,
      productsByVehicle,
      productsBySupplier,
      lowMarginProducts,
      investmentAnalysis
    };
  };

  const stats = calculateStats();

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => navigate('/inventory')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Inventory Statistics</h1>
              <p className="text-sm text-slate-600">
                Customize and view detailed analytics
              </p>
            </div>
          </div>
        </div>

        {/* Report Selection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="h-4 w-4" />
              Select Reports to Display
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {REPORT_TYPES.map((report) => {
                const Icon = report.icon;
                return (
                  <div key={report.id} className="flex items-start space-x-2">
                    <Checkbox
                      id={report.id}
                      checked={selectedReports.includes(report.id)}
                      onCheckedChange={() => toggleReport(report.id)}
                    />
                    <Label 
                      htmlFor={report.id} 
                      className="text-sm cursor-pointer flex items-center gap-1"
                    >
                      <Icon className="h-3 w-3" />
                      {report.label}
                    </Label>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center py-12">
            <BarChart3 className="h-12 w-12 mx-auto text-slate-300 animate-pulse" />
            <p className="text-slate-500 mt-4">Loading statistics...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 mx-auto text-slate-300" />
            <p className="text-slate-500 mt-4">No products in inventory</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Overview Cards */}
            {selectedReports.includes('overview') && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="text-3xl font-bold text-blue-600">{stats.totalProducts}</div>
                    <div className="text-sm text-blue-700">Total Products</div>
                  </CardContent>
                </Card>
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4">
                    <div className="text-3xl font-bold text-green-600">{stats.totalStock}</div>
                    <div className="text-sm text-green-700">Total Stock Items</div>
                  </CardContent>
                </Card>
                <Card className="bg-purple-50 border-purple-200">
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-purple-600">
                      {stats.investmentAnalysis.totalInvestment.toLocaleString()} DA
                    </div>
                    <div className="text-sm text-purple-700">Total Investment</div>
                  </CardContent>
                </Card>
                <Card className="bg-amber-50 border-amber-200">
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-amber-600">
                      {stats.investmentAnalysis.totalPotentialProfit.toLocaleString()} DA
                    </div>
                    <div className="text-sm text-amber-700">Potential Profit</div>
                    <div className="text-xs text-amber-600 mt-1">
                      ROI: {stats.investmentAnalysis.roi}%
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Top Profitable Products */}
            {selectedReports.includes('topProfitable') && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <CardTitle className="flex items-center gap-2 text-amber-600">
                      <Award className="h-5 w-5" />
                      Top {topProfitableLimit === 9999 ? '' : topProfitableLimit} Most Profitable Products
                    </CardTitle>
                    <div className="flex gap-2">
                      {/* Part Type Filter */}
                      <Select value={topProfitableFilter} onValueChange={setTopProfitableFilter}>
                        <SelectTrigger className="w-[140px] h-8 text-sm">
                          <SelectValue placeholder="All Types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          {[...new Set(products.map(p => p.part_type).filter(Boolean))].sort().map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {/* Limit Selector */}
                      <Select value={topProfitableLimit.toString()} onValueChange={(v) => setTopProfitableLimit(Number(v))}>
                        <SelectTrigger className="w-[70px] h-8 text-sm">
                          <SelectValue placeholder="Top">
                            {() => 'Top'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">Top 5</SelectItem>
                          <SelectItem value="10">Top 10</SelectItem>
                          <SelectItem value="20">Top 20</SelectItem>
                          <SelectItem value="50">Top 50</SelectItem>
                          <SelectItem value="100">Top 100</SelectItem>
                          <SelectItem value="200">Top 200</SelectItem>
                          <SelectItem value="9999">All</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {stats.topProfitableProducts.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <Award className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                      <p>No profitable products found{topProfitableFilter !== 'all' ? ` for "${topProfitableFilter}" type` : ''}</p>
                      <p className="text-xs mt-1">Products with positive profit will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {stats.topProfitableProducts.map((p, idx) => (
                        <div 
                          key={p.id} 
                          className="flex items-center justify-between p-3 bg-gradient-to-r from-amber-50 to-white rounded-lg border border-amber-200"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl font-bold text-amber-600 w-8">#{idx + 1}</span>
                            <div>
                              <div className="font-semibold">{p.name}</div>
                              <div className="text-xs text-slate-500">
                                Buy: {p.purchase_price?.toLocaleString()} DA | 
                                Sell: {p.selling_price?.toLocaleString()} DA |
                                Margin: {p.profitMargin}%
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold text-amber-600">
                              +{p.totalProfit.toLocaleString()} DA
                            </div>
                            <div className="text-xs text-slate-500">Stock: {p.quantity} units</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Top Selling Products */}
            {selectedReports.includes('topSelling') && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <CardTitle className="flex items-center gap-2 text-blue-600">
                      <TrendingUp className="h-5 w-5" />
                      Top {topSellingLimit === 9999 ? '' : topSellingLimit} Most Sold Products
                    </CardTitle>
                    <div className="flex gap-2">
                      {/* Part Type Filter */}
                      <Select value={topSellingFilter} onValueChange={setTopSellingFilter}>
                        <SelectTrigger className="w-[140px] h-8 text-sm">
                          <SelectValue placeholder="All Types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          {[...new Set(products.map(p => p.part_type).filter(Boolean))].sort().map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {/* Limit Selector */}
                      <Select value={topSellingLimit.toString()} onValueChange={(v) => setTopSellingLimit(Number(v))}>
                        <SelectTrigger className="w-[70px] h-8 text-sm">
                          <SelectValue placeholder="Top">
                            {() => 'Top'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">Top 5</SelectItem>
                          <SelectItem value="10">Top 10</SelectItem>
                          <SelectItem value="20">Top 20</SelectItem>
                          <SelectItem value="50">Top 50</SelectItem>
                          <SelectItem value="100">Top 100</SelectItem>
                          <SelectItem value="200">Top 200</SelectItem>
                          <SelectItem value="9999">All</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {stats.topSellingProducts.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <TrendingUp className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                      <p>No sales data found{topSellingFilter !== 'all' ? ` for "${topSellingFilter}" type` : ''}</p>
                      <p className="text-xs mt-1">Sales will appear when inventory decreases</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {stats.topSellingProducts.map((p, idx) => (
                        <div 
                          key={p.id} 
                          className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-white rounded-lg border border-blue-200"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl font-bold text-blue-600 w-8">#{idx + 1}</span>
                            <div>
                              <div className="font-semibold">{p.name}</div>
                              <div className="text-xs text-slate-500">
                                {p.part_type} | By: {p.supplier_name}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold text-blue-600">
                              {p.totalSold} sold
                            </div>
                            <div className="text-xs text-slate-500">
                              Revenue: {p.totalRevenue.toLocaleString()} DA |
                              Profit: +{p.totalProfit.toLocaleString()} DA
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Two Column: By Type and By Vehicle */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* By Type */}
              {selectedReports.includes('byType') && Object.keys(stats.productsByType).length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="h-5 w-5" />
                      Analysis by Part Type
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {Object.entries(stats.productsByType)
                        .sort((a, b) => b[1].profit - a[1].profit)
                        .map(([type, data]) => (
                          <div key={type} className="p-3 bg-slate-50 rounded-lg">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-medium">{type}</span>
                              <span className="text-sm text-slate-600">{data.count} products</span>
                            </div>
                            <div className="text-xs text-slate-500 space-y-1">
                              <div className="flex justify-between">
                                <span>Stock: {data.stock} items</span>
                                <span className="text-green-600">+{data.profit.toLocaleString()} DA profit</span>
                              </div>
                              <div className="flex justify-between text-slate-400">
                                <span>Revenue: {data.revenue.toLocaleString()} DA</span>
                                <span>Cost: {data.investment.toLocaleString()} DA</span>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* By Vehicle */}
              {selectedReports.includes('byVehicle') && Object.keys(stats.productsByVehicle).length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2">
                      <Car className="h-5 w-5" />
                      Analysis by Vehicle Make
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {Object.entries(stats.productsByVehicle)
                        .sort((a, b) => b[1].profit - a[1].profit)
                        .map(([make, data]) => (
                          <div key={make} className="p-3 bg-slate-50 rounded-lg">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-medium">{make}</span>
                              <span className="text-sm text-slate-600">{data.count} products</span>
                            </div>
                            <div className="text-xs text-slate-500 space-y-1">
                              <div className="flex justify-between">
                                <span>Stock: {data.stock} items</span>
                                <span className="text-green-600">+{data.profit.toLocaleString()} DA profit</span>
                              </div>
                              <div className="flex justify-between text-slate-400">
                                <span>Revenue: {data.revenue.toLocaleString()} DA</span>
                                <span>Cost: {data.investment.toLocaleString()} DA</span>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* By Supplier */}
            {selectedReports.includes('bySupplier') && Object.keys(stats.productsBySupplier).length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Analysis by Supplier
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-3">
                    {Object.entries(stats.productsBySupplier)
                      .sort((a, b) => b[1].profit - a[1].profit)
                      .map(([supplier, data]) => (
                        <div key={supplier} className="p-3 bg-slate-50 rounded-lg">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-medium">{supplier}</span>
                            <span className="text-sm text-slate-600">{data.count} products</span>
                          </div>
                          <div className="text-xs text-slate-500 space-y-1">
                            <div className="flex justify-between">
                              <span>Stock: {data.stock} items</span>
                              <span className="text-green-600">+{data.profit.toLocaleString()} DA profit</span>
                            </div>
                            <div className="flex justify-between text-slate-400">
                              <span>Revenue: {data.revenue.toLocaleString()} DA</span>
                              <span>Cost: {data.investment.toLocaleString()} DA</span>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Investment Analysis */}
            {selectedReports.includes('investment') && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Investment Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-purple-50 rounded-lg text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {stats.investmentAnalysis.totalInvestment.toLocaleString()} DA
                      </div>
                      <div className="text-sm text-purple-700">Total Investment</div>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {stats.investmentAnalysis.totalPotentialRevenue.toLocaleString()} DA
                      </div>
                      <div className="text-sm text-blue-700">Potential Revenue</div>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {stats.investmentAnalysis.totalPotentialProfit.toLocaleString()} DA
                      </div>
                      <div className="text-sm text-green-700">Potential Profit</div>
                    </div>
                    <div className="p-4 bg-amber-50 rounded-lg text-center">
                      <div className="text-2xl font-bold text-amber-600">
                        {stats.investmentAnalysis.roi}%
                      </div>
                      <div className="text-sm text-amber-700">ROI</div>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-slate-50 rounded text-sm text-slate-600">
                    Average profit per product: <strong>{stats.investmentAnalysis.avgProfitPerProduct} DA</strong>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Low Margin Alerts */}
            {selectedReports.includes('lowMargin') && stats.lowMarginProducts.length > 0 && (
              <Card className="border-red-200">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="h-5 w-5" />
                    Low Margin Alerts ({stats.lowMarginProducts.length} products)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {stats.lowMarginProducts.slice(0, 10).map(p => (
                      <div 
                        key={p.id} 
                        className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-200"
                      >
                        <div>
                          <div className="font-medium">{p.name}</div>
                          <div className="text-xs text-slate-500">
                            {p.part_type} | Stock: {p.quantity}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm">
                            Buy: <span className="font-medium">{p.purchase_price?.toLocaleString()} DA</span>
                          </div>
                          <div className="text-sm text-red-600">
                            Sell: <span className="font-medium">{p.selling_price?.toLocaleString()} DA</span>
                          </div>
                          {p.selling_price === 1 && (
                            <div className="text-xs text-red-500 font-medium">Price not set!</div>
                          )}
                        </div>
                      </div>
                    ))}
                    {stats.lowMarginProducts.length > 10 && (
                      <p className="text-center text-sm text-slate-500 py-2">
                        ... and {stats.lowMarginProducts.length - 10} more products
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
