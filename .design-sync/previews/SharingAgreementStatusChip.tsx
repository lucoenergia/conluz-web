import { SharingAgreementStatusChip, Mui, colors, radii } from "conluz-web";

export const Draft = () => <SharingAgreementStatusChip status={"DRAFT" as any} />;

export const Published = () => <SharingAgreementStatusChip status={"PUBLISHED" as any} />;

export const Superseded = () => <SharingAgreementStatusChip status={"SUPERSEDED" as any} />;

export const OnDark = () => (
  <Mui.Box
    sx={{
      bgcolor: colors.brand.main,
      borderRadius: radii.large,
      p: 2.5,
      display: "flex",
      gap: 1.5,
      flexWrap: "wrap",
      alignItems: "center",
    }}
  >
    <SharingAgreementStatusChip tone="onDark" status={"DRAFT" as any} />
    <SharingAgreementStatusChip tone="onDark" status={"PUBLISHED" as any} />
    <SharingAgreementStatusChip tone="onDark" status={"SUPERSEDED" as any} />
  </Mui.Box>
);
