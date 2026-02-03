import { NextRequest, NextResponse } from "next/server";

/**
 * Phase 2: API Layer - Clean AI Endpoint
 *
 * POST /api/ai/command
 *
 * Flow:
 * 1. Receive user input
 * 2. Generate plan (intent → tool mapping)
 * 3. Execute MCP tool
 * 4. (Optional) Explain results with AI
 * 5. Return JSON
 *
 * This endpoint orchestrates AI + MCP, no direct kubectl access.
 */

// Types for the request/response
interface CommandRequest {
  input: string;
  namespace?: string;
}

interface CommandResponse {
  success: boolean;
  data?: any;
  explanation?: string;
  error?: string;
  tool?: string;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Parse request
    const body: CommandRequest = await request.json();
    const { input, namespace = "default" } = body;

    if (!input || input.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Input is required",
        } as CommandResponse,
        { status: 400 },
      );
    }

    console.log(`[AI Command] Received: "${input}" (namespace: ${namespace})`);

    // 2. Generate plan (convert intent → tool + args)
    const plan = await generatePlan(input, namespace);
    console.log(`[AI Command] Plan generated:`, plan);

    if (!plan.tool) {
      return NextResponse.json(
        {
          success: false,
          error: "Could not determine intent. Try being more specific.",
        } as CommandResponse,
        { status: 400 },
      );
    }

    // 3. Execute MCP tool
    const toolResult = await executeTool(plan.tool, plan.args);
    console.log(`[AI Command] Tool executed: ${plan.tool}`);

    // 4. (Optional) Generate explanation
    let explanation: string | undefined;
    if (plan.shouldExplain) {
      explanation = await generateExplanation(input, toolResult);
      console.log(`[AI Command] Explanation generated`);
    }

    // 5. Return response
    const duration = Date.now() - startTime;
    console.log(`[AI Command] Completed in ${duration}ms`);

    return NextResponse.json({
      success: true,
      data: toolResult,
      explanation,
      tool: plan.tool,
    } as CommandResponse);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[AI Command] Error after ${duration}ms:`, error);

    // Handle specific error types
    if (error.message?.includes("MCP")) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Kubernetes cluster connection failed. Please check your configuration.",
        } as CommandResponse,
        { status: 503 },
      );
    }

    if (error.message?.includes("tool")) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid tool or arguments. Please try a different command.",
        } as CommandResponse,
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || "An unexpected error occurred",
      } as CommandResponse,
      { status: 500 },
    );
  }
}

/**
 * Generate execution plan from user input
 * Maps natural language intent → MCP tool + arguments
 */
async function generatePlan(input: string, namespace: string) {
  // TODO: Integrate with your plan.service.ts
  // This is a placeholder that shows the expected flow

  const inputLower = input.toLowerCase();

  // Simple intent mapping (replace with proper AI planning)
  if (inputLower.includes("show") && inputLower.includes("pod")) {
    return {
      tool: "pods.list",
      args: { namespace },
      shouldExplain: false,
    };
  }

  if (inputLower.includes("log")) {
    // Extract pod name (simple regex, improve this)
    const podMatch = input.match(/for\s+(\S+)/);
    return {
      tool: "pods.logs",
      args: {
        namespace,
        podName: podMatch?.[1] || "",
      },
      shouldExplain: false,
    };
  }

  if (inputLower.includes("crash") || inputLower.includes("fail")) {
    return {
      tool: "pods.list",
      args: {
        namespace,
        fieldSelector: "status.phase!=Running",
      },
      shouldExplain: true, // Enable AI explanation for failures
    };
  }

  if (inputLower.includes("restart")) {
    const deploymentMatch = input.match(/restart\s+(?:deployment\s+)?(\S+)/);
    return {
      tool: "deployments.restart",
      args: {
        namespace,
        deploymentName: deploymentMatch?.[1] || "",
      },
      shouldExplain: false,
    };
  }

  // Default: try to list pods
  return {
    tool: "pods.list",
    args: { namespace },
    shouldExplain: false,
  };
}

/**
 * Execute MCP tool
 * Calls the Kubernetes MCP server with the specified tool and args
 */
async function executeTool(tool: string, args: any) {
  // TODO: Integrate with your toolRunner.service.ts
  // This should call the MCP client

  console.log(`[Tool Execution] ${tool} with args:`, args);

  // Placeholder response
  // Replace with actual MCP client call:
  // const result = await mcpClient.callTool(tool, args);
  // return result;

  throw new Error(
    "MCP client integration pending - connect to toolRunner.service.ts",
  );
}

/**
 * Generate AI explanation of results
 * Uses AI to summarize and explain Kubernetes data
 */
async function generateExplanation(input: string, toolResult: any) {
  // TODO: Integrate with your explain.service.ts
  // This should use Groq or another LLM

  console.log(`[Explanation] Generating for input: "${input}"`);

  // Placeholder
  return "AI explanation will be generated here using explain.service.ts";
}
