import { Mui, PeriodHeader } from "conluz-web";

const SEPTEMBER = { kind: "month", month: { year: 2026, month: 9 } } as const;

/** The member pages' publication sentence (src/pages/historical-analysis/memberPeriod.ts). */
const memberPublication = () =>
  "Los datos de cada mes se publican hacia el día 10 del mes siguiente, así que lo más reciente que puedes ver es septiembre de 2026.";

export const OneMonth = () => (
  <Mui.Box sx={{ maxWidth: 720 }}>
    <PeriodHeader
      anchor={SEPTEMBER}
      resolution={{
        status: "ok",
        period: {
          startDate: "2026-09-01T00:00:00+02:00",
          endDate: "2026-10-01T00:00:00+02:00",
          granularity: "daily",
          label: "Septiembre de 2026",
        },
        title: "Datos de septiembre de 2026",
        firstDay: { year: 2026, month: 9, day: 1 },
        lastDay: { year: 2026, month: 9, day: 30 },
        pickedDays: 30,
        snapped: null,
      }}
      publication={memberPublication}
    />
  </Mui.Box>
);

export const LastTwelveMonths = () => (
  <Mui.Box sx={{ maxWidth: 720 }}>
    <PeriodHeader
      anchor={SEPTEMBER}
      resolution={{
        status: "ok",
        period: {
          startDate: "2025-10-01T00:00:00+02:00",
          endDate: "2026-10-01T00:00:00+02:00",
          granularity: "monthly",
          label: "De octubre de 2025 a septiembre de 2026",
        },
        title: "Datos de octubre de 2025 a septiembre de 2026",
        firstDay: { year: 2025, month: 10, day: 1 },
        lastDay: { year: 2026, month: 9, day: 30 },
        pickedDays: 365,
        snapped: null,
      }}
      publication={memberPublication}
    />
  </Mui.Box>
);

export const WidenedToMonths = () => (
  <Mui.Box sx={{ maxWidth: 720 }}>
    <PeriodHeader
      anchor={SEPTEMBER}
      resolution={{
        status: "ok",
        period: {
          startDate: "2026-03-01T00:00:00+01:00",
          endDate: "2026-08-01T00:00:00+02:00",
          granularity: "monthly",
          label: "De marzo a julio de 2026",
        },
        title: "Datos de marzo a julio de 2026",
        firstDay: { year: 2026, month: 3, day: 1 },
        lastDay: { year: 2026, month: 7, day: 31 },
        pickedDays: 128,
        snapped: {
          from: { year: 2026, month: 3, day: 1 },
          to: { year: 2026, month: 7, day: 31 },
          months: 5,
          text: "Elegiste del 15 de marzo al 20 de julio de 2026. Como son más de 62 días, lo mostramos por meses completos: de marzo de 2026 a julio de 2026 (5 meses).",
        },
      }}
      publication={memberPublication}
    />
  </Mui.Box>
);

export const OneDay = () => (
  <Mui.Box sx={{ maxWidth: 720 }}>
    <PeriodHeader
      anchor={{ kind: "day", day: { year: 2026, month: 11, day: 16 } }}
      resolution={{
        status: "ok",
        period: {
          startDate: "2026-11-16T00:00:00+01:00",
          endDate: "2026-11-17T00:00:00+01:00",
          granularity: "hourly",
          label: "16 de noviembre de 2026",
        },
        title: "Datos del 16 de noviembre de 2026",
        firstDay: { year: 2026, month: 11, day: 16 },
        lastDay: { year: 2026, month: 11, day: 16 },
        pickedDays: 1,
        snapped: null,
      }}
      publication={() =>
        "La distribuidora publica la producción con unos días de retraso, así que lo más reciente que puedes ver es el 16 de noviembre de 2026."
      }
    />
  </Mui.Box>
);
