#!/bin/bash

# Deploy Test Pods Script
# Creates various error scenarios for testing Kubernetes monitoring

set -e

echo "🚀 Deploying Error Test Pods to Kubernetes..."
echo ""

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl not found. Please install kubectl first."
    exit 1
fi

# Check if cluster is accessible
if ! kubectl cluster-info &> /dev/null; then
    echo "❌ Cannot connect to Kubernetes cluster. Check your kubeconfig."
    exit 1
fi

echo "✅ Kubernetes cluster is accessible"
echo ""

# Apply the test pods
echo "📦 Creating error-testing namespace and deploying test pods..."
kubectl apply -f test-pods.yaml

echo ""
echo "⏳ Waiting for pods to be created (10 seconds)..."
sleep 10

echo ""
echo "📊 Current pod status:"
kubectl get pods -n error-testing -o wide

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Test pods created:"
echo "  1. crashloop-pod         - CrashLoopBackOff (exits with error)"
echo "  2. imagepull-pod         - ImagePullBackOff (invalid image)"
echo "  3. pending-pod           - Pending (insufficient resources)"
echo "  4. oom-pod               - OOMKilled (out of memory)"
echo "  5. app-error-pod         - Running but with errors in logs"
echo "  6. unhealthy-pod         - Running but failing health checks"
echo "  7. mixed-health-deployment - Deployment with 3 replicas"
echo ""
echo "🧪 Test commands you can try:"
echo "  - show all pods"
echo "  - show pods in error-testing namespace"
echo "  - get logs for app-error-pod in error-testing"
echo "  - why is crashloop-pod crashing in error-testing"
echo "  - show events for imagepull-pod in error-testing"
echo "  - analyze cluster health"
echo ""
echo "🔍 To monitor in real-time:"
echo "  kubectl get pods -n error-testing -w"
echo ""
echo "🧹 To clean up:"
echo "  ./cleanup-test-pods.sh"