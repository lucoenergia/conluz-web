import "./App.css";
import { Route, Routes } from "react-router";
import { AuthenticatedLayout } from "./layouts/authenticated.layout";
import { SupplyPointsPage } from "./pages/supplyPointsPage/SupplyPointsPage";
import { LoginLayout } from "./layouts/login.layout";
import { Login } from "./pages/login/login";
import { ForgotPassword } from "./pages/ForgotPassword/ForgotPassword";
import { NewPassword } from "./pages/NewPassword/NewPassword";
import { SupplyDetailPage } from "./pages/SupplyDetail/SupplyDetailPage";
import { CreateSupplyPage } from "./pages/CreateSupply";
import { EditSupplyPage } from "./pages/EditSupply/EditSupply";
import { HomePage } from "./pages/Home/Home";
import { ContactPage } from "./pages/contact/Contact.page";
import { DynamicLayout } from "./layouts/dynamic.layout";

function App() {
  return (
    <>
      <Routes>
        <Route element={<LoginLayout />}>
          <Route path="login" element={<Login />}></Route>
          <Route path="forgot-password">
            <Route index element={<ForgotPassword />}></Route>
            <Route path=":token" element={<NewPassword />}></Route>
          </Route>
        </Route>
        <Route element={<AuthenticatedLayout />}>
          <Route index element={<HomePage />} />
          <Route path="supply-points">
            <Route index element={<SupplyPointsPage />}></Route>
            <Route path="new" element={<CreateSupplyPage />} />
            <Route path=":supplyPointId">
              <Route index element={<SupplyDetailPage />} />
              <Route path="edit" element={<EditSupplyPage />} />
            </Route>
          </Route>
        </Route>
        <Route element={<DynamicLayout />}>
          <Route path="contact" element={<ContactPage />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
