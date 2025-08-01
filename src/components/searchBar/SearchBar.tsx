import { alpha, InputBase, styled } from "@mui/material";
import { type FC } from "react"
import SearchIcon from '@mui/icons-material/Search';

interface SearchBarProps {
    className? : string;
    value?: string;
    onChange?: (value: string) => void;
}

const Search = styled('div')(({ theme }) => ({
    position: 'relative',
    borderRadius: '15px',
    border: `1px solid ${theme.palette.primary.light}`,
    backgroundColor: alpha(theme.palette.common.white, 0.15),
    '&:hover': {
        border: `1px solid ${theme.palette.primary.main}`,
        backgroundColor: alpha(theme.palette.primary.main, 0.0)
      },
    marginLeft: 0,
    width: '100%',
    // maxWidth:'175px',
    [theme.breakpoints.up('sm')]: {
    maxWidth: '270px',
    width: '100%'

    },
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: '100%',
  position: 'absolute',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: 'inherit',
  width: '100%',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1, 1, 1, 0),
    // vertical padding + font size from searchIcon
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create('width'),
    [theme.breakpoints.up('sm')]: {
      width: '12ch',
      '&:focus': {
        width: '20ch',
      },
    },
  },
}));

export const SearchBar: FC<SearchBarProps> = ({className, onChange, value}) => {

const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  onChange?.(event.target.value);
};

return <Search className={className}>
    <SearchIconWrapper>
    <SearchIcon />
    </SearchIconWrapper>
    <StyledInputBase
      placeholder="Buscar"
      value={value}
      // className="pt-3.5 md:pt-0"
      onChange={handleChange}
      inputProps={{ 'aria-label': 'search' }}
    />

</Search>    
}