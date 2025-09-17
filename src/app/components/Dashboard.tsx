'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Database, 
  Wallet, 
  Hash, 
  Layers, 
  FileText, 
  AtSign,
  Activity,
  BarChart3,
  Circle,
  Globe,
  TrendingUp,
  Loader,
  RefreshCw
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { useStats } from '../context/StatsContext';
import { useState } from 'react';
import AllContributorsComponent from '../context/AllContributorsComponent';

// Helper functions
const formatPrice = (price: string | number) => parseFloat(price.toString()).toFixed(5);
const formatNumber = (num: number) => new Intl.NumberFormat("en-US").format(num);

// Chain colors
const CHAIN_COLORS = {
  Mainnet: "#9333EA",
  Optimism: "#EF4444", 
  Base: "#3B82F6",
  Offchain: "#22C55E",
};

// Animated card component
const WidgetCard = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => (
  <motion.div
    className="group relative"
    initial={{ y: 50, opacity: 0, filter: "blur(10px)" }}
    whileInView={{ y: 0, opacity: 1, filter: "blur(0px)" }}
    viewport={{ once: true }}
    transition={{
      duration: 0.5,
      delay,
      ease: "easeOut",
    }}
  >
    <div className="absolute inset-0 bg-gradient-to-r from-gray-100 to-gray-200 rounded-2xl transform rotate-1 group-hover:rotate-2 transition-transform duration-300" />
    <div className="relative bg-white rounded-2xl p-6 shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
      {children}
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-gray-50 to-transparent rounded-2xl opacity-50" />
    </div>
  </motion.div>
);

