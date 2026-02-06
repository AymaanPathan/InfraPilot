import logger from "../utils/logger";
import { runTool } from "./tool-runner";
import type { MultiStepPlan, PlanStep } from "./multi_step_planner";

/**
 * Multi-Step Executor - FIXED COMPARISON DATA EXTRACTION
 *
 * CRITICAL FIX: Properly extract metrics data for comparison
 * Problem: Was looking for r.data.pod which doesn't exist for get_pod_metrics
 * Solution: Use r.data directly, which already has all the metrics
 */

export interface StepResult {
  step_number: number;
  success: boolean;
  data: any;
  error?: string;
  executionTime: number;
}

export interface ExecutionResult {
  success: boolean;
  results: StepResult[];
  mergedData: any;
  finalComponent: string;
  totalExecutionTime: number;
  explanation?: string;
}

export async function executeMultiStepPlan(
  plan: MultiStepPlan,
): Promise<ExecutionResult> {
  const startTime = Date.now();

  console.log("\n========== 🚀 OPTIMIZED MULTI-STEP EXECUTOR START ==========");
  console.log("📊 Plan:", {
    stepCount: plan.steps.length,
    mergeStrategy: plan.merge_strategy,
    finalComponent: plan.final_component,
  });

  const isComparison =
    plan.merge_strategy === "compare" || plan.merge_strategy === "side_by_side";

  if (isComparison) {
    console.log("\n🔵 COMPARISON MODE - Using PARALLEL execution!");
  }

  const results: StepResult[] = [];

  try {
    // Parallel execution for comparisons
    if (
      isComparison &&
      plan.steps.length > 1 &&
      !hasStepDependencies(plan.steps)
    ) {
      console.log("\n⚡ EXECUTING STEPS IN PARALLEL...");
      const parallelResults = await executeStepsInParallel(plan.steps);
      results.push(...parallelResults);
      console.log(
        `\n✅ Parallel execution complete! Total time: ${Date.now() - startTime}ms`,
      );
    } else {
      // Sequential execution
      console.log("\n🔄 EXECUTING STEPS SEQUENTIALLY...");

      for (const step of plan.steps) {
        console.log(
          `\n📍 Executing Step ${step.step_number}: ${step.description}`,
        );
        const stepStartTime = Date.now();
        const resolvedArgs = await resolveDynamicArgs(step, results);

        try {
          const toolResult = await runTool({
            tool: step.tool,
            args: resolvedArgs,
          });

          const stepExecutionTime = Date.now() - stepStartTime;

          results.push({
            step_number: step.step_number,
            success: toolResult.success,
            data: toolResult.data,
            error: toolResult.error,
            executionTime: stepExecutionTime,
          });

          if (toolResult.success) {
            console.log(
              `   ✅ Step ${step.step_number} completed in ${stepExecutionTime}ms`,
            );
          } else {
            console.error(
              `   ❌ Step ${step.step_number} failed:`,
              toolResult.error,
            );
          }
        } catch (error) {
          const stepExecutionTime = Date.now() - stepStartTime;
          const errorMessage =
            error instanceof Error ? error.message : String(error);

          console.error(`   ❌ Step ${step.step_number} error:`, errorMessage);

          results.push({
            step_number: step.step_number,
            success: false,
            data: null,
            error: errorMessage,
            executionTime: stepExecutionTime,
          });
        }
      }
    }

    // Merge results
    console.log("\n🔀 MERGING RESULTS...");
    const mergedData = await mergeResults(
      results,
      plan.merge_strategy,
      plan.steps,
    );

    if (isComparison) {
      console.log("\n🔵 COMPARISON MERGE COMPLETE!");
      console.log("   Merged data structure:", {
        hasComparison: !!mergedData.comparison,
        comparisonCount: mergedData.comparison?.length,
        hasItems: !!mergedData.items,
        itemCount: mergedData.items?.length,
        comparisonType: mergedData.comparisonType,
      });
    }

    // Generate explanation if needed
    let explanation: string | undefined;
    const hasErrors = results.some((r) => !r.success);

    if (plan.explanation_needed || hasErrors) {
      explanation = await generateMultiStepExplanation(plan, results);
    }

    const totalExecutionTime = Date.now() - startTime;

    console.log("\n✅ Multi-step execution completed!");
    console.log("   Total steps:", results.length);
    console.log("   Successful:", results.filter((r) => r.success).length);
    console.log("   Failed:", results.filter((r) => !r.success).length);
    console.log("   Total time:", totalExecutionTime, "ms");
    console.log("========== OPTIMIZED MULTI-STEP EXECUTOR END ==========\n");

    logger.info("Multi-step plan executed", {
      stepCount: results.length,
      successCount: results.filter((r) => r.success).length,
      mergeStrategy: plan.merge_strategy,
      totalExecutionTime,
    });

    const success = isComparison
      ? results.some((r) => r.success)
      : results.every((r) => r.success);

    return {
      success,
      results,
      mergedData,
      finalComponent: plan.final_component,
      totalExecutionTime,
      explanation,
    };
  } catch (error) {
    const totalExecutionTime = Date.now() - startTime;
    console.error("\n❌ Multi-step execution failed!", error);
    logger.error("Multi-step execution failed", {
      error: error instanceof Error ? error.message : String(error),
      completedSteps: results.length,
      totalExecutionTime,
    });
    throw error;
  }
}

