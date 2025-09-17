//@ts-nocheck
import { useState, useEffect, useCallback } from 'react';

const AllContributorsComponent = ({ 
  username = 'thenamespace', 
  githubToken = process.env.NEXT_PUBLIC_GITHUB_TOKEN || '', // Use environment variable
  autoLoad = true,
  cacheExpiry = 30 * 60 * 1000 // 30 minutes in milliseconds
}) => {
  const [data, setData] = useState({
    repositories: [],
    contributorsByRepo: {},
    allContributors: [],
    summary: null
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0, stage: '' });
  const [activeTab, setActiveTab] = useState('summary');
  const [searchTerm, setSearchTerm] = useState('');
  const [tokenInput, setTokenInput] = useState(githubToken);
  const [lastFetched, setLastFetched] = useState(null);
  const [usingCache, setUsingCache] = useState(false);

  // Cache keys
  const CACHE_KEY = `github_contributors_${username}`;
  const CACHE_TIMESTAMP_KEY = `github_contributors_timestamp_${username}`;

  // Utility function for delays
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Check if cached data exists and is still valid
  const getCachedData = useCallback(() => {
    try {
      const cachedData = sessionStorage.getItem(CACHE_KEY);
      const cachedTimestamp = sessionStorage.getItem(CACHE_TIMESTAMP_KEY);
      
      if (cachedData && cachedTimestamp) {
        const timestamp = parseInt(cachedTimestamp);
        const now = Date.now();
        
        // Check if cache is still valid
        if (now - timestamp < cacheExpiry) {
          return JSON.parse(cachedData);
        } else {
          // Cache expired, remove it
          sessionStorage.removeItem(CACHE_KEY);
          sessionStorage.removeItem(CACHE_TIMESTAMP_KEY);
        }
      }
    } catch (error) {
      console.error('Error reading from cache:', error);
      // If there's an error reading cache, remove potentially corrupted data
      sessionStorage.removeItem(CACHE_KEY);
      sessionStorage.removeItem(CACHE_TIMESTAMP_KEY);
    }
    
    return null;
  }, [CACHE_KEY, CACHE_TIMESTAMP_KEY, cacheExpiry]);

  // Save data to cache
  const setCachedData = useCallback((dataToCache) => {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(dataToCache));
      sessionStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
      setLastFetched(new Date());
    } catch (error) {
      console.error('Error saving to cache:', error);
      // If storage is full or unavailable, continue without caching
    }
  }, [CACHE_KEY, CACHE_TIMESTAMP_KEY]);

  // Clear cache manually
  const clearCache = useCallback(() => {
    try {
      sessionStorage.removeItem(CACHE_KEY);
      sessionStorage.removeItem(CACHE_TIMESTAMP_KEY);
      setLastFetched(null);
      setUsingCache(false);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }, [CACHE_KEY, CACHE_TIMESTAMP_KEY]);

  // Load data from cache
  const loadFromCache = useCallback(() => {
    const cachedData = getCachedData();
    if (cachedData) {
      setData(cachedData);
      setUsingCache(true);
      const timestamp = sessionStorage.getItem(CACHE_TIMESTAMP_KEY);
      if (timestamp) {
        setLastFetched(new Date(parseInt(timestamp)));
      }
      return true;
    }
    return false;
  }, [getCachedData, CACHE_TIMESTAMP_KEY]);

  // Check cache expiry time remaining
  const getCacheTimeRemaining = useCallback(() => {
    try {
      const cachedTimestamp = sessionStorage.getItem(CACHE_TIMESTAMP_KEY);
      if (cachedTimestamp) {
        const timestamp = parseInt(cachedTimestamp);
        const now = Date.now();
        const remaining = cacheExpiry - (now - timestamp);
        return Math.max(0, remaining);
      }
    } catch (error) {
      console.error('Error checking cache time:', error);
    }
    return 0;
  }, [CACHE_TIMESTAMP_KEY, cacheExpiry]);

  // Format remaining time for display
  const formatTimeRemaining = (ms) => {
    const minutes = Math.floor(ms / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  // Fetch all repositories for a user
  const fetchRepositories = async (token) => {
    const allRepos = [];
    let page = 1;
    let hasMore = true;

    setProgress({ current: 0, total: 0, stage: 'Fetching repositories...' });

    while (hasMore) {
      try {
        const headers = {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Contributors-Fetcher/1.0'
        };

        if (token) {
          headers.Authorization = `token ${token}`;
        }

        const response = await fetch(
          `https://api.github.com/users/${username}/repos?type=all&per_page=100&page=${page}`,
          { headers }
        );

        if (!response.ok) {
          if (response.status === 403) {
            throw new Error('Rate limit exceeded or insufficient permissions');
          }
          throw new Error(`Failed to fetch repositories: ${response.status}`);
        }

        const repos = await response.json();
        
        if (repos.length === 0) {
          hasMore = false;
        } else {
          allRepos.push(...repos);
          setProgress(prev => ({ 
            ...prev, 
            stage: `Found ${allRepos.length} repositories...` 
          }));
          page++;
        }

        await delay(100); // Rate limiting
      } catch (err) {
        throw err;
      }
    }

    return allRepos;
  };

  // Fetch contributors for a specific repository
  const fetchRepoContributors = async (owner, repo, token) => {
    try {
      const headers = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Contributors-Fetcher/1.0'
      };

      if (token) {
        headers.Authorization = `token ${token}`;
      }

      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contributors?per_page=100`,
        { headers }
      );

      if (!response.ok) {
        if (response.status === 403) {
          console.warn(`Rate limited or no access to ${owner}/${repo}`);
          return [];
        }
        if (response.status === 404) {
          console.warn(`Repository ${owner}/${repo} not found or no contributors`);
          return [];
        }
        return [];
      }

      const contributors = await response.json();
      return contributors.map(contributor => ({
        ...contributor,
        repository: `${owner}/${repo}`
      }));

    } catch (error) {
      console.error(`Error fetching contributors for ${owner}/${repo}:`, error);
      return [];
    }
  };

  // Main function to fetch all data
  const fetchAllData = async (forceRefresh = false) => {
    if (!username) {
      setError('Username is required');
      return;
    }

    // Check cache first unless force refresh
    if (!forceRefresh) {
      const cacheLoaded = loadFromCache();
      if (cacheLoaded) {
        console.log('Loaded data from cache');
        return;
      }
    }

    setLoading(true);
    setError(null);
    setUsingCache(false);
    setProgress({ current: 0, total: 0, stage: 'Starting...' });

    try {
      // Step 1: Get all repositories
      const repositories = await fetchRepositories(tokenInput);
      
      if (repositories.length === 0) {
        throw new Error('No repositories found for this user');
      }

      setProgress({ 
        current: 0, 
        total: repositories.length, 
        stage: `Processing ${repositories.length} repositories...` 
      });

      // Step 2: Fetch contributors for each repository
      const allContributors = [];
      const contributorsByRepo = {};
      
      for (let i = 0; i < repositories.length; i++) {
        const repo = repositories[i];
        
        setProgress(prev => ({ 
          ...prev, 
          current: i + 1, 
          stage: `Processing ${repo.name} (${i + 1}/${repositories.length})` 
        }));

        const contributors = await fetchRepoContributors(
          repo.owner.login, 
          repo.name, 
          tokenInput
        );

        if (contributors.length > 0) {
          allContributors.push(...contributors);
          contributorsByRepo[repo.full_name] = {
            repository: repo.full_name,
            name: repo.name,
            private: repo.private,
            url: repo.html_url,
            description: repo.description,
            language: repo.language,
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            contributors: contributors,
            contributorCount: contributors.length,
            totalContributions: contributors.reduce((sum, c) => sum + c.contributions, 0)
          };
        }

        // Rate limiting
        await delay(200);
      }

      // Step 3: Generate summary
      const summary = generateSummary(allContributors, contributorsByRepo, repositories);

      const newData = {
        repositories,
        contributorsByRepo,
        allContributors,
        summary
      };

      setData(newData);

      // Save to cache
      setCachedData(newData);

      setProgress({ 
        current: repositories.length, 
        total: repositories.length, 
        stage: 'Complete!' 
      });

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Generate summary statistics
  const generateSummary = (allContributors, contributorsByRepo, repositories) => {
    const uniqueContributors = new Map();
    
    allContributors.forEach(contributor => {
      const key = contributor.login;
      if (!uniqueContributors.has(key)) {
        uniqueContributors.set(key, {
          login: contributor.login,
          avatar_url: contributor.avatar_url,
          html_url: contributor.html_url,
          totalContributions: 0,
          repositories: []
        });
      }
      
      const existing = uniqueContributors.get(key);
      existing.totalContributions += contributor.contributions;
      existing.repositories.push({
        repo: contributor.repository,
        contributions: contributor.contributions
      });
    });

    const reposWithContributors = Object.keys(contributorsByRepo).length;
    const totalContributions = allContributors.reduce((sum, c) => sum + c.contributions, 0);

    return {
      totalRepositories: repositories.length,
      repositoriesWithContributors: reposWithContributors,
      privateRepositories: repositories.filter(r => r.private).length,
      publicRepositories: repositories.filter(r => !r.private).length,
      uniqueContributors: uniqueContributors.size,
      totalContributors: allContributors.length,
      totalContributions,
      topContributors: Array.from(uniqueContributors.values())
        .sort((a, b) => b.totalContributions - a.totalContributions)
        .slice(0, 20),
      topRepositories: Object.values(contributorsByRepo)
        .sort((a, b) => b.contributorCount - a.contributorCount)
        .slice(0, 10)
    };
  };

  // Auto-load on mount if autoLoad is true
  useEffect(() => {
    if (autoLoad && username) {
      fetchAllData();
    }
  }, [autoLoad, username]);

  // Filter functions
  const filteredContributors = data.summary?.topContributors.filter(contributor =>
    contributor.login.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const filteredRepos = Object.values(data.contributorsByRepo).filter(repo =>
    repo.repository.toLowerCase().includes(searchTerm.toLowerCase()) ||
    repo.language?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Cache Status Banner */}
      {/* {(usingCache || lastFetched) && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <div>
                <span className="text-green-700 font-medium">
                  {usingCache ? 'Using cached data' : 'Data cached successfully'}
                </span>
                {lastFetched && (
                  <p className="text-green-600 text-sm">
                    Last fetched: {lastFetched.toLocaleString()}
                    {getCacheTimeRemaining() > 0 && (
                      <span> • Expires in: {formatTimeRemaining(getCacheTimeRemaining())}</span>
                    )}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => fetchAllData(true)}
                disabled={loading}
                className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                Refresh Data
              </button>
              <button
                onClick={clearCache}
                className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Clear Cache
              </button>
            </div>
          </div>
        </div>
      )} */}

      {/* Loading Progress */}
      {loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-blue-700 font-medium">{progress.stage}</span>
            <span className="text-blue-600 text-sm">
              {progress.total > 0 && `${progress.current}/${progress.total}`}
            </span>
          </div>
          {progress.total > 0 && (
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              ></div>
            </div>
          )}
          <p className="text-blue-600 text-sm mt-2">
            This may take a few minutes for users with many repositories...
          </p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-700 mb-6">
          <h3 className="font-semibold text-lg mb-2">Error</h3>
          <p className="mb-4">{error}</p>
          <div className="flex gap-2">
            <button 
              onClick={() => fetchAllData(true)}
              className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Try Again
            </button>
            {getCachedData() && (
              <button 
                onClick={() => loadFromCache()}
                className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Load Cached Data
              </button>
            )}
          </div>
        </div>
      )}

      {/* Results */}
      {data.summary && (
        <>
          {/* Navigation Tabs */}
          <div className="flex flex-wrap gap-2 text-black mb-6 border-b">
            {[
              { id: 'summary', label: 'Summary', count: null },
              { id: 'contributors', label: 'Top Contributors', count: data.summary.uniqueContributors },
              { id: 'repositories', label: 'Repositories', count: data.summary.repositoriesWithContributors }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {tab.label}
                {tab.count && <span className="ml-2 text-sm">({tab.count})</span>}
              </button>
            ))}
          </div>

          {/* Rest of your existing JSX remains the same */}
          {/* Summary Tab */}
          {activeTab === 'summary' && (
            <div className="space-y-8">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-md border">
                  <h3 className="font-semibold text-gray-600 mb-2">Total Repositories</h3>
                  <p className="text-3xl font-bold text-blue-600">{data.summary.totalRepositories}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {data.summary.privateRepositories} private, {data.summary.publicRepositories} public
                  </p>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md border">
                  <h3 className="font-semibold text-gray-600 mb-2">Unique Contributors</h3>
                  <p className="text-3xl font-bold text-green-600">{data.summary.uniqueContributors}</p>
                  <p className="text-sm text-gray-500 mt-1">Across all repositories</p>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md border">
                  <h3 className="font-semibold text-gray-600 mb-2">Total Contributions</h3>
                  <p className="text-3xl font-bold text-purple-600">{data.summary.totalContributions.toLocaleString()}</p>
                  <p className="text-sm text-gray-500 mt-1">All time</p>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md border">
                  <h3 className="font-semibold text-gray-600 mb-2">Active Repositories</h3>
                  <p className="text-3xl font-bold text-orange-600">{data.summary.repositoriesWithContributors}</p>
                  <p className="text-sm text-gray-500 mt-1">With contributors</p>
                </div>
              </div>

              {/* Top Contributors Preview */}
              <div className="bg-white rounded-lg text-black shadow-md p-6 border">
                <h3 className="text-xl font-semibold mb-4">Top Contributors</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.summary.topContributors.slice(0, 6).map((contributor, index) => (
                    <div key={contributor.login} className="flex items-center p-3 bg-gray-200 rounded-lg">
                      <span className="text-lg font-bold text-black w-8">#{index + 1}</span>
                      <img
                        src={contributor.avatar_url}
                        alt={contributor.login}
                        className="w-8 h-8 rounded-full mx-3"
                      />
                      <div className="flex-1">
                        <p className="font-medium">{contributor.login}</p>
                        <p className="text-sm text-gray-600">
                          {contributor.totalContributions.toLocaleString()} contributions
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Contributors Tab */}
          {activeTab === 'contributors' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredContributors.map((contributor, index) => (
                <div key={contributor.login} className="bg-white rounded-lg shadow-md p-6 border hover:shadow-lg transition-shadow">
                  <div className="flex items-center mb-4">
                    <div className="text-2xl font-bold text-black w-12">#{index + 1}</div>
                    <img
                      src={contributor.avatar_url}
                      alt={contributor.login}
                      className="w-12 h-12 rounded-full border-2 border-gray-200 mx-3"
                    />
                    <div className="flex-1 text-black">
                      <h3 className="font-semibold text-lg">{contributor.login}</h3>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <p className="text-2xl font-bold text-blue-600">
                      {contributor.totalContributions.toLocaleString()}
                    </p>
                    <p className="text-gray-600 text-sm">
                      contributions across {contributor.repositories.length} repositories
                    </p>
                  </div>

                  <div className="space-y-1 mb-4">
                    <p className="font-medium text-sm text-gray-700">Top repositories:</p>
                    {contributor.repositories
                      .sort((a, b) => b.contributions - a.contributions)
                      .slice(0, 3)
                      .map(repo => (
                        <div key={repo.repo} className="text-xs text-gray-600 flex justify-between">
                          <span className="truncate mr-2">{repo.repo.split('/')[1]}</span>
                          <span className="font-medium">{repo.contributions}</span>
                        </div>
                      ))}
                  </div>

                  <a
                    href={contributor.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block w-full text-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    View GitHub Profile
                  </a>
                </div>
              ))}
            </div>
          )}

          {/* Repositories Tab */}
          {activeTab === 'repositories' && (
            <div className="space-y-4">
              {filteredRepos
                .sort((a, b) => b.contributorCount - a.contributorCount)
                .map(repo => (
                  <div key={repo.repository} className="bg-white rounded-lg shadow-md p-6 border">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold text-gray-800">
                            <a href={repo.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">
                              {repo.name}
                            </a>
                          </h3>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            repo.private 
                              ? 'bg-red-100 text-red-700' 
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {repo.private ? 'Private' : 'Public'}
                          </span>
                          {repo.language && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                              {repo.language}
                            </span>
                          )}
                        </div>
                        
                        {repo.description && (
                          <p className="text-gray-600 text-sm mb-2">{repo.description}</p>
                        )}
                        
                        <div className="flex items-center gap-6 text-sm text-gray-600">
                          <span>{repo.contributorCount} contributors</span>
                          <span>{repo.totalContributions.toLocaleString()} contributions</span>
                          {repo.stars > 0 && <span>⭐ {repo.stars}</span>}
                          {repo.forks > 0 && <span>🍴 {repo.forks}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {repo.contributors.slice(0, 10).map(contributor => (
                        <div
                          key={contributor.login}
                          className="flex items-center bg-gray-50 rounded-full px-3 py-1 hover:bg-gray-100 transition-colors"
                          title={`${contributor.login}: ${contributor.contributions} contributions`}
                        >
                          <img
                            src={contributor.avatar_url}
                            alt={contributor.login}
                            className="w-6 h-6 rounded-full mr-2"
                          />
                          <span className="text-sm text-black font-medium">{contributor.login}</span>
                          <span className="text-xs text-gray-600 ml-1">
                            ({contributor.contributions})
                          </span>
                        </div>
                      ))}
                      {repo.contributors.length > 10 && (
                        <div className="flex items-center justify-center bg-gray-200 rounded-full px-3 py-1">
                          <span className="text-sm text-gray-600">
                            +{repo.contributors.length - 10} more
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AllContributorsComponent;