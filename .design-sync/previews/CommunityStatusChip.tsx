import { createElement } from "react";
import * as S from "../../src/components/CommunityStatusChip/CommunityStatusChip.stories";

// The sync's bundler swaps every @storybook/* import for an inert stub, so
// composeStories cannot run here. This renders a story as Storybook does:
// meta args under story args, the story's render or the meta component,
// inside the meta decorators.
const story = (key: string, parameters: object = {}) => () => {
  const meta: any = S.default;
  const st: any = (S as any)[key];
  const args = { ...meta.args, ...st.args };
  const context = { args, parameters };
  const render = () => (st.render ? st.render(args, context) : createElement(meta.component, args));
  return (meta.decorators ?? []).reduce((inner: any, decorator: any) => () => decorator(inner, context), render)();
};

export const Activa = story("Activa");
export const SinAdmin = story("SinAdmin");
export const SinUsuarios = story("SinUsuarios");
export const Deshabilitada = story("Deshabilitada");
export const AllStatuses = story("AllStatuses");
