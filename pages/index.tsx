
import {  useState } from 'react';

import { useSocialAuth } from '@/utils/useSocialAuth';
import { OAuthStrategy } from '@clerk/types';
import { useAuth } from '@clerk/clerk-react';



export default function Home() {
  const [isOpen, setIsOpen] = useState(false);
  const {  socialAuth } = useSocialAuth({
    onSuccess: handleSuccess,
  });
  const clerkAuth = useAuth();
  const callbackPath = 'auth/oauth-callback';
  const redirectUrl = `${process.env.NEXT_PUBLIC_HOST}/${callbackPath}`;

  async function handleSuccess() {
    alert(await clerkAuth.getToken())
  }

  function openOauthWin(
    authUrl: string,
  ): Promise<{ createdSessionId?: string }> {
    const height = 700,
      width = 400;
    //todo: fix calc for multi display
    const top = undefined; //window.top.outerHeight / 2 + window.top.screenY - height / 2;
    const left = undefined; //window.top.outerWidth / 2 + window.top.screenX - width / 2;
    const newWindow = window.open(
      authUrl,
      'gated_oauth_window',
      `height=${height},width=${width},top=${top},left=${left}`,
    );

    return new Promise<{ createdSessionId?: string }>((resolve, reject) => {
      const timer = setInterval(function () {
        try {
          if (!newWindow) return;
          if (newWindow.closed) {
            clearInterval(timer);
            setIsOpen(false);
          }
          if (newWindow.document.URL.indexOf('auth/oauth-callback') != -1) {
            window.clearInterval(timer);

            newWindow.close();
            setIsOpen(false);

            const callback = new URL(newWindow.document.URL);

            const createdSessionId =
              callback.searchParams.get('created_session_id');
            if (createdSessionId) {
              resolve({ createdSessionId });
            }

            const error = callback.searchParams.get('error'); //todo: havent validated this is the right param. need to force an error and check
            if (error) {
              reject(error);
            }

            console.log(newWindow.document.URL);

            resolve({});
          }
        } catch (e) {
          // swallow error and keep checking
        }
      }, 500);
    });
  }

  const handleSocialAuth = (strategy: OAuthStrategy) => {
    socialAuth(strategy, redirectUrl, openOauthWin);
  };

  return (
    <>
      <button onClick={()=> handleSocialAuth('oauth_linkedin')}>LinkedIn</button>
    </>
  )
}