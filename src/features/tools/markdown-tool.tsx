"use client";

import { useEffect, useMemo, useState } from "react";
import { Trash2, Eye, Code2, Columns2 } from "lucide-react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { AiCopyButton } from "@/components/ai-copy-button";
import { Segmented } from "@/components/ui/segmented";

type View = "split" | "preview" | "source";

marked.setOptions({ gfm: true, breaks: false });

const SAMPLE = `# Markdown, right here

Type on the left — **bold**, *italic*, \`code\` and [links](https://example.com).

## What works

- GFM tables, task lists and fences
- Sanitized output — no script injection, ever
- Copy the HTML or the source with one click

| Tool | Status |
| --- | --- |
| Markdown preview | ✅ live |
| Uploads required | ❌ never |

\`\`\`ts
const toolbox = ["preview", "copy", "ship"];
\`\`\`

> Everything renders locally. Nothing is sent anywhere.
`;

export function MarkdownTool() {
  const [input, setInput] = useState(SAMPLE);
  const [view, setView] = useState<View>("split");
  const rawHtml = useMemo(() => marked.parse(input, { async: false }) as string, [input]);
  /* DOMPurify has no window on the server — sanitize only after mount,
     and render nothing until then so SSR and first client render agree. */
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(t);
  }, []);
  const html = useMemo(() => {
    if (!mounted) return "";
    const purifier = DOMPurify as unknown as { sanitize?: (dirty: string, config: object) => string };
    if (typeof purifier.sanitize !== "function") return "";
    return purifier.sanitize(rawHtml, { USE_PROFILES: { html: true } });
  }, [mounted, rawHtml]);

  const showSource = view !== "preview";
  const showPreview = view !== "source";

  return (
    <div className="soft-shadow overflow-hidden rounded-[18px] border border-line bg-panel">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-sunken/40 px-4 py-2">
        <Segmented
          ariaLabel="View"
          size="sm"
          value={view}
          onChange={setView}
          options={[
            { value: "split", label: "Split", icon: <Columns2 className="size-3.5" /> },
            { value: "preview", label: "Preview", icon: <Eye className="size-3.5" /> },
            { value: "source", label: "Source", icon: <Code2 className="size-3.5" /> },
          ]}
        />
        <div className="flex items-center gap-1.5">
          <AiCopyButton variant="outline" size="sm" label="Copy Markdown" value={() => input} className="bg-panel" />
          <AiCopyButton variant="outline" size="sm" label="Copy HTML" value={() => html} className="bg-panel" />
          <button
            type="button"
            onClick={() => setInput("")}
            aria-label="Clear"
            className="grid size-8 place-items-center rounded-full text-ink3 transition-colors hover:bg-sunken hover:text-ink"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2">
        {showSource ? (
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="# Start typing markdown…"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            aria-label="Markdown source"
            className="block h-[32rem] w-full resize-y bg-panel p-4 font-mono text-[12.5px] leading-relaxed text-ink outline-none placeholder:text-ink3 lg:border-r lg:border-line"
          />
        ) : null}
        {showPreview ? (
          <div
            className="markdown-preview h-[32rem] overflow-y-auto border-t border-line bg-panel p-4 text-[14px] leading-relaxed text-ink lg:border-t-0"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : null}
      </div>

      <p className="border-t border-line bg-sunken/40 px-4 py-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-ink3">
        GFM · sanitized with DOMPurify · rendered locally
      </p>
    </div>
  );
}
