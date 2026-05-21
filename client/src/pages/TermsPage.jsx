import { Link } from 'react-router-dom';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-ninja-bg py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <img src="/DojoLinkLogoH.png" alt="DojoLink" className="h-10 w-auto mb-6" />
          <h1 className="text-3xl font-bold font-ninja text-ninja-navy">Terms and Conditions</h1>
          <p className="text-ninja-muted font-ninja text-sm mt-1">Last updated: May 2026</p>
        </div>

        <div className="bg-white border border-ninja-border rounded-2xl p-8 shadow-sm space-y-6 font-ninja text-ninja-navy">

          <section>
            <h2 className="text-lg font-bold mb-2">Acceptance of Terms</h2>
            <p className="text-sm text-ninja-muted leading-relaxed">
              By accessing or using DojoLink, you agree to be bound by these Terms and Conditions. If you do not agree, do not use the platform. Access is granted by Code Ninjas franchise center staff — accounts are not available through public registration.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">Who May Use DojoLink</h2>
            <ul className="text-sm text-ninja-muted leading-relaxed space-y-2 list-disc list-inside">
              <li><strong className="text-ninja-navy">Staff (Center Directors and Senseis)</strong>: Authorized employees of a Code Ninjas franchise location with credentials issued by their Center Director.</li>
              <li><strong className="text-ninja-navy">Parents and Guardians</strong>: Individuals whose contact information is on file with the center and whose account was created by center staff.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">Permitted Use</h2>
            <p className="text-sm text-ninja-muted leading-relaxed">
              DojoLink is intended solely for managing student progress, check-ins, club participation, and parent visibility at Code Ninjas franchise locations. You agree not to:
            </p>
            <ul className="text-sm text-ninja-muted leading-relaxed space-y-2 list-disc list-inside mt-2">
              <li>Access accounts or data that do not belong to you.</li>
              <li>Attempt to reverse-engineer, copy, or redistribute any part of the platform.</li>
              <li>Use the platform for any unlawful purpose or in violation of any applicable law.</li>
              <li>Share your login credentials with unauthorized individuals.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">Accounts and Credentials</h2>
            <p className="text-sm text-ninja-muted leading-relaxed">
              You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account. If you believe your account has been compromised, notify your Center Director immediately. DojoLink does not support self-service password recovery — contact your center.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">Data and Privacy</h2>
            <p className="text-sm text-ninja-muted leading-relaxed">
              Your use of DojoLink is also governed by our{' '}
              <Link to="/privacy" className="text-ninja-blue hover:underline">Privacy Policy</Link>,
              which describes what data is collected and how it is used. By using DojoLink, you consent to the collection and use of information as described therein.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">Limitation of Liability</h2>
            <p className="text-sm text-ninja-muted leading-relaxed">
              DojoLink is provided as-is for internal franchise use. The platform operators make no warranties regarding uptime, accuracy, or fitness for any particular purpose beyond its intended use. To the fullest extent permitted by law, the operators are not liable for any indirect, incidental, or consequential damages arising from your use of the platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">Changes to These Terms</h2>
            <p className="text-sm text-ninja-muted leading-relaxed">
              These terms may be updated from time to time. Continued use of DojoLink after changes are posted constitutes acceptance of the revised terms. The date at the top of this page reflects when the terms were last updated.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">Contact</h2>
            <p className="text-sm text-ninja-muted leading-relaxed">
              For questions about these terms, contact the Center Director at your Code Ninjas location.
            </p>
          </section>

        </div>

        <div className="mt-6 text-center">
          <Link to="/login" className="text-ninja-blue font-ninja text-sm font-semibold hover:underline">
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
