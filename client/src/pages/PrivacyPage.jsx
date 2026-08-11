import { Link } from 'react-router-dom';
import { CARD } from '../lib/surfaces';

export default function PrivacyPage() {
  return (
    <div className="theme-locked min-h-[100dvh] bg-ninja-bg py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <img src="/DojoLinkLogoH.webp" alt="DojoLink" width="800" height="420" className="h-10 w-auto mb-6" />
          <h1 className="text-3xl font-bold font-ninja text-ninja-navy">Privacy Policy</h1>
          <p className="text-ninja-muted font-ninja text-sm mt-1">Last Updated: May 28, 2026</p>
        </div>

        <div className={`${CARD} p-8 space-y-6 font-ninja text-ninja-navy`}>

          <section>
            <h2 className="text-lg font-bold mb-2">About DojoLink</h2>
            <p className="text-sm text-ninja-muted leading-relaxed mb-2">
              DojoLink is an independently developed studio management platform created by a staff member of a Code Ninjas franchise location. DojoLink is not affiliated with, endorsed by, sponsored by, or operated by Code Ninjas Inc. or any related corporate entity.
            </p>
            <p className="text-sm text-ninja-muted leading-relaxed mb-2">
              DojoLink is used by participating franchise staff to manage student check-ins, attendance, curriculum progress, and club participation. Parents and guardians may also use the platform to view their child's progress and activity within the center.
            </p>
            <p className="text-sm text-ninja-muted leading-relaxed">
              This Privacy Policy explains what information is collected, how it is used, and how it is protected.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3">Information We Collect</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-ninja-navy mb-1">Student Information</h3>
                <p className="text-sm text-ninja-muted leading-relaxed mb-2">We may collect and store:</p>
                <div className="text-sm text-ninja-muted leading-relaxed space-y-1">
                  <p>Student names</p>
                  <p>Belt level and curriculum progression</p>
                  <p>Program enrollment information</p>
                  <p>Attendance and check-in records</p>
                  <p>Progress notes and logs entered by center staff</p>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-bold text-ninja-navy mb-1">Parent and Guardian Information</h3>
                <p className="text-sm text-ninja-muted leading-relaxed mb-2">We may collect and store:</p>
                <div className="text-sm text-ninja-muted leading-relaxed space-y-1">
                  <p>Parent or guardian names</p>
                  <p>Email addresses</p>
                  <p>Phone numbers</p>
                </div>
                <p className="text-sm text-ninja-muted leading-relaxed mt-2">
                  Parent portal accounts are created and managed by authorized center staff. Public self-registration is not available.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-bold text-ninja-navy mb-1">Staff Information</h3>
                <p className="text-sm text-ninja-muted leading-relaxed mb-2">We may collect and store:</p>
                <div className="text-sm text-ninja-muted leading-relaxed space-y-1">
                  <p>Usernames</p>
                  <p>Encrypted passwords</p>
                  <p>Display names</p>
                  <p>Optional profile photos</p>
                  <p>Account activity related to platform usage</p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">How Information Is Used</h2>
            <p className="text-sm text-ninja-muted leading-relaxed mb-3">
              Information collected through DojoLink is used solely for operational and educational purposes within participating franchise locations, including:
            </p>
            <div className="text-sm text-ninja-muted leading-relaxed space-y-2 mb-3">
              <p>Tracking and displaying student progress</p>
              <p>Managing attendance and student check-ins</p>
              <p>Allowing parents and guardians to view their own child's progress</p>
              <p>Authenticating authorized staff access</p>
              <p>Maintaining platform functionality and security</p>
            </div>
            <p className="text-sm text-ninja-muted leading-relaxed mb-2">
              Parents and guardians may only access information associated with their own child.
            </p>
            <p className="text-sm text-ninja-muted leading-relaxed">
              We do not sell, rent, license, or share personal information with third parties for advertising or marketing purposes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3">Access and Visibility</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-ninja-navy mb-1">Center Staff</h3>
                <p className="text-sm text-ninja-muted leading-relaxed">
                  Authorized Center Directors and Senseis may access student information for students enrolled at their franchise location.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-bold text-ninja-navy mb-1">Parents and Guardians</h3>
                <p className="text-sm text-ninja-muted leading-relaxed">
                  Parents and guardians may only access information associated with their own child or children.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-bold text-ninja-navy mb-1">Children</h3>
                <p className="text-sm text-ninja-muted leading-relaxed">
                  Children do not create accounts and do not directly log into DojoLink.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">Data Storage and Security</h2>
            <p className="text-sm text-ninja-muted leading-relaxed mb-3">
              Data is stored using Supabase infrastructure hosted in the United States with PostgreSQL database services.
            </p>
            <p className="text-sm text-ninja-muted leading-relaxed mb-2">Security measures include:</p>
            <div className="text-sm text-ninja-muted leading-relaxed space-y-2 mb-3">
              <p>HTTPS-encrypted connections</p>
              <p>Password hashing using bcrypt</p>
              <p>Restricted staff access controls</p>
              <p>Authentication protections for parent and staff accounts</p>
            </div>
            <p className="text-sm text-ninja-muted leading-relaxed mb-2">
              Passwords are never stored in plain text.
            </p>
            <p className="text-sm text-ninja-muted leading-relaxed">
              While reasonable security measures are implemented, no online platform can guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">Data Retention</h2>
            <p className="text-sm text-ninja-muted leading-relaxed mb-2">
              Student and parent information is retained while the student remains actively enrolled at a participating franchise location.
            </p>
            <p className="text-sm text-ninja-muted leading-relaxed mb-2">
              Requests for data deletion or account removal should be directed to the Center Director of the participating location.
            </p>
            <p className="text-sm text-ninja-muted leading-relaxed">
              Certain records may be retained where reasonably necessary for operational, legal, or security purposes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">Analytics and Local Storage</h2>
            <p className="text-sm text-ninja-muted leading-relaxed mb-2">
              DojoLink uses <strong>Vercel Analytics</strong> to collect anonymized, aggregated page-view data (such as page visited and general geographic region). No personally identifiable information is included in these analytics reports.
            </p>
            <p className="text-sm text-ninja-muted leading-relaxed mb-2">
              DojoLink stores a small amount of data in your browser's local storage and session storage for functional purposes only:
            </p>
            <div className="text-sm text-ninja-muted leading-relaxed space-y-1 mb-2">
              <p><strong>Theme preference</strong> (localStorage): remembers whether you selected light or dark mode.</p>
              <p><strong>Announcement dismissal</strong> (sessionStorage): remembers that you dismissed a system announcement banner during your current session. This data is cleared when you close your browser tab.</p>
            </div>
            <p className="text-sm text-ninja-muted leading-relaxed">
              No advertising cookies or cross-site tracking technologies are used.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">Children's Privacy (COPPA)</h2>
            <p className="text-sm text-ninja-muted leading-relaxed mb-2">
              DojoLink stores information <em>about</em> children enrolled at participating franchise locations (such as names, belt levels, and attendance records). This information is entered and managed exclusively by authorized center staff. Children do not create accounts, submit personal information, or directly interact with the platform.
            </p>
            <p className="text-sm text-ninja-muted leading-relaxed mb-2">
              Student records are collected for internal educational and operational purposes only, consistent with the Children's Online Privacy Protection Act (COPPA). We do not use or disclose children's information for any commercial, advertising, or marketing purpose.
            </p>
            <p className="text-sm text-ninja-muted leading-relaxed">
              Parents or guardians who wish to review, correct, or request deletion of their child's information should contact the Center Director of their participating franchise location.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">California Privacy Rights</h2>
            <p className="text-sm text-ninja-muted leading-relaxed mb-2">
              California residents may have rights under the California Consumer Privacy Act (CCPA) regarding personal information collected about them. DojoLink is an internal operational platform used by franchise staff; it does not sell personal information to third parties.
            </p>
            <p className="text-sm text-ninja-muted leading-relaxed">
              California residents may contact the Center Director of their participating franchise location to request access to, correction of, or deletion of personal information held about them, subject to applicable legal limitations.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">Third-Party Services</h2>
            <p className="text-sm text-ninja-muted leading-relaxed">
              DojoLink may utilize third-party infrastructure and hosting providers solely for platform functionality, storage, authentication, and security operations. These providers do not receive permission to use personal information for independent marketing purposes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">Changes to This Privacy Policy</h2>
            <p className="text-sm text-ninja-muted leading-relaxed mb-2">
              This Privacy Policy may be updated periodically. Continued use of DojoLink after updates are posted constitutes acceptance of the revised policy.
            </p>
            <p className="text-sm text-ninja-muted leading-relaxed">
              The "Last Updated" date above reflects the effective date of the current version.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">Contact</h2>
            <p className="text-sm text-ninja-muted leading-relaxed">
              For privacy-related questions, account concerns, or data deletion requests, please contact the Center Director at your participating franchise location.
            </p>
          </section>

        </div>

        <div className="mt-6 text-center">
          <Link to="/" className="text-ninja-blue font-ninja text-sm font-semibold hover:underline">
            ← Back
          </Link>
        </div>
      </div>
    </div>
  );
}
