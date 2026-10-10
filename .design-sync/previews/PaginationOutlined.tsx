import { useState } from "react";
import { PaginationOutlined, Mui } from "conluz-web";

export const FirstPage = () => {
  const [page, setPage] = useState(1);
  return <PaginationOutlined count={12} page={page} handleChange={(_, p) => setPage(p)} />;
};

export const MiddlePage = () => {
  const [page, setPage] = useState(6);
  return <PaginationOutlined count={12} page={page} handleChange={(_, p) => setPage(p)} />;
};

export const LastPage = () => {
  const [page, setPage] = useState(12);
  return <PaginationOutlined count={12} page={page} handleChange={(_, p) => setPage(p)} />;
};

export const UnderAList = () => {
  const [page, setPage] = useState(2);
  return (
    <Mui.Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <Mui.Typography variant="body2" sx={{ color: "text.secondary" }}>
        Mostrando 11–20 de 47 puntos de suministro
      </Mui.Typography>
      <PaginationOutlined count={5} page={page} handleChange={(_, p) => setPage(p)} />
    </Mui.Box>
  );
};
