import Link from 'next/link';

export const metadata = {
  title: 'Communications Policy - Ward',
};

export default function CommunicationsPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100 mb-8">Communications Policy</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Last updated: February 27, 2026</p>

      <div className="prose prose-gray max-w-none space-y-6">
        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-8 mb-3">1. Consent to Receive Messages</h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            By creating an account on the Ward scheduling platform (the &quot;Service&quot;), you consent to receive communications from us via SMS text message and email. These communications are directly related to your use of the Service and include, but are not limited to:
          </p>
          <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-1 mt-2">
            <li>Verification codes for account authentication</li>
            <li>Appointment booking confirmations</li>
            <li>Appointment cancellation notices</li>
            <li>Shift and schedule reminders</li>
            <li>Account and service-related updates</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-8 mb-3">2. Service-Related Messages Only</h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            We will only contact you in connection with your active use of the Service. If you are not actively using the Service — for example, if you have no upcoming appointments or shifts — you will not receive messages from us. We do not send marketing, promotional, or advertising messages.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-8 mb-3">3. SMS Text Messages</h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            SMS messages are sent to the phone number you provide during registration. Message frequency varies based on your activity on the platform. Standard message and data rates from your mobile carrier may apply.
          </p>
          <div className="mt-4 rounded-lg bg-blue-50 border border-blue-200 p-4">
            <p className="text-sm font-medium text-blue-900">
              To opt out of SMS messages at any time, reply <strong>STOP</strong> to any message you receive from us.
            </p>
            <p className="text-sm text-blue-700 mt-1">
              After opting out, you will receive one final confirmation message. You will no longer receive SMS notifications, though you may still use the Service. To opt back in, contact your event administrator.
            </p>
          </div>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
            <strong>Note:</strong> Opting out of SMS notifications does not affect authentication messages. Verification codes required to log in will still be sent to your phone number.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-8 mb-3">4. Email Communications</h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            If you provide an email address, we may send you service-related email communications such as appointment confirmations, schedule changes, and account updates.
          </p>
          <div className="mt-4 rounded-lg bg-blue-50 border border-blue-200 p-4">
            <p className="text-sm font-medium text-blue-900">
              To opt out of email communications, click the <strong>Unsubscribe</strong> link included at the bottom of any email you receive from us.
            </p>
            <p className="text-sm text-blue-700 mt-1">
              After unsubscribing, you will no longer receive email notifications. You may still use the Service and receive SMS messages unless separately opted out.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-8 mb-3">5. Message Content</h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            Messages from Ward may include:
          </p>
          <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-1 mt-2">
            <li>Your name and appointment details (date, time, location)</li>
            <li>The name of the professional or client associated with your appointment</li>
            <li>Resource and event information relevant to your schedule</li>
          </ul>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-2">
            We will never include sensitive personal information such as passwords, financial data, or health records in our messages.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-8 mb-3">6. Your Responsibilities</h2>
          <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-2 mt-2">
            <li>Keep your phone number and email address up to date in your account profile to ensure you receive important notifications.</li>
            <li>Be aware that opting out of notifications may cause you to miss appointment confirmations, cancellations, or schedule changes.</li>
            <li>Contact your event administrator if you need to update your communication preferences or re-subscribe after opting out.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-8 mb-3">7. Third-Party Messaging Providers</h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            SMS messages are delivered through <a href="https://www.twilio.com/legal/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Twilio</a>, a third-party communications platform. Your phone number is shared with Twilio solely for the purpose of delivering messages. Twilio&apos;s privacy policy governs their handling of your data.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-8 mb-3">8. Changes to This Policy</h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            We may update this Communications Policy from time to time. Changes will be reflected by the &quot;Last updated&quot; date at the top of this page. Your continued use of the Service after changes are posted constitutes acceptance of the revised policy.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-8 mb-3">9. Contact</h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            If you have questions about this Communications Policy or need assistance with your messaging preferences, please contact your event administrator.
          </p>
        </section>
      </div>

      <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-6">
        <Link href="/privacy" className="text-blue-600 hover:underline text-sm">
          Privacy Policy
        </Link>
        <span className="mx-2 text-gray-300">|</span>
        <Link href="/terms" className="text-blue-600 hover:underline text-sm">
          Terms &amp; Conditions
        </Link>
        <span className="mx-2 text-gray-300">|</span>
        <Link href="/" className="text-blue-600 hover:underline text-sm">
          Home
        </Link>
      </div>
    </div>
  );
}
