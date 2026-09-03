// Orval input transformer: rewrites a nullable $ref schema, e.g.
//   { "$ref": "#/components/schemas/X", "type": ["object", "null"] }
// into the canonical OpenAPI 3.1 idiom
//   { "anyOf": [{ "$ref": "#/components/schemas/X" }, { "type": "null" }] }
//
// Backend response DTOs document a nullable nested object with
// @Schema(types = {"object", "null"}), which springdoc correctly renders as the
// {$ref, type:[...]} shape above -- valid per OpenAPI 3.1 (sibling keywords next to
// $ref are permitted). Orval, however, silently drops the `type` sibling whenever a
// $ref is present and types the field as the bare referenced type (no `| null`),
// which reintroduces the "required field that can be null" lie this pipeline exists
// to prevent. Orval *does* correctly turn anyOf/oneOf into TypeScript unions, so
// rewriting into that shape before generation fixes it with no backend change and no
// Orval upgrade.
//
// NOTE: a nullable *enum* (`{ "type": ["string", "null"], "enum": [...] }`, e.g.
// RestErrorDetail.code) has the SAME underlying problem -- Orval's enum-to-runtime-
// object generation only triggers when `type` is the bare string "string", not an
// array -- but wrapping the enum branch in anyOf the same way does NOT fix it: Orval
// does not hoist an inline enum inside an anyOf branch into a named runtime object,
// it just inlines the literal-string union. That case is not solved here; see
// AGENTS.md / the PR description for the tracked follow-up.
function rewriteNullableRefs(schema) {
  if (Array.isArray(schema)) {
    return schema.map(rewriteNullableRefs);
  }
  if (schema && typeof schema === "object") {
    if (
      schema.$ref &&
      Array.isArray(schema.type) &&
      schema.type.includes("null")
    ) {
      const { $ref, type, ...rest } = schema;
      return {
        ...rest,
        anyOf: [{ $ref }, { type: "null" }],
      };
    }
    const out = {};
    for (const key of Object.keys(schema)) {
      out[key] = rewriteNullableRefs(schema[key]);
    }
    return out;
  }
  return schema;
}

export default function transformer(spec) {
  return rewriteNullableRefs(spec);
}
