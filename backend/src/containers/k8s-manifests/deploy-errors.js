#!/usr/bin/env node

const { execSync } = require("child_process");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ERROR_SCENARIOS = {
  1: {
    name: "CrashLoopBackOff",
    deployment: "crashloop-app",
    description: "App crashes after 10 requests, restarts continuously",
    errorType: "Container keeps crashing and restarting",
    logsPreview: 'Look for: "FATAL: Crash limit reached"',
  },
  2: {
    name: "OOMKilled",
    deployment: "oom-app",
    description: "Memory leak causes Out of Memory termination",
    errorType: "Pod killed due to excessive memory usage",
    logsPreview: 'Look for: "Memory leak: XXXXX items allocated"',
  },
  3: {
    name: "High Error Rate",
    deployment: "error-spammer",
    description: "80% of requests generate errors (connection, timeout, auth)",
    errorType: "Application errors flooding logs",
    logsPreview:
      'Look for: "ERROR [X]: DatabaseConnectionError", "RedisConnectionError"',
  },
  4: {
    name: "Failing Health Checks",
    deployment: "unhealthy-app",
    description: "Health endpoints return 500, pod marked unhealthy",
    errorType: "Liveness/Readiness probes failing",
    logsPreview: "Check pod status for health check failures",
  },
  5: {
    name: "ImagePullBackOff",
    deployment: "imagepull-fail",
    description: "Container image does not exist",
    errorType: "Cannot pull container image from registry",
    logsPreview: 'Check events for: "Failed to pull image"',
  },
  6: {
    name: "Pending (Insufficient Resources)",
    deployment: "pending-app",
    description: "Requests 100Gi memory, cannot be scheduled",
    errorType: "Pod cannot be scheduled to any node",
    logsPreview: 'Check events for: "Insufficient memory"',
  },
  7: {
    name: "High CPU Usage",
    deployment: "cpu-intensive",
    description: "CPU-intensive operations hitting limits",
    errorType: "Container being throttled due to CPU limits",
    logsPreview: 'Look for: "CPU intensive operation took XXXms"',
  },
  8: {
    name: "Database Connection Errors",
    deployment: "db-error-app",
    description: "50% error rate with database connection failures",
    errorType: "Persistent database connectivity issues",
    logsPreview: 'Look for: "DatabaseError: Connection pool exhausted"',
  },
};

function printBanner() {
  console.log("\n╔════════════════════════════════════════════════════════╗");
  console.log("║     Kubernetes Error Scenario Test Generator          ║");
  console.log("╚════════════════════════════════════════════════════════╝\n");
}

function printMenu() {
  console.log("📋 Available Error Scenarios:\n");
  Object.entries(ERROR_SCENARIOS).forEach(([key, scenario]) => {
    console.log(`  ${key}. ${scenario.name}`);
    console.log(`     └─ ${scenario.description}\n`);
  });
  console.log("  0. Exit\n");
  console.log("  all. Deploy ALL scenarios at once\n");
}

function executeCommand(cmd, description) {
  try {
    console.log(`\n⚙️  ${description}...`);
    const output = execSync(cmd, { encoding: "utf-8" });
    console.log(output);
    return true;
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return false;
  }
}

function buildImages() {
  console.log("\n🔨 Building Docker images...\n");

  const builds = [
    {
      path: "../error-apps/nodejs-error-app",
      tag: "error-generator:latest",
      name: "Node.js Error Generator",
    },
    {
      path: "../error-apps/python-error-app",
      tag: "python-error-generator:latest",
      name: "Python Error Generator",
    },
  ];

  for (const build of builds) {
    console.log(`📦 Building ${build.name}...`);
    const success = executeCommand(
      `docker build -t ${build.tag} ${build.path}`,
      `Building ${build.name}`,
    );

    if (!success) {
      console.error(`❌ Failed to build ${build.name}`);
      return false;
    }
    console.log(`✅ ${build.name} built successfully\n`);
  }

  return true;
}

