import React, { useState } from "react";
import * as S from "./SearchBar.styles";
import CloseIcon from "@mui/icons-material/Close";
import InputAdornment from "@mui/material/InputAdornment";
import SearchIcon from "@mui/icons-material/Search";
import { IconButton } from "@mui/material";

interface SearchProps {
  onSearch: (searchText: string) => void;
  onClearInput: () => void;
}

const Search: React.FC<SearchProps> = ({ onSearch, onClearInput }) => {
  // Local variables
  const [searchText, setSearchText] = useState<string>("");

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const searchText = event.target.value.toLowerCase();
    setSearchText(searchText);
    onSearch(searchText);
  };

  const handleClear = () => {
    setSearchText("");
    onClearInput();
  };

  return (
    <S.StyledTextField
      value={searchText}
      onChange={handleSearch}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon />
          </InputAdornment>
        ),
        endAdornment: searchText ? (
          <InputAdornment position="end">
            <IconButton onClick={handleClear} edge="end">
              <CloseIcon />
            </IconButton>
          </InputAdornment>
        ) : null,
      }}
      variant="standard"
      fullWidth
    />
  );
};

export default Search;
