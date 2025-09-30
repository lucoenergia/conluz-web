import "./App.css";
import { Route, Routes } from "react-router";
import { AuthenticatedLayout } from "./layouts/authenticated.layout";
import { EnhancedSupplyPointsPage } from "./pages/EnhancedSupplyPointsPage";
import { LoginLayout } from "./layouts/login.layout";
import { Login } from "./pages/Login";
import { ForgotPassword } from "./pages/ForgotPassword";
import { NewPassword } from "./pages/NewPassword";
import { SupplyDetailPage } from "./pages/SupplyDetailPage";
import { CreateSupplyPage } from "./pages/CreateSupply";
import { EditSupplyPage } from "./pages/EditSupply";
import { HomePage } from "./pages/Home";
import { ContactPage } from "./pages/Contact.page";
import { DynamicLayout } from "./layouts/dynamic.layout";
import { PartnersPage } from "./pages/Partners.page";
import { ChangePasswordPage } from "./pages/ChangePassword";

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
            <Route index element={<EnhancedSupplyPointsPage />}></Route>
            <Route path="new" element={<CreateSupplyPage />} />
            <Route path=":supplyPointId">
              <Route index element={<SupplyDetailPage />} />
              <Route path="edit" element={<EditSupplyPage />} />
            </Route>
          </Route>
          <Route path="partners" element={<PartnersPage />} />
          <Route path="change-password" element={<ChangePasswordPage />} />
        </Route>
        <Route element={<DynamicLayout />}>
          <Route path="contact" element={<ContactPage />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
