#!/usr/bin/env node
/**
 * @mcpx/railway — a Model Context Protocol server for Railway.
 *
 * Read-only by default; infrastructure-mutating tools are exposed only when
 * MCPX_RAILWAY_ALLOW_WRITE=1. Authenticates with a scoped RAILWAY_API_TOKEN and
 * never returns secret variable values.
 *
 * Transport: stdio (works with Claude Desktop, Cursor, VS Code, and the mcpx CLI).
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { enabledTools, assertToolAllowed, redactVariables } from "./lib.js";

const RAILWAY_API = process.env.RAILWAY_API_URL || "https://backboard.railway.app/graphql/v2";
const TOKEN = process.env.RAILWAY_API_TOKEN;

async function railwayGraphQL(query, variables = {}) {
  if (!TOKEN) throw new Error("RAILWAY_API_TOKEN is not set.");
  const res = await fetch(RAILWAY_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.errors) {
    const msg = body.errors?.map((e) => e.message).join("; ") || `HTTP ${res.status}`;
    throw new Error(`Railway API error: ${msg}`);
  }
  return body.data;
}

// NOTE: field names follow Railway's public GraphQL API; validate against the
// current schema (https://docs.railway.com/reference/public-api) before publishing.
const handlers = {
  async list_projects() {
    const data = await railwayGraphQL(`query { projects { edges { node { id name } } } }`);
    return data.projects.edges.map((e) => e.node);
  },
  async list_services({ projectId }) {
    const data = await railwayGraphQL(
      `query($id: String!) { project(id: $id) { services { edges { node { id name } } } } }`,
      { id: projectId },
    );
    return data.project.services.edges.map((e) => e.node);
  },
  async list_deployments({ serviceId, environmentId, limit = 10 }) {
    const data = await railwayGraphQL(
      `query($serviceId: String!, $environmentId: String!, $first: Int) {
        deployments(input: { serviceId: $serviceId, environmentId: $environmentId }, first: $first) {
          edges { node { id status createdAt } }
        }
      }`,
      { serviceId, environmentId, first: limit },
    );
    return data.deployments.edges.map((e) => e.node);
  },
  async get_deployment_logs({ deploymentId, limit = 100 }) {
    const data = await railwayGraphQL(
      `query($deploymentId: String!, $limit: Int) { deploymentLogs(deploymentId: $deploymentId, limit: $limit) { message timestamp } }`,
      { deploymentId, limit },
    );
    return data.deploymentLogs;
  },
  async get_variables({ projectId, environmentId, serviceId }) {
    const data = await railwayGraphQL(
      `query($projectId: String!, $environmentId: String!, $serviceId: String) {
        variables(projectId: $projectId, environmentId: $environmentId, serviceId: $serviceId)
      }`,
      { projectId, environmentId, serviceId },
    );
    return redactVariables(data.variables); // names only — values never returned
  },
  async trigger_deploy({ serviceId, environmentId }) {
    const data = await railwayGraphQL(
      `mutation($serviceId: String!, $environmentId: String!) {
        serviceInstanceRedeploy(serviceId: $serviceId, environmentId: $environmentId)
      }`,
      { serviceId, environmentId },
    );
    return { redeployed: !!data.serviceInstanceRedeploy };
  },
  async restart_service({ serviceId, environmentId }) {
    const data = await railwayGraphQL(
      `mutation($serviceId: String!, $environmentId: String!) {
        serviceInstanceRedeploy(serviceId: $serviceId, environmentId: $environmentId)
      }`,
      { serviceId, environmentId },
    );
    return { restarted: !!data.serviceInstanceRedeploy };
  },
  async set_variable({ projectId, environmentId, serviceId, name, value }) {
    await railwayGraphQL(
      `mutation($input: VariableUpsertInput!) { variableUpsert(input: $input) }`,
      { input: { projectId, environmentId, serviceId, name, value } },
    );
    return { ok: true, name }; // never echo the value back
  },
  async rollback_deployment({ deploymentId }) {
    const data = await railwayGraphQL(
      `mutation($id: String!) { deploymentRollback(id: $id) }`,
      { id: deploymentId },
    );
    return { rolledBack: !!data.deploymentRollback };
  },
};

const server = new Server(
  { name: "mcpx-railway", version: "0.1.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: enabledTools().map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args = {} } = req.params;
  try {
    assertToolAllowed(name);            // enforce the write gate server-side
    const result = await handlers[name](args);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (err) {
    return { isError: true, content: [{ type: "text", text: `Error: ${err.message}` }] };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("[mcpx-railway] ready (write mode: " + (process.env.MCPX_RAILWAY_ALLOW_WRITE ? "ON" : "off") + ")");
