import { useState } from "react";
import { MemberPicker, Mui } from "conluz-web";

const member = (id: string, fullName: string, personalId: string) => ({ id, fullName, personalId }) as any;

const ROSTER = [
  member("1b5f9e2c-8d43-4a07-b6e1-c39a7d0f2e58", "Andrés Navarro Pons", "12345678Z"),
  member("4e2a7c91-0f36-4b58-9d1e-a83c5f6b2d07", "Lucía Ferrer Martí", "23456789D"),
  member("7c9d1e40-2b6a-4f83-8e5c-1d0a9b3f6e27", "Panadería Hermanos Soler, S.L.", "B98765432"),
  member("a0f3b5d8-6e12-4c97-b4a1-5e8d2c7f9031", "Ayuntamiento de Alcàsser", "P4601900B"),
];

const Frame = ({ children }: { children: React.ReactNode }) => <Mui.Box sx={{ width: "100%", maxWidth: 480 }}>{children}</Mui.Box>;

const TEXTS = {
  label: "Nuevo titular",
  emptyText: "No hay ningún otro miembro en esta comunidad al que cambiar el titular.",
  errorText: "No se pudieron cargar los miembros de esta comunidad. Inténtalo más tarde.",
};

export const Chosen = () => {
  const [value, setValue] = useState<string | null>(ROSTER[1].id);
  return (
    <Frame>
      <MemberPicker {...TEXTS} options={ROSTER} status="ready" value={value} onChange={(m) => setValue(m?.id ?? null)} required />
    </Frame>
  );
};

export const Empty = () => {
  const [value, setValue] = useState<string | null>(null);
  return (
    <Frame>
      <MemberPicker {...TEXTS} options={ROSTER} status="ready" value={value} onChange={(m) => setValue(m?.id ?? null)} required />
    </Frame>
  );
};

export const Loading = () => (
  <Frame>
    <MemberPicker {...TEXTS} options={[]} status="loading" value={null} onChange={() => {}} required />
  </Frame>
);

export const NobodyToOffer = () => (
  <Frame>
    <MemberPicker {...TEXTS} options={[]} status="ready" value={null} onChange={() => {}} required />
  </Frame>
);

export const RosterFailed = () => (
  <Frame>
    <MemberPicker {...TEXTS} options={[]} status="error" value={null} onChange={() => {}} required />
  </Frame>
);

export const Refused = () => (
  <Frame>
    <MemberPicker
      {...TEXTS}
      options={ROSTER}
      status="ready"
      value={ROSTER[0].id}
      onChange={() => {}}
      required
      error="Este miembro ya es el titular del punto."
    />
  </Frame>
);
