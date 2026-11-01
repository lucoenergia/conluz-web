import { useState } from "react";
import { ListPagination } from "conluz-web";

export const Members = () => {
  const [page, setPage] = useState(2);
  return (
    <ListPagination page={page} pageCount={6} total={128} noun={{ one: "miembro", other: "miembros" }} onChange={setPage} />
  );
};

export const Communities = () => {
  const [page, setPage] = useState(1);
  return (
    <ListPagination
      page={page}
      pageCount={2}
      total={26}
      noun={{ one: "comunidad", other: "comunidades" }}
      onChange={setPage}
    />
  );
};
