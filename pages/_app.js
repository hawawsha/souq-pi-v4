/**
 * Souq Pi - Next.js App Component
 * Dynamic Network Support
 */

import { PiPriceProvider } from '../contexts/PiPriceContext';
import '../styles/globals.css';

function MyApp({ Component, pageProps }) {
  return (
    <PiPriceProvider>
      <Component {...pageProps} />
    </PiPriceProvider>
  );
}

export default MyApp;
