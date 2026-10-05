import { lazy, type ComponentType } from "react";
import { Outlet, Route, Routes } from "react-router";
import { AuthenticatedLayout } from "./layouts/authenticated.layout";
import { LoginLayout } from "./layouts/login.layout";
import { PublicLayout } from "./layouts/public.layout";
import { CapabilityRoute } from "./components/Auth/CapabilityRoute";
import { HomeIndexRedirect, HomeViewRoute } from "./pages/home/HomeViewRoute";

/**
 * Route-level code splitting.
 *
 * Layouts and route guards stay eager — they are small, always needed, and
 * keeping them in the entry means the app shell paints without waiting on a
 * second request. Every page is loaded on demand instead, so reaching the login
 * form no longer downloads the charting library, the sharing-agreement editor
 * and every admin screen first. Each layout renders its own <Suspense> around
 * <Outlet>, so the chrome stays put while a page arrives.
 *
 * The pages use named exports, so each import is mapped onto `default`.
 */
function lazyPage<M, K extends keyof M>(loader: () => Promise<M>, name: K) {
  return lazy(() =>
    loader().then((module) => ({ default: module[name] as ComponentType })),
  );
}

const Login = lazyPage(() => import("./pages/auth/Login"), "Login");
const ForgotPassword = lazyPage(() => import("./pages/auth/ForgotPassword"), "ForgotPassword");
const NewPassword = lazyPage(() => import("./pages/auth/NewPassword"), "NewPassword");
const ChangePasswordPage = lazyPage(() => import("./pages/auth/ChangePassword"), "ChangePasswordPage");

const HomePage = lazyPage(() => import("./pages/Home"), "HomePage");
const ProfilePage = lazyPage(() => import("./pages/Profile"), "ProfilePage");
const ContactPage = lazyPage(() => import("./pages/Contact.page"), "ContactPage");
const NoCommunityPage = lazyPage(() => import("./pages/no-community/NoCommunityPage"), "NoCommunityPage");
const MemberHomePage = lazyPage(() => import("./pages/home/MemberHomePage"), "MemberHomePage");
const CommunityManagementPage = lazyPage(() => import("./pages/home/CommunityManagementPage"), "CommunityManagementPage");

const SupplyPointsPage = lazyPage(() => import("./pages/supply-points/SupplyPointsPage"), "SupplyPointsPage");
const SupplyDetailPage = lazyPage(() => import("./pages/supply-points/SupplyDetailPage"), "SupplyDetailPage");
const CreateSupplyPage = lazyPage(() => import("./pages/supply-points/CreateSupply"), "CreateSupplyPage");
const EditSupplyPage = lazyPage(() => import("./pages/supply-points/EditSupply"), "EditSupplyPage");

const PlantsPage = lazyPage(() => import("./pages/production/PlantsPage"), "PlantsPage");
const CreatePlantPage = lazyPage(() => import("./pages/production/CreatePlantPage"), "CreatePlantPage");
const EditPlantPage = lazyPage(() => import("./pages/production/EditPlantPage"), "EditPlantPage");
const PlantDetailPage = lazyPage(() => import("./pages/production/PlantDetailPage"), "PlantDetailPage");
const SharingAgreementsPage = lazyPage(() => import("./pages/production/SharingAgreementsPage"), "SharingAgreementsPage");
const SharingAgreementDetailPage = lazyPage(() => import("./pages/production/SharingAgreementDetailPage"), "SharingAgreementDetailPage");

const IntegrationsPage = lazyPage(() => import("./pages/integrations/IntegrationsPage"), "IntegrationsPage");
const MembersPage = lazyPage(() => import("./pages/members/MembersPage"), "MembersPage");

const CommunitiesPage = lazyPage(() => import("./pages/communities/CommunitiesPage"), "CommunitiesPage");
const CreateCommunityPage = lazyPage(() => import("./pages/communities/CreateCommunityPage"), "CreateCommunityPage");
const EditCommunityPage = lazyPage(() => import("./pages/communities/EditCommunityPage"), "EditCommunityPage");

