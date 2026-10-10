import { ListTableHeaderText, Mui } from "conluz-web";

export const Single = () => <ListTableHeaderText>Punto de suministro</ListTableHeaderText>;

export const InATableHead = () => (
  <Mui.TableContainer sx={{ minWidth: 560 }}>
    <Mui.Table>
      <Mui.TableHead>
        <Mui.TableRow>
          <Mui.TableCell><ListTableHeaderText>Nombre</ListTableHeaderText></Mui.TableCell>
          <Mui.TableCell><ListTableHeaderText>CUPS</ListTableHeaderText></Mui.TableCell>
          <Mui.TableCell><ListTableHeaderText>Estado</ListTableHeaderText></Mui.TableCell>
          <Mui.TableCell align="center"><ListTableHeaderText>Acciones</ListTableHeaderText></Mui.TableCell>
        </Mui.TableRow>
      </Mui.TableHead>
      <Mui.TableBody>
        <Mui.TableRow>
          <Mui.TableCell>Casa de Lucía</Mui.TableCell>
          <Mui.TableCell>ES0031406912345678JN0F</Mui.TableCell>
          <Mui.TableCell>Activo</Mui.TableCell>
          <Mui.TableCell align="center">—</Mui.TableCell>
        </Mui.TableRow>
      </Mui.TableBody>
    </Mui.Table>
  </Mui.TableContainer>
);
