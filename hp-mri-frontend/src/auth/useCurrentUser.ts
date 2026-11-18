import { useEffect, useState } from 'react';
import { AUTH_CHANGE_EVENT, getCurrentUserName, isAuthenticated } from './cognito';

interface CurrentUser {
  userName: string | null;
  isSignedIn: boolean;
}

function readCurrentUser(): CurrentUser {
  return { userName: getCurrentUserName(), isSignedIn: isAuthenticated() };
}

/**
 * The signed-in user, kept live: re-read on sign-in/out in this tab
 * (AUTH_CHANGE_EVENT) and in other tabs (the `storage` event).
 */
export function useCurrentUser(): CurrentUser {
  const [user, setUser] = useState<CurrentUser>(readCurrentUser);

  useEffect(() => {
    const refresh = () => setUser(readCurrentUser());
    window.addEventListener(AUTH_CHANGE_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(AUTH_CHANGE_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  return user;
}
