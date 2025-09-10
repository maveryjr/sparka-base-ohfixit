import { withAuth } from 'next-auth/middleware';

// Implement an Edge-safe authorized callback mirroring our app's routing rules
export default withAuth({
  callbacks: {
    authorized: ({ token, req }) => {
      const { pathname } = req.nextUrl;

      const isLoggedIn = !!token;
      const isApiAuthRoute = pathname.startsWith('/api/auth');
      if (isApiAuthRoute) return true;

      const isTrpcApi = pathname.startsWith('/api/trpc');
      if (isTrpcApi) return true;

      const isChatApiRoute = pathname === '/api/chat';
      if (isChatApiRoute) return true;

      const isOnChat = pathname.startsWith('/');
      const isOnLoginPage = pathname.startsWith('/login');
      const isOnRegisterPage = pathname.startsWith('/register');
      const isOnMagicBridge = pathname.startsWith('/magic');
      const isOnResetPassword = pathname.startsWith('/reset-password');
      const isOnSharePage = pathname.startsWith('/share/');

      if (isLoggedIn && (isOnLoginPage || isOnRegisterPage)) {
        // Let it through; app code will redirect if needed
        return true;
      }

      if (
        isOnRegisterPage ||
        isOnLoginPage ||
        isOnMagicBridge ||
        isOnResetPassword
      ) {
        return true;
      }

      if (isOnSharePage) {
        return true;
      }

      if (isOnChat) {
        if (pathname === '/') return true; // allow main chat page anonymously
        return isLoggedIn; // specific chat pages require auth
      }

      // Default: allow
      return true;
    },
  },
});

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|opengraph-image|manifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|webmanifest)$).*)',
  ],
};
