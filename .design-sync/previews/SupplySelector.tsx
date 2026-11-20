import { useState } from "react";
import { Mui, SupplySelector } from "conluz-web";

const supply = (id: string, code: string, name: string | null, extra: Record<string, unknown> = {}) =>
  ({ id, code, name, address: "", partitionCoefficient: 0, enabled: true, plant: null, ownerRecord: null, ...extra }) as any;

const HOME = supply("6f1c2a9e-0d4b-4a51-9f37-2be0c1d8a4f2", "ES0031406912345678JN0F", "Casa de Lucía");
const SHOP = supply("9a0e4c1b-7f25-4d63-8b19-c5e2f7a03d68", "ES0031406955512345AB3K", "Panadería del barrio");
const UNNAMED = supply("3c8b5d27-1e94-4f0a-a6d3-08f9e2b4c751", "ES0031406977700011ZZ9X", null);
const PLANT = supply("b2d7e3f0-5a61-4c8e-9e02-7d4f1a6c3b95", "ES0031406987654321QW1A", "Cubierta del polideportivo", {
  plant: { id: "e7c41f0a-2b58-4d96-8a3e-61f9d0c2b7a4", name: "Polideportivo Municipal" },
});
const VIEWED = supply("d41e8a63-9c07-4b2f-b5e8-2a7f3c9d0e16", "ES0031406933344455CD7P", "Casa de Andrés", {
  ownerRecord: { id: "1b5f9e2c-8d43-4a07-b6e1-c39a7d0f2e58", fullName: "Andrés Navarro Pons" },
});

const Frame = ({ children }: { children: React.ReactNode }) => <Mui.Box sx={{ width: "100%", maxWidth: 600 }}>{children}</Mui.Box>;

export const AllMySupplies = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const supplies = [HOME, SHOP, PLANT];
  return (
    <Frame>
      <SupplySelector supplies={supplies} selected={supplies.find((s) => s.id === selectedId) ?? null} onSelect={setSelectedId} />
    </Frame>
  );
};

export const OneSupplyChosen = () => {
  const [selectedId, setSelectedId] = useState<string | null>(HOME.id);
  const supplies = [HOME, SHOP, UNNAMED];
  return (
    <Frame>
      <SupplySelector supplies={supplies} selected={supplies.find((s) => s.id === selectedId) ?? null} onSelect={setSelectedId} />
    </Frame>
  );
};

export const PlantSupplyChosen = () => {
  const [selectedId, setSelectedId] = useState<string | null>(PLANT.id);
  const supplies = [HOME, PLANT];
  return (
    <Frame>
      <SupplySelector supplies={supplies} selected={supplies.find((s) => s.id === selectedId) ?? null} onSelect={setSelectedId} />
    </Frame>
  );
};

/** A community admin who opened another member's supply from its detail page (#252). */
export const ViewedByAnAdmin = () => {
  const [selectedId, setSelectedId] = useState<string | null>(VIEWED.id);
  const supplies = [HOME, SHOP];
  return (
    <Frame>
      <SupplySelector
        supplies={supplies}
        viewed={VIEWED}
        selected={[VIEWED, ...supplies].find((s) => s.id === selectedId) ?? null}
        onSelect={setSelectedId}
      />
    </Frame>
  );
};

/** "Datos de hoy" shows one supply at a time, so it leaves out "Todos mis puntos" (#432). */
export const WithoutAll = () => {
  const [selectedId, setSelectedId] = useState<string | null>(SHOP.id);
  const supplies = [HOME, SHOP];
  return (
    <Frame>
      <SupplySelector
        supplies={supplies}
        selected={supplies.find((s) => s.id === selectedId) ?? null}
        onSelect={setSelectedId}
        showAll={false}
      />
    </Frame>
  );
};
