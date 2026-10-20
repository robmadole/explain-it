import ts from 'typescript';

export interface Beat {
  // null when the argument isn't a string literal.
  id: string | null;
  caption: string | null;
  line: number;
}

const CORE = '@explain-it/core';

// The local names `beat` is imported under from @explain-it/core.
function beatNames(source: ts.SourceFile) {
  const names = new Set<string>();
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    if (statement.moduleSpecifier.text !== CORE) continue;
    const bindings = statement.importClause?.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) continue;
    for (const element of bindings.elements) {
      if ((element.propertyName ?? element.name).text === 'beat') names.add(element.name.text);
    }
  }
  return names;
}

function literal(node: ts.Expression | undefined) {
  if (node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))) return node.text;
  return null;
}

// Every beat() call in a scene file, in source order, read without running it.
export function readBeats(fileName: string, text: string): Beat[] {
  const source = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const names = beatNames(source);
  const beats: Beat[] = [];
  if (names.size === 0) return beats;

  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && names.has(node.expression.text)) {
      const [id, caption] = node.arguments;
      beats.push({
        id: literal(id),
        caption: literal(caption),
        line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return beats;
}
