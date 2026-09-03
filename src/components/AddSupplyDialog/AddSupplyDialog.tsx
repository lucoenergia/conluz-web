import { useMemo, useState, type FC } from "react";
import { alpha, useTheme } from "@mui/material/styles";
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
} from "@mui/material";
import GroupAddOutlinedIcon from "@mui/icons-material/GroupAddOutlined";
import { AppModal } from "../Modals/AppModal";
import { SearchBar } from "../SearchBar/SearchBar";
import { fontSizes, shadows } from "../../theme/tokens";
import { useDebounce } from "../../utils/useDebounce";
import { useCommunitySuppliesCatalogue } from "./useCommunitySuppliesCatalogue";
import type { SupplyResponse } from "../../api/models";

export interface AddSupplyDialogProps {
  isOpen: boolean;
  communityId: string | null;
  /** supplyIds already present in the agreement's coefficient set — shown disabled, cannot be re-added. */
  alreadyAddedSupplyIds: Set<string>;
  onCancel: () => void;
  onConfirm: (supplies: SupplyResponse[]) => void;
}

function matchesSearch(supply: SupplyResponse, search: string): boolean {
  const term = search.trim().toLowerCase();
  if (!term) return true;
  return (supply.name?.toLowerCase().includes(term) ?? false) || (supply.code?.toLowerCase().includes(term) ?? false);
}

export const AddSupplyDialog: FC<AddSupplyDialogProps> = ({
  isOpen,
  communityId,
  alreadyAddedSupplyIds,
  onCancel,
  onConfirm,
}) => {
  const theme = useTheme();
  const { supplies, isLoading } = useCommunitySuppliesCatalogue(communityId, isOpen);
  const [searchText, setSearchText] = useState("");
  const debouncedSearchText = useDebounce(searchText, 300);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredSupplies = useMemo(
    () => supplies.filter((supply) => matchesSearch(supply, debouncedSearchText)),
    [supplies, debouncedSearchText],
  );

  const toggleSelection = (supplyId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(supplyId)) next.delete(supplyId);
      else next.add(supplyId);
      return next;
    });
  };

  const handleClose = () => {
    setSearchText("");
    setSelectedIds(new Set());
    onCancel();
  };

  const handleConfirm = () => {
    const selected = supplies.filter((supply) => supply.id && selectedIds.has(supply.id));
    setSearchText("");
    setSelectedIds(new Set());
    onConfirm(selected);
  };

  return (
    <AppModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Añadir suministros"
      icon={<GroupAddOutlinedIcon sx={{ fontSize: 28, color: "primary.main" }} />}
      iconBg={alpha(theme.palette.primary.main, 0.12)}
      actions={
        <>
          <Button
            variant="outlined"
            onClick={handleClose}
            sx={{
              minWidth: "64px",
              padding: "5px 15px",
              fontSize: fontSizes.lg,
              borderColor: (t) => t.palette.primary.main,
              color: (t) => t.palette.primary.main,
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirm}
            disabled={selectedIds.size === 0}
            sx={{ minWidth: "64px", padding: "5px 15px", fontSize: fontSizes.lg, boxShadow: shadows.medium }}
          >
            Añadir {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
          </Button>
        </>
      }
    >
      <Box sx={{ mb: 2 }}>
        <SearchBar value={searchText} onChange={setSearchText} placeholder="Buscar por nombre o CUPS" />
      </Box>

      <Box sx={{ maxHeight: "50vh", overflowY: "auto" }}>
        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : filteredSupplies.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
            No se han encontrado suministros.
          </Typography>
        ) : (
          <List dense disablePadding>
            {filteredSupplies.map((supply) => {
              const alreadyAdded = !!supply.id && alreadyAddedSupplyIds.has(supply.id);
              const selected = !!supply.id && selectedIds.has(supply.id);
              return (
                <ListItem key={supply.id} disablePadding>
                  <ListItemButton
                    disabled={alreadyAdded || !supply.id}
                    onClick={() => supply.id && toggleSelection(supply.id)}
                    dense
                  >
                    <Checkbox edge="start" checked={selected} disabled={alreadyAdded} tabIndex={-1} disableRipple />
                    <ListItemText
                      primary={supply.name || "-"}
                      secondary={alreadyAdded ? `${supply.code || "-"} · Ya añadido` : supply.code || "-"}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        )}
      </Box>
    </AppModal>
  );
};
