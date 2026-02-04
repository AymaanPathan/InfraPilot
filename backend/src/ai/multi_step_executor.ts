import logger from "../utils/logger";
import { runTool } from "./tool-runner";
import type { MultiStepPlan, PlanStep } from "./multi_step_planner";

/**
 * Multi-Step Executor - FIXED LOGS COMPARISON
 *
 * Key fixes:
 * 1. Properly extracts logs data for side-by-side comparison
 * 2. Converts log arrays to strings for MultiPanelView
 * 3. Better logging for debugging
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
    console.log("   This will be much faster than sequential");
  }

  const results: StepResult[] = [];

  try {
    // ========================================
    // OPTIMIZATION: Parallel execution for comparisons
    // ========================================
    if (
      isComparison &&
      plan.steps.length > 1 &&
      !hasStepDependencies(plan.steps)
    ) {
      console.log("\n⚡ EXECUTING STEPS IN PARALLEL...");

      const parallelResults = await executeStepsInParallel(plan.steps);
      results.push(...parallelResults);

      console.log(`\n✅ Parallel execution complete!`);
      console.log(`   Total time: ${Date.now() - startTime}ms`);
      console.log(
        `   Average per step: ${Math.round((Date.now() - startTime) / results.length)}ms`,
      );
    } else {
      // Sequential execution for dependent steps
      console.log("\n🔄 EXECUTING STEPS SEQUENTIALLY...");

      for (const step of plan.steps) {
        console.log(
          `\n📍 Executing Step ${step.step_number}: ${step.description}`,
        );

        const stepStartTime = Date.now();
        const resolvedArgs = await resolveDynamicArgs(step, results);

        console.log("   Tool:", step.tool);
        console.log("   Args:", resolvedArgs);

        // Handle dynamic loops (e.g., get logs for each pod)
        if (hasDynamicEach(step.args)) {
          const loopResults = await executeDynamicLoop(
            step,
            resolvedArgs,
            results,
          );
          results.push(...loopResults);
        } else {
          // Single execution - CONTINUE EVEN ON ERROR FOR COMPARISONS
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

            console.log(
              `   ✅ Step ${step.step_number} completed (${stepExecutionTime}ms)`,
            );
          } catch (error) {
            const stepExecutionTime = Date.now() - stepStartTime;
            const errorMessage =
              error instanceof Error ? error.message : String(error);

            console.error(
              `   ⚠️ Step ${step.step_number} failed:`,
              errorMessage,
            );

            results.push({
              step_number: step.step_number,
              success: false,
              data: null,
              error: errorMessage,
              executionTime: stepExecutionTime,
            });

            // For comparisons, continue to next step
            if (isComparison) {
              console.log("   ℹ️ Continuing to next comparison item...");
            } else {
              // For non-comparisons, stop on error
              throw error;
            }
          }
        }
      }
    }

    // Merge results based on strategy
    console.log("\n🔀 Merging results with strategy:", plan.merge_strategy);
    const mergedData = await mergeResults(
      results,
      plan.merge_strategy,
      plan.steps,
    );

    if (isComparison) {
      console.log("\n🔵 COMPARISON MERGE COMPLETE!");
      console.log("   Merged data structure:", {
        hasComparison: !!mergedData.comparison,
        hasItems: !!mergedData.items,
        hasPanels: !!mergedData.panels,
        itemCount: mergedData.items?.length || 0,
        panelCount: mergedData.panels?.length || 0,
        comparisonType: mergedData.comparisonType,
        successfulItems:
          mergedData.items?.filter((i: any) => i !== null).length || 0,
      });
    }

    // Generate explanation if needed or if there were errors
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
      failedCount: results.filter((r) => !r.success).length,
      mergeStrategy: plan.merge_strategy,
      totalExecutionTime,
      wasParallel: isComparison && !hasStepDependencies(plan.steps),
    });

    // For comparisons, consider it successful even if some items failed
    const success = isComparison
      ? results.some((r) => r.success) // At least one succeeded
      : results.every((r) => r.success); // All must succeed

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

    console.error("\n❌ Multi-step execution failed!");
    console.error("   Error:", error);
    console.log(
      "========== OPTIMIZED MULTI-STEP EXECUTOR END (ERROR) ==========\n",
    );

    logger.error("Multi-step execution failed", {
      error: error instanceof Error ? error.message : String(error),
      completedSteps: results.length,
      totalExecutionTime,
    });

    throw error;
  }
}

// ============================================
// PARALLEL EXECUTION OPTIMIZATION
// ============================================

/**
 * Execute multiple independent steps in parallel
 * This is much faster than sequential execution for comparisons
 */
