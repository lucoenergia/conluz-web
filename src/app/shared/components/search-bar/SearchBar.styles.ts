import { styled } from "@mui/material/styles";
import SearchBar, { SearchBarProps } from "@mkyy/mui-search-bar";

export const Search = styled(SearchBar)<SearchBarProps>(({ theme }) => ({
  position: "relative",
  borderRadius: theme.shape.borderRadius,
  marginLeft: 0,
  width: "100%",
  height: "100%",
  display: "flex",
  justifyContent: "right",
  [theme.breakpoints.up("sm")]: {
    border: `1px solid ${theme.palette.primary.main}`,
    display: "flex",
    justifyContent: "left",
    marginLeft: theme.spacing(1),
    width: "auto",
  },
}));
