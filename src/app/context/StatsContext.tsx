"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import axios from "axios";

interface L2ChainStats {
  chainId: number;
  totalFee: number;
  totalPrice: number;
  totalSubnames: number;
  totalRegistries: number;
}

interface GlobalL2Statistics {
  perChain: Record<string, L2ChainStats>;
  totalSubnames: number;
  totalPrice: number;
  totalFee: number;
  totalRegistries: number;
}

interface OffchainStats {
  total: number;
  names: Record<string, number>;
  totalApiKeys: number;
}

interface ListingStats {
  totalDeployedRegistries: {
    base: number;
    optimism: number;
  };
  totalListings: {
    base: number;
    mainnet: number;
    optimism: number;
  };
  totalCount: number;
}

interface ResolutionStats {
  total: number;
  total_addr: number;
  total_text: number;
  contenthash: number;
  per_type: {
    base: {
      total: number;
      total_addr: number;
      total_text: number;
      contenthash: number;
    };
    optimism: {
      total: number;
      total_addr: number;
      total_text: number;
      contenthash: number;
    };
    offchain: {
      total: number;
      total_addr: number;
      total_text: number;
      contenthash: number;
    };
  };
}

interface StatsContextType {
  l2Stats: GlobalL2Statistics | null;
  offchainStats: OffchainStats | null;
  listingStats: ListingStats | null;
  resolutionStats: ResolutionStats | null;
  subnameStats: SubnameStats | null;
  loading: boolean;
  error: string | null;
  refreshStats: () => Promise<void>;
  githubContributors: any[] | null;
}

export interface SubnameStats {
  totalL2PerChain: Record<
    string,
    {
      total: number;
      volume: number;
      uniqueMinter: number;
      top5Names: { name: string; subnames: number }[];
    }
  >;
  totalL1: {
    total: number;
    volume: number;
    uniqueMinter: number;
    top5Names: { name: string; subnames: number }[];
  };
  totalOveral: number;
  uniqueMinter: number;
}

const StatsContext = createContext<StatsContextType | undefined>(undefined);

export function StatsProvider({ children }: { children: ReactNode }) {
  const [l2Stats, setL2Stats] = useState<GlobalL2Statistics | null>(null);
  const [offchainStats, setOffchainStats] = useState<OffchainStats | null>(
    null,
  );
  const [listingStats, setListingStats] = useState<ListingStats | null>(null);
  const [resolutionStats, setResolutionStats] =
    useState<ResolutionStats | null>(null);
  const [subnameStats, setSubnameStats] = useState<SubnameStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [githubContributors, setGithubContributors] = useState <any[] | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        l2Response,
        offchainResponse,
        listingResponse,
        resolutionResponse,
        subnameStats,
        githubContributorsResponse,
      ] = await Promise.all([
        axios.get("https://indexer.namespace.ninja/api/v1/l2-subnames/stats"),
        axios.get("https://offchain-manager.namespace.ninja/api/v1/statistics"),
        axios.get("https://list-manager.namespace.ninja/api/v1/listing/stats"),
        axios.get(
          "https://indexer.namespace.ninja/api/v1/ccip-resolutions/total",
        ),
        axios.get("https://indexer.namespace.ninja/api/v1/stats/global"),
        axios.get("https://api.github.com/repos/thenamespace/namespacesdk/contributors"),
      ]);

      setSubnameStats(subnameStats.data.stats);
      setL2Stats(l2Response.data);
      setOffchainStats(offchainResponse.data);
      setListingStats(listingResponse.data);
      setResolutionStats(resolutionResponse.data);
      setGithubContributors(githubContributorsResponse.data);
    } catch (error) {
      console.error("Error fetching stats:", error);
      setError("Failed to load statistics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <StatsContext.Provider
      value={{
        subnameStats,
        l2Stats,
        offchainStats,
        listingStats,
        resolutionStats,
        loading,
        error,
        refreshStats: fetchStats,
        githubContributors,
      }}
    >
      {children}
    </StatsContext.Provider>
  );
}

export function useStats() {
  const context = useContext(StatsContext);
  if (context === undefined) {
    throw new Error("useStats must be used within a StatsProvider");
  }
  return context;
}
