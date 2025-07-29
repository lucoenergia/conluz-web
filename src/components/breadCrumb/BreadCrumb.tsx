import * as React from 'react';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Link from '@mui/material/Link';
import Menu from '@mui/material/Menu';
import IconButton from '@mui/material/IconButton';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';

interface BreadCrumbsProps {
  className?: string,
  linkName: string,
  href: string
}

export const BreadCrumb: React.FC<BreadCrumbsProps> = ({linkName, href}) => {
  const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement> | null) => {
    if (event) {
      setAnchorEl(event.currentTarget);
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <React.Fragment>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        aria-labelledby="with-menu-demo-breadcrumbs"
      ></Menu>
      <Breadcrumbs aria-label="breadcrumbs">
        <Link color="primary" href={href}>
          {linkName} 
        </Link>
        <IconButton color="primary" size="small" onClick={handleClick}>
          <MoreHorizIcon />
        </IconButton>
      </Breadcrumbs>
    </React.Fragment>
  );
}
