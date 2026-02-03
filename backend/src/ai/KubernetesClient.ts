import * as k8s from "@kubernetes/client-node";
import logger from "../utils/logger";

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

  /**
   * Get detailed metrics server status with installation guidance
   */
  async getMetricsServerStatus(): Promise<{
    available: boolean;
    error?: string;
    installationGuide?: string;
  }> {
    const available = await this.isMetricsServerAvailable();

    if (!available) {
      return {
        available: false,
        error: "Kubernetes Metrics Server is not installed or not responding",
        installationGuide: `To enable pod metrics, install the Metrics Server:

**For Docker Desktop Kubernetes:**
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

**For Minikube:**
minikube addons enable metrics-server

**For other clusters:**
1. Download: curl -LO https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
2. Edit the deployment and add: --kubelet-insecure-tls
3. Apply: kubectl apply -f components.yaml

**Verify installation:**
kubectl get deployment metrics-server -n kube-system
kubectl top nodes

After installation, wait 1-2 minutes for metrics to become available.`,
      };
    }

    return { available: true };
  }

  // ============================================
  // POD OPERATIONS
  // ============================================

  async listPods(
    namespace?: string,
    labelSelector?: string,
  ): Promise<k8s.V1Pod[]> {
    try {
      const response = namespace
        ? await this.coreV1Api.listNamespacedPod({ namespace, labelSelector })
        : await this.coreV1Api.listPodForAllNamespaces({ labelSelector });

      return response.items || [];
    } catch (error) {
      logger.error("Error listing pods", { error, namespace, labelSelector });
      throw new Error(`Failed to list pods: ${error}`);
    }
  }

  async getPod(name: string, namespace: string): Promise<k8s.V1Pod> {
    try {
      return await this.coreV1Api.readNamespacedPod({ name, namespace });
    } catch (error) {
      logger.error("Error getting pod", { error, name, namespace });
      throw new Error(`Failed to get pod ${name} in ${namespace}: ${error}`);
    }
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
  // ENHANCED METRICS OPERATIONS
  // ============================================

  /**
   * Get pod metrics with graceful error handling
   * Returns null if metrics are unavailable instead of throwing
   */
  async getPodMetrics(name?: string, namespace?: string): Promise<any | null> {
    try {
      // Check if metrics server is available
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
        const response = await this.metricsApi.getPodMetrics(namespace);
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

  /**
   * Get pod metrics safely - returns null instead of throwing
   * Useful for optional metrics display
   */
  async getPodMetricsSafe(
    name: string,
    namespace: string,
  ): Promise<any | null> {
    try {
      return await this.getPodMetrics(name, namespace);
    } catch (error: any) {
      const errorMessage = error?.message || "";
      if (errorMessage.includes("METRICS_UNAVAILABLE")) {
        logger.debug("Metrics unavailable for pod (expected)", {
          name,
          namespace,
        });
        return null;
      }
      // Re-throw other errors
      throw error;
    }
  }

  // ============================================
  // NAMESPACE OPERATIONS
  // ============================================

  async listNamespaces(): Promise<k8s.V1Namespace[]> {
    try {
      const response = await this.coreV1Api.listNamespace();
      return response.items || [];
    } catch (error) {
      logger.error("Error listing namespaces", { error });
      throw new Error(`Failed to list namespaces: ${error}`);
    }
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
}

// Export singleton and factory
export const k8sClient = new KubernetesClient();

export function createK8sClient(configPath?: string): KubernetesClient {
  return new KubernetesClient(configPath);
}
