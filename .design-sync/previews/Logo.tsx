import { Logo, Mui } from "conluz-web";

export const Default = () => <Logo />;

export const InAppBar = () => (
  <Mui.Paper elevation={0} sx={{ display: "flex", alignItems: "center", gap: 2, px: 3, py: 1.5, borderBottom: 1, borderColor: "divider", maxWidth: 640 }}>
    <Logo responsive />
  </Mui.Paper>
);