export default function Dashboard() {
  const {
    loading,
    offchainStats,
    resolutionStats,
    listingStats,
    subnameStats,
    l2Stats,
    githubContributors,
    error,
    refreshStats
  } = useStats();

  const { totalSubnamesOverall, totalVolume } = useMemo(() => {
    if (!subnameStats || !offchainStats) {
      return { totalSubnamesOverall: 0, totalVolume: 0 };
    }

    const l1Volume = subnameStats.totalL1?.volume || 0;
    const l2BaseVolume = subnameStats.totalL2PerChain?.base?.volume || 0;
    const l2OpVolume = subnameStats.totalL2PerChain?.optimism?.volume || 0;

    return {
      totalSubnamesOverall: subnameStats.totalOveral + offchainStats.total,
      totalVolume: l1Volume + l2BaseVolume + l2OpVolume,
    };
  }, [subnameStats, offchainStats]);

  // Loading state
  if (loading || !listingStats || !offchainStats || !resolutionStats || !subnameStats || !l2Stats) {
    return (
      <div className="w-screen h-screen flex justify-center items-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-600 font-medium">Loading analytics...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="w-screen h-screen flex justify-center items-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="text-red-500 text-lg font-medium">Error loading data</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={refreshStats}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Chart data preparation
  const subnamesPerChain = [
    { name: "Mainnet", value: subnameStats.totalL1.total },
    { name: "Base", value: subnameStats.totalL2PerChain?.base?.total || 0 },
    { name: "Optimism", value: subnameStats.totalL2PerChain?.optimism?.total || 0 },
    { name: "Offchain", value: offchainStats.total || 0 },
  ];

  const pieChartData = [
    { name: "Base", value: l2Stats.perChain?.["8453"]?.totalRegistries || 0 },
    { name: "Optimism", value: l2Stats.perChain?.["10"]?.totalRegistries || 0 },
  ];

  const resolutionData = [
    { name: "Base", value: resolutionStats.per_type.base.total || 0 },
    { name: "Optimism", value: resolutionStats.per_type.optimism.total || 0 },
    { name: "Offchain", value: resolutionStats.per_type.offchain.total || 0 },
  ];

  const resolutionTypeData = [
    { name: "Text", value: resolutionStats.total_text || 0 },
    { name: "Address", value: resolutionStats.total_addr || 0 },
    { name: "ContentHash", value: resolutionStats.contenthash || 0 },
  ];

  const ExpandableOffchainNames = ({ offchainStats }: { offchainStats: any }) => {
  const [visibleCount, setVisibleCount] = useState(5);
  
  const sortedEntries = Object.entries(offchainStats.names)
    .sort(([,a], [,b]) => (b as number) - (a as number));
  
  const visibleEntries = sortedEntries.slice(0, visibleCount);
  const hasMore = visibleCount < sortedEntries.length;
  const remainingCount = sortedEntries.length - visibleCount;
  
  const showMore = () => {
    setVisibleCount(prev => Math.min(prev + 25, sortedEntries.length));
  };
  
  const showLess = () => {
    setVisibleCount(5);
  };

  return (
    <>
      <div className="text-lg font-bold text-gray-900 mb-4">
        Top Offchain Names ({visibleCount} of {sortedEntries.length})
      </div>
      <div className="space-y-3 mb-4">
        {visibleEntries.map(([name, count], index) => (
          <motion.div
            key={name}
            initial={{ x: -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.05 + (index * 0.02) }}
            className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                  {index + 1}
                </div>
                <span className="font-medium text-gray-900">{name}</span>
              </div>
              <span className="font-bold text-emerald-600">{formatNumber(count as number)}</span>
            </div>
          </motion.div>
        ))}
      </div>
      
      <div className="flex justify-center gap-3">
        {hasMore && (
          <motion.button
            onClick={showMore}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 text-sm"
          >
            + Show {Math.min(25, remainingCount)} More
          </motion.button>
        )}
        
        {visibleCount > 5 && (
          <motion.button
            onClick={showLess}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-4 py-2 bg-gray-500 text-white font-semibold rounded-lg shadow-md hover:shadow-lg hover:bg-gray-600 transition-all duration-200 text-sm"
          >
            Show Less
          </motion.button>
        )}
      </div>
      
      {!hasMore && visibleCount > 5 && (
        <p className="text-center text-gray-500 text-xs mt-3">
          All {sortedEntries.length} names displayed
        </p>
      )}
    </>
  );
};
  

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className=" backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="w-full px-4 sm:px-6 py-6 border-green-100">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex items-center justify-between"
          >
            <div >
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent">
                Namespace Stats
              </h1>
              {/* <p className="text-gray-600 mt-1">Comprehensive domain insights</p> */}
            </div>
            {/* <div className="flex items-center gap-4">
              <button 
                onClick={refreshStats}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-blue-600 transition-colors"
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full text-white font-medium shadow-lg">
                <Activity className="w-4 h-4" />
                Live Dashboard
              </div>
            </div> */}
          </motion.div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 py-8 bg-blue-100">
        {/* Overview Section */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Overview</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <WidgetCard delay={0.1}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg">
                      <Database className="w-6 h-6 text-white" />
                    </div>
                    {/* <div className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium">
                      <TrendingUp className="w-3 h-3" />
                      +12.5%
                    </div> */}
                  </div>
                  <div className="text-gray-600 text-sm font-medium mb-1">Total Subnames</div>
                  <div className="text-2xl font-bold text-gray-900 mb-2">{formatNumber(totalSubnamesOverall)}</div>
                  <div className="text-gray-500 text-xs">Total subnames minted on platform</div>
                </div>
              </div>
            </WidgetCard>

            <WidgetCard delay={0.2}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-lg">
                      <Wallet className="w-6 h-6 text-white" />
                    </div>
                    {/* <div className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium">
                      <TrendingUp className="w-3 h-3" />
                      +8.3%
                    </div> */}
                  </div>
                  <div className="text-gray-600 text-sm font-medium mb-1">Total Volume</div>
                  <div className="text-2xl font-bold text-gray-900 mb-2">{formatPrice(totalVolume)} ETH</div>
                  <div className="text-gray-500 text-xs">Total Subnames minted on Namespace platform</div>
                </div>
              </div>
            </WidgetCard>

            <WidgetCard delay={0.3}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 shadow-lg">
                      <Hash className="w-6 h-6 text-white" />
                    </div>
                    {/* <div className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium">
                      <TrendingUp className="w-3 h-3" />
                      +15.7%
                    </div> */}
                  </div>
                  <div className="text-gray-600 text-sm font-medium mb-1">Total Resolutions</div>
                  <div className="text-2xl font-bold text-gray-900 mb-2">{formatNumber(resolutionStats.total)}</div>
                  <div className="text-gray-500 text-xs">Number of resolutions for Namespace subnames</div>
                </div>
              </div>
            </WidgetCard>

            <WidgetCard delay={0.4}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 shadow-lg">
                      <Layers className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="text-gray-600 text-sm font-medium mb-1">L2 Registries</div>
                  <div className="text-2xl font-bold text-gray-900 mb-2">{formatNumber(l2Stats.totalRegistries)}</div>
                  <div className="text-gray-500 text-xs">Deployed on Layer 2 networks</div>
                </div>
              </div>
            </WidgetCard>

            <WidgetCard delay={0.5}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-3 rounded-xl bg-gradient-to-r from-pink-500 to-pink-600 shadow-lg">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="text-gray-600 text-sm font-medium mb-1">Widgets</div>
                  <div className="text-2xl font-bold text-gray-900 mb-2">124</div>
                  <div className="text-gray-500 text-xs">Total subname registries deployed on L2 chains</div>
                </div>
              </div>
            </WidgetCard>

            <WidgetCard delay={0.6}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-3 rounded-xl bg-gradient-to-r from-red-500 to-red-600 shadow-lg">
                      <AtSign className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="text-gray-600 text-sm font-medium mb-1">Listings</div>
                  <div className="text-2xl font-bold text-gray-900 mb-2">{formatNumber(listingStats.totalCount)}</div>
                  <div className="text-gray-500 text-xs">Names listed on marketplace</div>
                </div>
              </div>
            </WidgetCard>
          </div>
        </section>

        {/* Platform Metrics Section */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 rounded-lg bg-gradient-to-r from-violet-500 to-purple-600">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Platform Metrics</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <WidgetCard delay={0.1}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-3 rounded-xl bg-gradient-to-r from-violet-500 to-violet-600 shadow-lg">
                      <Database className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="text-gray-600 text-sm font-medium mb-1">Total Overall</div>
                  <div className="text-2xl font-bold text-gray-900 mb-2">
                    {formatNumber(subnameStats.totalOveral || 0)}
                  </div>
                  <div className="text-gray-500 text-xs">Total subnames across all platforms</div>
                </div>
              </div>
            </WidgetCard>

            <WidgetCard delay={0.2}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-3 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 shadow-lg">
                      <Activity className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="text-gray-600 text-sm font-medium mb-1">Unique Minters</div>
                  <div className="text-2xl font-bold text-gray-900 mb-2">
                    {formatNumber(subnameStats.uniqueMinter || 0)}
                  </div>
                  <div className="text-gray-500 text-xs">Individual addresses that have minted</div>
                </div>
              </div>
            </WidgetCard>

            <WidgetCard delay={0.3}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 shadow-lg">
                      <Hash className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="text-gray-600 text-sm font-medium mb-1">API Keys Generated</div>
                  <div className="text-2xl font-bold text-gray-900 mb-2">
                    {/* Replace with actual API keys count when available */}
                    {formatNumber(8205)}
                  </div>
                  <div className="text-gray-500 text-xs">Total API keys issued to developers</div>
                </div>
              </div>
            </WidgetCard>
          </div>
        </section>

        {/* Charts Section */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-600">
              <Circle className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Distribution Analytics</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <WidgetCard delay={0.1}>
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-1">Subnames per Chain</h3>
                <p className="text-gray-500 text-sm">Distribution across blockchain networks</p>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={subnamesPerChain}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${formatNumber(value as number)}`}
                    >
                      {subnamesPerChain.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={CHAIN_COLORS[entry.name as keyof typeof CHAIN_COLORS]}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatNumber(Number(value))} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </WidgetCard>

            <WidgetCard delay={0.2}>
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-1">Resolution Types</h3>
                <p className="text-gray-500 text-sm">Breakdown by resolution category</p>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={resolutionTypeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${formatNumber(value as number)}`}
                    >
                      <Cell fill="#8b5cf6" />
                      <Cell fill="#ef4444" />
                      <Cell fill="#3b82f6" />
                    </Pie>
                    <Tooltip formatter={(value) => formatNumber(Number(value))} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </WidgetCard>
          </div>
        </section>



        {/* Chain-specific Stats */}
        <section className="mb-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <WidgetCard delay={0.1}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg">
                      <Database className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="text-gray-600 text-sm font-medium mb-1">Base Subnames</div>
                  <div className="text-2xl font-bold text-gray-900 mb-2">
                    {formatNumber(subnameStats.totalL2PerChain?.base?.total || 0)}
                  </div>
                  <div className="text-gray-500 text-xs">Total subnames minted on Base chain</div>
                </div>
              </div>
            </WidgetCard>

            <WidgetCard delay={0.3}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-3 rounded-xl bg-gradient-to-r from-red-500 to-red-600 shadow-lg">
                      <Database className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="text-gray-600 text-sm font-medium mb-1">Optimism Subnames</div>
                  <div className="text-2xl font-bold text-gray-900 mb-2">
                    {formatNumber(subnameStats.totalL2PerChain?.optimism?.total || 0)}
                  </div>
                  <div className="text-gray-500 text-xs">Total subnames minted on Optimism chain</div>
                </div>
              </div>
            </WidgetCard>

            <WidgetCard delay={0.4}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 shadow-lg">
                      <Database className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="text-gray-600 text-sm font-medium mb-1">Mainnet Subnames</div>
                  <div className="text-2xl font-bold text-gray-900 mb-2">
                    {formatNumber(subnameStats.totalL1?.total || 0)}
                  </div>
                  <div className="text-gray-500 text-xs">Total subnames minted on Ethereum mainnet</div>
                </div>
              </div>
            </WidgetCard>
          </div>

          {/* Offchain Subnames - Full Width */}
          <WidgetCard delay={0.1}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-lg">
                    <Globe className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="text-gray-600 text-sm font-medium">Offchain Subnames</div>
                    <div className="text-3xl font-bold text-gray-900">{formatNumber(offchainStats.total)}</div>
                    <div className="text-gray-500 text-xs">Total subnames minted offchain</div>
                  </div>
                </div>
              </div>
              <div>
                <ExpandableOffchainNames offchainStats={offchainStats} />
              </div>
            </div>
          </WidgetCard>
        </section>

        {/* Resolutions Section */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600">
              <Hash className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Resolutions</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <WidgetCard delay={0.1}>
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-1">Total Resolutions per Chain</h3>
                <p className="text-gray-500 text-sm">Overview of total resolutions per chain type</p>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={resolutionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${formatNumber(value as number)}`}
                    >
                      {resolutionData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={CHAIN_COLORS[entry.name as keyof typeof CHAIN_COLORS]}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatNumber(Number(value))} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </WidgetCard>

            <WidgetCard delay={0.2}>
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-1">Resolution Details</h3>
                <span className="flex justify-between items-center mb-2 font-bold text-green-700">Total Resolution: {formatNumber(resolutionStats.total)}</span>
                <p className="text-gray-500 text-sm">Breakdown by resolution type across all chains</p>
              </div>
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-blue-900">Base Resolutions</span>
                    <span className="font-bold text-blue-700">{formatNumber(resolutionStats.per_type.base.total)}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div className="text-center">
                      <div className="text-blue-600 font-medium">{formatNumber(resolutionStats.per_type.base.total_addr)}</div>
                      <div className="text-blue-500">Addresses</div>
                    </div>
                    <div className="text-center">
                      <div className="text-blue-600 font-medium">{formatNumber(resolutionStats.per_type.base.total_text)}</div>
                      <div className="text-blue-500">Text</div>
                    </div>
                    <div className="text-center">
                      <div className="text-blue-600 font-medium">{formatNumber(resolutionStats.per_type.base.contenthash)}</div>
                      <div className="text-blue-500">ContentHash</div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-red-900">Optimism Resolutions</span>
                    <span className="font-bold text-red-700">{formatNumber(resolutionStats.per_type.optimism.total)}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div className="text-center">
                      <div className="text-red-600 font-medium">{formatNumber(resolutionStats.per_type.optimism.total_addr)}</div>
                      <div className="text-red-500">Addresses</div>
                    </div>
                    <div className="text-center">
                      <div className="text-red-600 font-medium">{formatNumber(resolutionStats.per_type.optimism.total_text)}</div>
                      <div className="text-red-500">Text</div>
                    </div>
                    <div className="text-center">
                      <div className="text-red-600 font-medium">{formatNumber(resolutionStats.per_type.optimism.contenthash)}</div>
                      <div className="text-red-500">ContentHash</div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-emerald-900">Offchain Resolutions</span>
                    <span className="font-bold text-emerald-700">{formatNumber(resolutionStats.per_type.offchain.total)}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div className="text-center">
                      <div className="text-emerald-600 font-medium">{formatNumber(resolutionStats.per_type.offchain.total_addr)}</div>
                      <div className="text-emerald-500">Addresses</div>
                    </div>
                    <div className="text-center">
                      <div className="text-emerald-600 font-medium">{formatNumber(resolutionStats.per_type.offchain.total_text)}</div>
                      <div className="text-emerald-500">Text</div>
                    </div>
                    <div className="text-center">
                      <div className="text-emerald-600 font-medium">{formatNumber(resolutionStats.per_type.offchain.contenthash)}</div>
                      <div className="text-emerald-500">ContentHash</div>
                    </div>
                  </div>
                </div>
              </div>
            </WidgetCard>
          </div>
        </section>

        {/* Listings Section */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 rounded-lg bg-gradient-to-r from-pink-500 to-rose-600">
              <AtSign className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Listings</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <WidgetCard delay={0.1}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 shadow-lg">
                      <Database className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="text-gray-600 text-sm font-medium mb-1">Mainnet Listings</div>
                  <div className="text-2xl font-bold text-gray-900 mb-2">
                    {formatNumber(listingStats.totalListings.mainnet || 0)}
                  </div>
                  <div className="text-gray-500 text-xs">Total listings on Mainnet</div>
                </div>
              </div>
            </WidgetCard>

            <WidgetCard delay={0.3}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg">
                      <Database className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="text-gray-600 text-sm font-medium mb-1">Base Listings</div>
                  <div className="text-2xl font-bold text-gray-900 mb-2">
                    {formatNumber(listingStats.totalListings.base || 0)}
                  </div>
                  <div className="text-gray-500 text-xs">Total listings on Base chain</div>
                </div>
              </div>
            </WidgetCard>

            <WidgetCard delay={0.5}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-3 rounded-xl bg-gradient-to-r from-red-500 to-red-600 shadow-lg">
                      <Database className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="text-gray-600 text-sm font-medium mb-1">Optimism Listings</div>
                  <div className="text-2xl font-bold text-gray-900 mb-2">
                    {formatNumber(listingStats.totalListings.optimism || 0)}
                  </div>
                  <div className="text-gray-500 text-xs">Total listings on Optimism chain</div>
                </div>
              </div>
            </WidgetCard>
          </div>
        </section>

        {/* Additional Registry Section */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Registry Analytics</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <WidgetCard delay={0.1}>
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-1">L2 Registry Distribution</h3>
                <p className="text-gray-500 text-sm">Registries deployed across Layer 2 networks</p>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {pieChartData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={CHAIN_COLORS[entry.name as keyof typeof CHAIN_COLORS]}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatNumber(Number(value))} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </WidgetCard>

            <WidgetCard delay={0.2}>
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-1">Registry Metrics</h3>
                <p className="text-gray-500 text-sm">Key performance indicators for deployed registries</p>
              </div>
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-100 rounded-xl p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-blue-900 font-medium">Base Registries</div>
                      <div className="text-blue-600 text-sm">Chain ID: 8453</div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-700">
                        {formatNumber(l2Stats.perChain?.["8453"]?.totalRegistries || 0)}
                      </div>
                      <div className="text-blue-500 text-sm">Active</div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-red-50 to-pink-100 rounded-xl p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-red-900 font-medium">Optimism Registries</div>
                      <div className="text-red-600 text-sm">Chain ID: 10</div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-red-700">
                        {formatNumber(l2Stats.perChain?.["10"]?.totalRegistries || 0)}
                      </div>
                      <div className="text-red-500 text-sm">Active</div>
                    </div>
                  </div>
                </div>
                
                 <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-green-900 font-medium">Total Fee</div>
                      {/* <div className="text-red-600 text-sm">Chain ID: 10</div> */}
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-700">
                        {formatNumber(l2Stats.totalFee || 0)}
                      </div>
                      <div className="text-green-500 text-sm">ETH</div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-gray-900 font-medium">Total Deployed</div>
                      <div className="text-gray-600 text-sm">Across all L2 chains</div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-700">
                        {formatNumber(l2Stats.totalRegistries)}
                      </div>
                      <div className="text-gray-500 text-sm">Registries</div>
                    </div>
                  </div>
                </div>
              </div>
            </WidgetCard>
          </div>
        </section>

        {/* GitHub Contributors Section */}
<section className="mb-12">
  <div className="flex items-center gap-3 mb-8">
    <div className="p-2 rounded-lg bg-gradient-to-r from-gray-800 to-gray-900">
      <Activity className="w-5 h-5 text-white" />
    </div>
    <h2 className="text-2xl font-bold text-gray-900">GitHub Contributors</h2>
  </div>
  
  <WidgetCard delay={0.1}>
    <div className="mb-6">
      <h3 className="text-lg font-bold text-gray-900 mb-1">Development Team</h3>
      <p className="text-gray-500 text-sm">Contributors who have helped build the platform</p>
    </div>
    
    {githubContributors && githubContributors.length > 0 && (
      <div className="space-y-6">
        {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {githubContributors
            .filter((contributor: any) => contributor.type !== 'Bot')
            .map((contributor: any, index: any) => (
              <motion.div
                key={contributor.id}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 + (index * 0.05) }}
                className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={contributor.avatar_url}
                    alt={`${contributor.login} avatar`}
                    className="w-12 h-12 rounded-full border-2 border-white shadow-sm"
                  />
                  <div className="flex-1">
                    <a
                      href={contributor.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-gray-900 hover:text-blue-600 transition-colors"
                    >
                      {contributor.login}
                    </a>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-gray-600">{contributor.contributions} commits</span>
                      <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                      <span className="text-xs text-gray-500 capitalize">{contributor.type}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
        </div> */}

          <AllContributorsComponent username="thenamespace"/>
        
        {/* <div className="pt-6 border-t border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {githubContributors.filter((c: any) => c.type !== 'Bot').length}
              </div>
              <div className="text-sm text-gray-500">Active Contributors</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {githubContributors.reduce((sum: any, c: any) => sum + (c.type !== 'Bot' ? c.contributions : 0), 0)}
              </div>
              <div className="text-sm text-gray-500">Total Commits</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {githubContributors.filter((c: any) => c.type !== 'Bot').length > 0 ? Math.max(...githubContributors.filter((c: any) => c.type !== 'Bot').map((c: any) => c.contributions)) : 0}
              </div>
              <div className="text-sm text-gray-500">Top Contributor</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {githubContributors.filter((c: any) => c.type === 'Bot').length}
              </div>
              <div className="text-sm text-gray-500">Bots/Automation</div>
            </div>
          </div>
        </div> */}
      </div>
    )}
    
    
    {(!githubContributors || githubContributors.length === 0) && (
      <div className="text-center py-8 text-gray-500">
        <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No contributors data available</p>
      </div>
    )}
  </WidgetCard>
</section>                

   

        {/* Footer */}
        {/* <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center py-8 border-t border-gray-200 bg-white/50 rounded-2xl"
        >
          <p className="text-gray-600">
            Powered by <span className="font-semibold text-indigo-600">Namespace Protocol</span> - Real-time blockchain analytics
          </p>
          <div className="flex justify-center items-center gap-4 mt-4 text-sm text-gray-500">
            <span>Last updated: {new Date().toLocaleTimeString()}</span>
            <span>•</span>
            <span>Data refreshed every 30 seconds</span>
          </div>
        </motion.div> */}
      </div>
    </div>
  );
}