import * as k8s from "@kubernetes/client-node";
import logger from "../utils/logger";

/**
 * Optimized Kubernetes Client
 *
 * Key optimizations:
 * 1. Response caching for frequently accessed data
 * 2. Batch operations for multiple similar requests
 * 3. Request deduplication
 * 4. Optimized metrics server checking
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export class KubernetesClient {
  private readonly kubeConfig: k8s.KubeConfig;
  private readonly coreV1Api: k8s.CoreV1Api;
  private readonly appsV1Api: k8s.AppsV1Api;
  private readonly metricsApi: k8s.Metrics;
  private readonly networkingV1Api: k8s.NetworkingV1Api;
  private readonly batchV1Api: k8s.BatchV1Api;
  private readonly storageV1Api: k8s.StorageV1Api;
  private readonly rbacV1Api: k8s.RbacAuthorizationV1Api;

  // Metrics server availability cache
  private metricsServerAvailable: boolean | null = null;
  private lastMetricsCheck: number = 0;
  private readonly METRICS_CHECK_INTERVAL = 60000; // Check every 60 seconds

  // Response cache for frequently accessed data
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly CACHE_TTL = 5000; // 5 seconds cache TTL

  // In-flight request deduplication
  private inFlightRequests: Map<string, Promise<any>> = new Map();

  constructor(configPath?: string) {
    this.kubeConfig = new k8s.KubeConfig();

    if (configPath) {
      this.kubeConfig.loadFromFile(configPath);
    } else {
      this.kubeConfig.loadFromDefault();
    }

    this.coreV1Api = this.kubeConfig.makeApiClient(k8s.CoreV1Api);
    this.appsV1Api = this.kubeConfig.makeApiClient(k8s.AppsV1Api);
    this.metricsApi = new k8s.Metrics(this.kubeConfig);
    this.networkingV1Api = this.kubeConfig.makeApiClient(k8s.NetworkingV1Api);
    this.batchV1Api = this.kubeConfig.makeApiClient(k8s.BatchV1Api);
    this.storageV1Api = this.kubeConfig.makeApiClient(k8s.StorageV1Api);
    this.rbacV1Api = this.kubeConfig.makeApiClient(k8s.RbacAuthorizationV1Api);
  }

  // ============================================
  // CACHE HELPERS
  // ============================================

  private getCacheKey(operation: string, ...args: any[]): string {
    return `${operation}:${JSON.stringify(args)}`;
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear cache manually if needed
   */
  clearCache(): void {
    this.cache.clear();
    logger.info("Cache cleared");
  }

  // ============================================
  // REQUEST DEDUPLICATION
  // ============================================

  /**
   * Deduplicate concurrent identical requests
   */
  private async deduplicateRequest<T>(
    key: string,
    requestFn: () => Promise<T>,
  ): Promise<T> {
    // Check if same request is already in flight
    const inFlight = this.inFlightRequests.get(key);
    if (inFlight) {
      logger.debug("Deduplicating request", { key });
      return inFlight as Promise<T>;
    }

    // Execute request and store promise
    const promise = requestFn();
    this.inFlightRequests.set(key, promise);

    try {
      const result = await promise;
      return result;
    } finally {
      // Clean up after request completes
      this.inFlightRequests.delete(key);
    }
  }

  // ============================================
  // METRICS SERVER HEALTH CHECK
  // ============================================

  /**
   * Check if Metrics Server is available
   * Caches result to avoid repeated checks
   */
  async isMetricsServerAvailable(): Promise<boolean> {
    const now = Date.now();

    // Return cached result if recent
    if (
      this.metricsServerAvailable !== null &&
      now - this.lastMetricsCheck < this.METRICS_CHECK_INTERVAL
    ) {
      return this.metricsServerAvailable;
    }

    try {
      // Try to get any pod metrics from default namespace
      await this.metricsApi.getPodMetrics("default");
      this.metricsServerAvailable = true;
      this.lastMetricsCheck = now;
      logger.info("Metrics Server is available");
      return true;
    } catch (error: any) {
      // Check if it's a metrics server unavailability error
      const errorMessage = error?.message?.toLowerCase() || "";
      const isMetricsUnavailable =
        error?.statusCode === 500 ||
        error?.code === 500 ||
        errorMessage.includes("invalid json") ||
        errorMessage.includes("metrics.k8s.io") ||
        errorMessage.includes("not found") ||
        errorMessage.includes("unavailable");

      if (isMetricsUnavailable) {
        this.metricsServerAvailable = false;
        this.lastMetricsCheck = now;
        logger.warn("Metrics Server is not available", {
          error: error?.message,
        });
        return false;
      }

      // Unknown error - don't cache result
      logger.error("Error checking Metrics Server availability", { error });
      return false;
    }
  }

  // ============================================
  // OPTIMIZED POD OPERATIONS
  // ============================================

  /**
   * List pods with optional caching
   */
  async listPods(
    namespace?: string,
    labelSelector?: string,
    useCache: boolean = false,
  ): Promise<k8s.V1Pod[]> {
    const cacheKey = this.getCacheKey("listPods", namespace, labelSelector);

    // Try cache first if enabled
    if (useCache) {
      const cached = this.getFromCache<k8s.V1Pod[]>(cacheKey);
      if (cached) {
        logger.debug("Cache hit for listPods");
        return cached;
      }
    }

    // Deduplicate concurrent requests
    return this.deduplicateRequest(cacheKey, async () => {
      try {
        const response = namespace
          ? await this.coreV1Api.listNamespacedPod({ namespace, labelSelector })
          : await this.coreV1Api.listPodForAllNamespaces({ labelSelector });

        const pods = response.items || [];

        // Cache result if caching is enabled
        if (useCache) {
          this.setCache(cacheKey, pods);
        }

        return pods;
      } catch (error) {
        logger.error("Error listing pods", { error, namespace, labelSelector });
        throw new Error(`Failed to list pods: ${error}`);
      }
    });
  }

  /**
   * Batch get multiple pods
   * Much faster than calling getPod multiple times
   */
  async getPodsBatch(
    requests: Array<{ name: string; namespace: string }>,
  ): Promise<
    Array<{
      name: string;
      namespace: string;
      pod: k8s.V1Pod | null;
      error?: string;
    }>
  > {
    logger.info("Batch getting pods", { count: requests.length });

    const startTime = Date.now();

    // Execute all requests in parallel
    const results = await Promise.all(
      requests.map(async ({ name, namespace }) => {
        try {
          const pod = await this.coreV1Api.readNamespacedPod({
            name,
            namespace,
          });
          return { name, namespace, pod };
        } catch (error) {
          logger.warn("Pod not found in batch", { name, namespace });
          return {
            name,
            namespace,
            pod: null,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }),
    );

    const duration = Date.now() - startTime;
    logger.info("Batch pod fetch complete", {
      count: requests.length,
      duration,
      avgPerPod: Math.round(duration / requests.length),
    });

    return results;
  }

  async getPod(name: string, namespace: string): Promise<k8s.V1Pod> {
    const cacheKey = this.getCacheKey("getPod", name, namespace);

    return this.deduplicateRequest(cacheKey, async () => {
      try {
        return await this.coreV1Api.readNamespacedPod({ name, namespace });
      } catch (error) {
        logger.error("Error getting pod", { error, name, namespace });
        throw new Error(`Failed to get pod ${name} in ${namespace}: ${error}`);
      }
    });
  }

  /**
   * Optimized batch log fetching
   */
  async getPodLogsBatch(
    requests: Array<{
      name: string;
      namespace: string;
      options?: {
        container?: string;
        tailLines?: number;
        previous?: boolean;
        timestamps?: boolean;
        sinceSeconds?: number;
      };
    }>,
  ): Promise<
    Array<{
      name: string;
      namespace: string;
      logs: string | null;
      error?: string;
    }>
  > {
    logger.info("Batch getting pod logs", { count: requests.length });

    const startTime = Date.now();

    // Execute all log requests in parallel
    const results = await Promise.all(
      requests.map(async ({ name, namespace, options }) => {
        try {
          const logs = await this.coreV1Api.readNamespacedPodLog({
            name,
            namespace,
            container: options?.container,
            tailLines: options?.tailLines || 100, // Default to 100 lines
            previous: options?.previous,
            timestamps: options?.timestamps,
            sinceSeconds: options?.sinceSeconds,
          });

          return { name, namespace, logs };
        } catch (error) {
          logger.warn("Failed to get logs for pod", { name, namespace });
          return {
            name,
            namespace,
            logs: null,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }),
    );

    const duration = Date.now() - startTime;
    logger.info("Batch log fetch complete", {
      count: requests.length,
      duration,
      avgPerPod: Math.round(duration / requests.length),
    });

    return results;
  }

  async getPodLogs(
    name: string,
    namespace: string,
    options?: {
      container?: string;
      tailLines?: number;
      previous?: boolean;
      timestamps?: boolean;
      sinceSeconds?: number;
    },
  ): Promise<string> {
    try {
      return await this.coreV1Api.readNamespacedPodLog({
        name,
        namespace,
        container: options?.container,
        tailLines: options?.tailLines,
        previous: options?.previous,
        timestamps: options?.timestamps,
        sinceSeconds: options?.sinceSeconds,
      });
    } catch (error) {
      logger.error("Error getting pod logs", { error, name, namespace });
      throw new Error(`Failed to get logs for pod ${name}: ${error}`);
    }
  }

  /**
   * Batch get pod events
   */
  async getPodEventsBatch(
    requests: Array<{ name: string; namespace: string }>,
  ): Promise<
    Array<{
      name: string;
      namespace: string;
      events: k8s.CoreV1Event[];
      error?: string;
    }>
  > {
    logger.info("Batch getting pod events", { count: requests.length });

    const startTime = Date.now();

    const results = await Promise.all(
      requests.map(async ({ name, namespace }) => {
        try {
          const response = await this.coreV1Api.listNamespacedEvent({
            namespace,
            fieldSelector: `involvedObject.name=${name}`,
          });

          return {
            name,
            namespace,
            events: response.items || [],
          };
        } catch (error) {
          logger.warn("Failed to get events for pod", { name, namespace });
          return {
            name,
            namespace,
            events: [],
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }),
    );

    const duration = Date.now() - startTime;
    logger.info("Batch events fetch complete", {
      count: requests.length,
      duration,
      avgPerPod: Math.round(duration / requests.length),
    });

    return results;
  }

  async getPodEvents(
    name: string,
    namespace: string,
  ): Promise<k8s.CoreV1Event[]> {
    try {
      const response = await this.coreV1Api.listNamespacedEvent({
        namespace,
        fieldSelector: `involvedObject.name=${name}`,
      });
      return response.items || [];
    } catch (error) {
      logger.error("Error getting pod events", { error, name, namespace });
      throw new Error(`Failed to get events for pod ${name}: ${error}`);
    }
  }

  // ============================================
  // OPTIMIZED METRICS OPERATIONS
  // ============================================

  /**
   * Get pod metrics with graceful error handling
   * Returns null if metrics are unavailable instead of throwing
   */
  async getPodMetrics(name?: string, namespace?: string): Promise<any | null> {
    try {
      // Check if metrics server is available (cached)
      const metricsAvailable = await this.isMetricsServerAvailable();

      if (!metricsAvailable) {
        logger.warn("Metrics Server unavailable, returning null", {
          name,
          namespace,
        });
        throw new Error(
          "METRICS_UNAVAILABLE: Kubernetes Metrics Server is not installed or not responding. " +
            "Pod metrics cannot be retrieved. Install Metrics Server to enable this feature.",
        );
      }

      if (name && namespace) {
        // Get metrics for a specific pod
        const response: any = await this.metricsApi.getPodMetrics(namespace);

        // Filter for the specific pod
        if (response.items) {
          const podMetric = response.items.find(
            (item: any) => item.metadata?.name === name,
          );
          if (!podMetric) {
            throw new Error(
              `Metrics not found for pod ${name} in namespace ${namespace}`,
            );
          }
          return podMetric;
        }

        // If response is already a single pod metric
        if (response.metadata?.name === name) {
          return response;
        }

        throw new Error(
          `Metrics not found for pod ${name} in namespace ${namespace}`,
        );
      } else if (namespace) {
        // Get metrics for all pods in a namespace
        const response: any = await this.metricsApi.getPodMetrics(namespace);
        return response;
      } else {
        // Get metrics for all pods across all namespaces
        const namespaces = await this.listNamespaces();
        const allMetrics: any[] = [];

        for (const ns of namespaces) {
          try {
            const nsMetrics = await this.metricsApi.getPodMetrics(
              ns.metadata?.name || "",
            );
            if (nsMetrics.items) {
              allMetrics.push(...nsMetrics.items);
            }
          } catch (error) {
            logger.debug("No metrics available for namespace", {
              namespace: ns.metadata?.name,
            });
          }
        }

        return { items: allMetrics };
      }
    } catch (error: any) {
      // Check if this is a metrics unavailable error
      const errorMessage = error?.message?.toLowerCase() || "";

      if (
        errorMessage.includes("metrics_unavailable") ||
        errorMessage.includes("metrics server") ||
        error?.statusCode === 500 ||
        error?.code === 500
      ) {
        // Mark metrics as unavailable
        this.metricsServerAvailable = false;
        this.lastMetricsCheck = Date.now();

        logger.error("Metrics Server unavailable", {
          name,
          namespace,
          error: error?.message,
        });

        // Throw a user-friendly error
        throw new Error(
          `METRICS_UNAVAILABLE: Kubernetes Metrics Server is not available. ` +
            `Pod metrics cannot be retrieved. To fix this issue, please install the Metrics Server in your cluster.`,
        );
      }

      logger.error("Error getting pod metrics", { error, name, namespace });
      throw new Error(`Failed to get pod metrics: ${error}`);
    }
  }

  // ============================================
  // NAMESPACE OPERATIONS (with caching)
  // ============================================

  async listNamespaces(useCache: boolean = true): Promise<k8s.V1Namespace[]> {
    const cacheKey = this.getCacheKey("listNamespaces");

    if (useCache) {
      const cached = this.getFromCache<k8s.V1Namespace[]>(cacheKey);
      if (cached) return cached;
    }

    return this.deduplicateRequest(cacheKey, async () => {
      try {
        const response = await this.coreV1Api.listNamespace();
        const namespaces = response.items || [];

        if (useCache) {
          this.setCache(cacheKey, namespaces);
        }

        return namespaces;
      } catch (error) {
        logger.error("Error listing namespaces", { error });
        throw new Error(`Failed to list namespaces: ${error}`);
      }
    });
  }

  // ============================================
  // NODE OPERATIONS
  // ============================================

  async listNodes(labelSelector?: string): Promise<k8s.V1Node[]> {
    try {
      const response = await this.coreV1Api.listNode({ labelSelector });
      return response.items || [];
    } catch (error) {
      logger.error("Error listing nodes", { error, labelSelector });
      throw new Error(`Failed to list nodes: ${error}`);
    }
  }

  // ============================================
  // SERVICE OPERATIONS
  // ============================================

  async listServices(
    namespace?: string,
    labelSelector?: string,
  ): Promise<k8s.V1Service[]> {
    try {
      const response = namespace
        ? await this.coreV1Api.listNamespacedService({
            namespace,
            labelSelector,
          })
        : await this.coreV1Api.listServiceForAllNamespaces({ labelSelector });

      return response.items || [];
    } catch (error) {
      logger.error("Error listing services", { error, namespace });
      throw new Error(`Failed to list services: ${error}`);
    }
  }

  // ============================================
  // DEPLOYMENT OPERATIONS
  // ============================================

  async listDeployments(
    namespace?: string,
    labelSelector?: string,
  ): Promise<k8s.V1Deployment[]> {
    try {
      const response = namespace
        ? await this.appsV1Api.listNamespacedDeployment({
            namespace,
            labelSelector,
          })
        : await this.appsV1Api.listDeploymentForAllNamespaces({
            labelSelector,
          });

      return response.items || [];
    } catch (error) {
      logger.error("Error listing deployments", { error, namespace });
      throw new Error(`Failed to list deployments: ${error}`);
    }
  }

  async getDeployment(
    name: string,
    namespace: string,
  ): Promise<k8s.V1Deployment> {
    try {
      return await this.appsV1Api.readNamespacedDeployment({ name, namespace });
    } catch (error) {
      logger.error("Error getting deployment", { error, name, namespace });
      throw new Error(`Failed to get deployment ${name}: ${error}`);
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  async getClusterInfo(): Promise<{
    currentContext: string;
    cluster: string;
    user: string;
  }> {
    const currentContext = this.kubeConfig.getCurrentContext();
    const context = this.kubeConfig.getContextObject(currentContext);

    return {
      currentContext,
      cluster: context?.cluster || "unknown",
      user: context?.user || "unknown",
    };
  }

  async checkConnectivity(): Promise<boolean> {
    try {
      await this.coreV1Api.listNamespace();
      return true;
    } catch (error) {
      logger.error("Cluster connectivity check failed", { error });
      return false;
    }
  }

  async getNodeMetrics(): Promise<any[] | null> {
    try {
      const available = await this.isMetricsServerAvailable();
      if (!available) return null;

      const res: any = await this.metricsApi.getNodeMetrics();
      return res.items || [];
    } catch (error) {
      logger.error("Error getting node metrics", { error });
      return null;
    }
  }

  async getClusterVersion(): Promise<string | null> {
    try {
      const versionApi = this.kubeConfig.makeApiClient(k8s.VersionApi);
      const v = await versionApi.getCode();
      return v.gitVersion || null;
    } catch (error) {
      logger.error("Error getting cluster version", { error });
      return null;
    }
  }

  async getNodeUptimeHours(): Promise<number | null> {
    try {
      const nodes = await this.listNodes();
      if (!nodes.length) return null;

      const created = new Date(
        nodes[0].metadata?.creationTimestamp || "",
      ).getTime();

      const diff = Date.now() - created;
      return Math.floor(diff / (1000 * 60 * 60));
    } catch (error) {
      logger.error("Error calculating uptime", { error });
      return null;
    }
  }
}

// Export singleton and factory
export const k8sClient = new KubernetesClient();

export function createK8sClient(configPath?: string): KubernetesClient {
  return new KubernetesClient(configPath);
}
