import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy - Ward',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-8">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: February 26, 2026</p>

      <div className="prose prose-gray max-w-none space-y-6">
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">1. Introduction</h2>
          <p className="text-gray-700 leading-relaxed">
            Ward (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates the Ward scheduling platform (the &quot;Service&quot;). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service. Please read this policy carefully. By accessing or using the Service, you agree to the terms of this Privacy Policy.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">2. Information We Collect</h2>
          <h3 className="text-lg font-medium text-gray-800 mt-4 mb-2">Personal Information</h3>
          <p className="text-gray-700 leading-relaxed">When you register for or use the Service, we may collect:</p>
          <ul className="list-disc pl-6 text-gray-700 space-y-1 mt-2">
            <li>Full name</li>
            <li>Phone number (used for authentication and optional SMS notifications)</li>
            <li>Role designation (administrator, professional, or client)</li>
            <li>Appointment and scheduling data</li>
          </ul>

          <h3 className="text-lg font-medium text-gray-800 mt-4 mb-2">Automatically Collected Information</h3>
          <p className="text-gray-700 leading-relaxed">When you access the Service, we may automatically collect:</p>
          <ul className="list-disc pl-6 text-gray-700 space-y-1 mt-2">
            <li>Browser type and version</li>
            <li>Access times and dates</li>
            <li>Pages viewed and features used</li>
            <li>IP address</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">3. How We Use Your Information</h2>
          <p className="text-gray-700 leading-relaxed">We use the information we collect to:</p>
          <ul className="list-disc pl-6 text-gray-700 space-y-1 mt-2">
            <li>Provide, operate, and maintain the Service</li>
            <li>Authenticate your identity via SMS verification</li>
            <li>Facilitate appointment scheduling between professionals and clients</li>
            <li>Send transactional notifications (e.g., booking confirmations and cancellations)</li>
            <li>Improve and personalize your experience</li>
            <li>Monitor and analyze usage trends</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">4. Third-Party Services</h2>
          <p className="text-gray-700 leading-relaxed">We use the following third-party services to operate the platform:</p>
          <ul className="list-disc pl-6 text-gray-700 space-y-1 mt-2">
            <li><strong>Twilio</strong> — for SMS-based authentication and notifications. Your phone number is shared with Twilio to deliver these messages. See <a href="https://www.twilio.com/legal/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Twilio&apos;s Privacy Policy</a>.</li>
            <li><strong>Vercel</strong> — for hosting and analytics. See <a href="https://vercel.com/legal/privacy-policy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Vercel&apos;s Privacy Policy</a>.</li>
            <li><strong>Turso (libSQL)</strong> — for database storage. Your data is stored securely in our database. See <a href="https://turso.tech/privacy-policy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Turso&apos;s Privacy Policy</a>.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">5. Data Retention</h2>
          <p className="text-gray-700 leading-relaxed">
            We retain your personal information for as long as your account is active or as needed to provide the Service. When data is deleted, it is soft-deleted and retained for up to 30 days before permanent removal. You may request deletion of your account and associated data by contacting an administrator.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">6. Data Security</h2>
          <p className="text-gray-700 leading-relaxed">
            We implement appropriate technical and organizational measures to protect your personal information, including encrypted connections (HTTPS), secure authentication tokens, and role-based access controls. However, no method of electronic transmission or storage is 100% secure, and we cannot guarantee absolute security.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">7. Your Rights</h2>
          <p className="text-gray-700 leading-relaxed">Depending on your jurisdiction, you may have the right to:</p>
          <ul className="list-disc pl-6 text-gray-700 space-y-1 mt-2">
            <li>Access the personal information we hold about you</li>
            <li>Request correction of inaccurate information</li>
            <li>Request deletion of your personal information</li>
            <li>Opt out of SMS notifications</li>
          </ul>
          <p className="text-gray-700 leading-relaxed mt-2">
            To exercise any of these rights, please contact your event administrator.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">8. Children&apos;s Privacy</h2>
          <p className="text-gray-700 leading-relaxed">
            The Service is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from children. If we become aware that we have collected information from a child, we will take steps to delete it.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">9. Changes to This Policy</h2>
          <p className="text-gray-700 leading-relaxed">
            We may update this Privacy Policy from time to time. We will notify you of material changes by updating the &quot;Last updated&quot; date at the top of this page. Your continued use of the Service after changes are posted constitutes acceptance of the revised policy.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">10. Contact Us</h2>
          <p className="text-gray-700 leading-relaxed">
            If you have questions about this Privacy Policy, please contact your event administrator.
          </p>
        </section>
      </div>

      <div className="mt-12 border-t border-gray-200 pt-6">
        <Link href="/terms" className="text-blue-600 hover:underline text-sm">
          Terms &amp; Conditions
        </Link>
        <span className="mx-2 text-gray-300">|</span>
        <Link href="/communications" className="text-blue-600 hover:underline text-sm">
          Communications Policy
        </Link>
        <span className="mx-2 text-gray-300">|</span>
        <Link href="/" className="text-blue-600 hover:underline text-sm">
          Home
        </Link>
      </div>
    </div>
  );
}
