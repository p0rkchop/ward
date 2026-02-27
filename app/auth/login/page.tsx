import { getBrandingImage } from '@/app/lib/branding-actions';
import LoginForm from './components/LoginForm';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const brandingImageUrl = await getBrandingImage();

  return <LoginForm brandingImageUrl={brandingImageUrl} />;
}
