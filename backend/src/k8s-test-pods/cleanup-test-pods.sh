#!/bin/bash

# Cleanup Test Pods Script
# Removes all test pods and namespace

set -e

echo "🧹 Cleaning up Error Test Pods..."
echo ""

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl not found."
    exit 1
fi

# Delete the namespace (this will delete all resources in it)
echo "🗑️  Deleting error-testing namespace and all resources..."
kubectl delete namespace error-testing --ignore-not-found=true

echo ""
echo "⏳ Waiting for namespace to be fully deleted..."
kubectl wait --for=delete namespace/error-testing --timeout=60s 2>/dev/null || true

echo ""
echo "✅ Cleanup complete! All test pods have been removed."