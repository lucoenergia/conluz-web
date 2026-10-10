import { SupportCard, LabeledIcon, Mui, Icons } from "conluz-web";

export const Contact = () => (
  <Mui.Box sx={{ width: "100%" }}>
    <SupportCard label="Soporte" icon={Icons.SupportAgentRounded}>
      <LabeledIcon label="soporte@lucoenergia.es" icon={Icons.MailOutline} />
      <LabeledIcon label="961 23 45 67" icon={Icons.LocalPhone} />
      <LabeledIcon label="L–V, 9:00–14:00" icon={Icons.ScheduleRounded} />
    </SupportCard>
  </Mui.Box>
);

export const Narrow = () => (
  <Mui.Box sx={{ width: 420 }}>
    <SupportCard label="Ayuda" icon={Icons.HelpOutline}>
      <LabeledIcon label="Preguntas frecuentes" icon={Icons.OpenInNew} />
    </SupportCard>
  </Mui.Box>
);
