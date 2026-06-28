/**
 * @mcpx/railway — pure tool registry, capability gating, and redaction.
 *
 * Kept free of the MCP SDK and of I/O so the security-critical logic (which tools
 * mutate infrastructure, when writes are allowed, and that secret *values* are
 * never returned) is unit-testable. index.js wires this to the SDK + Railway API.
 */

// Read tools are safe by default. Write tools mutate infrastructure and are only
// exposed when the operator explicitly opts in (MCPX_RAILWAY_ALLOW_WRITE=1).
export const TOOL_DEFS = [
  {
    name: "list_projects", write: false,
    description: "List Railway projects the token can access.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "list_services", write: false,
    description: "List services in a project.",
    inputSchema: { type: "object", properties: { projectId: { type: "string" } }, required: ["projectId"], additionalProperties: false },
  },
  {
    name: "list_deployments", write: false,
    description: "List recent deployments for a service in an environment.",
    inputSchema: {
      type: "object",
      properties: { serviceId: { type: "string" }, environmentId: { type: "string" }, limit: { type: "number" } },
      required: ["serviceId", "environmentId"], additionalProperties: false,
    },
  },
  {
    name: "get_deployment_logs", write: false,
    description: "Fetch build/deploy logs for a deployment.",
    inputSchema: {
      type: "object",
      properties: { deploymentId: { type: "string" }, limit: { type: "number" } },
      required: ["deploymentId"], additionalProperties: false,
    },
  },
  {
    name: "get_variables", write: false,
    description: "List environment variable NAMES for a service. Values are redacted and never returned.",
    inputSchema: {
      type: "object",
      properties: { projectId: { type: "string" }, environmentId: { type: "string" }, serviceId: { type: "string" } },
      required: ["projectId", "environmentId"], additionalProperties: false,
    },
  },
  {
    name: "trigger_deploy", write: true,
    description: "Trigger a new deployment (redeploy) of a service in an environment.",
    inputSchema: {
      type: "object",
      properties: { serviceId: { type: "string" }, environmentId: { type: "string" } },
      required: ["serviceId", "environmentId"], additionalProperties: false,
    },
  },
  {
    name: "restart_service", write: true,
    description: "Restart the latest deployment of a service in an environment.",
    inputSchema: {
      type: "object",
      properties: { serviceId: { type: "string" }, environmentId: { type: "string" } },
      required: ["serviceId", "environmentId"], additionalProperties: false,
    },
  },
  {
    name: "set_variable", write: true,
    description: "Create or update an environment variable. Requires write mode.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string" }, environmentId: { type: "string" },
        serviceId: { type: "string" }, name: { type: "string" }, value: { type: "string" },
      },
      required: ["projectId", "environmentId", "name", "value"], additionalProperties: false,
    },
  },
  {
    name: "rollback_deployment", write: true,
    description: "Roll a service back to a previous deployment.",
    inputSchema: {
      type: "object",
      properties: { deploymentId: { type: "string" } },
      required: ["deploymentId"], additionalProperties: false,
    },
  },
];

export const WRITE_TOOLS = new Set(TOOL_DEFS.filter((t) => t.write).map((t) => t.name));

/** Write tools require an explicit operator opt-in. */
export function isWriteEnabled(env = process.env) {
  return env.MCPX_RAILWAY_ALLOW_WRITE === "1" || env.MCPX_RAILWAY_ALLOW_WRITE === "true";
}

/** The tools actually exposed given the current mode (read-only by default). */
export function enabledTools(env = process.env) {
  return isWriteEnabled(env) ? TOOL_DEFS : TOOL_DEFS.filter((t) => !t.write);
}

/** Throw if a tool isn't permitted in the current mode (defense in depth). */
export function assertToolAllowed(name, env = process.env) {
  const def = TOOL_DEFS.find((t) => t.name === name);
  if (!def) throw new Error(`Unknown tool: ${name}`);
  if (def.write && !isWriteEnabled(env)) {
    throw new Error(`Tool "${name}" mutates infrastructure and is disabled. Set MCPX_RAILWAY_ALLOW_WRITE=1 to enable write tools.`);
  }
  return def;
}

/**
 * Replace every variable value with a redacted marker. Secret VALUES must never
 * leave this process; only names are useful to an agent and safe to expose.
 */
export function redactVariables(vars = {}) {
  const out = {};
  for (const key of Object.keys(vars)) out[key] = "***redacted***";
  return out;
}
