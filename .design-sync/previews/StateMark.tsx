import { Mui, StateMark } from "conluz-web";

/** The key under the evolution charts: each mark beside the words that say the same. */
export const Key = () => (
  <Mui.Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexDirection: "column", gap: 1 }}>
    {(
      [
        ["ring", "Sin datos: no hay lecturas"],
        ["dot", "Cero medido"],
        ["asterisk", "Datos parciales"],
      ] as const
    ).map(([kind, text]) => (
      <Mui.Box component="li" key={kind} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <StateMark kind={kind} />
        <Mui.Typography variant="body2">{text}</Mui.Typography>
      </Mui.Box>
    ))}
  </Mui.Box>
);
