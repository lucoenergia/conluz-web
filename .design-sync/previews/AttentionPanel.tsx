import { AttentionPanel, Mui, Icons } from "conluz-web";

export const ThreeSignals = () => (
  <Mui.Box sx={{ maxWidth: 640 }}>
    <AttentionPanel
      items={[
        { key: "without-admin", icon: <Icons.PersonOffRounded fontSize="small" />, label: "2 comunidades sin administrador", to: "/communities" },
        { key: "without-users", icon: <Icons.GroupOffRounded fontSize="small" />, label: "1 comunidad sin usuarios", to: "/communities" },
        { key: "disabled", icon: <Icons.DomainDisabledRounded fontSize="small" />, label: "3 comunidades desactivadas", to: "/communities" },
      ]}
    />
  </Mui.Box>
);

export const OneSignal = () => (
  <Mui.Box sx={{ maxWidth: 640 }}>
    <AttentionPanel
      items={[
        { key: "without-admin", icon: <Icons.PersonOffRounded fontSize="small" />, label: "1 comunidad sin administrador", to: "/communities" },
      ]}
    />
  </Mui.Box>
);
