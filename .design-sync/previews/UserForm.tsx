import { UserForm, Mui } from "conluz-web";

const noop = () => {};

export const Create = () => (
  <Mui.Paper sx={{ p: 4, maxWidth: 560 }}>
    <UserForm mode="create" handleSubmit={noop} isPending={false} submitLabel="Crear usuario" />
  </Mui.Paper>
);

export const Edit = () => (
  <Mui.Paper sx={{ p: 4, maxWidth: 560 }}>
    <UserForm
      mode="edit"
      initialValues={{
        fullName: "Lucía Ferrer Martí",
        personalId: "12345678Z",
        email: "lucia.ferrer@example.org",
        address: "Calle del Sol 14, 46900 Torrent, Valencia",
        phoneNumber: "612 345 678",
      }}
      handleSubmit={noop}
      isPending={false}
      submitLabel="Guardar cambios"
    />
  </Mui.Paper>
);

export const Saving = () => (
  <Mui.Paper sx={{ p: 4, maxWidth: 560 }}>
    <UserForm
      mode="edit"
      initialValues={{
        fullName: "Andrés Molina Soler",
        personalId: "87654321X",
        email: "andres.molina@example.org",
        address: "Avenida del Mediterráneo 88, 46900 Torrent, Valencia",
        phoneNumber: "634 112 908",
      }}
      handleSubmit={noop}
      isPending
      submitLabel="Guardar cambios"
    />
  </Mui.Paper>
);

export const Disabled = () => (
  <Mui.Paper sx={{ p: 4, maxWidth: 560 }}>
    <UserForm
      mode="edit"
      initialValues={{ fullName: "Carmen Ruiz", personalId: "11223344B", email: "carmen.ruiz@example.org" }}
      handleSubmit={noop}
      isPending={false}
      submitLabel="Guardar cambios"
      disabled
    />
  </Mui.Paper>
);
