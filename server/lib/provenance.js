/**
 * Provenance verification — MCPX
 *
 * Proves a publisher actually controls the repository they linked, by checking
 * for a `.mcpx-verify` file at the repo root containing a per-server token (the
 * same model as Google/DNS site verification: only someone with write access can
 * place the file). Verified ownership unlocks the full provenance points in the
 * Trust Score (see server/lib/trustScore.js).
 *
 * Thin wrapper over repoScan.readRepoFile so route handlers depend on this stable
 * seam (and tests can mock it without spawning git).
 */
import { readRepoFile } from "./repoScan.js";

export const VERIFY_FILENAME = ".mcpx-verify";

/** Read and trim the proof token from a repo's .mcpx-verify, or null if absent. */
export async function readProofToken(repoUrl) {
  const content = await readRepoFile(repoUrl, VERIFY_FILENAME);
  return content == null ? null : content.trim();
}

export default readProofToken;
