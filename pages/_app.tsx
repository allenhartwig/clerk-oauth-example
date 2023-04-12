import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import {ClerkProvider} from "@clerk/clerk-react";


export default function App({ Component, pageProps }: AppProps) {
  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_KEY as string}>
      <Component {...pageProps} />
    </ClerkProvider>
  );
}
