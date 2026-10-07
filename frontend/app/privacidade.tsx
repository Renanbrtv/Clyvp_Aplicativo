import { LegalScreen } from '../src/features/legal/LegalScreen';
import { privacyPolicy } from '../src/features/legal/legal-content';

/** Endereco publico exigido pela Google Play: /privacidade */
export default function PrivacidadeScreen() {
  return <LegalScreen document={privacyPolicy} />;
}