const PlatformPage = lazyPage(() => import("./pages/platform/PlatformPage"), "PlatformPage");
const UsersPage = lazyPage(() => import("./pages/users/UsersPage"), "UsersPage");
const CreateUserPage = lazyPage(() => import("./pages/users/CreateUser"), "CreateUserPage");
const EditUserPage = lazyPage(() => import("./pages/users/EditUser"), "EditUserPage");

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
          {/*
            The two home views (#197). /home is the landing after login and
            the menu's Inicio (#199); HomeIndexRedirect picks the view.
          */}
          <Route
            path="home"
            element={<CapabilityRoute require={{ scope: "community", capability: "canRead" }}><Outlet /></CapabilityRoute>}
          >
            <Route index element={<HomeIndexRedirect />} />
            <Route path="member" element={<HomeViewRoute view="member"><MemberHomePage /></HomeViewRoute>} />
            <Route path="management" element={<HomeViewRoute view="management"><CommunityManagementPage /></HomeViewRoute>} />
          </Route>
          <Route path="supply-points">
            <Route index element={<SupplyPointsPage />}></Route>
            <Route
              path="new"
              element={<CapabilityRoute require={{ scope: "community", capability: "canManage" }}><CreateSupplyPage /></CapabilityRoute>}
            />
            <Route path=":supplyPointId">
              <Route index element={<SupplyDetailPage />} />
              <Route
                path="edit"
                element={<CapabilityRoute require={{ scope: "supply", capability: "canEdit" }}><EditSupplyPage /></CapabilityRoute>}
              />
            </Route>
          </Route>
          <Route path="production">
            <Route index element={<PlantsPage />}></Route>
            <Route
              path="new"
              element={<CapabilityRoute require={{ scope: "community", capability: "canCreatePlants" }}><CreatePlantPage /></CapabilityRoute>}
            />
            <Route path=":plantId">
              <Route index element={<PlantDetailPage />} />
              <Route
                path="edit"
                element={<CapabilityRoute require={{ scope: "plant", capability: "canManage" }}><EditPlantPage /></CapabilityRoute>}
              />
              <Route
                path="sharing-agreements"
                element={<CapabilityRoute require={{ scope: "plant", capability: "canListSharingAgreements" }}><SharingAgreementsPage /></CapabilityRoute>}
              />
              <Route
                path="sharing-agreements/:sharingAgreementId"
                element={<CapabilityRoute require={{ scope: "plant", capability: "canListSharingAgreements" }}><SharingAgreementDetailPage /></CapabilityRoute>}
              />
            </Route>
          </Route>
          <Route path="profile" element={<ProfilePage />} />
          <Route path="change-password" element={<ChangePasswordPage />} />
          <Route
            path="integrations"
            element={<CapabilityRoute require={{ scope: "community", capability: "canManage" }}><IntegrationsPage /></CapabilityRoute>}
          />
          <Route
            path="members"
            element={<CapabilityRoute require={{ scope: "community", capability: "canManageMemberships" }}><MembersPage /></CapabilityRoute>}
          />
          <Route path="communities">
            <Route
              index
              element={<CapabilityRoute require={{ scope: "platform", capability: "canAdministerPlatform" }}><CommunitiesPage /></CapabilityRoute>}
            />
            <Route
              path="new"
              element={<CapabilityRoute require={{ scope: "platform", capability: "canCreateCommunity" }}><CreateCommunityPage /></CapabilityRoute>}
            />
            <Route
              path=":communityId/edit"
              element={<CapabilityRoute require={{ scope: "communityById", capability: "canUpdate" }}><EditCommunityPage /></CapabilityRoute>}
            />
          </Route>
          <Route
            path="platform"
            element={<CapabilityRoute require={{ scope: "platform", capability: "canAdministerPlatform" }}><PlatformPage /></CapabilityRoute>}
          />
          <Route path="users">
            <Route index element={<CapabilityRoute require={{ scope: "platform", capability: "canListUsers" }}><UsersPage /></CapabilityRoute>} />
            <Route path="new" element={<CapabilityRoute require={{ scope: "platform", capability: "canCreateUsers" }}><CreateUserPage /></CapabilityRoute>} />
            <Route path=":userId/edit" element={<CapabilityRoute require={{ scope: "user", capability: "canEdit" }}><EditUserPage /></CapabilityRoute>} />
          </Route>
          <Route path="no-community" element={<NoCommunityPage />} />
        </Route>
        {/*
          Public for everybody, signed in or not -- not an oversight, and not a
          decision about chrome.

          /contact is to show information per energy community, which raises
          questions this route cannot answer on its own: what a caller with no
          session sees, when there is no community to show; and what a caller who
          belongs to several sees -- their active community, or all of them. Those
          belong to the contact-screen epic, together with whether the route needs
          a community in its URL so that it behaves the same signed in and signed
          out.

          Until then it serves one page to everyone, which is what it has always
          done in practice: the layout it used to sit under chose its chrome from
          the signed-in user, and nothing fetched that user outside
          AuthenticatedLayout, so it always rendered the public one.
        */}
        <Route element={<PublicLayout />}>
          <Route path="contact" element={<ContactPage />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
