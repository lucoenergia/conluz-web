import { lazy, type ComponentType } from "react";
import { Outlet, Route, Routes } from "react-router";
import { AuthenticatedLayout } from "./layouts/authenticated.layout";
import { LoginLayout } from "./layouts/login.layout";
import { PublicLayout } from "./layouts/public.layout";
import { CapabilityRoute } from "./components/Auth/CapabilityRoute";
import { AnonRoute } from "./components/Auth/AnonRoute";
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
const ResetPassword = lazyPage(() => import("./pages/auth/ResetPassword"), "ResetPassword");
const AcceptInvitation = lazyPage(() => import("./pages/auth/AcceptInvitation"), "AcceptInvitation");
const ChangePasswordPage = lazyPage(() => import("./pages/auth/ChangePassword"), "ChangePasswordPage");
const NotFoundPage = lazyPage(() => import("./pages/not-found/NotFoundPage"), "NotFoundPage");

const LandingRoute = lazyPage(() => import("./pages/landing/LandingRoute"), "LandingRoute");
const ProfilePage = lazyPage(() => import("./pages/Profile"), "ProfilePage");
const SignInHelpPage = lazyPage(() => import("./pages/contact/SignInHelpPage"), "SignInHelpPage");
const CommunityContactPage = lazyPage(() => import("./pages/contact/CommunityContactPage"), "CommunityContactPage");
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
const CommunityAdminsPage = lazyPage(() => import("./pages/communities/CommunityAdminsPage"), "CommunityAdminsPage");

const PlatformPage = lazyPage(() => import("./pages/platform/PlatformPage"), "PlatformPage");
const PlatformAdminsPage = lazyPage(() => import("./pages/platform-admins/PlatformAdminsPage"), "PlatformAdminsPage");

function App() {
  return (
    <>
      <Routes>
        <Route element={<LoginLayout />}>
          <Route path="login" element={<Login />}></Route>
        </Route>
        {/*
          Recovering a password works with or without a session (#233): the
          reset link carries its token in the URL fragment, and the redirect a
          signed-in caller gets from the login page would lose it. Accepting an
          invitation (#274) is the same: its link carries the token the same
          way, and the screen serves both a new account and a signed-in one.

          A path that matches no route lands here too (#234): the not-found
          page is the same for every caller and reads nothing.
        */}
        <Route element={<LoginLayout allowSignedIn />}>
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="reset-password" element={<ResetPassword />} />
          <Route path="accept-invitation" element={<AcceptInvitation />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        <Route element={<AuthenticatedLayout />}>
          {/*
            "/" has no screen of its own (#221): it sends each caller where they
            belong, and it is where every denial redirects, so it is unguarded.
          */}
          <Route index element={<LandingRoute />} />
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
          {/*
            Supplies and plants are a community's operational data, so every
            page under them needs an active community the caller may read
            (#285). Without the guard the index and detail pages were open to
            any signed-in caller, and one with no membership -- a platform
            admin -- could still open a supply or plant by URL.
          */}
          <Route
            path="supply-points"
            element={<CapabilityRoute require={{ scope: "community", capability: "canRead" }}><Outlet /></CapabilityRoute>}
          >
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
          <Route
            path="production"
            element={<CapabilityRoute require={{ scope: "community", capability: "canRead" }}><Outlet /></CapabilityRoute>}
          >
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
            <Route
              path=":communityId/admins"
              element={<CapabilityRoute require={{ scope: "communityById", capability: "canManageAdmins" }}><CommunityAdminsPage /></CapabilityRoute>}
            />
          </Route>
          <Route
            path="platform"
            element={<CapabilityRoute require={{ scope: "platform", capability: "canAdministerPlatform" }}><PlatformPage /></CapabilityRoute>}
          />
          {/*
            The platform admins and revoking the role (#285). It replaces the
            users page, which read every user's personal data; this one reads
            only the platform admins' own accounts.
          */}
          <Route
            path="platform-admins"
            element={<CapabilityRoute require={{ scope: "platform", capability: "canListPlatformAdmins" }}><PlatformAdminsPage /></CapabilityRoute>}
          />
          <Route path="no-community" element={<NoCommunityPage />} />
          {/*
            Any signed-in caller (#295): the active community's channels, or,
            for one with no community, the instruction to contact whoever
            manages it. The channels endpoint refuses non-members itself.
          */}
          <Route path="community/contact" element={<CommunityContactPage />} />
        </Route>
        {/*
          Help for somebody who cannot sign in (#295). A signed-in caller is sent
          to the in-app contact page, which knows their community.
        */}
        <Route element={<PublicLayout />}>
          <Route
            path="contact"
            element={<AnonRoute redirectTo="/community/contact"><SignInHelpPage /></AnonRoute>}
          />
        </Route>
      </Routes>
    </>
  );
}

export default App;
