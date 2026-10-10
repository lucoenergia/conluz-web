import { CommunityScopeHeader, Mui, colors } from "conluz-web";

export const Default = () => <CommunityScopeHeader name="Comunitat Energètica de Torrent" />;

export const OnBrandBanner = () => (
  <Mui.Paper sx={{ p: 3, bgcolor: "primary.main", color: colors.brand.contrastText, maxWidth: 560 }}>
    <CommunityScopeHeader name="Comunitat Energètica de Torrent" tone="onBrand" />
    <Mui.Typography variant="h5" component="h1">Crear planta en Comunitat Energètica de Torrent</Mui.Typography>
    <Mui.Typography variant="body1" sx={{ opacity: 0.9 }}>
      Registra una nueva planta de producción en la comunidad energética
    </Mui.Typography>
  </Mui.Paper>
);

export const InADialogHeader = () => (
  <Mui.Paper sx={{ p: 3, maxWidth: 480 }}>
    <CommunityScopeHeader name="Sol de l'Horta" />
    <Mui.Typography variant="h6">Añadir miembro</Mui.Typography>
    <Mui.Typography variant="body2" sx={{ color: colors.text.subtle }}>
      El nuevo miembro tendrá acceso a los datos de esta comunidad.
    </Mui.Typography>
  </Mui.Paper>
);

export const Loading = () => <CommunityScopeHeader name={undefined} />;
