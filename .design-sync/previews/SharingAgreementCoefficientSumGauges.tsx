import { SharingAgreementCoefficientSumGauges, Mui } from "conluz-web";

const wrap = (children: any) => <Mui.Box sx={{ maxWidth: 520 }}>{children}</Mui.Box>;

export const Complete = () =>
  wrap(
    <SharingAgreementCoefficientSumGauges
      coefficients={[
        { coefficient: 0.25 },
        { coefficient: 0.208333 },
        { coefficient: 0.208333 },
        { coefficient: 0.166667 },
        { coefficient: 0.166667 },
      ]}
    />,
  );

export const Short = () =>
  wrap(
    <SharingAgreementCoefficientSumGauges
      coefficients={[
        { coefficient: 0.25 },
        { coefficient: 0.208333 },
        { coefficient: 0.208333 },
        { coefficient: 0.166667 },
        { coefficient: 0.087541 },
      ]}
    />,
  );

export const Over = () =>
  wrap(
    <SharingAgreementCoefficientSumGauges
      coefficients={[
        { coefficient: 0.3 },
        { coefficient: 0.25 },
        { coefficient: 0.25 },
        { coefficient: 0.2125 },
      ]}
    />,
  );

export const Empty = () => wrap(<SharingAgreementCoefficientSumGauges coefficients={[]} />);
