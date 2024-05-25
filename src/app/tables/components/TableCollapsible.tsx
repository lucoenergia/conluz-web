"use client";

// ** React Imports
import { useState, Fragment } from "react";

// ** MUI Imports
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import Collapse from "@mui/material/Collapse";
import TableRow from "@mui/material/TableRow";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import TableContainer from "@mui/material/TableContainer";
import MoreVertIcon from "@mui/icons-material/MoreVert";

// ** Icons Imports
import ChevronUp from "mdi-material-ui/ChevronUp";
import ChevronDown from "mdi-material-ui/ChevronDown";

const createData = (
  id: number,
  cups: string,
  address: string,
  distributionCoefficient: number,
  owner: string,
  status: string,
  actions: string
) => {
  return {
    id,
    cups,
    address,
    distributionCoefficient,
    owner,
    status,
    actions,
  };
};

const Row = (props: { row: ReturnType<typeof createData> }) => {
  // ** Props
  const { row } = props;

  // ** State
  const [open, setOpen] = useState<boolean>(false);

  return (
    <Fragment>
      <TableRow sx={{ "& > *": { borderBottom: "unset" } }}>
        <TableCell>
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={() => setOpen(!open)}
          >
            {open ? <ChevronUp /> : <ChevronDown />}
          </IconButton>
        </TableCell>
        <TableCell component="th" scope="row">
          {row.cups}
        </TableCell>
        <TableCell align="left">
          <IconButton aria-label="settings">
            <MoreVertIcon />
          </IconButton>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={6} sx={{ py: "0 !important" }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Typography variant="h6" gutterBottom component="div">
              Otros Datos
            </Typography>
            <Box sx={{ m: 2 }}>
              <Table size="small" aria-label="purchases">
                <TableBody>
                  <TableRow key={row.id}>
                    <TableCell align="left">Dirección: {row.address}</TableCell>
                  </TableRow>
                  <TableRow key={row.id}>
                    <TableCell align="left">
                      Coef.Reparto: {row.distributionCoefficient}
                    </TableCell>
                  </TableRow>
                  <TableRow key={row.id}>
                    <TableCell align="left">Titular:{row.owner}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </Fragment>
  );
};

const rows = [
  createData(
    1,
    "ES00333",
    "Calle Falsa 123",
    3.076,
    "Marco Botton",
    "activo",
    ""
  ),
  createData(
    2,
    "ES00333",
    "Calle Falsa 123",
    3.076,
    "Marco Botton",
    "inactivo",
    ""
  ),
  createData(
    3,
    "ES00333",
    "Calle Falsa 123",
    3.076,
    "Marco Botton",
    "inactivo",
    ""
  ),
];

const TableCollapsible = () => {
  return (
    <TableContainer component={Paper}>
      <Table aria-label="collapsible table">
        <TableHead>
          <TableRow>
            <TableCell />
            <TableCell>CUPS</TableCell>
            <TableCell align="left"></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <Row key={row.id} row={row} />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default TableCollapsible;
