import logger from "../utils/logger";
import { runTool } from "./tool-runner";
import type { MultiStepPlan, PlanStep } from "./multi_step_planner";

/**
 * Multi-Step Executor - PHASE F
 *
 * Executes complex multi-step plans with:
 * - Dependency resolution
 * - Dynamic argument population
 * - Result merging strategies
 * - Error recovery
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

/**
 * Execute multi-step plan
 */
export async function executeMultiStepPlan(
  plan: MultiStepPlan,
): Promise<ExecutionResult> {
  const startTime = Date.now();
  const results: StepResult[] = [];

  console.log("\n========== MULTI-STEP EXECUTOR START ==========");
  console.log("📊 Plan:", {
    stepCount: plan.steps.length,
    mergeStrategy: plan.merge_strategy,
    finalComponent: plan.final_component,
  });

  try {
    // Execute steps based on dependencies
    for (const step of plan.steps) {
      console.log(
        `\n🔹 Executing Step ${step.step_number}: ${step.description}`,
      );

      const stepStartTime = Date.now();
      const resolvedArgs = await resolveDynamicArgs(step, results);

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
        // Single execution
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
          console.error(`   ❌ Step ${step.step_number} failed:`, error);

          results.push({
            step_number: step.step_number,
            success: false,
            data: null,
            error: error instanceof Error ? error.message : String(error),
            executionTime: stepExecutionTime,
          });

          // Stop on critical errors (optional: could implement retry logic)
          throw error;
        }
      }
    }

    // Merge results based on strategy
    console.log("\n🔀 Merging results with strategy:", plan.merge_strategy);
    const mergedData = await mergeResults(results, plan.merge_strategy);

    // Generate explanation if needed
    let explanation: string | undefined;
    if (plan.explanation_needed) {
      explanation = await generateMultiStepExplanation(plan, results);
    }

    const totalExecutionTime = Date.now() - startTime;

    console.log("\n✅ Multi-step execution completed!");
    console.log("   Total steps:", results.length);
    console.log("   Successful:", results.filter((r) => r.success).length);
    console.log("   Total time:", totalExecutionTime, "ms");
    console.log("========== MULTI-STEP EXECUTOR END ==========\n");

    logger.info("Multi-step plan executed", {
      stepCount: results.length,
      successCount: results.filter((r) => r.success).length,
      mergeStrategy: plan.merge_strategy,
      totalExecutionTime,
    });

    return {
      success: results.every((r) => r.success),
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
    console.log("========== MULTI-STEP EXECUTOR END (ERROR) ==========\n");

    logger.error("Multi-step execution failed", {
      error: error instanceof Error ? error.message : String(error),
      completedSteps: results.length,
      totalExecutionTime,
    });

    throw error;
  }
}

/**
 * Resolve dynamic arguments from previous step results
 */
async function resolveDynamicArgs(
  step: PlanStep,
  previousResults: StepResult[],
): Promise<Record<string, any>> {
  const resolvedArgs: Record<string, any> = {};

  for (const [key, value] of Object.entries(step.args)) {
    if (typeof value === "string" && value.startsWith("$")) {
      // Handle dynamic values
      if (value === "$DYNAMIC" || value === "$DYNAMIC_EACH") {
        // Skip for now, will be handled in loop
        resolvedArgs[key] = value;
      } else if (value.startsWith("$RESULT_FIELD:")) {
        // Extract field from previous result
        const fieldPath = value.replace("$RESULT_FIELD:", "");
        const dependsOn = step.depends_on?.[0];

        if (dependsOn !== undefined) {
          const prevResult = previousResults.find(
            (r) => r.step_number === dependsOn,
          );

          if (prevResult && prevResult.success) {
            resolvedArgs[key] = extractField(prevResult.data, fieldPath);
          } else {
            throw new Error(
              `Cannot resolve $RESULT_FIELD: dependent step ${dependsOn} not found or failed`,
            );
          }
        }
      }
    } else {
      resolvedArgs[key] = value;
    }
  }

  return resolvedArgs;
}

/**
 * Check if step has dynamic loop args
 */
function hasDynamicEach(args: Record<string, any>): boolean {
  return Object.values(args).some(
    (v) => typeof v === "string" && v === "$DYNAMIC_EACH",
  );
}

/**
 * Execute step in a loop over previous results
 */
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

    console.log(`   ⚙️  Item ${i + 1}/${items.length}:`, loopArgs);

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

/**
 * Extract nested field from object
 */
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
 * Merge results based on strategy
 */
async function mergeResults(
  results: StepResult[],
  strategy: string,
): Promise<any> {
  switch (strategy) {
    case "sequential":
      // Return only the last result
      return results[results.length - 1]?.data || null;

    case "compare":
      // Return comparison structure
      return {
        comparison: results.map((r) => ({
          step: r.step_number,
          data: r.data,
        })),
        items: results.map((r) => r.data),
      };

    case "aggregate":
      // Combine all results into arrays
      return {
        aggregated: true,
        allData: results.map((r) => r.data),
        summary: {
          totalItems: results.length,
          successfulItems: results.filter((r) => r.success).length,
        },
      };

    case "side_by_side":
      // Return panels structure
      return {
        panels: results.map((r, index) => ({
          id: `panel-${index}`,
          step: r.step_number,
          data: r.data,
          success: r.success,
        })),
      };

    default:
      // Default: return all results
      return results.map((r) => r.data);
  }
}

/**
 * Generate explanation for multi-step execution
 */
async function generateMultiStepExplanation(
  plan: MultiStepPlan,
  results: StepResult[],
): Promise<string> {
  const successCount = results.filter((r) => r.success).length;
  const totalCount = results.length;

  let explanation = `Executed ${totalCount} step(s):\n\n`;

  results.forEach((result, index) => {
    const step = plan.steps.find(
      (s) => s.step_number === Math.floor(result.step_number),
    );
    if (step) {
      explanation += `${index + 1}. ${step.description} - ${result.success ? "✅ Success" : "❌ Failed"}\n`;
    }
  });

  if (successCount < totalCount) {
    explanation += `\n⚠️ ${totalCount - successCount} step(s) failed.`;
  }

  return explanation;
}
