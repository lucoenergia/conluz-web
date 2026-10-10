import { BreadCrumb, Icons } from "conluz-web";

export const SupplyDetail = () => (
  <BreadCrumb
    steps={[
      { label: "Inicio", href: "/" },
      { label: "Puntos de Suministro", href: "/supply-points" },
      { label: "Casa de Lucía", href: "#" },
    ]}
  />
);

export const TwoSteps = () => (
  <BreadCrumb
    steps={[
      { label: "Inicio", href: "/" },
      { label: "Miembros", href: "/members" },
    ]}
  />
);

export const DeepTrail = () => (
  <BreadCrumb
    steps={[
      { label: "Inicio", href: "/" },
      { label: "Producción", href: "/production" },
      { label: "Planta Polideportivo Torrent", href: "/production/plants/1" },
      { label: "Reparto 2026", href: "#" },
    ]}
  />
);

export const CustomIcon = () => (
  <BreadCrumb
    steps={[
      { label: "Inicio", href: "/" },
      { label: "Contacto", href: "/contact", icon: <Icons.SupportAgentRounded sx={{ fontSize: 20, mr: 0.5 }} /> },
    ]}
  />
);
