import type { FC } from "react";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import { EmptyState } from "../../components/EmptyState";

/**
 * A community a read answered 404 for. The API answers the same for a
 * community that does not exist and for one the caller may not see, so the
 * text names both, as the supply and plant not-found states do.
 */
export const CommunityNotFound: FC = () => (
  <EmptyState
    icon={SearchOffIcon}
    title="Comunidad no encontrada"
    subtitle="Esta comunidad no existe o no tienes acceso a ella."
  />
);