function deployScenario(scenarioKey) {
  const scenario = ERROR_SCENARIOS[scenarioKey];

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🚀 Deploying: ${scenario.name}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Description: ${scenario.description}`);
  console.log(`Error Type: ${scenario.errorType}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  // Create namespace
  executeCommand(
    "kubectl create namespace error-testing --dry-run=client -o yaml | kubectl apply -f -",
    "Creating namespace",
  );

  // Deploy specific scenario (extract from YAML)
  const cmd = `kubectl apply -f error-scenarios.yaml && kubectl rollout restart deployment/${scenario.deployment} -n error-testing 2>/dev/null || true`;
  const success = executeCommand(cmd, `Deploying ${scenario.name}`);

  if (success) {
    console.log(`\n✅ ${scenario.name} deployed successfully!\n`);
    console.log("📊 What to check:\n");
    console.log(
      `   1. Pod status: kubectl get pods -n error-testing -l app=${scenario.deployment.split("-")[0]}`,
    );
    console.log(
      `   2. Pod logs: kubectl logs -n error-testing -l app=${scenario.deployment.split("-")[0]} --tail=50`,
    );
    console.log(
      `   3. Pod events: kubectl describe pod -n error-testing -l app=${scenario.deployment.split("-")[0]}`,
    );
    console.log(`\n   ${scenario.logsPreview}\n`);

    console.log("🧪 Test with your AI dashboard:");
    console.log(`   - "Show pods in error-testing namespace"`);
    console.log(`   - "Get logs for ${scenario.deployment}"`);
    console.log(`   - "Why is ${scenario.deployment} failing?"`);
    console.log(`   - "Show events for ${scenario.deployment}"`);
  }
}

function deployAll() {
  console.log("\n🚀 Deploying ALL error scenarios...\n");

  executeCommand(
    "kubectl apply -f error-scenarios.yaml",
    "Deploying all scenarios",
  );

  console.log("\n✅ All scenarios deployed!\n");
  console.log("📊 View all pods: kubectl get pods -n error-testing -w\n");
  console.log("🧪 Test queries for your AI dashboard:");
  console.log('   - "Show cluster overview"');
  console.log('   - "Show all pods in error-testing"');
  console.log('   - "Show pods with errors"');
  console.log('   - "Monitor pod health in error-testing"');
  console.log('   - "Get resource usage for error-testing namespace"\n');
}

function cleanup() {
  console.log("\n🧹 Cleaning up...\n");
  executeCommand(
    "kubectl delete namespace error-testing --ignore-not-found=true",
    "Deleting namespace and all resources",
  );
  console.log("\n✅ Cleanup complete!\n");
}

function promptUser() {
  rl.question(
    "Select scenario (number) or action (all/clean/build/exit): ",
    (answer) => {
      const choice = answer.trim().toLowerCase();

      if (choice === "0" || choice === "exit" || choice === "quit") {
        console.log("\n👋 Goodbye!\n");
        rl.close();
        return;
      }

      if (choice === "build") {
        buildImages();
        promptUser();
        return;
      }

      if (choice === "clean" || choice === "cleanup") {
        cleanup();
        promptUser();
        return;
      }

      if (choice === "all") {
        deployAll();
        promptUser();
        return;
      }

      if (ERROR_SCENARIOS[choice]) {
        deployScenario(choice);
        promptUser();
      } else {
        console.log("\n❌ Invalid choice. Please try again.\n");
        promptUser();
      }
    },
  );
}

// Main
function main() {
  printBanner();

  // Check if we're in the right directory
  const fs = require("fs");
  if (!fs.existsSync("error-scenarios.yaml")) {
    console.error("❌ Error: error-scenarios.yaml not found!");
    console.error(
      "   Please run this script from the k8s-manifests directory.\n",
    );
    process.exit(1);
  }

  console.log("⚙️  Pre-flight checks:");
  console.log('   1. Docker images need to be built first (choose "build")');
  console.log("   2. Make sure kubectl is configured");
  console.log("   3. Kubernetes cluster must be running\n");

  printMenu();
  promptUser();
}

main();
