import type { Preview } from "@storybook/react-vite";
import { ConluzProvider } from "../.design-sync/pkg/ConluzProvider";

const preview: Preview = {
  // The same provider the design-system sync renders every component in: the
  // theme, the Spanish date locale, an in-memory router and the inert
  // community context the confirmation dialogs read.
  decorators: [
    (Story) => (
      <ConluzProvider>
        <Story />
      </ConluzProvider>
    ),
  ],
};

export default preview;
