/**
 * Redact one-click install recipes from public description fields when a paid
 * tool's install_command is paywalled. Publishers often paste `Install: npx …`
 * into long_description; that leaked the product past the install lock.
 */

const NPX_OR_GITHUB_INSTALL =
  /(?:^|\b)(?:npx\s+-y\s+\S+|npm\s+exec\s+\S+|pnpm\s+dlx\s+\S+|yarn\s+dlx\s+\S+|bunx\s+\S+)/i;

const INSTALL_HEADING = /^\s{0,3}#{1,6}\s*Install(?:\s+command)?\s*$/i;
const INSTALL_LABEL_LINE = /^\s*Install(?:\s+command)?\s*:\s*.+$/i;

function isFenceStart(line) {
  return /^\s*```/.test(line);
}

function fenceLooksLikeInstall(body) {
  const trimmed = body.replace(/\r/g, "").trim();
  if (!trimmed) return false;
  // Whole fence is an install recipe (possibly multi-line launcher + args).
  const lines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0 || lines.length > 6) return false;
  return lines.every((l) => NPX_OR_GITHUB_INSTALL.test(l) || /^(npx|npm|pnpm|yarn|bunx)\b/i.test(l));
}

/**
 * @param {string|null|undefined} text
 * @returns {string}
 */
export function redactInstallRecipes(text) {
  if (text == null) return text;
  const src = String(text);
  if (!src.trim()) return src;

  const lines = src.split("\n");
  const out = [];
  let i = 0;
  let removedAny = false;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (isFenceStart(line)) {
      const open = line;
      const body = [];
      i += 1;
      while (i < lines.length && !isFenceStart(lines[i])) {
        body.push(lines[i]);
        i += 1;
      }
      const close = i < lines.length ? lines[i] : "";
      if (i < lines.length) i += 1;

      // Drop a preceding "## Install" heading if the fence is an install recipe.
      if (fenceLooksLikeInstall(body.join("\n"))) {
        removedAny = true;
        // Also drop an immediately preceding Install heading we already pushed.
        while (out.length && out[out.length - 1].trim() === "") out.pop();
        if (out.length && INSTALL_HEADING.test(out[out.length - 1])) {
          out.pop();
          while (out.length && out[out.length - 1].trim() === "") out.pop();
        }
        continue;
      }

      out.push(open, ...body);
      if (close) out.push(close);
      continue;
    }

    if (INSTALL_LABEL_LINE.test(line) && NPX_OR_GITHUB_INSTALL.test(line)) {
      removedAny = true;
      i += 1;
      continue;
    }

    if (INSTALL_HEADING.test(line)) {
      // Peek ahead: if next non-empty content is only an install fence or label, drop the section.
      let j = i + 1;
      while (j < lines.length && lines[j].trim() === "") j += 1;
      if (j < lines.length && (INSTALL_LABEL_LINE.test(lines[j]) || isFenceStart(lines[j]))) {
        // Let the next loop iteration handle the fence/label; drop heading now.
        removedAny = true;
        i += 1;
        continue;
      }
    }

    // Bare install recipe line (no "Install:" prefix)
    if (NPX_OR_GITHUB_INSTALL.test(line) && /^\s*(?:\$\s*)?(?:npx|npm|pnpm|yarn|bunx)\b/i.test(line)) {
      // Only redact if it looks like a standalone install recipe, not prose mentioning npx.
      if (line.trim().length < 200 && !/[.?!]\s+\S+/.test(line)) {
        removedAny = true;
        i += 1;
        continue;
      }
    }

    out.push(line);
    i += 1;
  }

  let result = out.join("\n");
  // Collapse excess blank lines left by removals
  result = result.replace(/\n{3,}/g, "\n\n").trim();
  if (removedAny && !result) {
    return "Install unlocks after purchase.";
  }
  if (removedAny && !/install unlocks after purchase/i.test(result)) {
    // Soft pointer when we stripped recipes — keep product copy, add one line.
    result = `${result}\n\nInstall unlocks after purchase.`.trim();
  }
  return result;
}

/**
 * Apply redaction to a formatted server object in place when install is locked.
 * @param {Record<string, any>} formatted
 */
export function redactLockedServerCopy(formatted) {
  if (!formatted || formatted.install_locked !== true) return formatted;
  if ("description" in formatted) {
    formatted.description = redactInstallRecipes(formatted.description);
  }
  if ("long_description" in formatted) {
    formatted.long_description = redactInstallRecipes(formatted.long_description);
  }
  return formatted;
}
