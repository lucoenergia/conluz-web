import { SideMenu, CommunityScopeHeader, Mui, Icons } from "conluz-web";

const always = { scope: "always" } as any;

const sections = [
  {
    id: "community",
    title: "Comunidad",
    items: [
      { to: "/", id: "home", icon: Icons.HomeRounded, label: "Inicio", requires: always },
      { to: "/production", id: "production", icon: Icons.SolarPowerRounded, label: "Producción", requires: always },
      { to: "/supply-points", id: "supply-points", icon: Icons.ElectricBoltRounded, label: "Consumo", requires: always },
      { to: "/members", id: "members", icon: Icons.PeopleRounded, label: "Miembros", requires: always },
      { to: "/integrations", id: "integrations", icon: Icons.ExtensionRounded, label: "Integraciones", requires: always },
    ],
  },
  {
    id: "platform",
    title: "Plataforma",
    items: [
      { to: "/communities", id: "communities", icon: Icons.BusinessRounded, label: "Comunidades", requires: always },
      { to: "/users", id: "users", icon: Icons.ManageAccountsRounded, label: "Usuarios", requires: always },
    ],
  },
];

const contactItem = { to: "/contact", id: "contact", icon: Icons.SupportAgentRounded, label: "Contacto", requires: always };

// The drawer paper is position:fixed; a transformed frame becomes its containing block so it
// renders in-cell at a sidebar's real height.
const Frame = ({ children }: { children: any }) => (
  <Mui.Box sx={{ position: "relative", transform: "translateZ(0)", width: 260, height: 760, bgcolor: "background.default" }}>{children}</Mui.Box>
);

export const CommunityAdmin = () => (
  <Frame>
  <SideMenu
    isMenuOpened
    onMenuClose={() => {}}
    sections={sections as any}
    contactItem={contactItem as any}
    header={
      <Mui.Box sx={{ px: 3, pt: 2 }}>
        <CommunityScopeHeader name="Comunitat Energètica de Torrent" />
      </Mui.Box>
    }
  />
  </Frame>
);

export const CommunityMember = () => (
  <Frame>
  <SideMenu
    isMenuOpened
    onMenuClose={() => {}}
    sections={[{ ...sections[0], items: sections[0].items.slice(0, 3) }] as any}
    contactItem={contactItem as any}
    header={
      <Mui.Box sx={{ px: 3, pt: 2 }}>
        <CommunityScopeHeader name="Sol de l'Horta" />
      </Mui.Box>
    }
  />
  </Frame>
);
