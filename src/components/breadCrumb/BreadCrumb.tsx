import * as React from 'react';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Link from '@mui/material/Link';
import { Link as RouterLink } from 'react-router'
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

interface BreadCrumbStep {
  label: string,
  href: string
}

interface BreadCrumbsProps {
  steps: BreadCrumbStep[]
}

export const BreadCrumb: React.FC<BreadCrumbsProps> = ({ steps }) => {

  return (
    <React.Fragment>
      <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="breadcrumbs">
        {
          steps.map(step => (
            <Link color="primary" component={RouterLink} to={step.href}>
              {step.label} 
            </Link>
          ))
        }
      </Breadcrumbs>
    </React.Fragment>
  );
}
