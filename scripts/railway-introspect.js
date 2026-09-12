#!/usr/bin/env node
/**
 * Probe the live Railway GraphQL API with whatever token is in
 * RAILWAY_API_TOKEN, and report what that token can actually do.
 *
 * railway-mcp's queries were written from the docs and never run against a
 * real token (RELEASE.md says so). This is the validation step: it reports the
 * token's scope, the argument signatures we need, and which of our queries
 * succeed — without publishing anything or mutating any Railway state.
 *
 * Usage:
 *   $env:RAILWAY_API_TOKEN = "..."   # in your own shell
 *   node scripts/railway-introspect.js
 */
const API = "https://backboard.railway.com/graphql/v2";
const TOKEN = (process.env.RAILWAY_API_TOKEN || "").trim();

if (!TOKEN) {
  console.error("RAILWAY_API_TOKEN is not set in this shell.");
  process.exit(1);
}

/** Try one query under one header scheme. Never throws. */
async function gql(query, header = "bearer") {
  const headers = { "Content-Type": "application/json" };
  if (header === "bearer") headers.Authorization = `Bearer ${TOKEN}`;
  else headers["Project-Access-Token"] = TOKEN;

  try {
    const res = await fetch(API, {
      method: "POST",
      headers,
      body: JSON.stringify({ query }),
    });
    return await res.json();
  } catch (err) {
    return { errors: [{ message: `network: ${err.message}` }] };
  }
}

const errText = (r) => (r.errors || []).map((e) => e.message).join("; ");

async function main() {
  console.log(`token length: ${TOKEN.length}\n`);

  // 1. Which scope is this token? Each answer identifies a different type.
  const probes = [
    ["me { id email }", "account token (personal scope)"],
    ["projects { edges { node { id name } } }", "account token (project list)"],
    ["projectToken { projectId environmentId }", "project token"],
  ];
  console.log("— scope probes —");
  for (const [sel, label] of probes) {
    const r = await gql(`query { ${sel} }`);
    console.log(`  ${r.data ? "OK  " : "FAIL"} ${label}${r.data ? "" : `  (${errText(r)})`}`);
  }

  // 2. Argument signatures we need to write correct queries.
  console.log("\n— argument signatures —");
  const sig = await gql(
    `query { __type(name: "Query") { fields { name args { name type { name ofType { name } } } } } }`
  );
  const fields = sig.data?.__type?.fields || [];
  for (const want of ["workspace", "projects", "project", "environments", "deployments"]) {
    const f = fields.find((x) => x.name === want);
    if (!f) {
      console.log(`  ${want}: (not in schema)`);
      continue;
    }
    const args = f.args
      .map((a) => `${a.name}: ${a.type.name || a.type.ofType?.name || "?"}`)
      .join(", ");
    console.log(`  ${want}(${args})`);
  }

  // 3. Walk the real tool chain: projects -> services -> deployments -> logs.
  // These are the queries railway-mcp actually issues, in the order an agent
  // would hit them. Read-only; nothing is deployed or mutated.
  console.log("\n— tool chain (read-only) —");

  const pr = await gql(`query { projects { edges { node { id name } } } }`);
  if (!pr.data) {
    console.log(`  FAIL list_projects: ${errText(pr)}`);
    return;
  }
  const projects = pr.data.projects.edges.map((e) => e.node);
  console.log(`  OK   list_projects -> ${projects.length} project(s)`);
  if (projects.length === 0) return;

  const proj = projects[0];
  const sv = await gql(
    `query { project(id: "${proj.id}") { services { edges { node { id name } } } environments { edges { node { id name } } } } }`
  );
  if (!sv.data) {
    console.log(`  FAIL list_services: ${errText(sv)}`);
    return;
  }
  const services = sv.data.project.services.edges.map((e) => e.node);
  const envs = sv.data.project.environments.edges.map((e) => e.node);
  console.log(`  OK   list_services -> ${services.length} service(s), ${envs.length} env(s)`);
  if (!services.length || !envs.length) return;

  const dep = await gql(
    `query { deployments(input: { serviceId: "${services[0].id}", environmentId: "${envs[0].id}" }, first: 3) { edges { node { id status createdAt } } } }`
  );
  if (!dep.data) {
    console.log(`  FAIL list_deployments: ${errText(dep)}`);
    return;
  }
  const deps = dep.data.deployments.edges.map((e) => e.node);
  console.log(`  OK   list_deployments -> ${deps.length} deployment(s)`);
  if (!deps.length) return;

  const logs = await gql(
    `query { deploymentLogs(deploymentId: "${deps[0].id}", limit: 2) { message } }`
  );
  console.log(
    logs.data
      ? `  OK   get_deployment_logs -> ${logs.data.deploymentLogs.length} line(s)`
      : `  FAIL get_deployment_logs: ${errText(logs)}`
  );

  const vars = await gql(
    `query { variables(projectId: "${proj.id}", environmentId: "${envs[0].id}", serviceId: "${services[0].id}") }`
  );
  console.log(
    vars.data
      ? `  OK   get_variables -> ${Object.keys(vars.data.variables || {}).length} key(s) (values not printed)`
      : `  FAIL get_variables: ${errText(vars)}`
  );

  // 4. Confirm the WRITE mutations exist and take the arguments we send —
  // by introspecting the schema, never by executing them. Running these
  // would redeploy or restart a live service.
  console.log("\n— write mutations (schema only, not executed) —");
  const mut = await gql(
    `query { __type(name: "Mutation") { fields { name args { name type { name ofType { name } } } } } }`
  );
  const mfields = mut.data?.__type?.fields || [];
  for (const want of [
    "serviceInstanceRedeploy",
    "serviceInstanceDeploy",
    "variableUpsert",
    "deploymentRollback",
    "deploymentRedeploy",
  ]) {
    const f = mfields.find((x) => x.name === want);
    if (!f) {
      console.log(`  MISSING ${want}`);
      continue;
    }
    const args = f.args
      .map((a) => `${a.name}: ${a.type.name || a.type.ofType?.name || "?"}`)
      .join(", ");
    console.log(`  OK      ${want}(${args})`);
  }
}

main();
