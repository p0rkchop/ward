import Link from 'next/link';

export const metadata = {
  title: 'Terms & Conditions - Ward',
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100 mb-8">Terms &amp; Conditions</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Last updated: February 26, 2026</p>

      <div className="prose prose-gray max-w-none space-y-6">
        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-8 mb-3">1. Acceptance of Terms</h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            By accessing or using the Ward scheduling platform (the &quot;Service&quot;), you agree to be bound by these Terms &amp; Conditions (&quot;Terms&quot;). If you do not agree, you may not access or use the Service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-8 mb-3">2. Description of Service</h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            Ward is a capacity-first scheduling platform that enables administrators to organize events, professionals to manage their availability through shifts, and clients to book appointments. The Service facilitates scheduling — it does not provide medical, legal, financial, or other professional advice.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-8 mb-3">3. User Accounts</h2>
          <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-2 mt-2">
            <li>You must provide a valid phone number to register and authenticate.</li>
            <li>You are responsible for maintaining the confidentiality of your account and any verification codes sent to your phone.</li>
            <li>You agree to provide accurate, current, and complete information during registration and to update it as necessary.</li>
            <li>You must not share your account credentials or allow others to access the Service using your account.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-8 mb-3">4. User Roles and Responsibilities</h2>

          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mt-4 mb-2">Administrators</h3>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            Administrators are responsible for configuring events, managing resources, and overseeing users. Administrators must ensure appropriate use of the platform within their organization.
          </p>

          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mt-4 mb-2">Professionals</h3>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            Professionals manage their availability by creating shifts on assigned resources. Professionals are responsible for honoring the shifts they create and the appointments booked by clients.
          </p>

          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mt-4 mb-2">Clients</h3>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            Clients may book available appointment slots and are expected to attend or cancel appointments in a timely manner.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-8 mb-3">5. Acceptable Use</h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">You agree not to:</p>
          <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-1 mt-2">
            <li>Use the Service for any unlawful purpose</li>
            <li>Attempt to gain unauthorized access to any part of the Service</li>
            <li>Interfere with or disrupt the Service or its infrastructure</li>
            <li>Impersonate another user or provide false information</li>
            <li>Use automated scripts, bots, or scrapers to access the Service</li>
            <li>Transmit any malicious code, viruses, or harmful content</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-8 mb-3">6. Appointment Policies</h2>
          <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-2 mt-2">
            <li>Appointments are subject to availability and are confirmed on a first-come, first-served basis.</li>
            <li>Cancellations should be made as early as possible. Past appointments cannot be cancelled.</li>
            <li>Ward is not responsible for missed appointments, scheduling conflicts, or the quality of services provided by professionals.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-8 mb-3">7. SMS Communications</h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            By using the Service, you consent to receive SMS messages for authentication purposes (verification codes). You may also receive transactional notifications related to your appointments. Standard messaging rates from your carrier may apply. You may opt out of non-essential notifications by contacting your administrator.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-8 mb-3">8. Intellectual Property</h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            The Service and its original content, features, and functionality are owned by Ward and are protected by applicable intellectual property laws. You may not copy, modify, distribute, or create derivative works based on the Service without prior written consent.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-8 mb-3">9. Disclaimer of Warranties</h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-8 mb-3">10. Limitation of Liability</h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            TO THE FULLEST EXTENT PERMITTED BY LAW, WARD AND ITS OPERATORS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUE, WHETHER INCURRED DIRECTLY OR INDIRECTLY, ARISING FROM YOUR USE OF THE SERVICE.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-8 mb-3">11. Account Termination</h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            We reserve the right to suspend or terminate your account at any time, with or without notice, for conduct that we determine violates these Terms or is harmful to other users, us, or third parties. Upon termination, your right to use the Service will immediately cease.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-8 mb-3">12. Changes to These Terms</h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            We may revise these Terms at any time by updating this page. The &quot;Last updated&quot; date at the top will reflect the most recent revision. Your continued use of the Service after changes are posted constitutes acceptance of the revised Terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-8 mb-3">13. Governing Law</h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            These Terms shall be governed by and construed in accordance with the laws of the State of Wisconsin, United States, without regard to its conflict of law provisions.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-8 mb-3">14. Contact Us</h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            If you have questions about these Terms, please contact your event administrator.
          </p>
        </section>
      </div>

      <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-6">
        <Link href="/privacy" className="text-blue-600 hover:underline text-sm">
          Privacy Policy
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
