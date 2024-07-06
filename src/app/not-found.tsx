// ## Components Imports
import Error404 from "./error/components/404";

// ** Layout Imports
import BlankLayout from "./shared/layouts/main/main-content/blank-layout/BlankLayout";

export default function NotFound() {
  return (
    <BlankLayout>
      <Error404 />
    </BlankLayout>
  );
}
