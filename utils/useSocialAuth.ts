import { useSignIn, useSignUp, useUser, useAuth } from '@clerk/clerk-react';

import { OAuthStrategy } from '@clerk/types';
import { useState } from 'react';

export function useSocialAuth({
  onSuccess = () => {},
  onError = () => {},
}: {
  onSuccess?: (isSignup: boolean) => void;
  onError?: (message: string) => void;
}) {
  const x = useAuth();
  const { signUp } = useSignUp();
  const { signIn, setSession } = useSignIn();
  const [loading, setLoading] = useState(false);
  const clerkUser = useUser();

  const socialAuth = async (
    strategy: OAuthStrategy,
    redirectUrl: string,
    onDisplayLogin: (
      authUrl: string,
    ) => Promise<{ createdSessionId?: string; rotatingTokenNonce?: string }>,
  ) => {
    if (clerkUser.isSignedIn) {
      try {
        setLoading(true);
        const oauth = await clerkUser.user.createExternalAccount({
          strategy,
          redirect_url: redirectUrl,
        });
        const verificationUrl =
          oauth.verification?.externalVerificationRedirectURL;

        if (!verificationUrl) {
          throw 'Unable to get verification url';
        }
        await onDisplayLogin(verificationUrl.toString());
        await clerkUser.user.reload();

        return onSuccess(false);
      } catch (error: any) {
        return onError(error);
      } finally {
        setLoading(false);
      }
    } else {
      if (!signUp || !signIn) return;
      setLoading(true);

      try {
        // Choose your OAuth provider, based upon your instance.
        const x = await signIn.create({
          strategy,
          redirectUrl,
        });

        const {
          firstFactorVerification: { externalVerificationRedirectURL },
        } = signIn;

        if (!externalVerificationRedirectURL)
          throw 'Something went wrong during the OAuth flow. Try again.';

        // Get the rotatingTokenNonce from the redirect URL parameters
        const loginResponse = await onDisplayLogin(
          externalVerificationRedirectURL.toString(),
        );

        let createdSessionId: string | null | undefined =
          loginResponse.createdSessionId;

        if (loginResponse.rotatingTokenNonce) {
          await signIn.reload({
            rotatingTokenNonce: loginResponse.rotatingTokenNonce,
          });

          createdSessionId = signIn.createdSessionId;
        }

        if (createdSessionId) {
          // If we have a createdSessionId, then auth was successful

          await setSession(createdSessionId);
          await signIn.reload();

          console.log(signIn);
          onSuccess(false);
        } else {
          // If we have no createdSessionId, then this is a first time sign-in, so
          // we should process this as a signUp instead
          // Throw if we're not in the right state for creating a new user
          console.log(signIn);
          if (
            !signUp ||
            signIn.firstFactorVerification.status !== 'transferable'
          ) {
            throw 'Something went wrong during the Sign up OAuth flow. Please ensure that all sign up requirements are met.';
          }

          console.log(
            "Didn't have an account transferring, following through with new account sign up",
          );
          // Create user
          await signUp.create({ transfer: true });
          console.log(signUp);
          if (loginResponse.rotatingTokenNonce) {
            await signUp.reload({
              rotatingTokenNonce: loginResponse.rotatingTokenNonce,
            });
          }
          await setSession(signUp.createdSessionId);
          onSuccess(true);
        }
      } catch (err: any) {
        console.log(JSON.stringify(err, null, 2));
        console.log('error signing in', err);
        onError(err);
      } finally {
        setLoading(false);
      }
    }
  };

  return { loading, socialAuth };
}
