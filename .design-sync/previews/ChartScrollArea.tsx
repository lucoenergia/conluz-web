import { ChartScrollArea, Mui, colors } from "conluz-web";

/** A bar per day with its day number under it, as a chart's axis labels it. */
const Bars = ({ count }: { count: number }) => (
  <Mui.Box sx={{ display: "flex", alignItems: "flex-end", gap: "6px", px: 1 }}>
    {Array.from({ length: count }, (_, index) => (
      <Mui.Box key={index} sx={{ width: 14, display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5 }}>
        <Mui.Box sx={{ width: 14, height: 30 + ((index * 37) % 90), bgcolor: colors.success.vivid, borderRadius: "2px 2px 0 0" }} />
        <Mui.Typography variant="caption" sx={{ color: colors.text.secondary, fontSize: 10 }}>
          {index + 1}
        </Mui.Typography>
      </Mui.Box>
    ))}
  </Mui.Box>
);

/** Narrower than its content: the chart scrolls inside the area, never the page. */
export const Scrolls = () => (
  <Mui.Box sx={{ width: 320, border: `1px dashed ${colors.border.light}` }}>
    <ChartScrollArea minWidth={620}>
      <Bars count={31} />
    </ChartScrollArea>
  </Mui.Box>
);

/** Wide enough: nothing scrolls. */
export const Fits = () => (
  <Mui.Box sx={{ width: 420, border: `1px dashed ${colors.border.light}` }}>
    <ChartScrollArea minWidth={300}>
      <Bars count={12} />
    </ChartScrollArea>
  </Mui.Box>
);