// ============================================
// PARALLEL EXECUTION
// ============================================

async function executeStepsInParallel(
  steps: PlanStep[],
): Promise<StepResult[]> {
  console.log(`\n⚡ Starting parallel execution of ${steps.length} steps...`);

  const stepPromises = steps.map(async (step) => {
    const stepStartTime = Date.now();

    try {
      console.log(`   🔄 [${step.step_number}] Starting: ${step.tool}`);

      const toolResult = await runTool({
        tool: step.tool,
        args: step.args,
      });

      const stepExecutionTime = Date.now() - stepStartTime;
      console.log(
        `   ✅ [${step.step_number}] Completed in ${stepExecutionTime}ms`,
      );

      return {
        step_number: step.step_number,
        success: toolResult.success,
        data: toolResult.data,
        error: toolResult.error,
        executionTime: stepExecutionTime,
      };
    } catch (error) {
      const stepExecutionTime = Date.now() - stepStartTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`   ❌ [${step.step_number}] Failed:`, errorMessage);

      return {
        step_number: step.step_number,
        success: false,
        data: null,
        error: errorMessage,
        executionTime: stepExecutionTime,
      };
    }
  });

  const results = await Promise.all(stepPromises);
  const successCount = results.filter((r) => r.success).length;
  console.log(
    `\n⚡ Parallel execution: ${successCount}/${results.length} successful`,
  );

  return results;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function hasStepDependencies(steps: PlanStep[]): boolean {
  return steps.some((step) => step.depends_on && step.depends_on.length > 0);
}

async function resolveDynamicArgs(
  step: PlanStep,
  previousResults: StepResult[],
): Promise<Record<string, any>> {
  const resolvedArgs: Record<string, any> = {};

  for (const [key, value] of Object.entries(step.args)) {
    if (typeof value === "string" && value.startsWith("$RESULT")) {
      const match = value.match(/\$RESULT\[(\d+)\](?:\.(.+))?/);

      if (match) {
        const dependsOn = parseInt(match[1]);
        const field = match[2];

        const prevResult = previousResults.find(
          (r) => r.step_number === dependsOn,
        );

        if (prevResult && prevResult.success) {
          resolvedArgs[key] = field
            ? extractField(prevResult.data, field)
            : prevResult.data;
        } else {
          throw new Error(
            `Cannot resolve $RESULT: dependent step ${dependsOn} not found or failed`,
          );
        }
      }
    } else {
      resolvedArgs[key] = value;
    }
  }

  return resolvedArgs;
}

function extractField(obj: any, path: string): any {
  const parts = path.split(".");
  let current = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[part];
  }

  return current;
}

/**
 * CRITICAL FIX: Proper comparison data merging
 * Problem: Was extracting r.data?.pod || r.data, but get_pod_metrics returns data directly
 * Solution: Use r.data directly, which already has all the metrics (podName, cpu, memory, etc.)
 */
