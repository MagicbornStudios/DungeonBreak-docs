import fs from "node:fs";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

export async function renderMarkdownFile(filePath: string): Promise<string> {
  if (!fs.existsSync(filePath)) {
    return `<p class="text-muted-foreground">Missing file: <code>${filePath}</code></p>`;
  }
  const md = fs.readFileSync(filePath, "utf8");
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypePrettyCode, {
      theme: "github-dark",
    })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(md);
  return String(file);
}
