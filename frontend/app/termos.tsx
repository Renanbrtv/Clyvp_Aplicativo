import { LegalScreen } from '../src/features/legal/LegalScreen';
import { termsOfUse } from '../src/features/legal/legal-content';

/** Endereco publico: /termos */
export default function TermosScreen() {
  return <LegalScreen document={termsOfUse} />;
}
