import { ResultStatus, Mui, Icons, colors, radii } from "conluz-web";

/**
 * ResultStatus is a visually hidden live region: it paints nothing. Each cell
 * mounts the real region and shows a visible transcript of what it announces.
 */
const noun = { one: "comunidad", other: "comunidades" };
const emptyMessage = "No se encontraron comunidades";

const Transcript = ({ text }: { text: string }) => (
  <Mui.Box
    sx={{
      display: "flex",
      alignItems: "center",
      gap: 1,
      px: 1.5,
      py: 1,
      borderRadius: radii.small,
      border: "1px dashed",
      borderColor: colors.border.light,
      color: colors.text.subtle,
      maxWidth: 420,
    }}
  >
    <Icons.InfoOutlined fontSize="small" />
    <Mui.Typography variant="body2">Lector de pantalla: «{text}»</Mui.Typography>
  </Mui.Box>
);

export const Loaded = () => (
  <>
    <Transcript text="12 comunidades" />
    <ResultStatus count={12} noun={noun} emptyMessage={emptyMessage} />
  </>
);

export const Singular = () => (
  <>
    <Transcript text="1 comunidad" />
    <ResultStatus count={1} noun={noun} emptyMessage={emptyMessage} />
  </>
);

export const Loading = () => (
  <>
    <Transcript text="Cargando…" />
    <ResultStatus isLoading count={0} noun={noun} emptyMessage={emptyMessage} />
  </>
);

export const Empty = () => (
  <>
    <Transcript text={emptyMessage} />
    <ResultStatus count={0} noun={noun} emptyMessage={emptyMessage} />
  </>
);
