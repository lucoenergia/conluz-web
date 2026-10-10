// Prints the structural shape of named types (run from the repo root, after the .ds-sync deps install):
//   node .design-sync/scripts/data-shapes.mjs SharingAgreementResponse PlantResponse ...
// Used to (re)generate the type block in .design-sync/guidelines/data-shapes.md.
import { Project, TypeFormatFlags, Node } from '../../.ds-sync/node_modules/ts-morph/dist/ts-morph.js';
const p = new Project({ tsConfigFilePath: 'tsconfig.app.json' });
const want = process.argv.slice(2);
const F = TypeFormatFlags.NoTruncation | TypeFormatFlags.InTypeAlias | TypeFormatFlags.UseSingleQuotesForStringLiteralType;
for (const name of want) {
  let found = null;
  for (const sf of p.getSourceFiles()) {
    if (sf.getFilePath().includes('.spec.')) continue;
    const d = sf.getInterface(name) || sf.getTypeAlias(name);
    if (d) { found = d; break; }
  }
  if (!found) { console.log(`// ${name}: NOT FOUND`); continue; }
  const t = found.getType();
  const props = t.getProperties();
  if (Node.isInterfaceDeclaration(found) || (props.length && !t.isUnion())) {
    console.log(`interface ${name} {`);
    for (const pr of props) {
      const decl = pr.getValueDeclaration() ?? pr.getDeclarations()[0];
      const pt = pr.getTypeAtLocation(found);
      const doc = decl && Node.isJSDocable?.(decl) ? decl.getJsDocs().map(j => j.getDescription().trim()).join(' ').replace(/\s+/g,' ') : '';
      const opt = decl && Node.isPropertySignature(decl) && decl.hasQuestionToken() ? '?' : '';
      if (doc) console.log(`  /** ${doc.slice(0,200)} */`);
      console.log(`  ${pr.getName()}${opt}: ${pt.getText(found, F).replace(/import\([^)]*\)\./g,'')};`);
    }
    console.log('}');
  } else {
    console.log(`type ${name} = ${t.getText(found, F).replace(/import\([^)]*\)\./g,'')};`);
  }
  console.log();
}
