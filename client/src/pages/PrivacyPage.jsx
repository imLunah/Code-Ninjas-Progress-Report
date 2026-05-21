import { Link } from 'react-router-dom';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-ninja-bg py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <img src="/DojoLinkLogoH.png" alt="DojoLink" className="h-10 w-auto mb-6" />
          <h1 className="text-3xl font-bold font-ninja text-ninja-navy">Privacy Policy</h1>
          <p className="text-ninja-muted font-ninja text-sm mt-1">Last updated: May 2026</p>
        </div>

        <div className="bg-white border border-ninja-border rounded-2xl p-8 shadow-sm space-y-6 font-ninja text-ninja-navy">

          <section>
            <h2 className="text-lg font-bold mb-2">About DojoLink</h2>
            <p className="text-sm text-ninja-muted leading-relaxed">
              DojoLink is a studio management platform operated by Code Ninjas franchise owners. It is used by center staff to manage student check-ins and progress, and by parents to view their child's progress. This policy explains what information is collected and how it is used.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">Information We Collect</h2>
            <ul className="text-sm text-ninja-muted leading-relaxed space-y-2 list-disc list-inside">
              <li><strong className="text-ninja-navy">Student information</strong> — names, belt level, program enrollment, and progress logs entered by center staff.</li>
              <li><strong className="text-ninja-navy">Parent information</strong> — email address used to log in to the parent portal. Accounts are created by center staff, not through public registration.</li>
              <li><strong className="text-ninja-navy">Staff information</strong> — usernames, encrypted passwords, display names, and optional profile photos.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">How Information Is Used</h2>
            <ul className="text-sm text-ninja-muted leading-relaxed space-y-2 list-disc list-inside">
              <li>To track and display student progress within the center.</li>
              <li>To allow parents to view their own child's progress — parents cannot view other students.</li>
              <li>To authenticate center staff.</li>
              <li>We do not sell, rent, or share your information with third parties for marketing purposes.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">Who Can See What</h2>
            <ul className="text-sm text-ninja-muted leading-relaxed space-y-2 list-disc list-inside">
              <li><strong className="text-ninja-navy">Center Directors and Senseis</strong> — can view all students enrolled at their location.</li>
              <li><strong className="text-ninja-navy">Parents</strong> — can only view progress data for their own child.</li>
              <li>Children do not have accounts and do not log in.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">Data Storage & Security</h2>
            <p className="text-sm text-ninja-muted leading-relaxed">
              Data is stored in a PostgreSQL database hosted by Supabase in the United States. Passwords are encrypted using bcrypt and are never stored in plain text. All connections use HTTPS.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">Data Retention</h2>
            <p className="text-sm text-ninja-muted leading-relaxed">
              Student and parent data is retained while the student is actively enrolled. To request deletion of your data, contact your center director directly.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">Contact</h2>
            <p className="text-sm text-ninja-muted leading-relaxed">
              For any privacy-related questions or data deletion requests, contact the Center Director at your Code Ninjas location.
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
