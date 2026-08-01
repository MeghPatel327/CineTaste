const fs = require('fs');
const path = require('path');

const apiDir = path.join(__dirname, '../src/app/api');

function walk(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const stat = fs.statSync(path.join(dir, file));
    if (stat.isDirectory()) {
      walk(path.join(dir, file), fileList);
    } else if (file === 'route.ts') {
      fileList.push(path.join(dir, file));
    }
  }
  return fileList;
}

const routes = walk(apiDir);

routes.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf-8');

  // Skip already instrumented files
  if (content.includes('withLogger')) return;

  // Route name
  let relativePath = path.relative(apiDir, path.dirname(filePath)).replace(/\\/g, '/');
  if (relativePath === '') relativePath = 'root';
  const routeName = relativePath.replace(/\//g, '-').replace(/\[|\]/g, '');

  let newContent = 'import { withLogger } from "@/lib/apiWrapper";\n' + content;
  
  const regex = /export async function (GET|POST|PATCH|DELETE|PUT)\((.*?)\)\s*\{/g;
  let match;
  let modifiedContent = newContent;
  let offset = 0;

  // We have to iterate matches in original content to avoid infinite loop or wrong indices
  while ((match = regex.exec(newContent)) !== null) {
    const method = match[1];
    const args = match[2];
    const startIndex = match.index;
    
    // Find matching closing brace
    let openBraces = 1;
    let i = startIndex + match[0].length;
    let inString = false;
    let stringChar = null;
    let inComment = false;

    for (; i < newContent.length; i++) {
      const char = newContent[i];
      const nextChar = newContent[i+1];

      // Extremely basic comment/string skipping (assumes valid code)
      if (!inString && !inComment && char === '/' && nextChar === '/') {
        inComment = true;
      }
      if (inComment && char === '\n') {
        inComment = false;
      }
      if (!inComment && (char === '"' || char === "'" || char === '`')) {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (stringChar === char && newContent[i-1] !== '\\') {
          inString = false;
        }
      }

      if (!inString && !inComment) {
        if (char === '{') openBraces++;
        if (char === '}') openBraces--;

        if (openBraces === 0) {
          // Found the closing brace
          const beforeMatch = modifiedContent.slice(0, startIndex + offset);
          const replacementStart = `export const ${method} = withLogger(async (${args}) => {`;
          const between = modifiedContent.slice(startIndex + offset + match[0].length, i + offset);
          const replacementEnd = `}, "${routeName}");`;
          const afterMatch = modifiedContent.slice(i + offset + 1);

          modifiedContent = beforeMatch + replacementStart + between + replacementEnd + afterMatch;
          offset += replacementStart.length - match[0].length + replacementEnd.length - 1;
          break;
        }
      }
    }
  }

  fs.writeFileSync(filePath, modifiedContent);
  console.log(`Instrumented ${filePath}`);
});
