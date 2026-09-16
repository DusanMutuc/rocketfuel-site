import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Rocket Fuel Privacy Policy | Twenty New Clients Inc.',
};

export default function PrivacyPolicy() {
  return (
    <>
      <main style={styles.container}>
        <h1 style={styles.heading}>Rocket Fuel Privacy Policy</h1>
        <p><strong>Effective Date:</strong> June 19, 2025</p>
        <p><strong>Last Updated:</strong> September 16, 2026</p>

        <p>
          This Privacy Policy applies to the Rocket Fuel mobile application (Android package:{' '}
          <strong>com.twentynewclients.rocketfuel</strong>) and the related Rocket Fuel coaching
          service provided by <strong>Twenty New Clients Inc.</strong> (&ldquo;we,&rdquo;
          &ldquo;us,&rdquo; or &ldquo;our&rdquo;).
        </p>
        <p>
          This policy explains how we collect, use, store, and disclose personal information
          when you use Rocket Fuel.
        </p>

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
            We use your data to provide your Rocket Fuel account and track your progress in the programme.
            We do not sell your data, and we do not run ads or track you across apps.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.subheading}>3. Data Sharing</h2>
          <p>
            We use Supabase as a service provider to authenticate accounts and securely store your data
            on our behalf.
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
            <a href="mailto:admin@rebootmembers.com">admin@rebootmembers.com</a>.
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
            For privacy questions or data requests, contact Twenty New Clients Inc. at{' '}
            <a href="mailto:admin@rebootmembers.com">admin@rebootmembers.com</a>.
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