async function mergeResults(
  results: StepResult[],
  strategy: string,
  steps: PlanStep[],
): Promise<any> {
  console.log("\n🔀 MERGE RESULTS CALLED");
  console.log("   Strategy:", strategy);
  console.log("   Result count:", results.length);

  switch (strategy) {
    case "sequential":
      console.log("   Using sequential merge");
      return results[results.length - 1]?.data || null;

    case "compare":
      console.log("   🔵 Using COMPARE merge (metrics comparison)");

      // CRITICAL FIX: Use r.data directly - it already has the full structure
      const comparisonItems = results.map((r, index) => {
        const step = steps[index];

        if (!r.success) {
          // Return error info for failed comparisons
          console.warn(`   ⚠️ Step ${index + 1} failed:`, r.error);
          return {
            _error: true,
            _errorMessage: r.error || "Unknown error",
            podName: step?.args?.name || "unknown",
            namespace: step?.args?.namespace || "default",
            status: "Error",
          };
        }

        // ✅ FIX: r.data already has the structure we need!
        // Structure from get_pod_metrics: { podName, namespace, cpu, memory, restartCount, status, containers, available }
        console.log(
          `   ✅ Step ${index + 1} data keys:`,
          Object.keys(r.data || {}),
        );

        return {
          ...r.data, // ✅ This already has podName, cpu, memory, restartCount, etc!
          _success: true,
          _stepNumber: r.step_number,
        };
      });

      const comparisonData = {
        comparison: results.map((r, index) => ({
          step: r.step_number,
          success: r.success,
          data: r.data, // ✅ Pass complete data structure
          error: r.error,
          podName: steps[index]?.args?.name,
        })),
        items: comparisonItems,
        comparisonType: "metrics",
        errors: results
          .filter((r) => !r.success)
          .map((r, index) => ({
            step: r.step_number,
            podName: steps[index]?.args?.name,
            error: r.error,
          })),
      };

      console.log("   📊 Comparison data created:", {
        comparisonCount: comparisonData.comparison.length,
        itemsCount: comparisonData.items.length,
        successfulItems: comparisonItems.filter((i) => i._success).length,
        errorItems: comparisonItems.filter((i) => i._error).length,
        sampleItemKeys: comparisonItems[0]
          ? Object.keys(comparisonItems[0])
          : [],
      });

      return comparisonData;

    case "side_by_side":
      console.log("   🔵 Using SIDE_BY_SIDE merge (log comparison)");

      const panels = results.map((r, index) => {
        const step = steps[index];
        const podName = step?.args?.name || `panel-${index}`;

        let panelData = r.data;

        if (step?.tool === "get_pod_logs") {
          const logs =
            typeof r.data === "string"
              ? r.data
              : r.data?.logs || r.data?.content || "";

          panelData = Array.isArray(logs) ? logs.join("\n") : logs;
        }

        return {
          title: podName,
          content: panelData,
          podName: podName,
          namespace: step?.args?.namespace || "default",
          _success: r.success,
          _error: r.error,
        };
      });

      return {
        panels,
        comparisonType: "side_by_side",
        totalPanels: panels.length,
      };

    case "aggregate":
      console.log("   Using aggregate merge");
      return {
        items: results.map((r) => r.data),
        totalItems: results.length,
        successfulItems: results.filter((r) => r.success).length,
      };

    case "single":
    default:
      console.log("   Using single merge");
      return results[0]?.data || null;
  }
}

function hasDynamicEach(args: Record<string, any>): boolean {
  return Object.values(args).some(
    (v) => typeof v === "string" && v.includes("$EACH"),
  );
}

async function executeDynamicLoop(
  step: PlanStep,
  resolvedArgs: Record<string, any>,
  previousResults: StepResult[],
): Promise<StepResult[]> {
  const results: StepResult[] = [];

  // Find which arg has $EACH
  const eachArg = Object.entries(resolvedArgs).find(
    ([_, v]) => typeof v === "string" && v.includes("$EACH"),
  );

  if (!eachArg) return results;

  const [eachKey, eachValue] = eachArg;
  const match = (eachValue as string).match(/\$EACH\[(\d+)\](?:\.(.+))?/);

  if (!match) return results;

  const dependsOn = parseInt(match[1]);
  const field = match[2];

  const prevResult = previousResults.find((r) => r.step_number === dependsOn);

  if (!prevResult || !prevResult.success) {
    throw new Error(`$EACH dependency step ${dependsOn} failed`);
  }

  const items = field ? extractField(prevResult.data, field) : prevResult.data;

  if (!Array.isArray(items)) {
    throw new Error("$EACH target must be an array");
  }

  console.log(`   🔁 Loop: Processing ${items.length} items`);

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const loopStartTime = Date.now();

    const loopArgs: Record<string, any> = {};
    for (const [key, value] of Object.entries(resolvedArgs)) {
      if (key === eachKey) {
        loopArgs[key] = item;
      } else {
        loopArgs[key] = value;
      }
    }

    try {
      const toolResult = await runTool({
        tool: step.tool,
        args: loopArgs,
      });

      const loopExecutionTime = Date.now() - loopStartTime;

      results.push({
        step_number: step.step_number + i / 1000,
        success: toolResult.success,
        data: {
          ...toolResult.data,
          _itemContext: item,
        },
        error: toolResult.error,
        executionTime: loopExecutionTime,
      });
    } catch (error) {
      console.error(`   ❌ Loop item ${i + 1} failed:`, error);
    }
  }

  return results;
}

async function generateMultiStepExplanation(
  plan: MultiStepPlan,
  results: StepResult[],
): Promise<string> {
  const successCount = results.filter((r) => r.success).length;
  const totalCount = results.length;

  let explanation = `Executed ${successCount}/${totalCount} step(s) successfully.\n\n`;

  results.forEach((r, index) => {
    const step = plan.steps[index];
    if (r.success) {
      explanation += `✓ Step ${r.step_number}: ${step?.description || step?.tool}\n`;
    } else {
      explanation += `✗ Step ${r.step_number}: ${step?.description || step?.tool} - ${r.error}\n`;
    }
  });

  return explanation;
}

export { hasStepDependencies, resolveDynamicArgs, executeStepsInParallel };
