// react-apexcharts ships CommonJS only (`exports.default = Chart`). The repo's
// package.json is "type": "module", so esbuild gives a default import the whole
// exports object and every chart throws "Element type is invalid ... got: object".
// Vite unwraps it; the sync bundle routes the import through here instead.
// @ts-expect-error -- the dist file has no type declarations of its own
import * as mod from "../../../node_modules/react-apexcharts/dist/react-apexcharts.min.js";

const m = mod as unknown as { default?: unknown };
const Chart = ((m.default as { default?: unknown } | undefined)?.default ?? m.default ?? m) as never;
export default Chart;
