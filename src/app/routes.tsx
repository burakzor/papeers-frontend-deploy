import { Suspense, lazy, type ComponentType, type ReactElement } from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router';
import { NotificationProvider } from './context/NotificationContext';
import { useAuth } from './context/AuthContext';
import FeatherLoader from './components/shared/FeatherLoader';

const Login = lazy(() => import('./components/auth/Login'));
const ForgotPassword = lazy(() => import('./components/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./components/auth/ResetPassword'));
const LabSelection = lazy(() => import('./components/auth/LabSelection'));
const AcceptInvitation = lazy(() => import('./components/auth/AcceptInvitation'));

const CoordinatorLayout = lazy(() => import('./components/layouts/CoordinatorLayout'));
const LabMemberLayout = lazy(() => import('./components/layouts/LabMemberLayout'));
const AdminLayout = lazy(() => import('./components/layouts/AdminLayout'));

const CoordinatorDashboard = lazy(() => import('./components/coordinator/CoordinatorDashboard'));
const ReviewerAnalytics = lazy(() => import('./components/coordinator/ReviewerAnalytics'));
const DeadlineManagement = lazy(() => import('./components/coordinator/DeadlineManagement'));
const WorkloadBalance = lazy(() => import('./components/coordinator/WorkloadBalance'));
const ManageUsers = lazy(() => import('./components/coordinator/ManageUsers'));
const ManagePapers = lazy(() => import('./components/coordinator/ManagePapers'));
const ManageVenues = lazy(() => import('./components/coordinator/ManageVenues'));
const CommentDetail = lazy(() => import('./components/coordinator/CommentDetail'));

const NotificationsCenter = lazy(() => import('./components/shared/NotificationsCenter'));
const EditProfile = lazy(() => import('./components/shared/EditProfile'));

const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard'));
const ManageLabs = lazy(() => import('./components/admin/ManageLabs'));
const ManageAllUsers = lazy(() => import('./components/admin/ManageAllUsers'));

const LabMemberDashboard = lazy(() => import('./components/member/LabMemberDashboard'));
const LabMemberProfile = lazy(() => import('./components/member/LabMemberProfile'));
const MyProfile = lazy(() => import('./components/member/MyProfile'));
const MySubmissions = lazy(() => import('./components/member/MySubmissions'));
const MyComments = lazy(() => import('./components/member/MyComments'));

const NewSubmission = lazy(() => import('./components/author/NewSubmission'));
const AIAssistedReview = lazy(() => import('./components/author/AIAssistedReview'));
const VenueRecommendations = lazy(() => import('./components/author/VenueRecommendations'));
const EmpiricalChecklist = lazy(() => import('./components/author/EmpiricalChecklist'));

const Assignments = lazy(() => import('./components/reviewer/Assignments'));

const NotFound = lazy(() => import('./components/shared/NotFound'));
const ErrorPage = lazy(() => import('./components/shared/ErrorPage'));

function withSuspense(Component: ComponentType): ReactElement {
  return (
    <Suspense
      fallback={(
        // DÜZELTME: Sıkıcı "Loading..." yazısı yerine ortalanmış, hareketli logomuz
        <div className="flex min-h-[60vh] w-full flex-col items-center justify-center">
        </div>
      )}
    >
      <Component />
    </Suspense>
  );
}

const ProtectedWrapper = () => (
  <NotificationProvider>
    <Outlet />
  </NotificationProvider>
);

function GuestGuard() {
  const { selectedLab } = useAuth();
  if (selectedLab?.role === 'GUEST_MEMBER') {
    return <Navigate to="/member/submissions" replace />;
  }
  return <Outlet />;
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/login',
    element: withSuspense(Login),
  },
  {
    path: '/lab-selection',
    element: withSuspense(LabSelection),
  },
  {
    path: '/forgot-password',
    element: withSuspense(ForgotPassword),
  },
  {
    path: '/reset-password',
    element: withSuspense(ResetPassword),
  },
  {
    path: '/accept-invitation',
    element: withSuspense(AcceptInvitation),
  },
  {
    path: '/lab-member-registration',
    element: withSuspense(AcceptInvitation),
  },
  {
    element: <ProtectedWrapper />,
    errorElement: withSuspense(ErrorPage),
    children: [
      {
        path: '/admin',
        element: withSuspense(AdminLayout),
        children: [
          { index: true, element: withSuspense(AdminDashboard) },
          { path: 'labs', element: withSuspense(ManageLabs) },
          { path: 'users', element: withSuspense(ManageAllUsers) },
          { path: 'members/:memberId', element: withSuspense(LabMemberProfile) },
          { path: 'profile', element: withSuspense(EditProfile) },
        ],
      },
      {
        path: '/coordinator',
        element: withSuspense(CoordinatorLayout),
        children: [
          { index: true, element: withSuspense(CoordinatorDashboard) },
          { path: 'analytics', element: withSuspense(ReviewerAnalytics) },
          { path: 'deadlines', element: withSuspense(DeadlineManagement) },
          { path: 'workload', element: withSuspense(WorkloadBalance) },
          { path: 'papers', element: withSuspense(ManagePapers) },
          { path: 'manage-users', element: withSuspense(ManageUsers) },
          { path: 'venues', element: withSuspense(ManageVenues) },
          { path: 'members/:memberId', element: withSuspense(LabMemberProfile) },
          { path: 'notifications', element: withSuspense(NotificationsCenter) },
          { path: 'profile', element: withSuspense(MyProfile) },
          { path: 'comments/:commentId', element: withSuspense(CommentDetail) },
        ],
      },
      {
        path: '/member',
        element: withSuspense(LabMemberLayout),
        children: [
          // Guest-accessible routes
          { path: 'submissions', element: withSuspense(MySubmissions) },
          { path: 'profile', element: withSuspense(MyProfile) },
          { path: 'members/:memberId', element: withSuspense(LabMemberProfile) },
          { path: 'notifications', element: withSuspense(NotificationsCenter) },
          { path: 'ai-review', element: withSuspense(AIAssistedReview) },
          { path: 'venues', element: withSuspense(VenueRecommendations) },
          { path: 'empirical-checklist', element: withSuspense(EmpiricalChecklist) },
          // Guest-restricted routes
          {
            element: <GuestGuard />,
            children: [
              { index: true, element: withSuspense(LabMemberDashboard) },
              { path: 'new-submission', element: withSuspense(NewSubmission) },
              { path: 'reviews', element: withSuspense(Assignments) },
              { path: 'my-feedback', element: withSuspense(MyComments) },
              { path: 'comments', element: withSuspense(MyComments) },
            ],
          },
        ],
      },
    ],
  },
  // Catch-all (404) rotası en sonda kalmalı
  {
    path: '*',
    element: withSuspense(NotFound),
  }
]);