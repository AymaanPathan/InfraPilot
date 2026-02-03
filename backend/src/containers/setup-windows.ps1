# Kubernetes Error Testing - Windows Setup
Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Kubernetes Error Testing - Windows Setup            ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Host "🔍 Checking prerequisites..." -ForegroundColor Blue

# Check Docker
if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker not found. Please install Docker Desktop first." -ForegroundColor Red
    exit 1
}
Write-Host "✓ Docker found" -ForegroundColor Green

# Check kubectl
if (!(Get-Command kubectl -ErrorAction SilentlyContinue)) {
    Write-Host "❌ kubectl not found. Please install kubectl first." -ForegroundColor Red
    exit 1
}
Write-Host "✓ kubectl found" -ForegroundColor Green

# Check Kubernetes cluster
try {
    kubectl cluster-info | Out-Null
    Write-Host "✓ Kubernetes cluster accessible" -ForegroundColor Green
} catch {
    Write-Host "❌ Kubernetes cluster not accessible. Please start your cluster." -ForegroundColor Red
    exit 1
}

Write-Host ""

# Build Node.js error app
Write-Host "📦 Building Node.js error generator..." -ForegroundColor Blue
Set-Location error-apps\nodejs-error-app
docker build -t error-generator:latest .
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to build Node.js app" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Node.js error generator built" -ForegroundColor Green
Set-Location ..\..

# Build Python error app
Write-Host "📦 Building Python error generator..." -ForegroundColor Blue
Set-Location error-apps\python-error-app
docker build -t python-error-generator:latest .
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to build Python app" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Python error generator built" -ForegroundColor Green
Set-Location ..\..

# Check if using Docker Desktop
$context = kubectl config current-context
if ($context -eq "docker-desktop") {
    Write-Host "✓ Using Docker Desktop - images are automatically available" -ForegroundColor Green
}

# Deploy error scenarios
Write-Host ""
Write-Host "🚀 Deploying error scenarios..." -ForegroundColor Blue
Set-Location k8s-manifests
kubectl apply -f error-scenarios.yaml

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host "📊 What's been deployed:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  1. CrashLoopBackOff app (crashes after 10 requests)"
Write-Host "  2. OOMKilled app (memory leak → out of memory)"
Write-Host "  3. High error rate app (80% errors in logs)"
Write-Host "  4. Unhealthy app (failing health checks)"
Write-Host "  5. ImagePullBackOff app (non-existent image)"
Write-Host "  6. Pending app (insufficient resources)"
Write-Host "  7. CPU intensive app (hitting CPU limits)"
Write-Host "  8. Database error app (connection failures)"
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host "🔍 Next steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  # Watch pods (some will crash, some will error)"
Write-Host "  kubectl get pods -n error-testing -w"
Write-Host ""
Write-Host "  # View logs from any pod"
Write-Host "  kubectl logs -n error-testing <pod-name> --tail=50"
Write-Host ""
Write-Host "  # Check events"
Write-Host "  kubectl get events -n error-testing --sort-by='.lastTimestamp'"
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host "🧪 Test queries for your AI dashboard:" -ForegroundColor Yellow
Write-Host ""
Write-Host '  • "Show cluster overview"'
Write-Host '  • "Show all pods in error-testing namespace"'
Write-Host '  • "Monitor pod health in error-testing"'
Write-Host '  • "Get logs for crashloop-app and explain errors"'
Write-Host '  • "Why is oom-app failing?"'
Write-Host '  • "Show resource usage for error-testing"'
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host "🧹 Cleanup:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  kubectl delete namespace error-testing"
Write-Host ""