import "./App.css";
import { Route, Routes } from "react-router";
import { AuthenticatedLayout } from "./layouts/authenticated.layout";
import { SupplyPointsPage } from "./pages/supply-points/SupplyPointsPage";
import { LoginLayout } from "./layouts/login.layout";
import { Login } from "./pages/auth/Login";
import { ForgotPassword } from "./pages/auth/ForgotPassword";
import { NewPassword } from "./pages/auth/NewPassword";
import { SupplyDetailPage } from "./pages/supply-points/SupplyDetailPage";
import { CreateSupplyPage } from "./pages/supply-points/CreateSupply";
import { EditSupplyPage } from "./pages/supply-points/EditSupply";
import { HomePage } from "./pages/Home";
import { ContactPage } from "./pages/Contact.page";
import { DynamicLayout } from "./layouts/dynamic.layout";
import { PartnersPage } from "./pages/partners/Partners.page";
import { ChangePasswordPage } from "./pages/ChangePassword";
import { ProfilePage } from "./pages/Profile";
import { EditPartnerPage } from "./pages/partners/EditPartner";
import { PartnerSupplyPointsPage } from "./pages/partners/PartnerSupplyPointsPage";
import { PlantsPage } from "./pages/production/PlantsPage";
import { CreatePlantPage } from "./pages/production/CreatePlantPage";
import { EditPlantPage } from "./pages/production/EditPlantPage";
import { PlantDetailPage } from "./pages/production/PlantDetailPage";

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
          <Route path="production">
            <Route index element={<PlantsPage />}></Route>
            <Route path="new" element={<CreatePlantPage />} />
            <Route path=":plantId">
              <Route index element={<PlantDetailPage />} />
              <Route path="edit" element={<EditPlantPage />} />
            </Route>
          </Route>
          <Route path="partners">
            <Route index element={<PartnersPage />} />
            <Route path=":partnerId/edit" element={<EditPartnerPage />} />
            <Route path=":partnerId/supply-points" element={<PartnerSupplyPointsPage />} />
          </Route>
          <Route path="profile" element={<ProfilePage />} />
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
