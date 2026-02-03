import { z } from "zod";
import logger from "../utils/logger";
import {
  TOOL_REGISTRY,
  isValidTool,
  getToolDefinition,
  type ToolName,
} from "./ToolsRegistry";
import type { PlannerOutput } from "./Structured.planner.service";

/**
 * Planner Output Validator
 *
 * Validates and auto-fixes planner output before execution.
 * Acts as a safety layer.
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  fixed?: PlannerOutput;
  original: PlannerOutput;
}

/**
 * Unsafe operations that require extra validation
 */
const UNSAFE_OPERATIONS = [
  "restart_deployment",
  "scale_deployment",
  "delete_pod",
  "delete_deployment",
];

/**
 * Validate planner output
 */
export function validatePlannerOutput(plan: PlannerOutput): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let fixed = { ...plan };

  logger.debug("Validating planner output", {
    tool: plan.tool,
    confidence: plan.confidence,
  });

  // ========================================
  // 1. VALIDATE TOOL EXISTS
  // ========================================
  if (!isValidTool(plan.tool)) {
    errors.push(
      `Unknown tool '${plan.tool}'. Valid tools: ${Object.keys(TOOL_REGISTRY).join(", ")}`,
    );
    return {
      valid: false,
      errors,
      warnings,
      original: plan,
    };
  }

  const toolDef = getToolDefinition(plan.tool)!;

  // ========================================
  // 2. VALIDATE ARGUMENTS SCHEMA
  // ========================================
  try {
    const validated = toolDef.args_schema.parse(plan.args);
    fixed.args = validated;

    logger.debug("Arguments validated successfully", {
      tool: plan.tool,
      args: validated,
    }); 
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const argErrors = error.issues.map(
        (e: any) => `${e.path.join(".")}: ${e.message}`,
      );
      errors.push(...argErrors);

      // Try auto-fix
      const autoFixed = tryAutoFixArgs(plan.args, toolDef);
      if (autoFixed.success) {
        fixed.args = autoFixed.fixed!;
        warnings.push("Auto-fixed argument issues");
      } else {
        return {
          valid: false,
          errors,
          warnings,
          original: plan,
        };
      }
    } else {
      errors.push("Invalid arguments format");
      return {
        valid: false,
        errors,
        warnings,
        original: plan,
      };
    }
  }

  // ========================================
  // 3. VALIDATE UI COMPONENT
  // ========================================
  if (plan.ui_component !== toolDef.ui_component_default) {
    warnings.push(
      `UI component '${plan.ui_component}' differs from default '${toolDef.ui_component_default}'`,
    );
    // Use default to be safe
    fixed.ui_component = toolDef.ui_component_default;
  }

  // ========================================
  // 4. SAFETY CHECKS FOR UNSAFE OPERATIONS
  // ========================================
  if (UNSAFE_OPERATIONS.includes(plan.tool)) {
    if (plan.confidence === "low") {
      errors.push(
        `Unsafe operation '${plan.tool}' requires high confidence, got '${plan.confidence}'`,
      );
      return {
        valid: false,
        errors,
        warnings,
        original: plan,
      };
    }

    warnings.push(`Executing unsafe operation: ${plan.tool}`);

    // Validate required args for unsafe ops
    const missingCriticalArgs = validateCriticalArgs(plan.tool, plan.args);
    if (missingCriticalArgs.length > 0) {
      errors.push(
        `Unsafe operation missing critical args: ${missingCriticalArgs.join(", ")}`,
      );
      return {
        valid: false,
        errors,
        warnings,
        original: plan,
      };
    }
  }

  // ========================================
  // 5. CONFIDENCE WARNINGS
  // ========================================
  if (plan.confidence === "low") {
    warnings.push("Low confidence plan - result may not match user intent");
  }

  // ========================================
  // 6. NAMESPACE VALIDATION
  // ========================================
  if ("namespace" in fixed.args && !fixed.args.namespace) {
    fixed.args.namespace = "default";
    warnings.push("Auto-set namespace to 'default'");
  }

  // ========================================
  // 7. RETURN VALIDATION RESULT
  // ========================================
  const isValid = errors.length === 0;

  logger.info("Planner output validation complete", {
    tool: plan.tool,
    valid: isValid,
    errorCount: errors.length,
    warningCount: warnings.length,
    fixed: warnings.length > 0,
  });

  return {
    valid: isValid,
    errors,
    warnings,
    fixed: isValid ? fixed : undefined,
    original: plan,
  };
}

/**
 * Auto-fix common argument issues
 */
function tryAutoFixArgs(
  args: Record<string, any>,
  toolDef: any,
): { success: boolean; fixed?: Record<string, any> } {
  try {
    const fixed = { ...args };

    // Fix 1: Convert string numbers to numbers
    Object.entries(fixed).forEach(([key, value]) => {
      if (typeof value === "string" && !isNaN(Number(value))) {
        // Check if schema expects a number
        const fieldSchema = toolDef.args_schema.shape[key];
        if (fieldSchema?._def?.typeName === "ZodNumber") {
          fixed[key] = Number(value);
        }
      }
    });

    // Fix 2: Convert "true"/"false" strings to booleans
    Object.entries(fixed).forEach(([key, value]) => {
      if (value === "true" || value === "false") {
        const fieldSchema = toolDef.args_schema.shape[key];
        if (fieldSchema?._def?.typeName === "ZodBoolean") {
          fixed[key] = value === "true";
        }
      }
    });

    // Fix 3: Remove null/undefined optional fields
    Object.keys(fixed).forEach((key) => {
      if (fixed[key] === null || fixed[key] === undefined) {
        const fieldSchema = toolDef.args_schema.shape[key];
        if (fieldSchema?.isOptional()) {
          delete fixed[key];
        }
      }
    });

    // Validate fixed version
    toolDef.args_schema.parse(fixed);

    return { success: true, fixed };
  } catch {
    return { success: false };
  }
}

/**
 * Validate critical args for unsafe operations
 */
function validateCriticalArgs(
  tool: string,
  args: Record<string, any>,
): string[] {
  const missing: string[] = [];

  switch (tool) {
    case "restart_deployment":
      if (!args.name) missing.push("name");
      break;
    case "scale_deployment":
      if (!args.name) missing.push("name");
      if (args.replicas === undefined) missing.push("replicas");
      break;
    case "delete_pod":
      if (!args.pod_name) missing.push("pod_name");
      break;
    case "delete_deployment":
      if (!args.name) missing.push("name");
      break;
  }

  return missing;
}

/**
 * Sanitize plan for logging (remove sensitive data)
 */
export function sanitizePlanForLogging(plan: PlannerOutput): any {
  return {
    tool: plan.tool,
    argsKeys: Object.keys(plan.args),
    ui_component: plan.ui_component,
    explain_needed: plan.explain_needed,
    confidence: plan.confidence,
  };
}

/**
 * Check if tool requires explicit user confirmation
 */
export function requiresConfirmation(tool: string): boolean {
  return UNSAFE_OPERATIONS.includes(tool);
}