async function executeStepsInParallel(
  steps: PlanStep[],
): Promise<StepResult[]> {
  const startTime = Date.now();

  console.log(`\n⚡ Starting parallel execution of ${steps.length} steps...`);

  // Create promises for all steps
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

      console.error(
        `   ❌ [${step.step_number}] Failed in ${stepExecutionTime}ms:`,
        errorMessage,
      );

      // Return error result instead of throwing
      return {
        step_number: step.step_number,
        success: false,
        data: null,
        error: errorMessage,
        executionTime: stepExecutionTime,
      };
    }
  });

  // Wait for all to complete
  const results = await Promise.all(stepPromises);

  const totalTime = Date.now() - startTime;
  const successCount = results.filter((r) => r.success).length;

  console.log(`\n⚡ Parallel execution summary:`);
  console.log(`   Total time: ${totalTime}ms`);
  console.log(`   Successful: ${successCount}/${results.length}`);
  console.log(
    `   Speedup: ~${Math.round((results.length * (totalTime / results.length)) / totalTime)}x faster than sequential`,
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
    // Handle $RESULT references
    if (typeof value === "string" && value.startsWith("$RESULT")) {
      const match = value.match(/\$RESULT\[(\d+)\](?:\.(.+))?/);

      if (match) {
        const dependsOn = parseInt(match[1]);
        const field = match[2];

        const prevResult = previousResults.find(
          (r) => r.step_number === dependsOn,
        );

        if (prevResult && prevResult.success) {
          if (field) {
            resolvedArgs[key] = extractField(prevResult.data, field);
          } else {
            resolvedArgs[key] = prevResult.data;
          }
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

function hasDynamicEach(args: Record<string, any>): boolean {
  return Object.values(args).some(
    (v) => typeof v === "string" && v === "$DYNAMIC_EACH",
  );
}

async function executeDynamicLoop(
  step: PlanStep,
  args: Record<string, any>,
  previousResults: StepResult[],
): Promise<StepResult[]> {
  const results: StepResult[] = [];

  // Get the data to loop over
  const dependsOn = step.depends_on?.[0];
  if (dependsOn === undefined) {
    throw new Error("Dynamic loop requires depends_on");
  }

  const prevResult = previousResults.find((r) => r.step_number === dependsOn);
  if (!prevResult || !prevResult.success) {
    throw new Error(`Dependent step ${dependsOn} not found or failed`);
  }

  // Extract items to loop over
  const items = Array.isArray(prevResult.data)
    ? prevResult.data
    : prevResult.data.pods || prevResult.data.items || [];

  console.log(`   🔁 Looping over ${items.length} items`);

  // Execute for each item
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const loopStartTime = Date.now();

    // Replace $DYNAMIC_EACH with actual values
    const loopArgs: Record<string, any> = {};
    for (const [key, value] of Object.entries(args)) {
      if (value === "$DYNAMIC_EACH") {
        // Infer the value from item
        if (key === "name") {
          loopArgs[key] = item.name || item.metadata?.name;
        } else if (key === "namespace") {
          loopArgs[key] =
            item.namespace || item.metadata?.namespace || "default";
        } else {
          loopArgs[key] = item[key];
        }
      } else {
        loopArgs[key] = value;
      }
    }

    console.log(`   ⚙️ Item ${i + 1}/${items.length}:`, loopArgs);

    try {
      const toolResult = await runTool({
        tool: step.tool,
        args: loopArgs,
      });

      const loopExecutionTime = Date.now() - loopStartTime;

      results.push({
        step_number: step.step_number + i / 1000, // Unique sub-step number
        success: toolResult.success,
        data: {
          ...toolResult.data,
          _itemContext: item, // Preserve context
        },
        error: toolResult.error,
        executionTime: loopExecutionTime,
      });
    } catch (error) {
      console.error(`   ❌ Loop item ${i + 1} failed:`, error);
      // Continue with other items (optional: could stop on first error)
    }
  }

  return results;
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
      // Return only the last result
      console.log("   Using sequential merge");
      return results[results.length - 1]?.data || null;

    case "compare":
      // Return comparison structure with proper error handling
      console.log("   🔵 Using COMPARISON merge");

      const comparisonItems = results.map((r, index) => {
        const step = steps[index];

        if (!r.success) {
          // Return error info for failed comparisons
          return {
            _error: true,
            _errorMessage: r.error || "Unknown error",
            _podName: step?.args?.name || "unknown",
            _namespace: step?.args?.namespace || "default",
            name: step?.args?.name || "unknown",
            namespace: step?.args?.namespace || "default",
            status: "Error",
          };
        }

        // Extract pod info for successful comparisons
        const podData = r.data?.pod || r.data;
        return {
          ...podData,
          _success: true,
          _stepNumber: r.step_number,
        };
      });

      const comparisonData = {
        comparison: results.map((r, index) => ({
          step: r.step_number,
          success: r.success,
          data: r.data,
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
      });

      return comparisonData;

    case "side_by_side":
      // Return panels structure for MultiPanelView
      console.log("   🔵 Using SIDE_BY_SIDE merge (FIXED for logs)");

      const panels = results.map((r, index) => {
        const step = steps[index];
        const podName = step?.args?.name || `panel-${index}`;

        // CRITICAL FIX: Extract logs data properly
        let panelData = r.data;

        // If this is logs data, format it correctly for MultiPanelView
        if (step?.tool === "get_pod_logs") {
          // The transformed data has this structure: { podName, namespace, logs, ... }
          // We need just the logs string/array
          const logs =
            typeof r.data === "string"
              ? r.data
              : r.data?.logs || r.data?.content || "";

          // Convert array of log lines to string
          panelData = Array.isArray(logs) ? logs.join("\n") : logs;

          const lineCount = panelData.split("\n").length;
          console.log(
            `   📋 Panel "${podName}": Extracted ${lineCount} log lines`,
          );
          console.log(
            `   📋 Sample (first 100 chars): ${panelData.substring(0, 100)}...`,
          );
        }

        return {
          id: podName,
          step: r.step_number,
          data: panelData,
          success: r.success,
          error: r.error,
        };
      });

      console.log(
        `   ✅ Created ${panels.length} panels for side-by-side view`,
      );
      panels.forEach((panel, i) => {
        const dataType = typeof panel.data;
        const dataLength =
          typeof panel.data === "string" ? panel.data.length : "N/A";
        console.log(
          `   Panel ${i + 1} (${panel.id}): success=${panel.success}, dataType=${dataType}, dataLength=${dataLength}`,
        );
      });

      return { panels };

    case "aggregate":
      // Combine all results into arrays
      console.log("   Using aggregate merge");
      return {
        aggregated: true,
        allData: results.map((r) => r.data),
        summary: {
          totalItems: results.length,
          successfulItems: results.filter((r) => r.success).length,
        },
      };

    default:
      // Default: return all results
      console.log("   Using default merge");
      return results.map((r) => r.data);
  }
}

async function generateMultiStepExplanation(
  plan: MultiStepPlan,
  results: StepResult[],
): Promise<string> {
  const successCount = results.filter((r) => r.success).length;
  const totalCount = results.length;
  const failedCount = totalCount - successCount;

  let explanation = `Executed ${totalCount} step(s):\n\n`;

  results.forEach((result, index) => {
    const step = plan.steps.find(
      (s) => s.step_number === Math.floor(result.step_number),
    );
    if (step) {
      const status = result.success ? "✅ Success" : "❌ Failed";
      explanation += `${index + 1}. ${step.description} - ${status}\n`;

      if (!result.success && result.error) {
        explanation += `   Error: ${result.error}\n`;
      }
    }
  });

  if (failedCount > 0) {
    explanation += `\n⚠️ ${failedCount} step(s) failed.\n`;

    // Add specific error details for comparisons
    if (
      plan.merge_strategy === "compare" ||
      plan.merge_strategy === "side_by_side"
    ) {
      explanation += `\nNote: Some pods in the comparison could not be found. This may be because:\n`;
      explanation += `- The pods don't exist in the cluster\n`;
      explanation += `- The pod names were misspelled\n`;
      explanation += `- The pods are in a different namespace\n\n`;
      explanation += `Suggestion: Run "show all pods" to see available pods first.`;
    }
  }

  return explanation;
}
