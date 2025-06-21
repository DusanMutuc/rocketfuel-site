// pages/privacy-policy.tsx
import Head from 'next/head';

export default function PrivacyPolicy() {
  return (
    <>
      <Head>
        <title>Privacy Policy | Real Estate Rocket Fuel</title>
      </Head>
      <main style={styles.container}>
        <h1 style={styles.heading}>Privacy Policy</h1>
        <p><strong>Effective Date:</strong> June 19, 2025</p>

        <section style={styles.section}>
          <h2 style={styles.subheading}>1. Information We Collect</h2>
          <p>
            We collect and store your email address (used to set up your account in our coaching program)
            and any personal data you enter to track your progress.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.subheading}>2. How We Use Your Data</h2>
          <p>
            Your data is used only to track your progress in the programme. We do not sell or share your data with third
            parties, and we do not run ads or track you across apps.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.subheading}>3. Data Sharing</h2>
          <p>
            We use Supabase to securely store your data. We ensure it is handled according to best practices.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.subheading}>4. Data Retention</h2>
          <p>
            Your data is kept as long as you remain in the program. You can request deletion at any time.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.subheading}>5. Your Rights</h2>
          <p>
            You can request access, correction, or deletion of your data by contacting us at{' '}
            <strong>admin@rebootmember.com</strong>.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.subheading}>6. Changes to This Policy</h2>
          <p>
            We may update this page as needed. Check back for any changes.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.subheading}>7. Contact</h2>
          <p>
            For questions or data requests, contact us at{' '}
            <strong>admin@rebootmember.com</strong>.
          </p>
        </section>
      </main>
    </>
  );
}
const styles = {
  container: {
    padding: '3rem 1.5rem',
    maxWidth: '800px',
    margin: 'auto',
    fontFamily: 'system-ui, sans-serif',
    lineHeight: 1.6,
    color: '#333',
  },
  heading: {
    fontSize: '2.5rem',
    marginBottom: '1rem',
  },
  subheading: {
    fontSize: '1.5rem',
    marginTop: '2rem',
    marginBottom: '0.5rem',
    color: '#004080',
  },
  section: {
    marginBottom: '1.5rem',
  },
};
